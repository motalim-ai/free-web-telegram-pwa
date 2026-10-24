/** Uploaded photos (img_<uuid> in KV) or the pictures shipped in public/demo and public/brand. */
export const isImageKey = (value: unknown): value is string =>
  typeof value === 'string' && (/^img_[0-9a-f-]{36}$/.test(value) || /^\/(demo|brand)\/[a-z0-9-]+\.(svg|webp|png|jpg)$/.test(value));
