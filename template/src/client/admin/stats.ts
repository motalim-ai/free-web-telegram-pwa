import { createContext, useContext } from 'react';
import type { OrderStatus } from '../lib/format';

export interface Stats {
  byStatus: Partial<Record<OrderStatus, number>>;
  today: { orders: number; revenue: number };
  week: { orders: number; revenue: number };
  products: { total: number; soldOut: number };
}

/** Shared by the sidebar badge and the pages, refreshed by the dashboard every 30 seconds. */
export const StatsContext = createContext<{ stats: Stats | null; refreshStats: () => void }>({ stats: null, refreshStats: () => {} });
export const useStats = () => useContext(StatsContext);
