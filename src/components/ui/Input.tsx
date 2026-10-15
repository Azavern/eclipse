import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

/**
 * Kontrol formulir native. State yang didefinisikan (DESIGN.md §9): default,
 * focus, filled, error, disabled. Fokus ditangani satu kali oleh `:focus-visible`
 * global, sehingga kelas fokus tidak ditulis ulang per kontrol.
 *
 * Tinggi minimum memakai 44px (`min-h-11`), sama dengan tombol: satu baris
 * kontrol yang lebih pendek dari tombol di sebelahnya membuat form terlihat
 * tidak sejajar, dan target sentuh di bawah 44px melanggar lantai aksesibilitas
 * (DESIGN.md §10).
 */
const CONTROL =
  'w-full min-h-11 rounded-md border bg-surface px-3 py-2 text-body text-text ' +
  'placeholder:text-text-muted transition-func ' +
  'hover:border-text-muted ' +
  'disabled:cursor-not-allowed disabled:bg-surface-dim disabled:text-text-muted';

const INVALID = 'border-error';

/**
 * `aria-invalid` menandai kontrol untuk teknologi bantu; `aria-describedby`
 * disalin dari FormField supaya pesan error benar-benar diumumkan.
 */
export function Input({
  invalid = false,
  describedBy,
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; describedBy?: string }) {
  return (
    <input
      {...rest}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={`${CONTROL} ${invalid ? INVALID : 'border-control-border'} ${className}`}
    />
  );
}

export function Textarea({
  invalid = false,
  describedBy,
  className = '',
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean; describedBy?: string }) {
  return (
    <textarea
      {...rest}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={`${CONTROL} ${invalid ? INVALID : 'border-control-border'} ${className}`}
    />
  );
}

/**
 * Select native, bukan custom listbox: keyboard, screen reader, dan perilaku
 * mobile sudah benar tanpa menulis ulang (DESIGN.md §9: pakai komponen yang
 * sudah ada selama ia memenuhi kebutuhan; DESIGN.md §10: kontrol yang bisa
 * dioperasikan keyboard tanpa tambahan).
 */
export function Select({
  invalid = false,
  describedBy,
  className = '',
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean; describedBy?: string }) {
  return (
    <select
      {...rest}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={`${CONTROL} ${invalid ? INVALID : 'border-control-border'} ${className}`}
    >
      {children}
    </select>
  );
}
