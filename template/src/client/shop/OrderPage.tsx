import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useApp } from '../state';
import { Notice, Spinner } from '../components/ui';
import { CheckIcon, TelegramIcon, WhatsAppIcon } from '../components/icons';
import { api } from '../lib/api';
import { dateTime, money, STATUS_LABELS, type OrderStatus } from '../lib/format';
import { inTelegram, openTelegramLink } from '../lib/telegram';
import type { Order, OrderItem } from '../types';

type PublicOrder = Omit<Order, 'receiptKey' | 'telegramChatId'> & { followsOnTelegram: boolean };

const STEPS: OrderStatus[] = ['new', 'confirmed', 'shipping', 'delivered'];

export function OrderPage() {
  const { token } = useParams();
  const [search] = useSearchParams();
  const { data } = useApp();
  const [result, setResult] = useState<{ order: PublicOrder; items: OrderItem[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ order: PublicOrder; items: OrderItem[] }>(`/orders/${token}`).then(setResult, (e) => setError(e.message));
  }, [token]);

  if (error) return <main className="mx-auto max-w-md px-4 py-16"><Notice tone="error">{error}</Notice></main>;
  if (!result) return <Spinner />;

  const { order, items } = result;
  const { currency, botUsername, whatsapp } = data!.store;
  const stepIndex = STEPS.indexOf(order.status);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      {search.get('new') && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-bean px-4 py-4 text-white">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/20">
            <CheckIcon />
          </span>
          <div>
            <p className="font-semibold">وصلنا طلبك</p>
            <p className="text-sm opacity-90">سنتواصل معك لتأكيده قريباً.</p>
          </div>
        </div>
      )}

      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          طلب <span className="price">#{order.id}</span>
        </h1>
        <span className="text-sm text-muted">{dateTime(order.createdAt)}</span>
      </div>

      {order.status === 'cancelled' ? (
        <div className="mt-5">
          <Notice tone="error">تم إلغاء هذا الطلب. للاستفسار تواصل مع المتجر.</Notice>
        </div>
      ) : (
        <ol className="mt-6 grid grid-cols-4 gap-1.5" aria-label="حالة الطلب">
          {STEPS.map((step, i) => (
            <li key={step} aria-current={i === stepIndex ? 'step' : undefined}>
              <span className={`block h-1.5 rounded-full ${i <= stepIndex ? 'bg-brand' : 'bg-ink/10'}`} />
              <span className={`mt-2 block text-xs sm:text-sm ${i === stepIndex ? 'font-semibold text-ink' : 'text-muted'}`}>{STATUS_LABELS[step]}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {botUsername && !order.followsOnTelegram && !inTelegram && (
          <button
            onClick={() => openTelegramLink(`https://t.me/${botUsername}?start=o_${order.token}`)}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#229ED9] px-5 font-semibold text-white"
          >
            <TelegramIcon /> تابع طلبك على تيليجرام
          </button>
        )}
        {order.followsOnTelegram && <p className="text-center text-sm text-muted">سيصلك كل تحديث لهذا الطلب على تيليجرام.</p>}
        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp.replace(/^\+/, '')}?text=${encodeURIComponent(`استفسار عن الطلب #${order.id}`)}`}
            target="_blank"
            rel="noopener"
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-card px-5 font-semibold ring-1 ring-line"
          >
            <WhatsAppIcon className="text-[#1FA855]" /> تواصل مع المتجر
          </a>
        )}
      </div>

      <section className="mt-6 card p-4">
        <h2 className="font-semibold">المنتجات</h2>
        <ul className="mt-3 space-y-1.5 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span className="text-muted">
                {item.name} × {item.qty}
              </span>
              <span className="price shrink-0">{money(item.price * item.qty, currency)}</span>
            </li>
          ))}
          <li className="flex justify-between gap-3">
            <span className="text-muted">التوصيل</span>
            <span className="price">{order.deliveryFee ? money(order.deliveryFee, currency) : 'مجاني'}</span>
          </li>
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
          <span className="font-semibold">الإجمالي</span>
          <span className="price text-xl font-bold">{money(order.total, currency)}</span>
        </div>
      </section>

      <section className="mt-4 space-y-1 rounded-3xl bg-card p-4 text-sm leading-relaxed ring-1 ring-line/70">
        <h2 className="mb-2 text-base font-semibold">التوصيل إلى</h2>
        <p>{order.name}</p>
        <p dir="ltr" className="text-end">{order.phone}</p>
        <p className="text-muted">{order.address}</p>
        <p className="pt-1 text-muted">الدفع: {order.payment === 'cod' ? 'عند الاستلام' : 'تحويل'}</p>
      </section>

      <Link to="/" className="mt-6 block text-center font-semibold text-brand">
        متابعة التسوق
      </Link>
    </main>
  );
}
