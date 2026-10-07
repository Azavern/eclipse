'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, IconButton, type ButtonSize, type ButtonVariant } from './Button';

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
  disabled,
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  /** Menonaktifkan tombol selain saat aksi sedang berjalan. */
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      loading={pending}
      disabled={disabled}
      className={className}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}

/**
 * Versi ikon dari `SubmitButton`, untuk aksi yang sudah jelas dari ikonnya —
 * mis. tombol centang di daftar tugas, tempat label teks akan mengulang kalimat
 * yang sama di setiap baris.
 *
 * `label` wajib dengan alasan yang sama seperti `IconButton`: tombol ikon tanpa
 * nama aksesibel tidak bisa dioperasikan pembaca layar. Karena itu pemanggilnya
 * perlu menyebut objek aksinya, bukan hanya "Tandai selesai".
 */
export function IconSubmitButton({
  label,
  variant = 'ghost',
  className,
  disabled,
  children,
}: {
  label: string;
  variant?: ButtonVariant;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <IconButton
      type="submit"
      label={label}
      variant={variant}
      loading={pending}
      disabled={disabled}
      className={className}
    >
      {children}
    </IconButton>
  );
}
