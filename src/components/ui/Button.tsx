import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { Spinner } from './Spinner';
import type { SpinnerSize } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

/**
 * Satu komponen dengan varian, bukan komponen terpisah per tampilan
 * (DESIGN.md §5). Styling hanya dari token runtime.
 *
 * State yang didefinisikan (§11.2): default, hover, pressed, focus-visible,
 * disabled, loading. Di mobile/tablet tinggi minimal 44px (§16).
 *
 * Komponen ini tidak memakai hook sehingga aman dipakai dari Server Component.
 * Untuk tombol submit yang mengikuti status form, pakai `SubmitButton`.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-on-primary border border-transparent hover:brightness-110 active:brightness-95',
  secondary:
    'bg-surface text-primary border border-primary hover:bg-primary hover:text-on-primary',
  ghost:
    'bg-transparent text-text-muted border border-transparent hover:bg-surface-dim hover:text-text',
  danger: 'bg-surface text-error border border-error hover:bg-error hover:text-on-primary',
};

const SIZES: Record<ButtonSize, string> = {
  md: 'text-label px-4 min-h-11 gap-2',
  lg: 'text-body px-6 min-h-12 gap-2',
};

const BASE =
  'inline-flex items-center justify-center rounded-md font-semibold transition-func ' +
  'disabled:cursor-not-allowed disabled:opacity-55 aria-busy:cursor-progress';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Spinner + aria-busy, tetapi label tetap terbaca (§11.2). */
  loading?: boolean;
  spinnerSize?: SpinnerSize;
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  spinnerSize = 'sm',
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading ? <Spinner size={spinnerSize} /> : null}
      {children}
    </button>
  );
}

type ButtonLinkProps = {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
};

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
}: ButtonLinkProps) {
  return (
    <Link href={href} className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}>
      {children}
    </Link>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /**
   * WAJIB. Tombol ikon tanpa nama aksesibel tidak dapat dioperasikan pembaca
   * layar, jadi tipe ini memaksa setiap pemakaian menyebut tujuannya.
   */
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
};

export function IconButton({
  label,
  variant = 'ghost',
  loading = false,
  className = '',
  children,
  disabled,
  ...rest
}: IconButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      // Ikon bersifat dekoratif; nama aksesibilitas berasal dari `label`.
      aria-label={label}
      title={label}
      className={`${BASE} ${VARIANTS[variant]} size-11 shrink-0 p-0 ${className}`}
    >
      {loading ? <Spinner size="sm" /> : children}
    </button>
  );
}
