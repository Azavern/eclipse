'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, type ButtonSize, type ButtonVariant } from './Button';

/**
 * Tombol submit yang mengikuti status form: disabled + aria-busy selama aksi
 * berjalan, sehingga double-submit tidak mungkin terjadi (§9.3).
 *
 * `pendingLabel` mengganti teks selama proses agar tombol tidak menyusut; label
 * tetap terbaca pembaca layar lewat aria-busy.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = 'primary',
  size = 'md',
  className,
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      loading={pending}
      className={className}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
