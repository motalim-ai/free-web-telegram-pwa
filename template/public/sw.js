// Service worker: makes the store installable, quicker on repeat visits, and able to open without internet.
// BUILD is stamped on every `npm run build` (vite.config.ts), so each deploy starts with fresh caches.
const BUILD = '__BUILD_ID__';
const STATIC = `static-${BUILD}`; // app code, fonts and pictures
const PAGES = `pages-${BUILD}`; // the page itself and the last store data, used only when offline

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.addAll(['/']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== STATIC && key !== PAGES).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return; // orders and every other change always go to the server
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Always live, never stored: the dashboard, sign-in, orders, receipts and the bot.
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/bot/')) return;
  if (url.pathname.startsWith('/api/') && url.pathname !== '/api/store') return;

  if (request.mode === 'navigate') {
    // Every store page is the same app; keep one copy of it for opening offline.
    event.respondWith(networkFirst(request, '/'));
  } else if (url.pathname === '/api/store') {
    // Fresh products and prices whenever online; the saved copy only lets shoppers browse offline.
    // The server recomputes every price when an order is placed, so nothing is ever sold on old data.
    event.respondWith(networkFirst(request));
  } else if (/^\/(assets|demo|brand|icons|img)\//.test(url.pathname) || url.pathname === '/favicon.svg') {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirst(request, cacheKey = request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(cacheKey, response.clone());
    return response;
  } catch {
    return (await cache.match(cacheKey)) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const saved = await cache.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}
