import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useApp } from '../state';
import { Spinner } from '../components/ui';
import { api } from '../lib/api';
import { money, STATUS_LABELS, timeAgo, type OrderStatus } from '../lib/format';
import { savedOrders } from '../lib/myOrders';

interface Row {
  id: number;
  token: string;
  total: number;
  createdAt: number;
  status?: OrderStatus;
}

/** Inside Telegram: orders from the server. On the website: the orders placed from this browser. */
export function MyOrders() {
  const { data, session } = useApp();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (session.user) api<{ orders: Row[] }>('/my/orders').then((r) => setRows(r.orders), () => setRows([]));
    else setRows(savedOrders());
  }, [session.user]);

  if (!rows) return <Spinner />;
  return (
    <main className="mx-auto max-w-2xl px-4 py-5">
      <h1 className="text-2xl font-semibold">طلباتي</h1>
      {rows.length === 0 ? (
        <p className="py-16 text-center text-muted">لم تطلب شيئاً بعد.</p>
      ) : (
        <ul className="mt-4 card divide-y divide-line px-4">
          {rows.map((row) => (
            <li key={row.token}>
              <Link to={`/o/${row.token}`} className="flex items-center justify-between gap-3 py-4">
                <span>
                  <span className="price block font-semibold">طلب #{row.id}</span>
                  <span className="text-sm text-muted">
                    {row.status ? `${STATUS_LABELS[row.status]}، ` : ''}
                    {timeAgo(row.createdAt)}
                  </span>
                </span>
                <span className="price">{money(row.total, data!.store.currency)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!session.user && rows.length > 0 && (
        <p className="mt-4 text-center text-xs text-muted">هذه الطلبات محفوظة في هذا المتصفح فقط.</p>
      )}
    </main>
  );
}
