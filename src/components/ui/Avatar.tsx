/**
 * Avatar tanpa akses Storage, supaya aman dipakai dari komponen klien.
 *
 * `src` berisi URL yang SUDAH ditandatangani di server (lihat
 * `AvatarFromPath`), bukan path Storage — komponen ini tidak boleh menarik
 * modul server-only ke dalam client bundle.
 *
 * Fallback berupa inisial adalah informasi fungsional (menunjukkan siapa yang
 * sedang dilihat), bukan hiasan.
 */
const SIZES = {
  sm: 'size-8 text-caption',
  md: 'size-10 text-small',
  lg: 'size-16 text-h3',
  xl: 'size-24 text-h1',
} as const;

export type AvatarSize = keyof typeof SIZES;

export function Avatar({
  src,
  name,
  size = 'md',
}: {
  /** URL absolut yang sudah ditandatangani, atau null. */
  src?: string | null;
  name: string;
  size?: AvatarSize;
}) {
  const className = SIZES[size];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- optimizer tidak dipakai (§13.5)
      <img
        src={src}
        alt={name}
        className={`${className} rounded-full border border-border-subtle object-cover`}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <span
      // Fallback inisial tetap diumumkan sebagai teks yang dapat dibaca.
      role="img"
      aria-label={name}
      className={`${className} inline-flex items-center justify-center rounded-full border border-border-subtle bg-surface-dim font-semibold text-text-muted`}
    >
      {initials(name)}
    </span>
  );
}

/** Inisial dari satu atau dua kata pertama, maksimal dua huruf. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + second).toUpperCase();
}
