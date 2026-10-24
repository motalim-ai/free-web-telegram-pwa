import { Hono } from 'hono';
import { csrf } from 'hono/csrf';
import { HTTPException } from 'hono/http-exception';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from './db/schema';
import type { AppEnv } from './env';
import { loadSession } from './auth';
import { imageResponse } from './images';
import { store } from './routes/store';
import { admin } from './routes/admin';
import { bot } from './routes/bot';

const app = new Hono<AppEnv>();

app.use('*', async (c, next) => {
  c.set('db', drizzle(c.env.DB, { schema }));
  await next();
});

// The API only accepts writes from pages on this same site (blocks other sites posting with the admin cookie).
app.use('/api/*', csrf(), loadSession);
app.route('/api', store);
app.route('/api/admin', admin);
app.route('/bot', bot);

app.get('/img/:key', (c) => {
  const key = c.req.param('key');
  if (!key.startsWith('img_')) return c.notFound();
  // Keys never change content, so browsers and Cloudflare can cache them for a year.
  return imageResponse(c.env, key, 'public, max-age=31536000, immutable');
});

/** The installable-app description, built from the store settings so a rename in the dashboard reaches it too. */
app.get('/manifest.webmanifest', async (c) => {
  const [s] = await c.get('db').select().from(schema.settings).where(eq(schema.settings.id, 1));
  const name = s?.name ?? 'المتجر';
  return c.json(
    {
      id: '/',
      name,
      short_name: name.slice(0, 12),
      description: s?.tagline || name,
      lang: 'ar',
      dir: 'rtl',
      start_url: '/?source=app',
      scope: '/',
      display: 'standalone',
      background_color: '#f5f5f6',
      theme_color: '#ffffff',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
      shortcuts: [
        { name: 'السلة', url: '/cart', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        { name: 'طلباتي', url: '/orders', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      ],
    },
    200,
    { 'content-type': 'application/manifest+json', 'cache-control': 'public, max-age=300' },
  );
});

/**
 * Product links shared on WhatsApp/X/Telegram: put the product's name, price and photo into the page's
 * preview tags, then hand the page to React as usual.
 */
app.get('/p/:id', async (c) => {
  const page = await c.env.ASSETS.fetch(new URL('/', c.req.url));
  const db = c.get('db');
  const [product] = await db.select().from(schema.products).where(eq(schema.products.id, Number(c.req.param('id'))));
  const [settings] = await db.select().from(schema.settings).where(eq(schema.settings.id, 1));
  if (!product || !settings) return page;

  const origin = new URL(c.req.url).origin;
  const title = `${product.name} | ${settings.name}`;
  const description = `${product.price} ${settings.currency}${product.description ? ` · ${product.description.slice(0, 140)}` : ''}`;
  const cover = product.images[0];
  const image = cover ? `${origin}${cover.startsWith('/') ? cover : `/img/${cover}`}` : null;
  const setContent = (value: string) => ({
    element: (el: Element) => {
      el.setAttribute('content', value);
    },
  });

  return new HTMLRewriter()
    .on('title', {
      element: (el) => {
        el.setInnerContent(title);
      },
    })
    .on('meta[property="og:title"]', setContent(title))
    .on('meta[property="og:description"]', setContent(description))
    .on('meta[name="description"]', setContent(description))
    .on('meta[property="og:image"]', image ? setContent(image) : { element: (el: Element) => void el.remove() })
    .transform(page);
});

app.notFound((c) => c.json({ error: 'غير موجود' }, 404));
app.onError((error, c) => {
  // Deliberate refusals (e.g. the cross-site check) keep their own status.
  if (error instanceof HTTPException) return error.getResponse();
  console.error(error);
  return c.json({ error: 'حدث خطأ في الخادم. حاول مرة أخرى.' }, 500);
});

export default app;
