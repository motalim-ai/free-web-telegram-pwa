import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const timestamp = (name: string) =>
  integer(name)
    .notNull()
    .default(sql`(unixepoch())`);

/** One row (id = 1): everything the owner can change about the store without touching code. */
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  tagline: text('tagline').notNull().default(''),
  logoKey: text('logo_key'),
  color: text('color').notNull().default('#0f5c4d'),
  currency: text('currency').notNull().default('ر.س'),
  deliveryFee: integer('delivery_fee').notNull().default(0),
  // Orders at or above this subtotal ship free. 0 = no free-shipping offer.
  freeShippingOver: integer('free_shipping_over').notNull().default(0),
  // The thin bar above the header, e.g. "شحن مجاني للطلبات فوق 199 ر.س". Empty hides it.
  announcement: text('announcement').notNull().default(''),
  whatsapp: text('whatsapp').notNull().default(''),
  // Bank or wallet details shown at checkout. Empty means "transfer" is not offered.
  transferInfo: text('transfer_info').notNull().default(''),
  isOpen: integer('is_open', { mode: 'boolean' }).notNull().default(true),
});

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  imageKey: text('image_key'),
  sort: integer('sort').notNull().default(0),
});

/** The sliding banners at the top of the home page. */
export const banners = sqliteTable('banners', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  imageKey: text('image_key').notNull(),
  title: text('title').notNull().default(''),
  subtitle: text('subtitle').notNull().default(''),
  buttonText: text('button_text').notNull().default(''),
  // Where a tap goes inside the store, e.g. "/c/2" or "/p/5". Empty = not clickable.
  link: text('link').notNull().default(''),
  sort: integer('sort').notNull().default(0),
});

export const products = sqliteTable(
  'products',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    // Prices are whole currency units (e.g. 85 = 85 SAR).
    price: integer('price').notNull(),
    oldPrice: integer('old_price'),
    // JSON array of image keys (KV uploads or bundled /demo/ files), first one is the cover.
    images: text('images', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
    available: integer('available', { mode: 'boolean' }).notNull().default(true),
    sort: integer('sort').notNull().default(0),
    createdAt: timestamp('created_at'),
  },
  (t) => [index('products_category_idx').on(t.categoryId)],
);

/** Shoppers who opened the store inside Telegram. Website shoppers order as guests and have no row here. */
export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  telegramId: text('telegram_id').notNull().unique(),
  firstName: text('first_name').notNull().default(''),
  username: text('username'),
  phone: text('phone').notNull().default(''),
  address: text('address').notNull().default(''),
  createdAt: timestamp('created_at'),
});

export const ORDER_STATUSES = ['new', 'confirmed', 'shipping', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const orders = sqliteTable(
  'orders',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    // Secret, unguessable id used in the customer's order link (/o/<token>).
    token: text('token').notNull().unique(),
    status: text('status', { enum: ORDER_STATUSES }).notNull().default('new'),
    source: text('source', { enum: ['web', 'telegram'] }).notNull(),
    customerId: integer('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    // Where the bot sends status updates; set for Telegram orders or after "follow on Telegram".
    telegramChatId: text('telegram_chat_id'),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    address: text('address').notNull(),
    notes: text('notes').notNull().default(''),
    payment: text('payment', { enum: ['cod', 'transfer'] }).notNull(),
    receiptKey: text('receipt_key'),
    subtotal: integer('subtotal').notNull(),
    deliveryFee: integer('delivery_fee').notNull(),
    total: integer('total').notNull(),
    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at'),
  },
  (t) => [index('orders_status_idx').on(t.status), index('orders_customer_idx').on(t.customerId)],
);

export const orderItems = sqliteTable(
  'order_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
    // Name and price are copied at order time so later product edits don't rewrite old orders.
    name: text('name').notNull(),
    price: integer('price').notNull(),
    qty: integer('qty').notNull(),
  },
  (t) => [index('order_items_order_idx').on(t.orderId)],
);
