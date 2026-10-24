import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type * as schema from './db/schema';

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  ASSETS: Fetcher;
  BOT_USERNAME: string;
  // Secrets (`npx wrangler secret put NAME`, or .dev.vars locally).
  BOT_TOKEN?: string;
  /** Comma-separated Telegram user ids of the store owners, e.g. "12345,67890". */
  ADMIN_IDS?: string;
  SESSION_SECRET: string;
  /** Telegram sends it back in a header on every webhook call, so only Telegram can reach /bot/webhook. */
  WEBHOOK_SECRET?: string;
  /** "1" only in .dev.vars: shows a one-click admin login on localhost. */
  DEV_LOGIN?: string;
}

export interface Session {
  role: 'customer' | 'admin';
  /** Telegram user id; missing for an admin signed in with the local dev login. */
  tg?: string;
  /** customers.id for Telegram shoppers. */
  cid?: number;
}

export type AppEnv = {
  Bindings: Env;
  Variables: { db: DrizzleD1Database<typeof schema>; session: Session | null };
};
