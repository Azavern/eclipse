import type { ReactNode } from 'react';
import { VisuallyHidden } from './VisuallyHidden';

/**
 * Pembungkus label + kontrol + hint/error.
 *
 * Aturan a11y (§17.7): setiap input punya label terprogram, dan pesan error
 * terhubung lewat aria-describedby. "Wajib" ditulis sebagai teks, bukan hanya
 * warna, agar tidak bergantung pada penyebab warna.
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
    <div className="flex flex-col gap-1">
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
        <p id={errorId} className="text-small text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
