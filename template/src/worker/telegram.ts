import type { Env } from './env';
import type { OrderStatus } from './db/schema';

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'جديد',
  confirmed: 'تم التأكيد',
  shipping: 'في الطريق',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
};

type Button =
  | { text: string; web_app: { url: string } }
  | { text: string; url: string }
  | { text: string; callback_data: string };

/** Calls the Bot API. Without BOT_TOKEN (local dev) it only logs, so the store works before the bot exists. */
export async function botApi(env: Env, method: string, body: Record<string, unknown>) {
  if (!env.BOT_TOKEN) {
    console.log(`[bot disabled] ${method}`, JSON.stringify(body).slice(0, 300));
    return null;
  }
  const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as { ok: boolean; description?: string; result?: unknown };
  if (!result.ok) console.warn(`Bot API ${method} failed:`, result.description);
  return result;
}

export function sendMessage(env: Env, chatId: string | number, text: string, buttons: Button[][] = []) {
  return botApi(env, 'sendMessage', {
    chat_id: chatId,
    text,
    link_preview_options: { is_disabled: true },
    ...(buttons.length ? { reply_markup: { inline_keyboard: buttons } } : {}),
  });
}

export function adminIds(env: Env): string[] {
  return (env.ADMIN_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean);
}

export interface OrderSummary {
  id: number;
  token: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  payment: 'cod' | 'transfer';
  total: number;
  source: 'web' | 'telegram';
  items: { name: string; qty: number; price: number }[];
}

export function orderText(order: OrderSummary, currency: string) {
  const lines = order.items.map((item) => `• ${item.name} × ${item.qty} = ${item.price * item.qty} ${currency}`);
  return [
    `🛍️ طلب جديد #${order.id} (${order.source === 'telegram' ? 'من تليجرام' : 'من الموقع'})`,
    '',
    ...lines,
    '',
    `الإجمالي: ${order.total} ${currency}`,
    `الدفع: ${order.payment === 'cod' ? 'عند الاستلام' : 'تحويل'}`,
    '',
    `👤 ${order.name}`,
    `📞 ${order.phone}`,
    `📍 ${order.address}`,
    ...(order.notes ? [`📝 ${order.notes}`] : []),
  ].join('\n');
}

export function adminOrderButtons(origin: string, orderId: number): Button[][] {
  return [
    [
      { text: '✅ تأكيد', callback_data: `st:${orderId}:confirmed` },
      { text: '❌ إلغاء', callback_data: `st:${orderId}:cancelled` },
    ],
    [{ text: 'فتح الطلب', web_app: { url: `${origin}/admin/orders/${orderId}` } }],
  ];
}

export async function notifyAdminsOfOrder(env: Env, origin: string, order: OrderSummary, currency: string) {
  const text = orderText(order, currency);
  await Promise.all(adminIds(env).map((id) => sendMessage(env, id, text, adminOrderButtons(origin, order.id))));
}

export function notifyCustomerOfStatus(
  env: Env,
  origin: string,
  chatId: string,
  order: { id: number; token: string; status: OrderStatus },
) {
  const icons: Record<OrderStatus, string> = { new: '🕒', confirmed: '✅', shipping: '🚚', delivered: '🎉', cancelled: '❌' };
  return sendMessage(env, chatId, `${icons[order.status]} طلبك #${order.id}: ${STATUS_LABELS[order.status]}`, [
    [{ text: 'تفاصيل الطلب', web_app: { url: `${origin}/o/${order.token}` } }],
  ]);
}
