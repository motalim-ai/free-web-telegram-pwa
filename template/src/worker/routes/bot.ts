import { Hono, type Context } from 'hono';
import { eq, isNull, and } from 'drizzle-orm';
import { orders, ORDER_STATUSES, type OrderStatus } from '../db/schema';
import type { AppEnv } from '../env';
import { isAdminId } from '../auth';
import { botApi, sendMessage, STATUS_LABELS } from '../telegram';
import { randomToken, getSettings } from './store';
import { changeOrderStatus } from './admin';

interface Update {
  message?: { chat: { id: number; type: string }; from?: { id: number; first_name: string }; text?: string };
  callback_query?: {
    id: string;
    from: { id: number };
    data?: string;
    message?: { chat: { id: number }; message_id: number; text?: string };
  };
}

export const bot = new Hono<AppEnv>();

/** Telegram calls this for every message the bot receives (registered by `npm run bot:setup`). */
bot.post('/webhook', async (c) => {
  if (!c.env.WEBHOOK_SECRET || c.req.header('X-Telegram-Bot-Api-Secret-Token') !== c.env.WEBHOOK_SECRET) {
    return c.text('forbidden', 403);
  }
  const update = await c.req.json<Update>();
  const origin = new URL(c.req.url).origin;

  try {
    if (update.message?.text && update.message.chat.type === 'private' && update.message.from) {
      await onMessage(c, origin, update.message.chat.id, update.message.from.id, update.message.text);
    } else if (update.callback_query) {
      await onButton(c, update.callback_query);
    }
  } catch (error) {
    // Always answer 200, otherwise Telegram keeps re-sending the same update.
    console.error('bot update failed', error);
  }
  return c.json({ ok: true });
});

async function onMessage(c: Context<AppEnv>, origin: string, chatId: number, userId: number, text: string) {
  const env = c.env;
  const [command, payload] = text.trim().split(/\s+/, 2);
  const isAdmin = isAdminId(env, userId);

  if (command === '/start' && payload?.startsWith('o_')) {
    // "Follow your order on Telegram" from the website: link the order to this chat.
    const token = payload.slice(2);
    const [order] = await c
      .get('db')
      .update(orders)
      .set({ telegramChatId: String(chatId) })
      .where(and(eq(orders.token, token), isNull(orders.telegramChatId)))
      .returning();
    if (order) {
      return sendMessage(env, chatId, `تم ربط طلبك #${order.id}. سنرسل لك هنا كل تحديث.\nالحالة الآن: ${STATUS_LABELS[order.status]}`, [
        [{ text: 'تفاصيل الطلب', web_app: { url: `${origin}/o/${order.token}` } }],
      ]);
    }
  }

  if (command === '/admin') {
    if (!isAdmin) return sendMessage(env, chatId, 'هذا الأمر لصاحب المتجر فقط.');
    const code = randomToken(24);
    await env.KV.put(`login:${code}`, String(userId), { expirationTtl: 600 });
    return sendMessage(env, chatId, 'رابط دخول لوحة التحكم من المتصفح. صالح لمدة 10 دقائق ولمرة واحدة:', [
      [{ text: 'فتح لوحة التحكم في المتصفح', url: `${origin}/admin/login#code=${code}` }],
    ]);
  }

  const { name } = await getSettings(c);
  if (isAdmin) {
    // Owners get "Dashboard" next to the message box; everyone else keeps the default "Shop" button.
    await botApi(env, 'setChatMenuButton', {
      chat_id: chatId,
      menu_button: { type: 'web_app', text: 'لوحة التحكم', web_app: { url: `${origin}/admin` } },
    });
    return sendMessage(env, chatId, `أهلاً بك في إدارة ${name}.\nستصلك الطلبات الجديدة هنا. للدخول من الكمبيوتر اكتب /admin`, [
      [{ text: 'لوحة التحكم', web_app: { url: `${origin}/admin` } }],
      [{ text: 'المتجر', web_app: { url: origin } }],
    ]);
  }
  return sendMessage(env, chatId, `أهلاً بك في ${name} 👋\nاضغط الزر لتتصفح المنتجات وتطلب.`, [
    [{ text: 'افتح المتجر', web_app: { url: origin } }],
  ]);
}

async function onButton(c: Context<AppEnv>, query: NonNullable<Update['callback_query']>) {
  const env = c.env;
  const [kind, id, status] = (query.data ?? '').split(':');
  if (kind !== 'st' || !isAdminId(env, query.from.id) || !ORDER_STATUSES.includes(status as OrderStatus)) {
    return botApi(env, 'answerCallbackQuery', { callback_query_id: query.id, text: 'غير مسموح' });
  }
  const order = await changeOrderStatus(c, Number(id), status as OrderStatus);
  await botApi(env, 'answerCallbackQuery', {
    callback_query_id: query.id,
    text: order ? `الطلب #${id}: ${STATUS_LABELS[order.status]}` : 'الطلب غير موجود',
  });
  if (order && query.message) {
    // Replace the confirm/cancel buttons with the new status so nobody presses them twice.
    await botApi(env, 'editMessageText', {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id,
      text: `${query.message.text ?? ''}\n\nالحالة: ${STATUS_LABELS[order.status]}`,
      reply_markup: {
        inline_keyboard: [[{ text: 'فتح الطلب', web_app: { url: `${new URL(c.req.url).origin}/admin/orders/${order.id}` } }]],
      },
    });
  }
}
