/**
 * Redirection target dari query string selalu tidak dipercaya (blueprint §23).
 * Hanya path relatif yang diterima. Penolakan `//` dan `/\` menutup dua bentuk
 * open redirect: protocol-relative (`//evil.com`) dan backslash yang dinormalisasi
 * browser menjadi slash (`/\evil.com`).
 */
export function safeRedirect(target: string | null | undefined, fallback = '/'): string {
  if (!target) return fallback;
  if (!target.startsWith('/')) return fallback;
  if (target.startsWith('//') || target.startsWith('/\\')) return fallback;
  // Tolak karakter kontrol/newline yang bisa menyisipkan header atau baris baru.
  if (/[\u0000-\u001f\u007f]/.test(target)) return fallback;
  return target;
}
