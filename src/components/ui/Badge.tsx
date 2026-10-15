import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

/**
 * Badge status: bentuk seragam (ikon + teks) dengan latar ber-tint dan garis
 * senada (DESIGN.md §6, „status chips“).
 *
 * Teksnya sengaja memakai `--color-text`, bukan warna hue-nya. ThemeSchema
 * hanya menjamin warna semantik kelas kontras ≥4.5:1 terhadap `surface` dan
 * `background` — duduk di atas latar ber-tint akan menurunkannya sedikit, dan
 * untuk palet kelas yang persis di ambang batas itu berarti jatuh di bawah AA.
 * Hue-nya tetap terbaca dari tiga tempat: latar tint, garis, dan ikon. Ikon
 * dihitung sebagai grafik bermakna, jadi ambangnya 3:1 (DESIGN.md §10), dan
 * ambang itu tetap terpenuhi.
 */
const TONES: Record<BadgeTone, string> = {
  neutral: 'border-border-strong bg-surface-dim text-text',
  info: 'border-info-edge bg-info-soft text-text',
  success: 'border-success-edge bg-success-soft text-text',
  warning: 'border-warning-edge bg-warning-soft text-text',
  danger: 'border-error-edge bg-error-soft text-text',
};

/** Warna ikon mengikuti hue-nya, bukan warna teks badge. */
const ICON_TONES: Record<BadgeTone, string> = {
  neutral: 'text-text-muted',
  info: 'text-secondary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-error',
};

export function Badge({
  tone = 'neutral',
  icon,
  children,
  className = '',
}: {
  tone?: BadgeTone;
  /** Ikon dekoratif; makna sudah dibawa oleh `children`. */
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-caption font-semibold ${TONES[tone]} ${className}`}
    >
      {icon ? (
        <span aria-hidden="true" className={`inline-flex ${ICON_TONES[tone]}`}>
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  );
}
