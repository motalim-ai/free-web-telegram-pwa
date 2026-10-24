// Website shoppers have no account, so their order links are remembered in this browser only.
const KEY = 'orders:v1';

export interface SavedOrder {
  id: number;
  token: string;
  total: number;
  createdAt: number;
}

export function savedOrders(): SavedOrder[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function rememberOrder(order: SavedOrder) {
  try {
    localStorage.setItem(KEY, JSON.stringify([order, ...savedOrders()].slice(0, 30)));
  } catch {
    // Storage blocked: the order page link still works.
  }
}
