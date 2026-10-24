import { Link } from 'react-router';
import { useApp } from '../state';
import { ProductImage, QtyStepper } from '../components/ui';
import { BagIcon, ChevronIcon } from '../components/icons';
import { discountPercent, money } from '../lib/format';
import { haptic } from '../lib/telegram';
import type { Product } from '../types';

export function ProductCard({ product }: { product: Product }) {
  const { data, cart, setQty, addToCart } = useApp();
  const currency = data!.store.currency;
  const qty = cart[product.id] ?? 0;
  const off = discountPercent(product.price, product.oldPrice);

  return (
    <article className="card group flex h-full flex-col overflow-hidden transition hover:shadow-[0_8px_24px_-12px_rgb(0_0_0/0.18)]">
      <Link to={`/p/${product.id}`} className="relative block overflow-hidden">
        <ProductImage
          name={product.name}
          image={product.images[0]}
          className={`aspect-square w-full transition duration-300 group-hover:scale-[1.03] ${product.available ? '' : 'opacity-60 grayscale'}`}
        />
        {off > 0 && product.available && (
          <span className="absolute start-2.5 top-2.5 rounded-md bg-sale px-2 py-0.5 text-xs font-bold text-white">خصم {off}%</span>
        )}
        {!product.available && (
          <span className="absolute inset-x-0 bottom-0 bg-ink/75 py-1.5 text-center text-xs font-semibold text-white">نفدت الكمية</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <Link to={`/p/${product.id}`} className="line-clamp-2 min-h-[2.6em] text-[15px] font-medium leading-snug hover:text-brand">
          {product.name}
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className={`price text-[17px] ${off ? 'text-sale' : ''}`}>{money(product.price, currency)}</span>
          {off > 0 && <s className="price text-[13px] font-normal text-muted">{money(product.oldPrice!, currency)}</s>}
        </div>
        <div className="mt-auto pt-3">
          {!product.available ? (
            <button disabled className="h-10 w-full rounded-xl bg-ink/5 text-sm font-semibold text-muted">
              غير متوفر
            </button>
          ) : qty > 0 ? (
            <QtyStepper size="sm" full qty={qty} onChange={(n) => (haptic('tap'), setQty(product.id, n))} />
          ) : (
            <button
              onClick={() => {
                haptic('success');
                addToCart(product.id);
              }}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-brand text-sm font-semibold text-brand transition hover:bg-brand hover:text-on-brand"
            >
              <BagIcon width={18} height={18} /> إضافة للسلة
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/** A titled row of products: swipes sideways on phones, a grid on wide screens. */
export function ProductRail({ title, products, moreLink }: { title: string; products: Product[]; moreLink?: string }) {
  if (products.length === 0) return null;
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-end justify-between px-4">
        <h2 className="text-xl font-bold md:text-2xl">{title}</h2>
        {moreLink && (
          <Link to={moreLink} className="flex items-center gap-0.5 text-sm font-semibold text-brand">
            عرض الكل <ChevronIcon width={18} height={18} />
          </Link>
        )}
      </div>
      <ul className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:grid md:grid-cols-4 md:overflow-visible lg:grid-cols-5">
        {products.map((product) => (
          <li key={product.id} className="w-[44%] shrink-0 snap-start sm:w-[30%] md:w-auto">
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
