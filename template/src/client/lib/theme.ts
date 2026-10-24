/** Applies the store's color, and picks white or dark text on it so buttons stay readable whatever color the owner picks. */
export function applyBrand(hex: string) {
  const root = document.documentElement;
  root.style.setProperty('--brand', hex);
  root.style.setProperty('--on-brand', luminance(hex) > 0.45 ? '#261c16' : '#ffffff');
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
