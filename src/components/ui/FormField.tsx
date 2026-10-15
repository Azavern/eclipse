import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { VisuallyHidden } from './VisuallyHidden';

/**
 * Pembungkus label + kontrol + hint/error.
 *
 * Aturan a11y (DESIGN.md §10): setiap input punya label terprogram, dan pesan
 * error terhubung lewat aria-describedby. "Wajib" ditulis sebagai teks, bukan
 * hanya warna, agar tidak bergantung pada warna saja.
 */
export function FormField({
  id,
  label,
  hint,
  error,
  required = false,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (describedBy: string | undefined) => ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-label font-semibold text-text">
        {label}
        {required ? (
          <>
            <span aria-hidden="true" className="text-error ms-1">
              *
            </span>
            <VisuallyHidden> (wajib diisi)</VisuallyHidden>
          </>
        ) : null}
      </label>

      {hint ? (
        <p id={hintId} className="text-caption text-text-muted">
          {hint}
        </p>
      ) : null}

      {children(describedBy)}

      {error ? (
        // Pesannya memakai token teks, bukan warna galat, supaya tetap ≥4.5:1
        // untuk palet kelas mana pun; statusnya dibawa oleh ikon di sebelahnya
        // (DESIGN.md §10: warna bukan satu-satunya pembawa makna).
        <p id={errorId} className="flex items-start gap-1.5 text-small text-text">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-error" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
