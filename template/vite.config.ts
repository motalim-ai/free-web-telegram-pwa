import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cloudflare } from '@cloudflare/vite-plugin';

/** Gives public/sw.js a new id on every build, so phones drop the old cached version after each deploy. */
function stampServiceWorker(): Plugin {
  return {
    name: 'stamp-service-worker',
    apply: 'build',
    writeBundle(options) {
      const file = join(options.dir ?? '', 'sw.js');
      if (!existsSync(file)) return;
      writeFileSync(file, readFileSync(file, 'utf8').replace('__BUILD_ID__', Date.now().toString(36)));
    },
  };
}

// The Cloudflare plugin runs the Worker (API + D1 + KV) inside `npm run dev`, exactly like production.
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare(), stampServiceWorker()],
  server: { port: 5174, strictPort: true },
});
