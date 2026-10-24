import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useApp } from '../state';
import { Notice, Spinner } from '../components/ui';
import { TelegramIcon } from '../components/icons';
import { api } from '../lib/api';
import { count, ITEMS_WORDS, money, STATUS_LABELS, timeAgo, type OrderStatus } from '../lib/format';
import { StatusBadge } from './StatusBadge';
import { useStats } from './stats';

interface Row {
  id: number;
  status: OrderStatus;
  source: 'web' | 'telegram';
  name: string;
  total: number;
  payment: 'cod' | 'transfer';
  createdAt: number;
  itemCount: number;
}

const FILTERS: (OrderStatus | 'all')[] = ['all', 'new', 'confirmed', 'shipping', 'delivered', 'cancelled'];

export function OrdersPage() {
  const { data } = useApp();
  const { stats, refreshStats } = useStats();
  const currency = data!.store.currency;
  const [params, setParams] = useSearchParams();
  const requested = params.get('status') as OrderStatus | null;
  const filter: OrderStatus | 'all' = requested && requested in STATUS_LABELS ? requested : 'all';
  const setFilter = (f: OrderStatus | 'all') => setParams(f === 'all' ? {} : { status: f }, { replace: true });
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const query = filter === 'all' ? '' : `?status=${filter}`;
    api<{ orders: Row[] }>(`/admin/orders${query}`).then(
      (list) => {
        setRows(list.orders);
        setError(null);
      },
      (e) => setError(e.message),
    );
    refreshStats();
  }, [filter, refreshStats]);

  // New orders show up without a manual refresh while the dashboard is open.
  useEffect(() => {
    load();
    const timer = setInterval(load, 30_000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  return (
    <>
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((f) => {
          const n = f === 'all' ? null : stats?.byStatus[f] ?? 0;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${filter === f ? 'bg-ink text-white' : 'bg-card ring-1 ring-line'}`}
            >
              {f === 'all' ? 'الكل' : STATUS_LABELS[f]}
              {n ? <span className="price ms-1.5 opacity-60">{n}</span> : null}
            </button>
          );
        })}
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {!rows ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <p className="py-16 text-center text-muted">
          {filter === 'all' ? 'لا توجد طلبات بعد. شارك رابط المتجر أو البوت مع عملائك.' : 'لا توجد طلبات بهذه الحالة.'}
        </p>
      ) : (
        <ul className="divide-y divide-line card">
          {rows.map((row) => (
            <li key={row.id}>
              <Link to={`/admin/orders/${row.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-ink/[0.03]">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="price font-semibold">#{row.id}</span>
                    <span className="truncate">{row.name}</span>
                    {row.source === 'telegram' && <TelegramIcon width={16} height={16} className="shrink-0 text-[#229ED9]" aria-label="من تيليجرام" />}
                  </div>
                  <p className="mt-0.5 text-sm text-muted">
                    {count(row.itemCount, ITEMS_WORDS)}، {row.payment === 'cod' ? 'عند الاستلام' : 'تحويل'}، {timeAgo(row.createdAt)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="price font-semibold">{money(row.total, currency)}</span>
                  <StatusBadge status={row.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
