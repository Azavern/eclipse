import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

/**
 * Badge selalu ikon + teks, tidak pernah titik warna atau warna saja.
 * Bentuknya kotak sudut tumpul (radius-sm), bukan kapsul bulat, agar konsisten
 * dengan karakter editorial sistem desain.
 */
const TONES: Record<BadgeTone, string> = {
  neutral: 'border-control-border text-text-muted bg-surface',
  info: 'border-secondary text-secondary bg-surface',
  success: 'border-success text-success bg-surface',
  warning: 'border-warning text-warning bg-surface',
  danger: 'border-error text-error bg-surface',
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
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-caption font-semibold ${TONES[tone]} ${className}`}
    >
      {icon ? <span aria-hidden="true" className="inline-flex">{icon}</span> : null}
      {children}
    </span>
  );
}
