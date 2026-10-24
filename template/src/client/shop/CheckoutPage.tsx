import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useApp } from '../state';
import { Button, Field, Notice, ProductImage } from '../components/ui';
import { BankIcon, CashIcon, CheckIcon, ImageIcon } from '../components/icons';
import { deliveryFor, money } from '../lib/format';
import { api } from '../lib/api';
import { haptic } from '../lib/telegram';
import { shrinkImage } from '../lib/image';
import { rememberOrder } from '../lib/myOrders';
import { FreeShippingBar } from './CartPage';

const CITIES = [
  'الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر', 'الظهران', 'الأحساء', 'الطائف', 'تبوك',
  'بريدة', 'عنيزة', 'حائل', 'أبها', 'خميس مشيط', 'جازان', 'نجران', 'الباحة', 'الجبيل', 'ينبع', 'القطيف', 'حفر الباطن',
  'سكاكا', 'عرعر', 'القريات', 'الخرج', 'الدوادمي', 'المجمعة',
];

/** 05xxxxxxxx / 5xxxxxxxx / 9665xxxxxxxx → +9665xxxxxxxx. Anything else is sent as typed. */
function normalizePhone(raw: string) {
  const digits = raw.replace(/[^\d+]/g, '');
  const bare = digits.replace(/^\+/, '');
  if (/^9665\d{8}$/.test(bare)) return `+${bare}`;
  if (/^05\d{8}$/.test(bare)) return `+966${bare.slice(1)}`;
  if (/^5\d{8}$/.test(bare)) return `+966${bare}`;
  return digits;
}
const displayPhone = (phone: string) => (/^\+9665\d{8}$/.test(phone) ? phone.slice(4) : phone);

export function CheckoutPage() {
  const { data, session, cartLines, subtotal, clearCart } = useApp();
  const navigate = useNavigate();
  const { store } = data!;
  const delivery = deliveryFor(subtotal, store);
  const savedAddress = session.customer?.address ?? '';

  const [name, setName] = useState(session.user?.name ?? '');
  const [phone, setPhone] = useState(displayPhone(session.customer?.phone ?? ''));
  const [useSaved, setUseSaved] = useState(Boolean(savedAddress));
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [details, setDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [payment, setPayment] = useState<'cod' | 'transfer'>('cod');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const placed = useRef(false);

  useEffect(() => () => void (receiptPreview && URL.revokeObjectURL(receiptPreview)), [receiptPreview]);

  // Inside Telegram the sign-in may finish after this page opens: fill whatever is still empty.
  useEffect(() => {
    if (session.user) setName((v) => v || session.user!.name);
    if (session.customer) {
      setPhone((v) => v || displayPhone(session.customer!.phone));
      if (session.customer.address) setUseSaved(true);
    }
  }, [session.user, session.customer]);

  // After placing the order the cart empties; don't bounce to the empty cart on the way to the order page.
  if (cartLines.length === 0) return placed.current ? null : <Navigate to="/cart" replace />;
  const total = subtotal + delivery;

  async function pickReceipt(file: File | undefined) {
    if (!file) return;
    try {
      const small = await shrinkImage(file, 1800);
      setReceipt(small);
      setReceiptPreview(URL.createObjectURL(small));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!useSaved && !city) return setError('اختر المدينة');
    if (payment === 'transfer' && !receipt) return setError('أرفق صورة إيصال التحويل');
    const address = useSaved ? savedAddress : [city, district && `حي ${district}`, details].filter(Boolean).join('، ');
    setBusy(true);
    const form = new FormData();
    form.set(
      'data',
      JSON.stringify({
        items: cartLines.map(({ product, qty }) => ({ id: product.id, qty })),
        name,
        phone: normalizePhone(phone),
        address,
        notes,
        payment,
      }),
    );
    if (payment === 'transfer' && receipt) form.set('receipt', receipt);
    try {
      const { token, id } = await api<{ token: string; id: number }>('/orders', { form });
      haptic('success');
      rememberOrder({ id, token, total, createdAt: Math.floor(Date.now() / 1000) });
      placed.current = true;
      navigate(`/o/${token}?new=1`, { replace: true });
      clearCart();
    } catch (e) {
      haptic('error');
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-bold">إتمام الطلب</h1>
      <form onSubmit={submit} className="mt-5 gap-6 lg:grid lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Step n={1} title="بياناتك">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="الاسم">
                <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required minLength={2} maxLength={60} />
              </Field>
              <Field label="رقم الجوال">
                <div className="flex" dir="ltr">
                  <span className="grid place-items-center rounded-s-[10px] border border-e-0 border-line bg-paper px-3 text-sm text-muted">+966</span>
                  <input
                    className="field rounded-s-none"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="5XXXXXXXX"
                    required
                  />
                </div>
              </Field>
            </div>
          </Step>

          <Step n={2} title="عنوان التوصيل">
            {savedAddress && (
              <div className="mb-4 space-y-2">
                <Choice checked={useSaved} onSelect={() => setUseSaved(true)} title="عنواني السابق">
                  <p className="mt-1 text-sm text-muted">{savedAddress}</p>
                </Choice>
                <Choice checked={!useSaved} onSelect={() => setUseSaved(false)} title="عنوان جديد" />
              </div>
            )}
            {!useSaved && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="المدينة">
                  <select className="field" value={city} onChange={(e) => setCity(e.target.value)} required>
                    <option value="">اختر المدينة</option>
                    {CITIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                    <option value="مدينة أخرى">مدينة أخرى (اكتبها في العنوان)</option>
                  </select>
                </Field>
                <Field label="الحي">
                  <input className="field" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="مثلاً: النرجس" maxLength={60} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="العنوان التفصيلي">
                    <input
                      className="field"
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      autoComplete="street-address"
                      placeholder="الشارع، رقم المبنى، أو العنوان الوطني المختصر"
                      required
                      minLength={3}
                      maxLength={200}
                    />
                  </Field>
                </div>
              </div>
            )}
            <div className="mt-4">
              <Field label="ملاحظات للتوصيل (اختياري)">
                <input className="field" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} placeholder="مثلاً: اتصل قبل الوصول" />
              </Field>
            </div>
          </Step>

          <Step n={3} title="طريقة الدفع">
            <div className="space-y-2">
              <Choice checked={payment === 'cod'} onSelect={() => setPayment('cod')} title="الدفع عند الاستلام" icon={<CashIcon />} />
              {store.transferInfo && (
                <Choice checked={payment === 'transfer'} onSelect={() => setPayment('transfer')} title="تحويل بنكي" icon={<BankIcon />}>
                  <p className="mt-2 whitespace-pre-line rounded-lg bg-paper p-3 text-sm leading-relaxed">{store.transferInfo}</p>
                </Choice>
              )}
            </div>
            {payment === 'transfer' && (
              <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line bg-card p-3 hover:border-brand">
                {receiptPreview ? (
                  <img src={receiptPreview} alt="صورة الإيصال" className="size-16 rounded-lg object-cover" />
                ) : (
                  <span className="grid size-16 place-items-center rounded-lg bg-paper text-muted">
                    <ImageIcon />
                  </span>
                )}
                <span className="text-sm">
                  <span className="block font-semibold">{receipt ? 'تم إرفاق الإيصال' : 'أرفق صورة إيصال التحويل'}</span>
                  <span className="text-muted">{receipt ? 'اضغط لتغييره' : 'لقطة شاشة من تطبيق البنك'}</span>
                </span>
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickReceipt(e.target.files?.[0])} />
              </label>
            )}
          </Step>
        </div>

        <aside className="mt-4 h-fit space-y-4 lg:sticky lg:top-28 lg:mt-0">
          {store.freeShippingOver > 0 && <FreeShippingBar subtotal={subtotal} />}
          <section className="card p-5">
            <h2 className="text-lg font-bold">ملخص الطلب</h2>
            <ul className="mt-4 space-y-3">
              {cartLines.map(({ product, qty }) => (
                <li key={product.id} className="flex items-center gap-3 text-sm">
                  <span className="relative shrink-0">
                    <ProductImage name={product.name} image={product.images[0]} className="size-12 rounded-lg border border-line" />
                    <span className="price absolute -top-1.5 -start-1.5 grid size-5 place-items-center rounded-full bg-ink text-[11px] text-white">{qty}</span>
                  </span>
                  <span className="line-clamp-2 flex-1">{product.name}</span>
                  <span className="price shrink-0">{money(product.price * qty, store.currency)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-[15px]">
              <div className="flex justify-between">
                <dt className="text-muted">مجموع المنتجات</dt>
                <dd className="price">{money(subtotal, store.currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">الشحن</dt>
                <dd className={`price ${delivery ? '' : 'text-bean'}`}>{delivery ? money(delivery, store.currency) : 'مجاني'}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-3">
                <dt className="font-bold">الإجمالي</dt>
                <dd className="price text-2xl">{money(total, store.currency)}</dd>
              </div>
            </dl>
            {error && (
              <div className="mt-4">
                <Notice tone="error">{error}</Notice>
              </div>
            )}
            <Button type="submit" className="mt-4 w-full" busy={busy}>
              تأكيد الطلب
            </Button>
          </section>
        </aside>
      </form>
    </main>
  );
}

/** Checkout really is a sequence, so the sections carry their step number. */
function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <fieldset className="card p-4 sm:p-5">
      <legend className="sr-only">{title}</legend>
      <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold" aria-hidden>
        <span className="grid size-7 place-items-center rounded-full bg-brand text-sm text-on-brand">{n}</span>
        {title}
      </h2>
      {children}
    </fieldset>
  );
}

function Choice({ checked, onSelect, title, icon, children }: { checked: boolean; onSelect: () => void; title: string; icon?: ReactNode; children?: ReactNode }) {
  return (
    <label className={`block cursor-pointer rounded-xl border p-3.5 transition ${checked ? 'border-brand bg-brand/[0.04]' : 'border-line hover:border-ink/30'}`}>
      <span className="flex items-center gap-3">
        <input type="radio" name={title} className="sr-only" checked={checked} onChange={onSelect} />
        <span className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${checked ? 'border-brand bg-brand text-on-brand' : 'border-line'}`}>
          {checked && <CheckIcon width={12} height={12} strokeWidth={3.5} />}
        </span>
        {icon && <span className="text-brand">{icon}</span>}
        <span className="font-semibold">{title}</span>
      </span>
      {checked && children}
    </label>
  );
}
