import { Link, useNavigate } from 'react-router';
import { useApp } from '../state';
import { Button, ProductImage, QtyStepper } from '../components/ui';
import { BagIcon, TrashIcon, TruckIcon } from '../components/icons';
import { deliveryFor, money } from '../lib/format';
import { haptic } from '../lib/telegram';

export function CartPage() {
  const { data, cartLines, subtotal, setQty } = useApp();
  const navigate = useNavigate();
  const { store } = data!;
  const unavailable = cartLines.filter((line) => !line.product.available);
  const delivery = deliveryFor(subtotal, store);

  if (cartLines.length === 0) {
    return (
      <main className="mx-auto max-w-md px-6 py-20 text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-brand/10 text-brand">
          <BagIcon width={36} height={36} />
        </span>
        <h1 className="mt-5 text-xl font-bold">سلتك فارغة</h1>
        <p className="mt-2 text-muted">أضف المنتجات التي تعجبك وأكمل طلبك من هنا.</p>
        <Link to="/" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-brand px-6 font-semibold text-on-brand">
          تصفح المنتجات
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-bold">سلة المشتريات</h1>
      <div className="mt-5 gap-6 lg:grid lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {store.freeShippingOver > 0 && <FreeShippingBar subtotal={subtotal} />}
          <ul className="card divide-y divide-line">
            {cartLines.map(({ product, qty }) => (
              <li key={product.id} className="flex gap-3 p-3 sm:p-4">
                <Link to={`/p/${product.id}`} className="shrink-0 overflow-hidden rounded-xl border border-line">
                  <ProductImage name={product.name} image={product.images[0]} className="size-20 sm:size-24" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/p/${product.id}`} className="line-clamp-2 font-medium leading-snug hover:text-brand">
                      {product.name}
                    </Link>
                    <button
                      onClick={() => setQty(product.id, 0)}
                      className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-sale/10 hover:text-sale"
                      aria-label={`احذف ${product.name}`}
                    >
                      <TrashIcon width={18} height={18} />
                    </button>
                  </div>
                  <p className="price mt-0.5 text-sm text-muted">{money(product.price, store.currency)}</p>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    {product.available ? (
                      <QtyStepper size="sm" qty={qty} onChange={(n) => (haptic('tap'), setQty(product.id, n))} />
                    ) : (
                      <span className="text-sm font-semibold text-sale">لم يعد متوفراً</span>
                    )}
                    <span className="price">{money(product.price * qty, store.currency)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <aside className="card mt-5 h-fit p-5 lg:sticky lg:top-28 lg:mt-0">
          <h2 className="text-lg font-bold">ملخص الطلب</h2>
          <dl className="mt-4 space-y-3 text-[15px]">
            <Row label="مجموع المنتجات" value={money(subtotal, store.currency)} />
            <Row label="الشحن" value={delivery ? money(delivery, store.currency) : 'مجاني'} highlight={!delivery} />
            <div className="flex items-center justify-between border-t border-line pt-3">
              <dt className="font-bold">الإجمالي</dt>
              <dd className="price text-2xl">{money(subtotal + delivery, store.currency)}</dd>
            </div>
          </dl>
          <Button className="mt-5 w-full" disabled={!store.isOpen || unavailable.length > 0} onClick={() => navigate('/checkout')}>
            إتمام الطلب
          </Button>
          {!store.isOpen && <p className="mt-3 text-center text-sm text-muted">المتجر لا يستقبل طلبات الآن.</p>}
          {unavailable.length > 0 && <p className="mt-3 text-center text-sm text-sale">احذف المنتجات غير المتوفرة لإكمال الطلب.</p>}
          <Link to="/" className="mt-3 block text-center text-sm font-semibold text-brand">
            متابعة التسوق
          </Link>
        </aside>
      </div>
    </main>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className={`price ${highlight ? 'text-bean' : ''}`}>{value}</dd>
    </div>
  );
}

export function FreeShippingBar({ subtotal }: { subtotal: number }) {
  const { data } = useApp();
  const { freeShippingOver, currency } = data!.store;
  const left = freeShippingOver - subtotal;
  const progress = Math.min(100, (subtotal / freeShippingOver) * 100);
  return (
    <div className="card p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <TruckIcon width={20} height={20} className={left > 0 ? 'text-brand' : 'text-bean'} />
        {left > 0 ? (
          <span>
            أضف منتجات بقيمة <span className="price">{money(left, currency)}</span> واحصل على شحن مجاني
          </span>
        ) : (
          <span className="text-bean">طلبك مؤهل للشحن المجاني</span>
        )}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/8">
        <div className={`h-full rounded-full transition-all ${left > 0 ? 'bg-brand' : 'bg-bean'}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
