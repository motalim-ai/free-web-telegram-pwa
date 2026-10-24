// Part of `npm run setup`: creates .dev.vars (local secrets) the first time. Safe to run again.
import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { DEV_VARS } from './dev-vars.mjs';

if (existsSync(DEV_VARS)) {
  console.log('.dev.vars already exists, left as it is.');
} else {
  writeFileSync(
    DEV_VARS,
    [
      '# Local secrets for `npm run dev` only. Never commit or share this file.',
      `SESSION_SECRET=${randomBytes(32).toString('hex')}`,
      '# One-click admin login on localhost (never set this on Cloudflare).',
      'DEV_LOGIN=1',
      '# Paste the token from @BotFather right after the = sign. Remove the # at the start of the line.',
      '# BOT_TOKEN=',
      '# Filled in by npm run bot:check:',
      '# ADMIN_IDS=',
      `WEBHOOK_SECRET=${randomBytes(24).toString('hex')}`,
      '',
    ].join('\n'),
  );
  console.log('Created .dev.vars');
}
