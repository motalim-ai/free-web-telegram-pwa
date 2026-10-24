import { Hono, type Context } from 'hono';
import { and, asc, desc, eq, inArray, isNotNull, ne, sql } from 'drizzle-orm';
import { banners, categories, customers, orderItems, orders, products, settings } from '../db/schema';
import type { AppEnv } from '../env';
import { createSession, isAdminId, setAdminCookie, clearAdminCookie, verifyInitData } from '../auth';
import { notifyAdminsOfOrder } from '../telegram';
import { saveImage } from '../images';

export const store = new Hono<AppEnv>();

export async function getSettings(c: Context<AppEnv>) {
  const [row] = await c.get('db').select().from(settings).where(eq(settings.id, 1));
  if (!row) throw new Error('settings row missing: run the seed');
  return row;
}

/** Everything the storefront needs in one request: settings, categories and products. */
store.get('/store', async (c) => {
  const db = c.get('db');
  const [s, cats, items, slides, sold] = await Promise.all([
    getSettings(c),
    db.select().from(categories).orderBy(asc(categories.sort), asc(categories.id)),
    db.select().from(products).orderBy(asc(products.sort), desc(products.id)),
    db.select().from(banners).orderBy(asc(banners.sort), asc(banners.id)),
    // Best sellers: most units in orders that weren't cancelled.
    db
      .select({ id: orderItems.productId, n: sql<number>`sum(${orderItems.qty})` })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(ne(orders.status, 'cancelled'), isNotNull(orderItems.productId)))
      .groupBy(orderItems.productId)
      .orderBy(desc(sql`2`))
      .limit(12),
  ]);
  return c.json({
    store: {
      name: s.name,
      tagline: s.tagline,
      logo: s.logoKey,
      color: s.color,
      currency: s.currency,
      deliveryFee: s.deliveryFee,
      freeShippingOver: s.freeShippingOver,
      announcement: s.announcement,
      whatsapp: s.whatsapp,
      transferInfo: s.transferInfo,
      isOpen: s.isOpen,
      botUsername: c.env.BOT_USERNAME || null,
    },
    categories: cats,
    banners: slides,
    bestSellers: sold.map((row) => row.id!),
    products: items.map(({ createdAt, sort, ...p }) => ({ ...p, createdAt })),
  });
});

/** Inside Telegram: trade the signed initData for a session, creating the customer on first visit. */
store.post('/auth/telegram', async (c) => {
  const { initData } = await c.req.json<{ initData?: string }>();
  if (!c.env.BOT_TOKEN) return c.json({ error: 'البوت غير مضبوط بعد (BOT_TOKEN)' }, 500);
  const user = initData ? await verifyInitData(initData, c.env.BOT_TOKEN) : null;
  if (!user) return c.json({ error: 'تعذّر التحقق من حساب تيليجرام' }, 401);

  const db = c.get('db');
  const telegramId = String(user.id);
  const [customer] = await db
    .insert(customers)
    .values({ telegramId, firstName: user.first_name, username: user.username ?? null })
    .onConflictDoUpdate({
      target: customers.telegramId,
      set: { firstName: user.first_name, username: user.username ?? null },
    })
    .returning();

  const isAdmin = isAdminId(c.env, telegramId);
  const token = await createSession(c.env, { role: isAdmin ? 'admin' : 'customer', tg: telegramId, cid: customer.id });
  return c.json({
    token,
    user: { name: user.first_name, isAdmin },
    customer: { phone: customer.phone, address: customer.address },
  });
});

/** Website admin login: the one-time code the bot sends after /admin. */
store.post('/auth/admin-link', async (c) => {
  const { code } = await c.req.json<{ code?: string }>();
  const key = `login:${code ?? ''}`;
  const telegramId = code && /^[A-Za-z0-9_-]{20,}$/.test(code) ? await c.env.KV.get(key) : null;
  if (!telegramId || !isAdminId(c.env, telegramId)) {
    return c.json({ error: 'الرابط منتهي أو مستخدم. اكتب /admin للبوت لرابط جديد.' }, 401);
  }
  await c.env.KV.delete(key);
  await setAdminCookie(c, { role: 'admin', tg: telegramId });
  return c.json({ ok: true });
});

/** One-click admin login, only on localhost and only when .dev.vars sets DEV_LOGIN=1. */
store.post('/auth/dev-login', async (c) => {
  const host = new URL(c.req.url).hostname;
  if (c.env.DEV_LOGIN !== '1' || !['localhost', '127.0.0.1'].includes(host)) return c.json({ error: 'غير متاح' }, 404);
  await setAdminCookie(c, { role: 'admin' });
  return c.json({ ok: true });
});

store.get('/auth/dev-login', (c) => {
  const host = new URL(c.req.url).hostname;
  return c.json({ available: c.env.DEV_LOGIN === '1' && ['localhost', '127.0.0.1'].includes(host) });
});

store.post('/auth/logout', (c) => {
  clearAdminCookie(c);
  return c.json({ ok: true });
});

interface OrderInput {
  items: { id: number; qty: number }[];
  name: string;
  phone: string;
  address: string;
  notes?: string;
  payment: 'cod' | 'transfer';
}

const clean = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/**
 * Places an order (multipart: `data` = JSON, optional `receipt` = transfer screenshot).
 * Prices and totals are always recomputed here from the database, never taken from the browser.
 */
store.post('/orders', async (c) => {
  const db = c.get('db');
  const session = c.get('session');
  const form = await c.req.formData();
  let input: OrderInput;
  try {
    input = JSON.parse(String(form.get('data') ?? ''));
  } catch {
    return c.json({ error: 'بيانات الطلب غير صالحة' }, 400);
  }

  const s = await getSettings(c);
  if (!s.isOpen) return c.json({ error: 'المتجر لا يستقبل طلبات الآن' }, 400);

  const name = clean(input.name, 60);
  const phone = clean(input.phone, 20).replace(/[\s-]/g, '');
  const address = clean(input.address, 300);
  const notes = clean(input.notes, 300);
  if (name.length < 2) return c.json({ error: 'اكتب الاسم' }, 400);
  if (!/^\+?\d{9,15}$/.test(phone)) return c.json({ error: 'رقم الجوال غير صحيح' }, 400);
  if (address.length < 5) return c.json({ error: 'اكتب العنوان بالتفصيل' }, 400);
  if (input.payment !== 'cod' && input.payment !== 'transfer') return c.json({ error: 'اختر طريقة الدفع' }, 400);
  if (input.payment === 'transfer' && !s.transferInfo) return c.json({ error: 'التحويل غير متاح' }, 400);

  const wanted = new Map<number, number>();
  for (const item of Array.isArray(input.items) ? input.items : []) {
    const qty = Math.floor(Number(item?.qty));
    if (Number.isInteger(item?.id) && qty >= 1 && qty <= 50) wanted.set(item.id, (wanted.get(item.id) ?? 0) + qty);
  }
  if (wanted.size === 0 || wanted.size > 50) return c.json({ error: 'السلة فارغة' }, 400);

  const found = await db
    .select()
    .from(products)
    .where(and(inArray(products.id, [...wanted.keys()]), eq(products.available, true)));
  if (found.length !== wanted.size) return c.json({ error: 'بعض المنتجات لم تعد متاحة. حدّث السلة.' }, 409);

  let receiptKey: string | null = null;
  const receipt = form.get('receipt');
  if (input.payment === 'transfer') {
    if (!(receipt instanceof File)) return c.json({ error: 'أرفق صورة التحويل' }, 400);
    const saved = await saveImage(c.env, receipt, 'rcpt');
    if ('error' in saved) return c.json({ error: saved.error }, 400);
    receiptKey = saved.key;
  }

  const lines = found.map((p) => ({ productId: p.id, name: p.name, price: p.price, qty: wanted.get(p.id)! }));
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
  const deliveryFee = deliveryFor(subtotal, s);
  const total = subtotal + deliveryFee;
  const token = randomToken();
  const fromTelegram = Boolean(session?.tg);

  const [order] = await db
    .insert(orders)
    .values({
      token,
      source: fromTelegram ? 'telegram' : 'web',
      customerId: session?.cid ?? null,
      telegramChatId: session?.tg ?? null,
      name,
      phone,
      address,
      notes,
      payment: input.payment,
      receiptKey,
      subtotal,
      deliveryFee,
      total,
    })
    .returning();
  await db.insert(orderItems).values(lines.map((line) => ({ ...line, orderId: order.id })));
  // Remember phone and address so the next Telegram order is pre-filled.
  if (session?.cid) await db.update(customers).set({ phone, address }).where(eq(customers.id, session.cid));

  const origin = new URL(c.req.url).origin;
  c.executionCtx.waitUntil(
    notifyAdminsOfOrder(c.env, origin, { ...order, items: lines }, s.currency).catch((e) => console.error(e)),
  );
  return c.json({ token, id: order.id });
});

/** A customer's own order page. The long random token in the link is what grants access. */
store.get('/orders/:token', async (c) => {
  const db = c.get('db');
  const [order] = await db.select().from(orders).where(eq(orders.token, c.req.param('token')));
  if (!order) return c.json({ error: 'لم نجد هذا الطلب' }, 404);
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const { receiptKey, customerId, telegramChatId, ...visible } = order;
  return c.json({ order: { ...visible, followsOnTelegram: Boolean(telegramChatId) }, items });
});

/** "My orders" for shoppers inside Telegram. */
store.get('/my/orders', async (c) => {
  const cid = c.get('session')?.cid;
  if (!cid) return c.json({ orders: [] });
  const list = await c
    .get('db')
    .select({ id: orders.id, token: orders.token, status: orders.status, total: orders.total, createdAt: orders.createdAt })
    .from(orders)
    .where(eq(orders.customerId, cid))
    .orderBy(desc(orders.id))
    .limit(30);
  return c.json({ orders: list });
});

/** Free above the owner's threshold, otherwise the flat delivery fee. The browser shows the same rule. */
export const deliveryFor = (subtotal: number, s: { deliveryFee: number; freeShippingOver: number }) =>
  s.freeShippingOver > 0 && subtotal >= s.freeShippingOver ? 0 : s.deliveryFee;

export function randomToken(bytes = 18) {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...raw)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
