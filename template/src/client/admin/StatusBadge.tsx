import { STATUS_LABELS, type OrderStatus } from '../lib/format';

const TONES: Record<OrderStatus, string> = {
  new: 'bg-brand text-on-brand',
  confirmed: 'bg-ink/10 text-ink',
  shipping: 'bg-[#e8eefc] text-[#2847a3]',
  delivered: 'bg-bean/15 text-bean',
  cancelled: 'bg-ink/5 text-muted line-through',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[status]}`}>{STATUS_LABELS[status]}</span>;
}
