/**
 * Shrinks a photo in the browser before upload (max 1600px, WebP), so a 5 MB phone photo becomes ~200 KB.
 * That keeps the free KV storage going a long way.
 */
export async function shrinkImage(file: File, maxSide = 1600): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('اختر ملف صورة');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85));
  // Older Safari can't encode WebP and returns PNG; fall back to JPEG to keep it small.
  const final =
    blob && blob.type === 'image/webp'
      ? blob
      : await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!final) throw new Error('تعذّر تجهيز الصورة');
  return new File([final], final.type === 'image/webp' ? 'photo.webp' : 'photo.jpg', { type: final.type });
}
