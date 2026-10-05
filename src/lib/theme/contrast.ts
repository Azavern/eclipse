// Perhitungan kontras WCAG 2.x untuk validasi theme (blueprint §17.5).

/** Linearisasi satu channel sRGB 0-255 sesuai rumus WCAG. */
function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const int = Number.parseInt(match[1]!, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

/**
 * Luminansi relatif. Input bukan hex menghasilkan NaN, bukan angka, supaya
 * perbandingan mana pun yang memakainya gagal alih-alih kelihatannya benar.
 */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return Number.NaN;
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/**
 * Rasio kontras 1..21.
 *
 * Untuk input tidak valid mengembalikan 0 — fail CLOSED. Nilai 0 selalu gagal
 * ambang 4.5:1, sehingga tema rusak akan ditolak oleh ThemeSchema, bukan
 * diam-diam dianggap sangat kontras karena hex-nya dibaca sebagai hitam.
 */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (Number.isNaN(la) || Number.isNaN(lb)) return 0;

  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Hitam atau putih, mana yang kontrasnya lebih tinggi terhadap latar diberikan.
 * Untuk latar tidak valid, kembalikan putih sebagai pilihan konservatif.
 */
export function readableOn(background: string): string {
  if (Number.isNaN(relativeLuminance(background))) return '#FFFFFF';
  return contrastRatio('#FFFFFF', background) >= contrastRatio('#1C1B19', background)
    ? '#FFFFFF'
    : '#1C1B19';
}
