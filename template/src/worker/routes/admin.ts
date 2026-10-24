import { Hono, type Context } from 'hono';
import { asc, count, desc, eq, inArray, sql, sum } from 'drizzle-orm';
import { banners, categories, ORDER_STATUSES, orderItems, orders, products, settings, type OrderStatus } from '../db/schema';
import { isImageKey } from '../imageKeys';
import type { AppEnv } from '../env';
import { requireAdmin } from '../auth';
import { saveImage, imageResponse } from '../images';
import { notifyCustomerOfStatus } from '../telegram';
import { getSettings } from './store';

export const admin = new Hono<AppEnv>();
admin.use('*', requireAdmin);

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const wholeNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 10_000_000 ? n : null;
};

admin.get('/me', (c) => c.json({ ok: true }));

admin.get('/stats', async (c) => {
  const db = c.get('db');
  // "Today" in the owner's own time zone: the browser sends its offset (minutes, as getTimezoneOffset()).
  const offset = Math.max(-840, Math.min(840, Number(c.req.query('tz')) || 0)) * 60;
  const now = Math.floor(Date.now() / 1000);
  const startOfDay = Math.floor((now - offset) / 86400) * 86400 + offset;
  const weekAgo = startOfDay - 6 * 86400;
  const sales = (since: number) =>
    db
      .select({ n: count(), revenue: sum(orders.total) })
      .from(orders)
      .where(sql`${orders.createdAt} >= ${since} and ${orders.status} != 'cancelled'`);
  const [byStatus, [today], [week], [catalog]] = await Promise.all([
    db.select({ status: orders.status, n: count() }).from(orders).groupBy(orders.status),
    sales(startOfDay),
    sales(weekAgo),
    db.select({ total: count(), soldOut: sql<number>`sum(case when ${products.available} then 0 else 1 end)` }).from(products),
  ]);
  return c.json({
    byStatus: Object.fromEntries(byStatus.map((row) => [row.status, row.n])),
    today: { orders: today.n, revenue: Number(today.revenue ?? 0) },
    week: { orders: week.n, revenue: Number(week.revenue ?? 0) },
    products: { total: catalog.total, soldOut: Number(catalog.soldOut ?? 0) },
  });
});

// ---------- Orders ----------

admin.get('/orders', async (c) => {
  const db = c.get('db');
  const status = c.req.query('status') as OrderStatus | undefined;
  const where = status && ORDER_STATUSES.includes(status) ? eq(orders.status, status) : undefined;
  const list = await db
    .select({
      id: orders.id,
      status: orders.status,
      source: orders.source,
      name: orders.name,
      total: orders.total,
      payment: orders.payment,
      createdAt: orders.createdAt,
      itemCount: sql<number>`(select coalesce(sum(qty), 0) from order_items where order_items.order_id = "orders"."id")`,
    })
    .from(orders)
    .where(where)
    .orderBy(desc(orders.id))
    .limit(200);
  return c.json({ orders: list });
});

admin.get('/orders/:id', async (c) => {
  const db = c.get('db');
  const id = Number(c.req.param('id'));
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) return c.json({ error: 'الطلب غير موجود' }, 404);
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  return c.json({ order, items });
});

/** Updates the status and, when the customer follows the order on Telegram, tells them. */
export async function changeOrderStatus(c: Context<AppEnv>, id: number, status: OrderStatus) {
  const db = c.get('db');
  const [order] = await db
    .update(orders)
    .set({ status, updatedAt: sql`(unixepoch())` })
    .where(eq(orders.id, id))
    .returning();
  if (order?.telegramChatId) {
    c.executionCtx.waitUntil(
      notifyCustomerOfStatus(c.env, new URL(c.req.url).origin, order.telegramChatId, order).catch((e) => console.error(e)),
    );
  }
  return order;
}

admin.patch('/orders/:id', async (c) => {
  const { status } = await c.req.json<{ status: OrderStatus }>();
  if (!ORDER_STATUSES.includes(status)) return c.json({ error: 'حالة غير معروفة' }, 400);
  const order = await changeOrderStatus(c, Number(c.req.param('id')), status);
  if (!order) return c.json({ error: 'الطلب غير موجود' }, 404);
  return c.json({ order });
});

admin.get('/receipts/:key', async (c) => {
  const key = c.req.param('key');
  if (!key.startsWith('rcpt_')) return c.json({ error: 'غير موجود' }, 404);
  return imageResponse(c.env, key, 'private, max-age=3600');
});

// ---------- Products ----------

admin.get('/products', async (c) => {
  const list = await c.get('db').select().from(products).orderBy(asc(products.sort), desc(products.id));
  return c.json({ products: list });
});

function readProduct(body: Record<string, unknown>) {
  const name = text(body.name, 120);
  const price = wholeNumber(body.price);
  if (name.length < 2) return { error: 'اكتب اسم المنتج' } as const;
  if (price === null) return { error: 'السعر يجب أن يكون رقماً صحيحاً' } as const;
  const oldPrice = body.oldPrice === null || body.oldPrice === '' || body.oldPrice === undefined ? null : wholeNumber(body.oldPrice);
  const images = Array.isArray(body.images) ? body.images.filter(isImageKey).slice(0, 8) : [];
  return {
    value: {
      name,
      price,
      oldPrice: oldPrice && oldPrice > price ? oldPrice : null,
      description: text(body.description, 2000),
      categoryId: Number.isInteger(body.categoryId) ? (body.categoryId as number) : null,
      images,
      available: body.available !== false,
    },
  } as const;
}

admin.post('/products', async (c) => {
  const parsed = readProduct(await c.req.json());
  if ('error' in parsed) return c.json({ error: parsed.error }, 400);
  const [product] = await c.get('db').insert(products).values(parsed.value).returning();
  return c.json({ product });
});

admin.put('/products/:id', async (c) => {
  const parsed = readProduct(await c.req.json());
  if ('error' in parsed) return c.json({ error: parsed.error }, 400);
  const id = Number(c.req.param('id'));
  const db = c.get('db');
  const [before] = await db.select({ images: products.images }).from(products).where(eq(products.id, id));
  if (!before) return c.json({ error: 'المنتج غير موجود' }, 404);
  const [product] = await db.update(products).set(parsed.value).where(eq(products.id, id)).returning();
  // Free the space of photos removed from the product.
  const removed = before.images.filter((key) => key.startsWith('img_') && !parsed.value.images.includes(key));
  c.executionCtx.waitUntil(Promise.all(removed.map((key) => c.env.KV.delete(key))));
  return c.json({ product });
});

admin.delete('/products/:id', async (c) => {
  const db = c.get('db');
  const [product] = await db.delete(products).where(eq(products.id, Number(c.req.param('id')))).returning();
  if (product) c.executionCtx.waitUntil(Promise.all(product.images.filter((key) => key.startsWith('img_')).map((key) => c.env.KV.delete(key))));
  return c.json({ ok: true });
});

admin.post('/images', async (c) => {
  const file = (await c.req.formData()).get('file');
  if (!(file instanceof File)) return c.json({ error: 'اختر صورة' }, 400);
  const saved = await saveImage(c.env, file, 'img');
  if ('error' in saved) return c.json({ error: saved.error }, 400);
  return c.json(saved);
});

// ---------- Categories ----------

admin.post('/categories', async (c) => {
  const body = await c.req.json();
  const name = text(body.name, 60);
  if (name.length < 2) return c.json({ error: 'اكتب اسم القسم' }, 400);
  const db = c.get('db');
  const [{ n }] = await db.select({ n: count() }).from(categories);
  const imageKey = isImageKey(body.imageKey) ? body.imageKey : null;
  const [category] = await db.insert(categories).values({ name, imageKey, sort: n }).returning();
  return c.json({ category });
});

admin.put('/categories/:id', async (c) => {
  const body = await c.req.json();
  const name = text(body.name, 60);
  if (name.length < 2) return c.json({ error: 'اكتب اسم القسم' }, 400);
  const imageKey = isImageKey(body.imageKey) ? body.imageKey : null;
  const [category] = await c
    .get('db')
    .update(categories)
    .set({ name, imageKey })
    .where(eq(categories.id, Number(c.req.param('id'))))
    .returning();
  return c.json({ category });
});

admin.delete('/categories/:id', async (c) => {
  await c.get('db').delete(categories).where(eq(categories.id, Number(c.req.param('id'))));
  return c.json({ ok: true });
});

/** Saves a new order of categories: body = { ids: [3, 1, 2] }. */
admin.post('/categories/order', async (c) => {
  const { ids } = await c.req.json<{ ids: number[] }>();
  const db = c.get('db');
  const valid = (Array.isArray(ids) ? ids : []).filter(Number.isInteger);
  const existing = await db.select({ id: categories.id }).from(categories).where(inArray(categories.id, valid));
  if (existing.length) {
    await db.batch(
      valid.map((id, sort) => db.update(categories).set({ sort }).where(eq(categories.id, id))) as [any, ...any[]],
    );
  }
  return c.json({ ok: true });
});

// ---------- Banners ----------

function readBanner(body: Record<string, unknown>) {
  if (!isImageKey(body.imageKey)) return { error: 'اختر صورة البنر' } as const;
  const link = text(body.link, 100);
  return {
    value: {
      imageKey: body.imageKey,
      title: text(body.title, 80),
      subtitle: text(body.subtitle, 140),
      buttonText: text(body.buttonText, 30),
      // Only links inside the store, so a banner can't send shoppers to another site.
      link: /^\/(c|p)\/\d+$/.test(link) ? link : '',
    },
  } as const;
}

admin.post('/banners', async (c) => {
  const parsed = readBanner(await c.req.json());
  if ('error' in parsed) return c.json({ error: parsed.error }, 400);
  const db = c.get('db');
  const [{ n }] = await db.select({ n: count() }).from(banners);
  const [banner] = await db.insert(banners).values({ ...parsed.value, sort: n }).returning();
  return c.json({ banner });
});

admin.put('/banners/:id', async (c) => {
  const parsed = readBanner(await c.req.json());
  if ('error' in parsed) return c.json({ error: parsed.error }, 400);
  const [banner] = await c
    .get('db')
    .update(banners)
    .set(parsed.value)
    .where(eq(banners.id, Number(c.req.param('id'))))
    .returning();
  return c.json({ banner });
});

admin.delete('/banners/:id', async (c) => {
  const [banner] = await c.get('db').delete(banners).where(eq(banners.id, Number(c.req.param('id')))).returning();
  if (banner?.imageKey.startsWith('img_')) c.executionCtx.waitUntil(c.env.KV.delete(banner.imageKey));
  return c.json({ ok: true });
});

/** Saves a new order of banners: body = { ids: [3, 1, 2] }. */
admin.post('/banners/order', async (c) => {
  const { ids } = await c.req.json<{ ids: number[] }>();
  const db = c.get('db');
  const valid = (Array.isArray(ids) ? ids : []).filter(Number.isInteger);
  if (valid.length) {
    await db.batch(valid.map((id, sort) => db.update(banners).set({ sort }).where(eq(banners.id, id))) as [any, ...any[]]);
  }
  return c.json({ ok: true });
});

// ---------- Settings ----------

admin.get('/settings', async (c) => c.json({ settings: await getSettings(c) }));

admin.put('/settings', async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const name = text(body.name, 60);
  if (name.length < 2) return c.json({ error: 'اكتب اسم المتجر' }, 400);
  const color = typeof body.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(body.color) ? body.color : '#0f5c4d';
  const deliveryFee = wholeNumber(body.deliveryFee);
  if (deliveryFee === null) return c.json({ error: 'رسوم التوصيل يجب أن تكون رقماً صحيحاً' }, 400);
  const logoKey = isImageKey(body.logoKey) ? body.logoKey : null;
  const freeShippingOver = wholeNumber(body.freeShippingOver);
  if (freeShippingOver === null) return c.json({ error: 'حد الشحن المجاني يجب أن يكون رقماً صحيحاً' }, 400);
  const [row] = await c
    .get('db')
    .update(settings)
    .set({
      name,
      tagline: text(body.tagline, 120),
      color,
      currency: text(body.currency, 10) || 'ر.س',
      deliveryFee,
      freeShippingOver,
      announcement: text(body.announcement, 120),
      whatsapp: text(body.whatsapp, 20).replace(/[^\d+]/g, ''),
      transferInfo: text(body.transferInfo, 500),
      isOpen: body.isOpen !== false,
      logoKey,
    })
    .where(eq(settings.id, 1))
    .returning();
  return c.json({ settings: row });
});
