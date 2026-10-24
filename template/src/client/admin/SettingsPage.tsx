import { useEffect, useState, type FormEvent } from 'react';
import { useApp } from '../state';
import { Button, Field, Notice, Spinner } from '../components/ui';
import { ImageIcon } from '../components/icons';
import { api } from '../lib/api';
import { imageUrl } from '../lib/format';
import { shrinkImage } from '../lib/image';
import { haptic } from '../lib/telegram';
import { Toggle } from './Toggle';

interface Settings {
  name: string;
  tagline: string;
  logoKey: string | null;
  color: string;
  currency: string;
  deliveryFee: number;
  freeShippingOver: number;
  announcement: string;
  whatsapp: string;
  transferInfo: string;
  isOpen: boolean;
}

const COLORS = ['#0f5c4d', '#8a5233', '#1f4fa3', '#6b3fa0', '#a3202b', '#1d1f24'];

export function SettingsPage() {
  const { reload } = useApp();
  const [form, setForm] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    api<{ settings: Settings }>('/admin/settings').then((r) => setForm(r.settings));
  }, []);

  if (!form) return <Spinner />;
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setForm({ ...form, [key]: value });

  async function uploadLogo(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.set('file', await shrinkImage(file, 512));
      const { key } = await api<{ key: string }>('/admin/images', { form: body });
      setForm((f) => f && { ...f, logoKey: key });
    } catch (e) {
      setMessage({ tone: 'error', text: (e as Error).message });
    } finally {
      setUploading(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api('/admin/settings', { method: 'PUT', json: form });
      haptic('success');
      reload();
      setMessage({ tone: 'success', text: 'تم حفظ الإعدادات' });
    } catch (e) {
      setMessage({ tone: 'error', text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-xl font-semibold">إعدادات المتجر</h1>

      <div className="flex items-center justify-between card px-4 py-3">
        <span>
          <span className="block font-semibold">استقبال الطلبات</span>
          <span className="text-sm text-muted">أوقفه وقت الإجازات أو عند نفاد الكميات</span>
        </span>
        <Toggle checked={form.isOpen} onChange={(v) => set('isOpen', v)} label={form.isOpen ? 'مفتوح' : 'مغلق'} />
      </div>

      <div className="flex items-center gap-4">
        <label className="grid size-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-2xl border-[1.5px] border-dashed border-line bg-card text-muted hover:border-brand">
          {uploading ? (
            <span className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : form.logoKey ? (
            <img src={imageUrl(form.logoKey)} alt="الشعار" className="size-full object-contain p-1" />
          ) : (
            <ImageIcon />
          )}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => uploadLogo(e.target.files?.[0])} />
        </label>
        <div className="text-sm">
          <p className="font-semibold">الشعار</p>
          <p className="text-muted">صورة مربعة تظهر بجانب اسم المتجر.</p>
          {form.logoKey && (
            <button type="button" className="mt-1 font-semibold text-danger" onClick={() => set('logoKey', null)}>
              إزالة الشعار
            </button>
          )}
        </div>
      </div>

      <Field label="اسم المتجر">
        <input className="field" value={form.name} onChange={(e) => set('name', e.target.value)} required minLength={2} maxLength={60} />
      </Field>
      <Field label="وصف قصير" hint="يظهر تحت اسم المتجر في الصفحة الرئيسية">
        <input className="field" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} maxLength={120} />
      </Field>

      <div>
        <span className="mb-1.5 block text-sm font-semibold">لون المتجر</span>
        <div className="flex flex-wrap items-center gap-2">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => set('color', color)}
              className={`size-10 rounded-full ring-offset-2 ring-offset-paper ${form.color === color ? 'ring-2 ring-ink' : ''}`}
              style={{ background: color }}
              aria-label={`اللون ${color}`}
            />
          ))}
          <label className="flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-sm ring-1 ring-line">
            <input type="color" value={form.color} onChange={(e) => set('color', e.target.value)} className="size-7 cursor-pointer rounded-full border-0 bg-transparent p-0" />
            لون آخر
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="العملة">
          <input className="field" value={form.currency} onChange={(e) => set('currency', e.target.value)} maxLength={10} placeholder="ر.س" />
        </Field>
        <Field label="رسوم التوصيل" hint="0 = توصيل مجاني">
          <input
            className="field price"
            inputMode="numeric"
            value={String(form.deliveryFee)}
            onChange={(e) => set('deliveryFee', Number(e.target.value.replace(/\D/g, '') || 0))}
          />
        </Field>
      </div>
      <Field label="الشحن المجاني للطلبات فوق" hint="اكتب 0 لإلغاء الشحن المجاني">
        <input
          className="field price"
          inputMode="numeric"
          value={String(form.freeShippingOver)}
          onChange={(e) => set('freeShippingOver', Number(e.target.value.replace(/\D/g, '') || 0))}
        />
      </Field>
      <Field label="شريط الإعلان" hint="يظهر أعلى كل الصفحات. اتركه فارغاً لإخفائه">
        <input className="field" value={form.announcement} onChange={(e) => set('announcement', e.target.value)} maxLength={120} placeholder="مثلاً: شحن مجاني للطلبات فوق 199 ر.س" />
      </Field>
      <Field label="رقم واتساب" hint="بالصيغة الدولية مثل 966501234567. يظهر للعميل زر للتواصل.">
        <input className="field text-left" dir="ltr" inputMode="tel" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
      </Field>
      <Field label="بيانات التحويل" hint="اتركها فارغة إذا كان الدفع عند الاستلام فقط">
        <textarea
          className="field min-h-24"
          value={form.transferInfo}
          onChange={(e) => set('transferInfo', e.target.value)}
          maxLength={500}
          placeholder="مثلاً: مصرف الراجحي، الآيبان SA..، باسم ..."
        />
      </Field>

      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <Button type="submit" busy={saving} disabled={uploading} className="w-full">
        حفظ الإعدادات
      </Button>
    </form>
  );
}
