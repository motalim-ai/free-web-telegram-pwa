import type { Env } from './env';

const ALLOWED = ['image/webp', 'image/jpeg', 'image/png'];
const MAX_BYTES = 3 * 1024 * 1024;

/**
 * Images live in Workers KV (free, no card needed). The browser shrinks them before upload,
 * so a product photo is usually 100–300 KB.
 */
export async function saveImage(env: Env, file: File, prefix: 'img' | 'rcpt'): Promise<{ key: string } | { error: string }> {
  if (!ALLOWED.includes(file.type)) return { error: 'الصورة يجب أن تكون JPG أو PNG أو WebP' };
  if (file.size > MAX_BYTES) return { error: 'الصورة أكبر من 3 ميجا' };
  const key = `${prefix}_${crypto.randomUUID()}`;
  await env.KV.put(key, await file.arrayBuffer(), { metadata: { type: file.type } });
  return { key };
}

export async function imageResponse(env: Env, key: string, cacheControl: string) {
  const { value, metadata } = await env.KV.getWithMetadata<{ type: string }>(key, 'arrayBuffer');
  if (!value) return new Response('Not found', { status: 404 });
  return new Response(value, {
    headers: {
      'content-type': metadata?.type ?? 'image/webp',
      'cache-control': cacheControl,
      'x-content-type-options': 'nosniff',
    },
  });
}
