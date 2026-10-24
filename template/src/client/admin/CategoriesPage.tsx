import { useState, type FormEvent } from 'react';
import { useApp } from '../state';
import { Button, Notice } from '../components/ui';
import { ImageIcon, TrashIcon } from '../components/icons';
import { api } from '../lib/api';
import { imageUrl } from '../lib/format';
import { shrinkImage } from '../lib/image';
import { confirmAction } from '../lib/telegram';

export function CategoriesPage() {
  const { data, reload } = useApp();
  const categories = data!.categories;
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
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

  const add = (event: FormEvent) => {
    event.preventDefault();
    run(async () => {
      await api('/admin/categories', { json: { name } });
      setName('');
    });
  };

  const move = (index: number, by: -1 | 1) => {
    const ids = categories.map((c) => c.id);
    [ids[index], ids[index + by]] = [ids[index + by], ids[index]];
    run(() => api('/admin/categories/order', { json: { ids } }));
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold">الأقسام</h1>
      <form onSubmit={add} className="mb-4 flex gap-2">
        <input className="field" placeholder="اسم القسم الجديد" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={60} required />
        <Button type="submit" className="shrink-0">
          إضافة
        </Button>
      </form>
      {error && <Notice tone="error">{error}</Notice>}
      {categories.length === 0 ? (
        <p className="py-12 text-center text-muted">لا توجد أقسام. الأقسام تساعد العملاء على الوصول للمنتج بسرعة.</p>
      ) : (
        <ul className="divide-y divide-line card">
          {categories.map((cat, i) => (
            <li key={cat.id} className="flex items-center gap-2 px-3 py-2.5">
              <label className="relative grid size-12 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border border-line bg-paper text-muted hover:border-brand" title="تغيير صورة القسم">
                {cat.imageKey ? <img src={imageUrl(cat.imageKey)} alt="" className="size-full object-cover" /> : <ImageIcon width={18} height={18} />}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  aria-label={`صورة قسم ${cat.name}`}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    run(async () => {
                      const body = new FormData();
                      body.set('file', await shrinkImage(file, 600));
                      const { key } = await api<{ key: string }>('/admin/images', { form: body });
                      await api(`/admin/categories/${cat.id}`, { method: 'PUT', json: { name: cat.name, imageKey: key } });
                    });
                  }}
                />
              </label>
              {editing?.id === cat.id ? (
                <form
                  className="flex flex-1 gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(async () => {
                      await api(`/admin/categories/${cat.id}`, { method: 'PUT', json: { name: editing.name, imageKey: cat.imageKey } });
                      setEditing(null);
                    });
                  }}
                >
                  <input className="field py-2" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
                  <Button type="submit" className="min-h-10 shrink-0 px-4">
                    حفظ
                  </Button>
                </form>
              ) : (
                <>
                  <button className="flex-1 py-2 text-start font-semibold" onClick={() => setEditing({ id: cat.id, name: cat.name })}>
                    {cat.name}
                  </button>
                  <button className="grid size-9 place-items-center rounded-xl hover:bg-ink/5 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label="تحريك لأعلى">
                    ↑
                  </button>
                  <button className="grid size-9 place-items-center rounded-xl hover:bg-ink/5 disabled:opacity-30" disabled={i === categories.length - 1} onClick={() => move(i, 1)} aria-label="تحريك لأسفل">
                    ↓
                  </button>
                  <button
                    className="grid size-9 place-items-center rounded-xl text-danger hover:bg-danger/10"
                    aria-label={`حذف ${cat.name}`}
                    onClick={async () => {
                      if (await confirmAction(`حذف قسم «${cat.name}»؟ منتجاته تبقى بدون قسم.`)) run(() => api(`/admin/categories/${cat.id}`, { method: 'DELETE' }));
                    }}
                  >
                    <TrashIcon width={18} height={18} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted">اضغط على الصورة لتغييرها، وعلى الاسم لتعديله.</p>
    </div>
  );
}
