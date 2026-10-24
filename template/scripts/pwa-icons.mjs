// Turns the app-icon drawings (public/brand/icon-*.svg, from brand-art.py) into the PNGs phones need.
// Run: node scripts/pwa-icons.mjs
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// fileURLToPath, not .pathname: the folder names may contain non-ASCII (Arabic) characters.
const brand = fileURLToPath(new URL('../public/brand/', import.meta.url));
const out = fileURLToPath(new URL('../public/icons/', import.meta.url));
mkdirSync(out, { recursive: true });

const jobs = [
  ['icon-any.svg', 'icon-192.png', 192],
  ['icon-any.svg', 'icon-512.png', 512],
  ['icon-maskable.svg', 'maskable-512.png', 512],
  ['icon-any.svg', 'apple-touch-icon.png', 180],
];
for (const [src, file, size] of jobs) {
  await sharp(brand + src, { density: 300 }).resize(size, size).png().toFile(out + file);
  console.log('wrote icons/' + file);
}
