import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router';
import { ShopLayout } from './shop/ShopLayout';
import { Home } from './shop/Home';
import { ProductPage } from './shop/ProductPage';
import { CartPage } from './shop/CartPage';
import { CheckoutPage } from './shop/CheckoutPage';
import { OrderPage } from './shop/OrderPage';
import { MyOrders } from './shop/MyOrders';
import { NotFound } from './shop/NotFound';
import { CategoryPage } from './shop/CategoryPage';
import { Spinner } from './components/ui';
import { bindBackButton } from './lib/telegram';

// Shoppers never download the dashboard code.
const AdminApp = lazy(() => import('./admin/AdminApp'));

const ROOTS = ['/', '/admin', '/admin/'];

export function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // Telegram's own back arrow replaces the in-page one on every screen except the two home screens.
  useEffect(() => {
    const isRoot = ROOTS.includes(location.pathname);
    const home = location.pathname.startsWith('/admin') ? '/admin' : '/';
    // A page opened straight from a link has no history to go back to.
    return bindBackButton(!isRoot, () => (location.key === 'default' ? navigate(home) : navigate(-1)));
  }, [location, navigate]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <Routes>
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<Spinner />}>
            <AdminApp />
          </Suspense>
        }
      />
      <Route element={<ShopLayout />}>
        <Route index element={<Home />} />
        <Route path="p/:id" element={<ProductPage />} />
        <Route path="c/:id" element={<CategoryPage />} />
        <Route path="search" element={<CategoryPage search />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="o/:token" element={<OrderPage />} />
        <Route path="orders" element={<MyOrders />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
