import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../state';
import { Button, Notice, Spinner } from '../components/ui';
import { api } from '../lib/api';

/**
 * Website login for the owner. In the bot, /admin sends a one-time link to /admin/login#code=...
 * which is exchanged here for a login cookie.
 */
export function AdminLogin({ onSignedIn }: { onSignedIn: () => void }) {
  const { data } = useApp();
  const navigate = useNavigate();
  const code = new URLSearchParams(window.location.hash.slice(1)).get('code');
  const [error, setError] = useState<string | null>(null);
  const [exchanging, setExchanging] = useState(Boolean(code));
  const [devLogin, setDevLogin] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ available: boolean }>('/auth/dev-login').then((r) => setDevLogin(r.available), () => {});
    if (!code) return;
    // Remove the code from the address bar right away; it only works once anyway.
    history.replaceState(null, '', '/admin');
    api('/auth/admin-link', { json: { code } })
      .then(() => {
        navigate('/admin', { replace: true });
        onSignedIn();
      })
      .catch((e) => {
        setError(e.message);
        setExchanging(false);
      });
  }, []);

  if (exchanging) return <Spinner label="جارٍ تسجيل الدخول…" />;

  return (
    <main className="mx-auto grid min-h-dvh max-w-md place-items-center px-6">
      <div className="w-full space-y-5">
        <div>
          <p className="text-muted">{data?.store.name}</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold">لوحة التحكم</h1>
        </div>
        <ol className="list-inside list-decimal space-y-2 card p-5 leading-relaxed">
          <li>افتح بوت المتجر في تيليجرام.</li>
          <li>
            أرسل الأمر <bdi className="rounded bg-ink/5 px-1.5 py-0.5 font-mono" dir="ltr">/admin</bdi>
          </li>
          <li>اضغط الرابط الذي يرسله البوت. يفتح لوحة التحكم هنا مباشرة.</li>
        </ol>
        <p className="text-sm text-muted">من داخل تيليجرام لا تحتاج تسجيل دخول: اضغط زر «لوحة التحكم» بجانب خانة الكتابة.</p>
        {error && <Notice tone="error">{error}</Notice>}
        {devLogin && (
          <div className="space-y-2 border-t border-line pt-5">
            <Button
              variant="plain"
              className="w-full"
              busy={busy}
              onClick={async () => {
                setBusy(true);
                await api('/auth/dev-login', { json: {} });
                onSignedIn();
              }}
            >
              دخول تجريبي (على جهازك فقط)
            </Button>
            <p className="text-center text-xs text-muted">يظهر هذا الزر أثناء التطوير على localhost فقط.</p>
          </div>
        )}
      </div>
    </main>
  );
}
