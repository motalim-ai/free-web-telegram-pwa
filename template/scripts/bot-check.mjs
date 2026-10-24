// npm run bot:check
// Checks the bot token in .dev.vars and lists who sent /start, so the owner's Telegram id can be saved
// as ADMIN_IDS. Prints names and ids only, never the token.
// Works before `npm run bot:setup` (after the webhook is set, Telegram stops keeping messages for getUpdates).
import { botApi, fixCommentedToken, readVars, setVar } from './dev-vars.mjs';

if (fixCommentedToken()) console.log('Fixed: the BOT_TOKEN line started with "#", so it was ignored. Removed the "#".');

const { BOT_TOKEN: token, ADMIN_IDS } = readVars();
if (!token) {
  console.log('BOT_TOKEN: missing. Paste the token from @BotFather after BOT_TOKEN= in .dev.vars and save.');
  process.exit(1);
}
if (!/^\d+:[\w-]{30,}$/.test(token)) {
  console.log('BOT_TOKEN: does not look like a bot token (expected 123456789:ABC...). Check for spaces or quotes.');
  process.exit(1);
}

const me = await botApi(token, 'getMe');
if (!me.ok) {
  console.log(`BOT_TOKEN: Telegram rejected it (${me.description}). Copy it again from @BotFather.`);
  process.exit(1);
}
console.log(`Bot: @${me.result.username} (${me.result.first_name})`);

const hook = await botApi(token, 'getWebhookInfo');
if (hook.result?.url) {
  console.log(`Webhook already set to ${hook.result.url}; /start messages now go there, so ids are not listed here.`);
  console.log(ADMIN_IDS ? `ADMIN_IDS in .dev.vars: ${ADMIN_IDS}` : 'ADMIN_IDS is not set.');
  process.exit(0);
}

const updates = await botApi(token, 'getUpdates');
const people = new Map();
for (const update of updates.result ?? []) {
  const message = update.message;
  if (message?.chat?.type === 'private' && message.from) people.set(message.from.id, message.from);
}
if (people.size === 0) {
  console.log(`Nobody has messaged @${me.result.username} yet. Open it in Telegram and press Start (or send /start).`);
  process.exit(0);
}
console.log('People who messaged the bot:');
for (const person of people.values()) {
  console.log(`  ${person.first_name}${person.username ? ` @${person.username}` : ''}  id=${person.id}`);
}
if (people.size === 1 && !ADMIN_IDS) {
  const [owner] = people.values();
  setVar('ADMIN_IDS', String(owner.id));
  console.log(`Saved ADMIN_IDS=${owner.id} in .dev.vars (only one person messaged the bot). Confirm with the user it is them.`);
}
