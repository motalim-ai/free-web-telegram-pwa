// npm run bot:setup -- https://my-app.<account>.workers.dev
// Connects the bot to the deployed app: webhook, the "store" button for everyone,
// and the "dashboard" button for the owners in ADMIN_IDS. Reads BOT_TOKEN/WEBHOOK_SECRET/ADMIN_IDS from .dev.vars.
import { botApi, readVars } from './dev-vars.mjs';

const url = process.argv[2]?.replace(/\/$/, '');
if (!url?.startsWith('https://')) {
  console.error('Usage: npm run bot:setup -- https://your-app.workers.dev');
  process.exit(1);
}

const { BOT_TOKEN: token, WEBHOOK_SECRET: secret, ADMIN_IDS = '' } = readVars();
if (!token || !secret) {
  console.error('BOT_TOKEN and WEBHOOK_SECRET must be in .dev.vars (run npm run bot:check and npm run secrets:push first).');
  process.exit(1);
}

async function call(method, body) {
  const result = await botApi(token, method, body);
  if (!result.ok) throw new Error(`${method}: ${result.description}`);
  return result.result;
}

const me = await call('getMe');
await call('setWebhook', {
  url: `${url}/bot/webhook`,
  secret_token: secret,
  allowed_updates: ['message', 'callback_query'],
  drop_pending_updates: true,
});
await call('setMyCommands', { commands: [{ command: 'start', description: 'افتح التطبيق' }] });
// The button next to the message box for everyone. Set after the commands: setting commands resets it.
await call('setChatMenuButton', { menu_button: { type: 'web_app', text: 'افتح', web_app: { url } } });
// Owners get the dashboard button straight away (the bot also does this when they send /start).
for (const id of ADMIN_IDS.split(',').map((x) => x.trim()).filter(Boolean)) {
  await call('setChatMenuButton', {
    chat_id: Number(id),
    menu_button: { type: 'web_app', text: 'لوحة التحكم', web_app: { url: `${url}/admin` } },
  });
}

console.log(`Done. @${me.username} now opens ${url}`);
console.log(`Make sure "BOT_USERNAME": "${me.username}" is in wrangler.jsonc, then npm run deploy again if you changed it.`);
