import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { useApp } from '../state';
import { Button, Notice, Spinner } from '../components/ui';
import { TelegramIcon, WhatsAppIcon } from '../components/icons';
import { api, authedImageUrl } from '../lib/api';
import { dateTime, money, type OrderStatus } from '../lib/format';
import { confirmAction, haptic } from '../lib/telegram';
import { StatusBadge } from './StatusBadge';
import { useStats } from './stats';
import type { Order, OrderItem } from '../types';

/** The buttons offered for each status: the usual next step first. */
const NEXT: Record<OrderStatus, { status: OrderStatus; label: string }[]> = {
  new: [
    { status: 'confirmed', label: 'تأكيد الطلب' },
    { status: 'cancelled', label: 'إلغاء الطلب' },
  ],
  confirmed: [
    { status: 'shipping', label: 'خرج للتوصيل' },
    { status: 'cancelled', label: 'إلغاء الطلب' },
  ],
  shipping: [{ status: 'delivered', label: 'تم التسليم' }],
  delivered: [],
  cancelled: [{ status: 'new', label: 'إعادة فتح الطلب' }],
};

export function OrderDetail() {
  const { id } = useParams();
  const { data } = useApp();
  const { refreshStats } = useStats();
  const currency = data!.store.currency;
  const [result, setResult] = useState<{ order: Order; items: OrderItem[] } | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<OrderStatus | null>(null);

  useEffect(() => {
    api<{ order: Order; items: OrderItem[] }>(`/admin/orders/${id}`).then(setResult, (e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    const key = result?.order.receiptKey;
    if (!key) return;
    let url: string | null = null;
    authedImageUrl(`/admin/receipts/${key}`).then((u) => setReceipt((url = u)), () => {});
    return () => void (url && URL.revokeObjectURL(url));
  }, [result?.order.receiptKey]);

  if (error && !result) return <Notice tone="error">{error}</Notice>;
  if (!result) return <Spinner />;
  const { order, items } = result;

  async function setStatus(status: OrderStatus) {
    if (status === 'cancelled' && !(await confirmAction('إلغاء هذا الطلب؟'))) return;
    setBusy(status);
    try {
      const { order: updated } = await api<{ order: Order }>(`/admin/orders/${order.id}`, { method: 'PATCH', json: { status } });
      haptic('success');
      setResult({ order: updated, items });
      refreshStats();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const phoneDigits = order.phone.replace(/^\+/, '');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">
          طلب <span className="price">#{order.id}</span>
        </h1>
        <StatusBadge status={order.status} />
        <span className="ms-auto text-sm text-muted">{dateTime(order.createdAt)}</span>
      </div>

      {NEXT[order.status].length > 0 && (
        <div className="flex flex-wrap gap-2">
          {NEXT[order.status].map((action, i) => (
            <Button
              key={action.status}
              variant={action.status === 'cancelled' ? 'danger' : i === 0 ? 'brand' : 'plain'}
              busy={busy === action.status}
              disabled={busy !== null}
              onClick={() => setStatus(action.status)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
      {order.telegramChatId ? (
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <TelegramIcon width={16} height={16} className="text-[#229ED9]" /> العميل يتابع الطلب على تيليجرام وسيصله كل تغيير تلقائياً.
        </p>
      ) : (
        <p className="text-sm text-muted">العميل طلب من الموقع ولا يتابع على تيليجرام. تواصل معه بالهاتف أو واتساب.</p>
      )}
      {error && <Notice tone="error">{error}</Notice>}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-4">
          <h2 className="font-semibold">العميل</h2>
          <p className="mt-3 text-lg">{order.name}</p>
          <p className="price mt-1" dir="ltr">
            {order.phone}
          </p>
          <div className="mt-3 flex gap-2">
            <a href={`tel:${order.phone}`} className="rounded-xl bg-ink/5 px-3 py-2 text-sm font-semibold hover:bg-ink/10">
              اتصال
            </a>
            <a
              href={`https://wa.me/${phoneDigits}`}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-1.5 rounded-xl bg-ink/5 px-3 py-2 text-sm font-semibold hover:bg-ink/10"
            >
              <WhatsAppIcon width={16} height={16} className="text-[#1FA855]" /> واتساب
            </a>
          </div>
          <h3 className="mt-4 text-sm font-semibold text-muted">العنوان</h3>
          <p className="mt-1 whitespace-pre-line leading-relaxed">{order.address}</p>
          {order.notes && (
            <>
              <h3 className="mt-3 text-sm font-semibold text-muted">ملاحظات</h3>
              <p className="mt-1 leading-relaxed">{order.notes}</p>
            </>
          )}
        </section>

        <section className="card p-4">
          <h2 className="font-semibold">المنتجات</h2>
          <ul className="mt-3 space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span>
                  {item.name} <span className="price text-muted">× {item.qty}</span>
                </span>
                <span className="price shrink-0">{money(item.price * item.qty, currency)}</span>
              </li>
            ))}
            <li className="flex justify-between gap-3 text-muted">
              <span>التوصيل</span>
              <span className="price">{money(order.deliveryFee, currency)}</span>
            </li>
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <span className="font-semibold">الإجمالي</span>
            <span className="price text-2xl font-bold">{money(order.total, currency)}</span>
          </div>
          <p className="mt-3 text-sm text-muted">الدفع: {order.payment === 'cod' ? 'عند الاستلام' : 'تحويل'}</p>
          {order.payment === 'transfer' && (
            <div className="mt-3">
              {receipt ? (
                <a href={receipt} target="_blank" rel="noopener">
                  <img src={receipt} alt="صورة التحويل" className="max-h-80 rounded-2xl ring-1 ring-line" />
                </a>
              ) : (
                <p className="text-sm text-muted">جارٍ تحميل صورة التحويل…</p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
