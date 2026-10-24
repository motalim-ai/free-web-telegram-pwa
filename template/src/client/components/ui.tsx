import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { MinusIcon, PlusIcon } from './icons';
import { imageUrl } from '../lib/format';

type Variant = 'brand' | 'plain' | 'ghost' | 'danger';

export function Button({
  variant = 'brand',
  className = '',
  busy,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean }) {
  const styles: Record<Variant, string> = {
    brand: 'bg-brand text-on-brand hover:brightness-110',
    plain: 'bg-card text-ink border border-line hover:border-ink/30',
    ghost: 'text-ink hover:bg-ink/5',
    danger: 'bg-card text-danger border border-danger/30 hover:border-danger',
  };
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {busy ? <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : children}
    </button>
  );
}

export function QtyStepper({
  qty,
  onChange,
  max = 50,
  size = 'md',
  full,
}: {
  qty: number;
  onChange: (qty: number) => void;
  max?: number;
  size?: 'sm' | 'md';
  /** Stretch across the parent (product cards). */
  full?: boolean;
}) {
  const box = size === 'sm' ? 'h-9 w-9' : 'h-12 w-12';
  return (
    <div className={`${full ? 'flex w-full justify-between' : 'inline-flex'} items-center rounded-xl border border-brand/30 bg-card text-brand`}>
      <button type="button" className={`${box} grid place-items-center rounded-xl hover:bg-brand/5`} onClick={() => onChange(qty + 1)} disabled={qty >= max} aria-label="زيادة الكمية">
        <PlusIcon width={18} height={18} />
      </button>
      <span className="price min-w-8 text-center text-base text-ink" aria-live="polite">
        {qty}
      </span>
      <button type="button" className={`${box} grid place-items-center rounded-xl hover:bg-brand/5`} onClick={() => onChange(qty - 1)} aria-label="إنقاص الكمية">
        <MinusIcon width={18} height={18} />
      </button>
    </div>
  );
}

/** Product photo, or a soft tile with the product's first letter when the owner hasn't added photos yet. */
export function ProductImage({ name, image, className = '' }: { name: string; image?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (image && !failed) {
    return <img src={imageUrl(image)} alt={name} loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
  }
  return (
    <div className={`grid place-items-center bg-brand/6 ${className}`} aria-hidden>
      <span className="text-5xl font-bold text-brand/30">{name.trim().charAt(0)}</span>
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error' | 'success'; children: ReactNode }) {
  const tones = {
    info: 'bg-ink/5 text-ink',
    error: 'bg-danger/10 text-danger',
    success: 'bg-bean/10 text-bean',
  };
  return <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${tones[tone]}`}>{children}</div>;
}

export function Spinner({ label = 'جارٍ التحميل…' }: { label?: string }) {
  return (
    <div className="grid min-h-[50dvh] place-items-center" role="status">
      <div className="flex flex-col items-center gap-3 text-muted">
        <span className="size-8 animate-spin rounded-full border-[3px] border-brand border-t-transparent" />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
