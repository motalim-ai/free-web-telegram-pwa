import { Link } from 'react-router';

export function NotFound() {
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-xl font-semibold">هذه الصفحة غير موجودة</h1>
      <p className="mt-2 text-muted">ربما حُذف المنتج أو تغيّر الرابط.</p>
      <Link to="/" className="mt-6 inline-block rounded-2xl bg-brand px-5 py-3 font-semibold text-on-brand">
        العودة إلى المتجر
      </Link>
    </main>
  );
}
