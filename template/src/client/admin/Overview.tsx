import { useEffect, useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { Link } from 'react-router';
import { useApp } from '../state';
import { BoxIcon, ChevronIcon, GearIcon, ImageIcon, ReceiptIcon, TelegramIcon } from '../components/icons';
import { api } from '../lib/api';
import { count, ITEMS_WORDS, money, ORDERS_WORDS, timeAgo, type OrderStatus } from '../lib/format';
import { StatusBadge } from './StatusBadge';
import { useStats } from './stats';

interface Row {
  id: number;
  status: OrderStatus;
  source: 'web' | 'telegram';
  name: string;
  total: number;
  createdAt: number;
  itemCount: number;
}

/** The dashboard's first screen: what needs attention now, how sales are going, and the latest orders. */
export function Overview() {
  const { data } = useApp();
  const { stats } = useStats();
  const { store } = data!;
  const [latest, setLatest] = useState<Row[] | null>(null);

  useEffect(() => {
    api<{ orders: Row[] }>('/admin/orders').then((r) => setLatest(r.orders.slice(0, 6)), () => setLatest([]));
  }, []);

  const waiting = stats?.byStatus.new ?? 0;

  return (
    <div className="space-y-6">
      {!store.isOpen && (
        <Link to="/admin/settings" className="flex items-center justify-between gap-3 rounded-2xl bg-sale/10 px-4 py-3 text-sm font-medium text-sale">
          المتجر مغلق حالياً ولا يستقبل طلبات.
          <span className="shrink-0 font-semibold underline underline-offset-4">فتح المتجر</span>
        </Link>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          to="/admin/orders?status=new"
          label="طلبات تنتظر التأكيد"
          value={stats ? String(waiting) : '…'}
          note={waiting ? 'اضغط لمراجعتها' : 'لا شيء ينتظرك'}
          accent={waiting > 0}
        />
        <StatCard
          label="مبيعات اليوم"
          value={stats ? money(stats.today.revenue, store.currency) : '…'}
          note={stats ? (stats.today.orders ? count(stats.today.orders, ORDERS_WORDS) : 'لا طلبات بعد') : ''}
        />
        <StatCard
          label="آخر 7 أيام"
          value={stats ? money(stats.week.revenue, store.currency) : '…'}
          note={stats ? (stats.week.orders ? count(stats.week.orders, ORDERS_WORDS) : 'لا طلبات بعد') : ''}
        />
        <StatCard
          to="/admin/products"
          label="المنتجات"
          value={stats ? String(stats.products.total) : '…'}
          note={stats ? (stats.products.soldOut ? `نفد منها ${stats.products.soldOut}` : 'كلها متاحة') : ''}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <QuickAction to="/admin/products/new" icon={BoxIcon} label="إضافة منتج" />
        <QuickAction to="/admin/banners" icon={ImageIcon} label="إدارة البنرات" />
        <QuickAction to="/admin/settings" icon={GearIcon} label="إعدادات المتجر" />
      </section>

      <section className="card">
        <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
          <h2 className="font-bold">آخر الطلبات</h2>
          <Link to="/admin/orders" className="flex items-center gap-0.5 text-sm font-semibold text-brand">
            كل الطلبات <ChevronIcon width={18} height={18} />
          </Link>
        </div>
        {latest === null ? (
          <p className="p-6 text-center text-sm text-muted">جارٍ التحميل…</p>
        ) : latest.length === 0 ? (
          <Empty>
            لا توجد طلبات بعد. شارك رابط المتجر أو البوت مع عملائك، وستظهر الطلبات هنا فور وصولها.
          </Empty>
        ) : (
          <ul className="divide-y divide-line">
            {latest.map((row) => (
              <li key={row.id}>
                <Link to={`/admin/orders/${row.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-ink/[0.02]">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-paper text-muted">
                    {row.source === 'telegram' ? <TelegramIcon width={18} height={18} className="text-[#229ED9]" /> : <ReceiptIcon width={18} height={18} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      <span className="price">#{row.id}</span> {row.name}
                    </span>
                    <span className="text-sm text-muted">
                      {count(row.itemCount, ITEMS_WORDS)}، {timeAgo(row.createdAt)}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <span className="price">{money(row.total, store.currency)}</span>
                    <StatusBadge status={row.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, note, to, accent }: { label: string; value: string; note: string; to?: string; accent?: boolean }) {
  const body = (
    <>
      <span className={`block text-sm ${accent ? 'text-on-brand/80' : 'text-muted'}`}>{label}</span>
      <span className="price mt-2 block text-2xl lg:text-[28px]">{value}</span>
      <span className={`mt-1 block text-xs ${accent ? 'text-on-brand/80' : 'text-muted'}`}>{note}</span>
    </>
  );
  const style = `block rounded-2xl p-4 ${accent ? 'bg-brand text-on-brand' : 'card'}`;
  return to ? (
    <Link to={to} className={`${style} transition hover:brightness-[1.03]`}>
      {body}
    </Link>
  ) : (
    <div className={style}>{body}</div>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: ComponentType<SVGProps<SVGSVGElement>>; label: string }) {
  return (
    <Link to={to} className="card flex items-center gap-3 p-3.5 font-medium transition hover:border-brand">
      <span className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand">
        <Icon width={20} height={20} />
      </span>
      {label}
      <ChevronIcon width={18} height={18} className="ms-auto text-muted" />
    </Link>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="px-6 py-10 text-center text-sm leading-relaxed text-muted">{children}</p>;
}
