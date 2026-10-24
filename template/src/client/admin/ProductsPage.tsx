import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useApp } from '../state';
import { Notice, ProductImage, Spinner } from '../components/ui';
import { PlusIcon } from '../components/icons';
import { api } from '../lib/api';
import { money } from '../lib/format';
import { Toggle } from './Toggle';
import type { Product } from '../types';

export function ProductsPage() {
  const { data, reload } = useApp();
  const [list, setList] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ products: Product[] }>('/admin/products').then((r) => setList(r.products), (e) => setError(e.message));
  }, []);

  async function setAvailable(product: Product, available: boolean) {
    setList((current) => current!.map((p) => (p.id === product.id ? { ...p, available } : p)));
    try {
      await api(`/admin/products/${product.id}`, { method: 'PUT', json: { ...product, available } });
      reload();
    } catch (e) {
      setError((e as Error).message);
      setList((current) => current!.map((p) => (p.id === product.id ? { ...p, available: !available } : p)));
    }
  }

  const categoryName = (id: number | null) => data!.categories.find((c) => c.id === id)?.name ?? 'بدون قسم';

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">المنتجات</h1>
        <Link to="/admin/products/new" className="flex min-h-11 items-center gap-1.5 rounded-2xl bg-brand px-4 font-semibold text-on-brand">
          <PlusIcon width={18} height={18} /> منتج جديد
        </Link>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {!list ? (
        <Spinner />
      ) : list.length === 0 ? (
        <p className="py-16 text-center text-muted">لا توجد منتجات. أضف أول منتج من الزر بالأعلى.</p>
      ) : (
        <ul className="divide-y divide-line card">
          {list.map((product) => (
            <li key={product.id} className="flex items-center gap-3 px-3 py-3">
              <Link to={`/admin/products/${product.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <ProductImage name={product.name} image={product.images[0]} className="size-14 shrink-0 rounded-xl" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{product.name}</span>
                  <span className="text-sm text-muted">
                    <span className="price text-ink">{money(product.price, data!.store.currency)}</span>، {categoryName(product.categoryId)}
                  </span>
                </span>
              </Link>
              <Toggle checked={product.available} onChange={(v) => setAvailable(product, v)} label={product.available ? 'متاح' : 'نفد'} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
