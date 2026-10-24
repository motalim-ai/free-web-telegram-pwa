import { useCallback, useEffect, useState, type ComponentType, type SVGProps } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router';
import { useApp } from '../state';
import { Spinner } from '../components/ui';
import { BoxIcon, CloseIcon, GearIcon, GridIcon, ImageIcon, LayersIcon, LogoutIcon, MenuIcon, PanelIcon, ReceiptIcon, StoreIcon } from '../components/icons';
import { api } from '../lib/api';
import { imageUrl } from '../lib/format';
import { StatsContext, type Stats } from './stats';
import { inTelegram } from '../lib/telegram';
import { AdminLogin } from './AdminLogin';
import { Overview } from './Overview';
import { OrdersPage } from './OrdersPage';
import { OrderDetail } from './OrderDetail';
import { ProductsPage } from './ProductsPage';
import { ProductForm } from './ProductForm';
import { CategoriesPage } from './CategoriesPage';
import { SettingsPage } from './SettingsPage';
import { BannersPage } from './BannersPage';

type Access = 'checking' | 'in' | 'out' | 'denied';

export default function AdminApp() {
  const { session, data } = useApp();
  const [access, setAccess] = useState<Access>('checking');

  useEffect(() => {
    // Inside Telegram the owner is recognised from their Telegram account; on the website by the login cookie.
    if (inTelegram) {
      if (session.ready) setAccess(session.user?.isAdmin ? 'in' : 'denied');
      return;
    }
    api('/admin/me').then(
      () => setAccess('in'),
      () => setAccess('out'),
    );
  }, [session]);

  if (access === 'checking' || !data) return <Spinner />;
  if (access === 'denied') {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-xl font-semibold">هذه الصفحة لصاحب المتجر فقط</h1>
        <Link to="/" className="mt-6 inline-block font-semibold text-brand">
          العودة إلى المتجر
        </Link>
      </main>
    );
  }
  if (access === 'out') return <AdminLogin onSignedIn={() => setAccess('in')} />;
  return <Dashboard onSignedOut={() => setAccess('out')} />;
}

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  end?: boolean;
  badge?: number;
}

const COLLAPSE_KEY = 'admin:sidebar-collapsed';

function Dashboard({ onSignedOut }: { onSignedOut: () => void }) {
  const { pathname } = useLocation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const refreshStats = useCallback(() => {
    api<Stats>(`/admin/stats?tz=${new Date().getTimezoneOffset()}`).then(setStats, () => {});
  }, []);

  // Keep the "new orders" badge current: on every page change and every 30 seconds.
  useEffect(() => {
    refreshStats();
  }, [pathname, refreshStats]);
  useEffect(() => {
    const timer = setInterval(refreshStats, 30_000);
    return () => clearInterval(timer);
  }, [refreshStats]);
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const toggleCollapsed = () =>
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, value ? '0' : '1');
      } catch {
        // Storage blocked: the choice lasts until reload.
      }
      return !value;
    });

  const items: NavItem[] = [
    { to: '/admin', label: 'الرئيسية', icon: GridIcon, end: true },
    { to: '/admin/orders', label: 'الطلبات', icon: ReceiptIcon, badge: stats?.byStatus.new },
    { to: '/admin/products', label: 'المنتجات', icon: BoxIcon },
    { to: '/admin/categories', label: 'الأقسام', icon: LayersIcon },
    { to: '/admin/banners', label: 'البنرات', icon: ImageIcon },
    { to: '/admin/settings', label: 'الإعدادات', icon: GearIcon },
  ];
  const current = [...items].reverse().find((item) => (item.end ? pathname === item.to || pathname === `${item.to}/` : pathname.startsWith(item.to)));

  const signOut = async () => {
    await api('/auth/logout', { json: {} }).catch(() => {});
    onSignedOut();
  };

  return (
    <StatsContext.Provider value={{ stats, refreshStats }}>
      <div className="min-h-dvh lg:flex">
        {/* Desktop: always there, wide or icons-only. */}
        <aside
          className={`sticky top-0 hidden h-dvh shrink-0 flex-col bg-[#16181c] text-white transition-[width] duration-200 lg:flex ${collapsed ? 'w-[76px]' : 'w-64'}`}
        >
          <Sidebar items={items} collapsed={collapsed} onSignOut={signOut} />
        </aside>

        {/* Phones and Telegram: slides in from the side. */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal aria-label="قائمة لوحة التحكم">
            <button className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} aria-label="إغلاق القائمة" />
            <aside className="drawer-in absolute inset-y-0 start-0 flex w-72 max-w-[85%] flex-col bg-[#16181c] text-white">
              <button
                onClick={() => setDrawerOpen(false)}
                className="absolute end-3 top-4 grid size-9 place-items-center rounded-lg text-white/70 hover:bg-white/10"
                aria-label="إغلاق"
              >
                <CloseIcon width={20} height={20} />
              </button>
              <Sidebar items={items} onSignOut={signOut} />
            </aside>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-card/95 px-3 backdrop-blur lg:px-6">
            <button
              onClick={() => setDrawerOpen(true)}
              className="grid size-10 place-items-center rounded-lg hover:bg-ink/5 lg:hidden"
              aria-label="فتح القائمة"
            >
              <MenuIcon />
            </button>
            <button
              onClick={toggleCollapsed}
              className="hidden size-10 place-items-center rounded-lg text-muted hover:bg-ink/5 hover:text-ink lg:grid"
              aria-label={collapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
              aria-pressed={collapsed}
            >
              <PanelIcon />
            </button>
            <h1 className="truncate text-lg font-bold">{current?.label ?? 'لوحة التحكم'}</h1>
            <Link to="/" className="ms-auto flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-medium hover:border-ink/30">
              <StoreIcon width={18} height={18} /> <span className="max-sm:hidden">عرض المتجر</span>
            </Link>
          </header>
          <main className="mx-auto max-w-6xl p-4 lg:p-6">
            <Routes>
              <Route index element={<Overview />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/:id" element={<OrderDetail />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="products/new" element={<ProductForm />} />
              <Route path="products/:id" element={<ProductForm />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="banners" element={<BannersPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="login" element={<Overview />} />
            </Routes>
          </main>
        </div>
      </div>
    </StatsContext.Provider>
  );
}

function Sidebar({ items, collapsed, onSignOut }: { items: NavItem[]; collapsed?: boolean; onSignOut: () => void }) {
  const { data } = useApp();
  const { store } = data!;
  return (
    <>
      <div className={`flex h-16 shrink-0 items-center gap-3 border-b border-white/10 ${collapsed ? 'justify-center' : 'px-4'}`}>
        {store.logo ? (
          <img src={imageUrl(store.logo)} alt="" className="size-9 shrink-0 rounded-lg bg-white object-contain p-0.5" />
        ) : (
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand font-bold text-on-brand">{store.name.charAt(0)}</span>
        )}
        {!collapsed && (
          <span className="min-w-0">
            <span className="block truncate font-bold">{store.name}</span>
            <span className="block text-xs text-white/50">لوحة التحكم</span>
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="أقسام لوحة التحكم">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `relative flex items-center gap-3 rounded-xl py-2.5 text-[15px] font-medium transition ${collapsed ? 'justify-center px-0' : 'px-3'} ${
                isActive ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute inset-y-2 start-0 w-1 rounded-full bg-brand" aria-hidden />}
                <item.icon width={21} height={21} className="shrink-0" />
                {!collapsed && <span className="flex-1">{item.label}</span>}
                {!!item.badge && (
                  <span
                    className={`price grid min-w-5 place-items-center rounded-full bg-sale px-1.5 text-[11px] leading-5 text-white ${collapsed ? 'absolute end-2 top-1' : ''}`}
                    aria-label={`${item.badge} طلبات جديدة`}
                  >
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-3">
        <Link
          to="/"
          title={collapsed ? 'عرض المتجر' : undefined}
          className={`flex items-center gap-3 rounded-xl py-2.5 text-[15px] text-white/65 hover:bg-white/5 hover:text-white ${collapsed ? 'justify-center' : 'px-3'}`}
        >
          <StoreIcon width={21} height={21} /> {!collapsed && 'عرض المتجر'}
        </Link>
        {!inTelegram && (
          <button
            onClick={onSignOut}
            title={collapsed ? 'تسجيل الخروج' : undefined}
            className={`flex w-full items-center gap-3 rounded-xl py-2.5 text-[15px] text-white/65 hover:bg-white/5 hover:text-white ${collapsed ? 'justify-center' : 'px-3'}`}
          >
            <LogoutIcon width={21} height={21} /> {!collapsed && 'تسجيل الخروج'}
          </button>
        )}
      </div>
    </>
  );
}
