import type { OrderStatus } from './lib/format';

export interface StoreInfo {
  name: string;
  tagline: string;
  logo: string | null;
  color: string;
  currency: string;
  deliveryFee: number;
  /** 0 = no free-shipping offer. */
  freeShippingOver: number;
  announcement: string;
  whatsapp: string;
  transferInfo: string;
  isOpen: boolean;
  botUsername: string | null;
}

export interface Category {
  id: number;
  name: string;
  imageKey: string | null;
  sort: number;
}

export interface Banner {
  id: number;
  imageKey: string;
  title: string;
  subtitle: string;
  buttonText: string;
  link: string;
  sort: number;
}

export interface Product {
  id: number;
  categoryId: number | null;
  name: string;
  description: string;
  price: number;
  oldPrice: number | null;
  images: string[];
  available: boolean;
  createdAt: number;
}

export interface StoreData {
  store: StoreInfo;
  categories: Category[];
  banners: Banner[];
  /** Product ids by units sold, most first. */
  bestSellers: number[];
  products: Product[];
}

export interface OrderItem {
  id: number;
  productId: number | null;
  name: string;
  price: number;
  qty: number;
}

export interface Order {
  id: number;
  token: string;
  status: OrderStatus;
  source: 'web' | 'telegram';
  name: string;
  phone: string;
  address: string;
  notes: string;
  payment: 'cod' | 'transfer';
  receiptKey?: string | null;
  telegramChatId?: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt: number;
  updatedAt: number;
}
