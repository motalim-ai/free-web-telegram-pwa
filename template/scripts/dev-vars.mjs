// Reads and edits .dev.vars (local secrets). Shared by the bot and deploy scripts.
// Rule for every script here: never print a secret, not even inside an error message.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const DEV_VARS = fileURLToPath(new URL('../.dev.vars', import.meta.url));

export function readVars() {
  if (!existsSync(DEV_VARS)) return {};
  return Object.fromEntries(
    readFileSync(DEV_VARS, 'utf8')
      .split('\n')
      .filter((line) => /^\w+=/.test(line))
      .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]),
  );
}

/** Sets NAME=value in .dev.vars, replacing an existing or commented-out (# NAME=) line. */
export function setVar(name, value) {
  const text = existsSync(DEV_VARS) ? readFileSync(DEV_VARS, 'utf8') : '';
  const line = new RegExp(`^#?\\s*${name}=.*$`, 'm');
  writeFileSync(DEV_VARS, line.test(text) ? text.replace(line, `${name}=${value}`) : `${text.trimEnd()}\n${name}=${value}\n`);
}

/**
 * The token pasted after "# BOT_TOKEN=" still counts as a comment; beginners often leave the "#".
 * If such a line holds a token, uncomment it (without ever showing it).
 */
export function fixCommentedToken() {
  if (!existsSync(DEV_VARS)) return false;
  const text = readFileSync(DEV_VARS, 'utf8');
  const fixed = text.replace(/^#\s*BOT_TOKEN=\s*(\d+:[\w-]{30,})\s*$/m, 'BOT_TOKEN=$1');
  if (fixed === text) return false;
  writeFileSync(DEV_VARS, fixed);
  return true;
}

/** Calls the Bot API. Errors never include the URL, because the URL contains the token. */
export async function botApi(token, method, body = {}) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await response.json();
  } catch (error) {
    return { ok: false, description: `network error (${error?.name ?? 'unknown'})` };
  }
}
