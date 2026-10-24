import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useApp } from '../state';
import { count } from '../lib/format';
import { ProductGrid } from './ProductCard';
import { SearchBox } from './ShopLayout';
import { NotFound } from './NotFound';
import type { Product } from '../types';

type Sort = 'default' | 'newest' | 'cheap' | 'expensive';

const SORTS: Record<Sort, { label: string; fn?: (a: Product, b: Product) => number }> = {
  default: { label: 'المقترح' },
  newest: { label: 'الأحدث', fn: (a, b) => b.createdAt - a.createdAt || b.id - a.id },
  cheap: { label: 'السعر: من الأقل', fn: (a, b) => a.price - b.price },
  expensive: { label: 'السعر: من الأعلى', fn: (a, b) => b.price - a.price },
};

const PRODUCTS_WORDS: [string, string, string, string] = ['منتج واحد', 'منتجان', 'منتجات', 'منتجاً'];

/** One category's products (/c/:id) or search results (/search?q=). */
export function CategoryPage({ search }: { search?: boolean }) {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { data } = useApp();
  const [sort, setSort] = useState<Sort>('default');
  const { categories, products } = data!;
  const category = categories.find((c) => c.id === Number(id));
  const q = (params.get('q') ?? '').trim();

  const list = useMemo(() => {
    let items = search
      ? q
        ? products.filter((p) => `${p.name} ${p.description}`.toLowerCase().includes(q.toLowerCase()))
        : []
      : products.filter((p) => p.categoryId === category?.id);
    // Available products first, then the chosen order.
    const fn = SORTS[sort].fn;
    items = [...items].sort((a, b) => Number(b.available) - Number(a.available) || (fn ? fn(a, b) : 0));
    return items;
  }, [products, category, search, q, sort]);

  if (!search && !category) return <NotFound />;

  return (
    <main className="mx-auto max-w-6xl px-4 py-5">
      <nav className="mb-3 text-sm text-muted" aria-label="مسار التصفح">
        <Link to="/" className="hover:text-ink">
          الرئيسية
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{search ? 'البحث' : category!.name}</span>
      </nav>

      {search ? (
        <>
          <SearchBox className="flex" autoFocus={!q} />
          {q && <h1 className="mt-5 text-xl font-bold">نتائج البحث عن «{q}»</h1>}
        </>
      ) : (
        <h1 className="text-2xl font-bold md:text-3xl">{category!.name}</h1>
      )}

      {!search && categories.length > 1 && (
        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/c/${c.id}`}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium ${c.id === category!.id ? 'border-brand bg-brand text-on-brand' : 'border-line bg-card hover:border-ink/30'}`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {(list.length > 0 || !search) && (
        <div className="my-5 flex items-center justify-between gap-3">
          <p className="text-sm text-muted">{list.length ? count(list.length, PRODUCTS_WORDS) : ''}</p>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">ترتيب حسب</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="field w-auto py-2">
              {Object.entries(SORTS).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {list.length > 0 ? (
        <ProductGrid products={list} />
      ) : (
        (q || !search) && (
          <div className="py-16 text-center">
            <p className="font-semibold">{search ? 'لا توجد منتجات تطابق بحثك' : 'لا توجد منتجات في هذا القسم بعد'}</p>
            <Link to="/" className="mt-3 inline-block font-semibold text-brand">
              تصفح كل المنتجات
            </Link>
          </div>
        )
      )}
    </main>
  );
}
