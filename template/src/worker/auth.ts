import type { Context, Next } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';
import type { AppEnv, Env, Session } from './env';

export const ADMIN_COOKIE = 'admin_session';
const SESSION_DAYS = 7;

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

const encoder = new TextEncoder();

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
}

const toHex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');

function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Checks that initData really comes from Telegram for this bot (the official HMAC check) and is fresh.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export async function verifyInitData(initData: string, botToken: string, maxAgeSeconds = 24 * 60 * 60) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = await hmac(encoder.encode('WebAppData'), botToken);
  const expected = toHex(await hmac(secret, dataCheckString));
  if (!sameString(expected, hash)) return null;

  const authDate = Number(params.get('auth_date'));
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSeconds) return null;

  try {
    const user = JSON.parse(params.get('user') ?? '') as TelegramUser;
    return typeof user?.id === 'number' ? user : null;
  } catch {
    return null;
  }
}

export function isAdminId(env: Env, telegramId: string | number): boolean {
  const ids = (env.ADMIN_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean);
  return ids.includes(String(telegramId));
}

export async function createSession(env: Env, session: Session): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60;
  return sign({ ...session, exp }, env.SESSION_SECRET, 'HS256');
}

/** Admin sessions in a normal browser live in an HttpOnly cookie that page scripts can't read. */
export async function setAdminCookie(c: Context<AppEnv>, session: Session) {
  setCookie(c, ADMIN_COOKIE, await createSession(c.env, session), {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export const clearAdminCookie = (c: Context<AppEnv>) => deleteCookie(c, ADMIN_COOKIE, { path: '/' });

/** Reads the session from `Authorization: Bearer` (inside Telegram) or the admin cookie (website). */
export async function loadSession(c: Context<AppEnv>, next: Next) {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : getCookie(c, ADMIN_COOKIE);
  let session: Session | null = null;
  if (token) {
    try {
      const payload = (await verify(token, c.env.SESSION_SECRET, 'HS256')) as unknown as Session;
      // An admin removed from ADMIN_IDS loses access right away, even with a valid token.
      const stillAdmin = payload.role !== 'admin' || !payload.tg || isAdminId(c.env, payload.tg);
      if (stillAdmin) session = { role: payload.role, tg: payload.tg, cid: payload.cid };
    } catch {
      session = null;
    }
  }
  c.set('session', session);
  await next();
}

export async function requireAdmin(c: Context<AppEnv>, next: Next) {
  if (c.get('session')?.role !== 'admin') return c.json({ error: 'سجّل الدخول كمدير أولاً' }, 401);
  await next();
}
