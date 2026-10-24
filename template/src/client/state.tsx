import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setToken } from './lib/api';
import { inTelegram, tg } from './lib/telegram';
import { applyBrand } from './lib/theme';
import type { Product, StoreData } from './types';

interface Session {
  ready: boolean;
  /** Set inside Telegram once initData is verified. */
  user: { name: string; isAdmin: boolean } | null;
  customer: { phone: string; address: string } | null;
  error: string | null;
}

type Cart = Record<number, number>;

interface AppState {
  data: StoreData | null;
  loadError: string | null;
  reload: () => void;
  session: Session;
  cart: Cart;
  setQty: (productId: number, qty: number) => void;
  /** Adds to the cart and shows the "added" note. */
  addToCart: (productId: number, qty?: number) => void;
  lastAdded: { productId: number; at: number } | null;
  clearCart: () => void;
  cartLines: { product: Product; qty: number }[];
  cartCount: number;
  subtotal: number;
}

const Context = createContext<AppState | null>(null);
const CART_KEY = 'cart:v1';

function readCart(): Cart {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoreData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [session, setSession] = useState<Session>({ ready: !inTelegram, user: null, customer: null, error: null });
  const [cart, setCart] = useState<Cart>(readCart);
  const [lastAdded, setLastAdded] = useState<AppState['lastAdded']>(null);

  const reload = useCallback(() => {
    setLoadError(null);
    api<StoreData>('/store')
      .then((next) => {
        setData(next);
        applyBrand(next.store.color);
        document.title = next.store.name;
      })
      .catch((error) => setLoadError(error.message));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!inTelegram || !tg) return;
    api<{ token: string; user: Session['user']; customer: Session['customer'] }>('/auth/telegram', {
      json: { initData: tg.initData },
    })
      .then(({ token, user, customer }) => {
        setToken(token);
        setSession({ ready: true, user, customer, error: null });
      })
      .catch((error) => setSession({ ready: true, user: null, customer: null, error: error.message }));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      // Private mode or storage blocked: the cart still works for this visit.
    }
  }, [cart]);

  const setQty = useCallback((productId: number, qty: number) => {
    setCart((current) => {
      const next = { ...current };
      if (qty <= 0) delete next[productId];
      else next[productId] = Math.min(qty, 50);
      return next;
    });
  }, []);

  const addToCart = useCallback((productId: number, qty = 1) => {
    setCart((current) => ({ ...current, [productId]: Math.min((current[productId] ?? 0) + qty, 50) }));
    setLastAdded({ productId, at: Date.now() });
  }, []);

  const clearCart = useCallback(() => setCart({}), []);

  const derived = useMemo(() => {
    const byId = new Map(data?.products.map((p) => [p.id, p]));
    const cartLines = Object.entries(cart)
      .map(([id, qty]) => ({ product: byId.get(Number(id))!, qty }))
      .filter((line) => line.product);
    return {
      cartLines,
      cartCount: cartLines.reduce((n, line) => n + line.qty, 0),
      subtotal: cartLines.reduce((n, line) => n + line.qty * line.product.price, 0),
    };
  }, [cart, data]);

  const value = { data, loadError, reload, session, cart, setQty, addToCart, lastAdded, clearCart, ...derived };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error('useApp outside AppProvider');
  return value;
}
