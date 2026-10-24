import { useState, type FormEvent } from 'react';
import { useApp } from '../state';
import { Button, Field, Notice } from '../components/ui';
import { ImageIcon, PlusIcon, TrashIcon } from '../components/icons';
import { api } from '../lib/api';
import { imageUrl } from '../lib/format';
import { shrinkImage } from '../lib/image';
import { confirmAction, haptic } from '../lib/telegram';
import type { Banner } from '../types';

type Draft = Omit<Banner, 'id' | 'sort'> & { id?: number };
const EMPTY: Draft = { imageKey: '', title: '', subtitle: '', buttonText: '', link: '' };

export function BannersPage() {
  const { data, reload } = useApp();
  const banners = data!.banners;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const move = (index: number, by: -1 | 1) => {
    const ids = banners.map((b) => b.id);
    [ids[index], ids[index + by]] = [ids[index + by], ids[index]];
    run(() => api('/admin/banners/order', { json: { ids } }));
  };

  if (draft) return <BannerForm draft={draft} onDone={() => (setDraft(null), reload())} />;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">البنرات</h1>
          <p className="text-sm text-muted">الصور المتحركة أعلى الصفحة الرئيسية.</p>
        </div>
        <button onClick={() => setDraft(EMPTY)} className="flex min-h-11 items-center gap-1.5 rounded-xl bg-brand px-4 font-semibold text-on-brand">
          <PlusIcon width={18} height={18} /> بنر جديد
        </button>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {banners.length === 0 ? (
        <p className="py-16 text-center text-muted">لا توجد بنرات. أضف بنراً لعرض عروضك في أعلى المتجر.</p>
      ) : (
        <ul className="space-y-3">
          {banners.map((banner, i) => (
            <li key={banner.id} className="card flex items-center gap-3 p-2.5">
              <button onClick={() => setDraft(banner)} className="flex min-w-0 flex-1 items-center gap-3 text-start">
                <img src={imageUrl(banner.imageKey)} alt="" className="aspect-[3/1] w-36 shrink-0 rounded-lg object-cover object-left sm:w-48" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{banner.title || 'بدون عنوان'}</span>
                  <span className="block truncate text-sm text-muted">{banner.subtitle}</span>
                </span>
              </button>
              <div className="flex shrink-0 flex-col sm:flex-row">
                <IconButton label="تحريك لأعلى" disabled={i === 0} onClick={() => move(i, -1)}>
                  ↑
                </IconButton>
                <IconButton label="تحريك لأسفل" disabled={i === banners.length - 1} onClick={() => move(i, 1)}>
                  ↓
                </IconButton>
                <IconButton
                  label="حذف البنر"
                  danger
                  onClick={async () => {
                    if (await confirmAction('حذف هذا البنر؟')) run(() => api(`/admin/banners/${banner.id}`, { method: 'DELETE' }));
                  }}
                >
                  <TrashIcon width={18} height={18} />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IconButton({ label, danger, disabled, onClick, children }: { label: string; danger?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-9 place-items-center rounded-lg disabled:opacity-30 ${danger ? 'text-danger hover:bg-danger/10' : 'hover:bg-ink/5'}`}
    >
      {children}
    </button>
  );
}

function BannerForm({ draft, onDone }: { draft: Draft; onDone: () => void }) {
  const { data } = useApp();
  const [form, setForm] = useState(draft);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.set('file', await shrinkImage(file, 1800));
      const { key } = await api<{ key: string }>('/admin/images', { form: body });
      set('imageKey', key);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api(form.id ? `/admin/banners/${form.id}` : '/admin/banners', { method: form.id ? 'PUT' : 'POST', json: form });
      haptic('success');
      onDone();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-xl font-semibold">{form.id ? 'تعديل البنر' : 'بنر جديد'}</h1>
      <label className="relative block aspect-[3/1] cursor-pointer overflow-hidden rounded-2xl border border-dashed border-line bg-card hover:border-brand">
        {form.imageKey ? (
          <img src={imageUrl(form.imageKey)} alt="" className="size-full object-cover object-left" />
        ) : (
          <span className="grid size-full place-items-center text-muted">
            <span className="flex flex-col items-center gap-2 text-sm">
              <ImageIcon width={32} height={32} /> اختر صورة البنر (يفضّل مقاس 1500×500)
            </span>
          </span>
        )}
        {uploading && <span className="absolute inset-0 grid place-items-center bg-white/70">جارٍ الرفع…</span>}
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
      </label>
      <p className="-mt-3 text-xs text-muted">يظهر النص على الجانب الأيمن، ويقص الجوال أطراف الصورة. ضع العنصر المهم في الثلث الأيسر واترك اليمين هادئاً.</p>
      <Field label="العنوان">
        <input className="field" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={80} placeholder="مثلاً: خصم 20% على القهوة المختصة" />
      </Field>
      <Field label="وصف قصير">
        <input className="field" value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} maxLength={140} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="نص الزر" hint="اتركه فارغاً لإخفاء الزر">
          <input className="field" value={form.buttonText} onChange={(e) => set('buttonText', e.target.value)} maxLength={30} placeholder="تسوّق الآن" />
        </Field>
        <Field label="عند الضغط يفتح">
          <select className="field" value={form.link} onChange={(e) => set('link', e.target.value)}>
            <option value="">لا شيء</option>
            <optgroup label="قسم">
              {data!.categories.map((c) => (
                <option key={c.id} value={`/c/${c.id}`}>
                  {c.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="منتج">
              {data!.products.map((p) => (
                <option key={p.id} value={`/p/${p.id}`}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          </select>
        </Field>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2">
        <Button type="submit" busy={saving} disabled={uploading || !form.imageKey} className="flex-1">
          {form.id ? 'حفظ التعديلات' : 'إضافة البنر'}
        </Button>
        <Button type="button" variant="plain" onClick={onDone}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}
