import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useApp } from '../state';
import { Button, ProductImage, QtyStepper } from '../components/ui';
import { BagIcon, CashIcon, CheckIcon, TruckIcon } from '../components/icons';
import { discountPercent, money } from '../lib/format';
import { haptic } from '../lib/telegram';
import { ProductRail } from './ProductCard';
import { NotFound } from './NotFound';

export function ProductPage() {
  const { id } = useParams();
  const { data, cart, setQty, addToCart } = useApp();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState(0);
  const [qty, setLocalQty] = useState(1);
  const product = data!.products.find((p) => p.id === Number(id));
  if (!product) return <NotFound />;

  const { store, categories, products } = data!;
  const inCart = cart[product.id] ?? 0;
  const category = categories.find((c) => c.id === product.categoryId);
  const off = discountPercent(product.price, product.oldPrice);
  const related = products.filter((p) => p.id !== product.id && p.categoryId === product.categoryId && p.available).slice(0, 10);
  const images = product.images.length ? product.images : [undefined];

  const add = () => {
    haptic('success');
    addToCart(product.id, qty);
    setLocalQty(1);
  };
  const buyNow = () => {
    if (!inCart) setQty(product.id, qty);
    navigate('/checkout');
  };

  return (
    <main className="mx-auto max-w-6xl pb-28 md:pb-6">
      <nav className="px-4 pt-4 text-sm text-muted" aria-label="مسار التصفح">
        <Link to="/" className="hover:text-ink">
          الرئيسية
        </Link>
        {category && (
          <>
            <span className="mx-2">/</span>
            <Link to={`/c/${category.id}`} className="hover:text-ink">
              {category.name}
            </Link>
          </>
        )}
      </nav>

      <div className="mt-3 md:grid md:grid-cols-2 md:gap-10 md:px-4">
        <section aria-label="صور المنتج">
          <div className="relative md:overflow-hidden md:rounded-2xl md:border md:border-line">
            <div
              className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
              onScroll={(e) => setPhoto(Math.round(Math.abs(e.currentTarget.scrollLeft) / e.currentTarget.clientWidth))}
            >
              {images.map((key, i) => (
                <ProductImage key={key ?? i} name={product.name} image={key} className="aspect-square w-full shrink-0 snap-center" />
              ))}
            </div>
            {off > 0 && <span className="absolute start-3 top-3 rounded-md bg-sale px-2.5 py-1 text-sm font-bold text-white">خصم {off}%</span>}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2 px-4 md:px-0">
              {product.images.map((key, i) => (
                <span key={key} className={`size-16 overflow-hidden rounded-lg border-2 ${i === photo ? 'border-brand' : 'border-transparent'}`}>
                  <ProductImage name={product.name} image={key} className="size-full" />
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="px-4 pt-5 md:px-0 md:pt-0">
          <h1 className="text-2xl font-bold leading-snug md:text-3xl">{product.name}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={`price text-3xl ${off ? 'text-sale' : ''}`}>{money(product.price, store.currency)}</span>
            {off > 0 && (
              <>
                <s className="price text-lg font-normal text-muted">{money(product.oldPrice!, store.currency)}</s>
                <span className="rounded-md bg-sale/10 px-2 py-0.5 text-sm font-semibold text-sale">
                  وفّر {money(product.oldPrice! - product.price, store.currency)}
                </span>
              </>
            )}
          </div>

          <p className={`mt-4 flex items-center gap-1.5 text-sm font-semibold ${product.available ? 'text-bean' : 'text-sale'}`}>
            {product.available ? (
              <>
                <CheckIcon width={18} height={18} /> متوفر
              </>
            ) : (
              'نفدت الكمية'
            )}
          </p>

          {product.available && (
            <div className="mt-5 hidden items-center gap-3 md:flex">
              <QtyStepper qty={qty} onChange={(n) => setLocalQty(Math.max(1, n))} />
              <Button className="flex-1" onClick={add}>
                <BagIcon /> إضافة للسلة
              </Button>
              <Button variant="plain" onClick={buyNow}>
                اشترِ الآن
              </Button>
            </div>
          )}
          {inCart > 0 && (
            <p className="mt-3 text-sm text-muted">
              في سلتك {inCart} من هذا المنتج.{' '}
              <Link to="/cart" className="font-semibold text-brand">
                عرض السلة
              </Link>
            </p>
          )}

          <ul className="card mt-6 divide-y divide-line text-sm">
            <li className="flex items-center gap-3 p-3.5">
              <TruckIcon className="shrink-0 text-brand" width={20} height={20} />
              {store.freeShippingOver
                ? `شحن مجاني للطلبات فوق ${money(store.freeShippingOver, store.currency)}`
                : store.deliveryFee
                  ? `رسوم التوصيل ${money(store.deliveryFee, store.currency)}`
                  : 'توصيل مجاني'}
            </li>
            <li className="flex items-center gap-3 p-3.5">
              <CashIcon className="shrink-0 text-brand" width={20} height={20} />
              {store.transferInfo ? 'الدفع عند الاستلام أو تحويل بنكي' : 'الدفع عند الاستلام'}
            </li>
          </ul>

          {product.description && (
            <section className="mt-6">
              <h2 className="mb-2 text-lg font-bold">وصف المنتج</h2>
              <p className="max-w-[65ch] whitespace-pre-line leading-loose text-ink/85">{product.description}</p>
            </section>
          )}
        </section>
      </div>

      <ProductRail title="قد يعجبك أيضاً" products={related} />

      {/* Phones: the buy buttons stay reachable at the bottom while scrolling. */}
      {product.available && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card p-3 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden">
          <div className="flex items-center gap-2">
            <QtyStepper size="sm" qty={qty} onChange={(n) => setLocalQty(Math.max(1, n))} />
            <Button className="min-h-11 flex-1 px-3" onClick={add}>
              إضافة للسلة
            </Button>
            <Button variant="plain" className="min-h-11 px-3" onClick={buyNow}>
              اشترِ الآن
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
