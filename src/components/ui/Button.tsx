import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { Spinner } from './Spinner';
import type { SpinnerSize } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

/**
 * Satu komponen dengan varian, bukan komponen terpisah per tampilan
 * (DESIGN.md §9). Styling hanya dari token runtime.
 *
 * State yang didefinisikan (DESIGN.md §9): default, hover, pressed,
 * focus-visible, disabled, loading. Gerakan hover/pressed-nya datang dari kelas
 * `.press` supaya sama dengan seluruh kontrol lain, bukan dari utility per
 * tombol.
 *
 * Kedua ukuran memenuhi target sentuh minimal 44px (DESIGN.md §10). Ukuran
 * "kecil" 32–36px yang disebut Appendix C sengaja TIDAK ditambahkan: aplikasi
 * ini dibuka dari ponsel, dan tombol di bawah 44px akan melanggar lantai
 * aksesibilitas yang di DESIGN.md §1 berperingkat lebih tinggi daripada
 * kerapatan.
 *
 * Komponen ini tidak memakai hook sehingga aman dipakai dari Server Component.
 * Untuk tombol submit yang mengikuti status form, pakai `SubmitButton`.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  /*
   * Tombol utama: satu-satunya elemen yang benar-benar "berisi" warna aksen di
   * halaman. `on-primary` sudah dijamin terbaca di atasnya oleh validator tema.
   * Kecerahan dinaikkan sedikit saat hover, bukan diganti warna kedua — supaya
   * palet kelas tetap tidak menuntut kita menebak hue pendampingnya.
   */
  primary:
    'bg-primary text-on-primary border border-primary hover:brightness-105 hover:shadow-medium',
  /*
   * Sekunder = tombol bergaris. Teks aksen di atas `surface` adalah pasangan
   * yang dijamin kontrasnya oleh ThemeSchema, jadi varian ini aman untuk palet
   * kelas mana pun. Saat hover ia membalik jadi bidang penuh.
   */
  secondary:
    'bg-surface text-primary border border-primary hover:bg-primary hover:text-on-primary hover:shadow-medium',
  // `ghost` tetap bergaris dan berpermukaan: tanpa keduanya ia terbaca sebagai
  // teks biasa, bukan sebagai tombol yang bisa ditekan. Yang membedakannya dari
  // `secondary` adalah warna garis, bukan ada-tidaknya garis.
  ghost:
    'bg-surface text-text-muted border border-border-strong hover:border-text-muted hover:bg-surface-dim hover:text-text',
  danger: 'bg-surface text-error border border-error hover:bg-error hover:text-on-primary',
};

const SIZES: Record<ButtonSize, string> = {
  md: 'text-label px-4 min-h-11 gap-2',
  lg: 'text-body px-6 min-h-12 gap-2',
};

const BASE =
  'press inline-flex items-center justify-center rounded-md font-semibold ' +
  'disabled:cursor-not-allowed disabled:opacity-55 ' +
  'disabled:hover:transform-none aria-busy:cursor-progress';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Spinner + aria-busy, tetapi label tetap terbaca (DESIGN.md §9). */
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
      className={`${BASE} ${VARIANTS[variant]} size-11 shrink-0 rounded-md p-0 ${className}`}
    >
      {loading ? <Spinner size="sm" /> : children}
    </button>
  );
}
