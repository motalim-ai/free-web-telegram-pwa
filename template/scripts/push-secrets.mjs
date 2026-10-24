// npm run secrets:push
// Saves the production secrets on Cloudflare with `wrangler secret put`, passing each value through stdin
// so it never appears on screen. Run after the first `npm run deploy` (the Worker must exist).
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readVars, setVar } from './dev-vars.mjs';

let vars = readVars();
if (!vars.WEBHOOK_SECRET) {
  setVar('WEBHOOK_SECRET', randomBytes(24).toString('hex'));
  vars = readVars();
}

const secrets = {
  // A separate random key for the live site: sessions signed on a laptop never work in production.
  SESSION_SECRET: randomBytes(32).toString('hex'),
  BOT_TOKEN: vars.BOT_TOKEN,
  WEBHOOK_SECRET: vars.WEBHOOK_SECRET,
  ADMIN_IDS: vars.ADMIN_IDS,
};

let failed = false;
for (const [name, value] of Object.entries(secrets)) {
  if (!value) {
    console.log(`${name}: missing in .dev.vars (run npm run bot:check first)`);
    failed = true;
    continue;
  }
  try {
    const output = execFileSync('npx', ['wrangler', 'secret', 'put', name], {
      input: `${value}\n`,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });
    console.log(`${name}: ${/success/i.test(output) ? 'saved' : 'check the Cloudflare dashboard'}`);
  } catch (error) {
    // stderr from wrangler never contains the value (it was sent on stdin), so it is safe to show.
    console.log(`${name}: failed. ${String(error.stderr ?? '').split('\n').filter(Boolean).slice(-2).join(' ')}`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
