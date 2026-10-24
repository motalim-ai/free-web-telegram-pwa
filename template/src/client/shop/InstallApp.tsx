import { useState } from 'react';
import { useApp } from '../state';
import { CloseIcon } from '../components/icons';
import { imageUrl } from '../lib/format';
import { useInstall } from '../lib/install';

const DISMISS_KEY = 'install:dismissed';

/** The card on the home page offering to install the store as an app (or, in Telegram, a home-screen shortcut). */
export function InstallBanner() {
  const { mode } = useInstall();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  if (!mode || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Storage blocked: it comes back next visit, which is fine.
    }
  };

  return (
    <div className="card mx-4 mt-4 flex items-center gap-3 p-3">
      <AppIcon />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">ثبّت التطبيق على جوالك</p>
        <p className="text-sm text-muted">{mode === 'telegram' ? 'افتح المتجر من الشاشة الرئيسية مباشرة' : 'يفتح أسرع ومن غير متصفح'}</p>
      </div>
      <InstallButton className="shrink-0" />
      <button onClick={dismiss} className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-ink/5" aria-label="إخفاء">
        <CloseIcon width={18} height={18} />
      </button>
    </div>
  );
}

/** One tap on Android/desktop and in Telegram; on iPhone browsers it opens the Add-to-Home-Screen steps. */
export function InstallButton({ className = '', label = 'تثبيت' }: { className?: string; label?: string }) {
  const { mode, install } = useInstall();
  const [showSteps, setShowSteps] = useState(false);
  if (!mode) return null;
  return (
    <>
      <button
        onClick={() => (mode === 'ios' ? setShowSteps(true) : install())}
        className={`rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand hover:brightness-110 ${className}`}
      >
        {label}
      </button>
      {showSteps && <IosSteps onClose={() => setShowSteps(false)} />}
    </>
  );
}

function IosSteps({ onClose }: { onClose: () => void }) {
  const { data } = useApp();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal aria-label="تثبيت التطبيق">
      <button className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="إغلاق" />
      <div className="relative w-full max-w-sm rounded-t-3xl bg-card p-6 pb-[max(24px,env(safe-area-inset-bottom))] sm:rounded-3xl">
        <div className="flex items-center gap-3">
          <AppIcon />
          <p className="text-lg font-bold">ثبّت {data?.store.name} على جوالك</p>
        </div>
        <ol className="mt-5 space-y-4">
          <Step n={1}>
            اضغط زر المشاركة <ShareGlyph /> أسفل الشاشة في Safari
          </Step>
          <Step n={2}>اختر «إضافة إلى الشاشة الرئيسية»</Step>
          <Step n={3}>اضغط «إضافة»، وسيظهر التطبيق بين تطبيقاتك</Step>
        </ol>
        <button onClick={onClose} className="mt-6 h-12 w-full rounded-xl border border-line font-semibold">
          حسناً
        </button>
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="price grid size-7 shrink-0 place-items-center rounded-full bg-brand/10 text-sm text-brand">{n}</span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

function AppIcon() {
  const { data } = useApp();
  const logo = data?.store.logo;
  return logo ? (
    <img src={imageUrl(logo)} alt="" className="size-12 shrink-0 rounded-xl border border-line bg-white object-contain p-1" />
  ) : (
    <img src="/icons/icon-192.png" alt="" className="size-12 shrink-0 rounded-xl border border-line" />
  );
}

/** The iOS share icon, drawn inline so the steps match what shoppers see. */
function ShareGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline align-[-3px] text-[#0a84ff]" aria-label="زر المشاركة">
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}
