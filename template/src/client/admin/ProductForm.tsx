import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useApp } from '../state';
import { Button, Field, Notice, Spinner } from '../components/ui';
import { ImageIcon, TrashIcon } from '../components/icons';
import { api } from '../lib/api';
import { imageUrl } from '../lib/format';
import { shrinkImage } from '../lib/image';
import { confirmAction, haptic } from '../lib/telegram';
import { Toggle } from './Toggle';
import type { Product } from '../types';

const EMPTY = { name: '', price: '', oldPrice: '', description: '', categoryId: '', images: [] as string[], available: true };

export function ProductForm() {
  const { id } = useParams();
  const isNew = !id;
  const { data, reload } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    api<{ products: Product[] }>('/admin/products').then(({ products }) => {
      const p = products.find((x) => x.id === Number(id));
      if (!p) return setError('المنتج غير موجود');
      setForm({
        name: p.name,
        price: String(p.price),
        oldPrice: p.oldPrice ? String(p.oldPrice) : '',
        description: p.description,
        categoryId: p.categoryId ? String(p.categoryId) : '',
        images: p.images,
        available: p.available,
      });
      setLoading(false);
    });
  }, [id, isNew]);

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    for (const file of [...files].slice(0, 8 - form.images.length)) {
      setUploading((n) => n + 1);
      try {
        const body = new FormData();
        body.set('file', await shrinkImage(file));
        const { key } = await api<{ key: string }>('/admin/images', { form: body });
        setForm((f) => ({ ...f, images: [...f.images, key] }));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      price: Number(form.price),
      oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
      description: form.description,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      images: form.images,
      available: form.available,
    };
    try {
      await api(isNew ? '/admin/products' : `/admin/products/${id}`, { method: isNew ? 'POST' : 'PUT', json: payload });
      haptic('success');
      reload();
      navigate('/admin/products');
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  async function remove() {
    if (!(await confirmAction('حذف هذا المنتج نهائياً؟ الطلبات القديمة تبقى كما هي.'))) return;
    await api(`/admin/products/${id}`, { method: 'DELETE' });
    reload();
    navigate('/admin/products');
  }

  if (loading) return error ? <Notice tone="error">{error}</Notice> : <Spinner />;

  return (
    <form onSubmit={save} className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-xl font-semibold">{isNew ? 'منتج جديد' : 'تعديل المنتج'}</h1>

      <section>
        <span className="mb-1.5 block text-sm font-semibold">الصور</span>
        <div className="flex flex-wrap gap-2">
          {form.images.map((key, i) => (
            <div key={key} className="relative">
              <img src={imageUrl(key)} alt="" className="size-24 rounded-2xl object-cover ring-1 ring-line" />
              {i === 0 ? (
                <span className="absolute bottom-1 start-1 rounded-full bg-ink/80 px-2 text-[11px] text-white">الغلاف</span>
              ) : (
                <button
                  type="button"
                  onClick={() => set('images', [key, ...form.images.filter((k) => k !== key)])}
                  className="absolute bottom-1 start-1 rounded-full bg-white/90 px-2 text-[11px] font-semibold"
                >
                  اجعلها الغلاف
                </button>
              )}
              <button
                type="button"
                onClick={() => set('images', form.images.filter((k) => k !== key))}
                className="absolute -top-2 -end-2 grid size-7 place-items-center rounded-full bg-white text-danger shadow ring-1 ring-line"
                aria-label="حذف الصورة"
              >
                <TrashIcon width={14} height={14} />
              </button>
            </div>
          ))}
          {form.images.length < 8 && (
            <label className="grid size-24 cursor-pointer place-items-center rounded-2xl border-[1.5px] border-dashed border-line bg-card text-muted hover:border-brand hover:text-brand">
              {uploading ? (
                <span className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <span className="flex flex-col items-center gap-1 text-xs">
                  <ImageIcon /> أضف صوراً
                </span>
              )}
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addPhotos(e.target.files)} />
            </label>
          )}
        </div>
        <p className="mt-1.5 text-xs text-muted">تُصغَّر الصور تلقائياً قبل الرفع. الصورة الأولى هي الغلاف.</p>
      </section>

      <Field label="اسم المنتج">
        <input className="field" value={form.name} onChange={(e) => set('name', e.target.value)} required minLength={2} maxLength={120} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`السعر (${data!.store.currency})`}>
          <input className="field price" inputMode="numeric" value={form.price} onChange={(e) => set('price', e.target.value.replace(/\D/g, ''))} required />
        </Field>
        <Field label="السعر قبل الخصم" hint="اختياري، يظهر مشطوباً">
          <input className="field price" inputMode="numeric" value={form.oldPrice} onChange={(e) => set('oldPrice', e.target.value.replace(/\D/g, ''))} />
        </Field>
      </div>
      <Field label="القسم">
        <select className="field" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
          <option value="">بدون قسم</option>
          {data!.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="الوصف">
        <textarea className="field min-h-28" value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={2000} />
      </Field>
      <div className="flex items-center justify-between card px-4 py-3">
        <span className="font-semibold">متاح للطلب</span>
        <Toggle checked={form.available} onChange={(v) => set('available', v)} label={form.available ? 'متاح' : 'نفد'} />
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2">
        <Button type="submit" busy={saving} disabled={uploading > 0} className="flex-1">
          {isNew ? 'إضافة المنتج' : 'حفظ التعديلات'}
        </Button>
        {!isNew && (
          <Button type="button" variant="danger" onClick={remove}>
            حذف
          </Button>
        )}
      </div>
    </form>
  );
}
