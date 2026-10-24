# Stage 4: building the user's idea on the template

## Create the project

```bash
cp -R template projects/<slug>     # Windows PowerShell: Copy-Item -Recurse template projects\<slug>
cd projects/<slug>
npm install
npm run setup                       # .dev.vars + local database with demo data
```

`projects/` is ignored by this repository's git, so the user's work stays theirs. Write `PROGRESS.md` there with the approved plan.

## Stack (do not swap it)

React + Vite + TypeScript + Tailwind (client) · Hono on **one** Cloudflare Worker (API + bot webhook + static files) · D1 (SQLite) with Drizzle · Workers KV for images · PWA (manifest from the Worker + `public/sw.js`). Everything runs locally with `npm run dev` exactly like production.

## Core: reuse as is (change only if you must, and keep the behaviour)

| File | What it guarantees |
|---|---|
| `src/worker/auth.ts` | Telegram sign-in: verifies `initData` with the bot token (HMAC) and freshness; sessions; `requireAdmin`; owners = `ADMIN_IDS` |
| `src/worker/telegram.ts` | Bot API calls (no-op without BOT_TOKEN locally), notifications |
| `src/worker/routes/bot.ts` | Webhook (checks the secret header), `/start`, owner dashboard button, `/admin` one-time browser login link, inline-button callbacks |
| `src/worker/images.ts` + `/img/*` | Image upload to KV (type/size checks), immutable caching |
| `src/worker/index.ts` | CSRF protection, `/manifest.webmanifest` from settings, share previews on `/p/:id`, error handling |
| `src/client/lib/telegram.ts`, `lib/install.ts` | Telegram WebApp helpers, back button, haptics, home-screen shortcut, PWA install, offline state |
| `src/client/lib/api.ts`, `lib/image.ts` | API calls with the Telegram token; images shrunk in the browser before upload |
| `src/client/admin/AdminApp.tsx` | Dashboard shell: collapsible sidebar, Telegram/web/dev sign-in, stats badge |
| `public/sw.js`, `public/_headers` | Service worker rules and security headers (CSP allows only telegram.org scripts) |
| `scripts/*` | setup, bot check, secrets, bot setup, icons: all secret-safe |

## Domain: replace with the user's idea

`src/worker/db/schema.ts` (tables), `src/worker/routes/store.ts` (public API), `src/worker/routes/admin.ts` (owner API), `src/client/shop/*` (customer pages), `src/client/admin/*Page.tsx` (dashboard pages), `seed/seed.sql` (demo data), `public/demo/*` (demo pictures).

Steps:
1. **Schema**: edit `schema.ts`, then delete `drizzle/` and run `npm run db:generate` (first version only; after the first deploy, never delete migrations, just generate new ones). Then reset local data: delete `.wrangler/state/v3/d1` and run `npm run db:migrate:local && npm run db:seed:local`.
2. **API**: validate every input on the server; **recompute every price/total on the server**, never trust the browser; owner routes go under `/api/admin` (already behind `requireAdmin`).
3. **Pages**: keep the layout pieces (header, drawer, footer, cards, cart-like flows) and rename them to the idea. Arabic RTL, simple MSA, logical CSS (`ms-/me-/ps-/pe-/start-/end-`).
4. **Bot**: keep the patterns: notify owners on the main action (with confirm/cancel buttons), notify the customer on status changes.
5. **Demo data**: rewrite `seed/seed.sql` for the idea (names, prices, 6–12 items) so the first look is convincing. Demo pictures can be simple SVGs in `public/demo/` (see `scripts/demo-art.py` for an example); real photos are uploaded later from the dashboard.
6. **Identity**: `python3 scripts/brand-art.py --color "#hex" --glyph <bag|cup|calendar|book|star|chat|heart>` then `npm run icons`. Put the name/tagline/color in `seed/seed.sql`, and the name in `index.html` (`<title>`, `og:title`, `apple-mobile-web-app-title`).
7. **Check**: `npm run typecheck` and `npm run build` must pass.

## Lessons already learned (do not repeat them)

- `useEffect(() => window.scrollTo(0, 0))` returns a value in new browsers and crashes React: always use a block body `useEffect(() => { … })`.
- After placing an order, navigate to the result **before** clearing the cart, or the checkout page redirects to the empty cart.
- Drizzle `sql` subqueries: write the outer column fully qualified (`"orders"."id"`), or it binds to the inner table.
- Two timestamps need two column names (`created_at`, `updated_at`); a shared helper once mapped both to one column.
- Node scripts in folders with non-English names: use `fileURLToPath(new URL(...))`, never `.pathname`.
- Setting bot commands resets the default menu button: `setMyCommands` **before** `setChatMenuButton` (done in `bot:setup`).
- When the D1 `database_id` changes in `wrangler.jsonc`, local data starts empty: run `npm run db:migrate:local && npm run db:seed:local` again.
- New `*.workers.dev` addresses need 1–3 minutes for HTTPS after the first deploy: wait and retry, don't change anything.
