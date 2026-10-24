# Stage 6: publishing (only after the user said yes)

Run everything inside `projects/<slug>`. Tell the user one short line per step.

## 1. Verify the accounts

```bash
npx wrangler whoami      # must say "You are logged in"
npm run bot:check        # bot @username, and ADMIN_IDS saved
```

Anything missing → guide the user with `docs/2-accounts.md`, then continue here. Confirm with the user that the email and the bot @username are theirs.

## 2. Create the free database and image storage

```bash
npx wrangler d1 create <slug>
npx wrangler kv namespace create KV
```

Copy the printed `database_id` and KV `id` into `wrangler.jsonc` (replace the zero placeholders). Answer "no" if wrangler offers to edit the config itself. Also set `"name"` (the Worker name, becomes part of the address) to the slug, `"database_name"` to the slug, and `"BOT_USERNAME"` to the bot's username without @.

Then: `npm run db:migrate:local && npm run db:seed:local` (the local data restarts when the id changes).

## 3. Fill the online database

```bash
npm run db:migrate:remote
npm run db:seed:remote     # demo data; skip if the user wants to start empty
```

## 4. Deploy

```bash
npm run deploy
```

It prints the address `https://<slug>.<account>.workers.dev`. On a brand-new account, wrangler may ask to register a `workers.dev` subdomain: let the user choose a name.

The first time, HTTPS can take 1–3 minutes: retry `curl -s -o /dev/null -w "%{http_code}" https://…/api/store` until it returns 200. Do not change anything meanwhile.

## 5. Secrets on Cloudflare

```bash
npm run secrets:push       # SESSION_SECRET (new), BOT_TOKEN, WEBHOOK_SECRET, ADMIN_IDS — never printed
```

`DEV_LOGIN` is never sent: the one-click login exists only on the user's computer.

## 6. Connect the bot

```bash
npm run bot:setup -- https://<slug>.<account>.workers.dev
```

Sets the webhook (with the secret), the «افتح» button for everyone and the «لوحة التحكم» button for the owner.

## 7. Check

- `curl` the address and `/api/store` → 200, and `/manifest.webmanifest` → JSON with the right name.
- A POST to `/bot/webhook` without the secret → 403.
- `/api/auth/dev-login` (POST) on the live site → 404.

Then send the final message from `AGENTS.md` and ask the user to try it in Telegram: Start, the dashboard button, and an order from another account (the owner gets a «طلب جديد» message with confirm/cancel buttons).

## Later updates

Edit → `npm run deploy`. If the schema changed: `npm run db:generate` → `npm run db:migrate:remote` → `npm run deploy`. Never re-run `db:seed:remote` on a store with real data.
