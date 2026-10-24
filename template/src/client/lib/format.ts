export const money = (amount: number, currency: string) => `${amount.toLocaleString('en-US')} ${currency}`;

const relative = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' });

/** "منذ 5 دقائق" style time for unix seconds. */
export function timeAgo(unixSeconds: number) {
  const diff = unixSeconds - Date.now() / 1000;
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 30],
    ['month', 12],
  ];
  let value = diff;
  for (const [unit, size] of steps) {
    if (Math.abs(value) < size) return relative.format(Math.round(value), unit);
    value /= size;
  }
  return relative.format(Math.round(value), 'year');
}

export const dateTime = (unixSeconds: number) =>
  new Date(unixSeconds * 1000).toLocaleString('ar-EG-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' });

/** Uploaded photos live under /img/; demo pictures are plain files under /demo/. */
export const imageUrl = (key: string) => (key.startsWith('/') ? key : `/img/${key}`);

/** Same rule as the server: free above the threshold, otherwise the flat fee. */
export const deliveryFor = (subtotal: number, store: { deliveryFee: number; freeShippingOver: number }) =>
  store.freeShippingOver > 0 && subtotal >= store.freeShippingOver ? 0 : store.deliveryFee;

export const discountPercent = (price: number, oldPrice: number | null) =>
  oldPrice && oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;

/** Arabic counting: 1 طلب، 2 طلبان، 3–10 طلبات، 11+ طلباً. */
export function count(n: number, [one, two, few, many]: [string, string, string, string]) {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}

export const ORDERS_WORDS: [string, string, string, string] = ['طلب واحد', 'طلبان', 'طلبات', 'طلباً'];
export const ITEMS_WORDS: [string, string, string, string] = ['منتج واحد', 'منتجان', 'منتجات', 'منتجاً'];

export const STATUS_LABELS = {
  new: 'جديد',
  confirmed: 'تم التأكيد',
  shipping: 'في الطريق',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
} as const;

export type OrderStatus = keyof typeof STATUS_LABELS;
