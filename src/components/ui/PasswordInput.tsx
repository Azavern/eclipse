'use client';

import { useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from './Input';
import { IconButton } from './Button';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  invalid?: boolean;
  describedBy?: string;
  /**
   * Nama tombol untuk pembaca layar. Wajib diisi kalau satu form punya lebih
   * dari satu field sandi, supaya tiap tombol bisa dibedakan.
   */
  toggleLabel?: string;
};

/**
 * Input kata sandi dengan tombol tampil/sembunyikan.
 *
 * Menyembunyikan adalah pilihan yang benar secara default, tapi memeriksa isi
 * sandi yang baru diketik (huruf kapital kelewat, salah ketik) adalah
 * kebutuhan nyata — terutama di ruang bersama. Tombolnya mengambang di dalam
 * kanan field, sama seperti mock login dan aktivasi.
 *
 * Yang diubah hanya atribut `type` antara `password` dan `text`. Nilai
 * keyboard tidak pernah masuk state React, jadi tidak ada salinan sandi di
 * memori peramban (§9.3), dan karena field-nya uncontrolled, isian tetap utuh
 * saat tipe ditukar.
 *
 * Tombol memakai pola toggle button ARIA: nama aksesibelnya tetap, keadaan
 * diumumkan lewat `aria-pressed`. Mengganti nama tombol setiap klik membuat
 * pembaca layar membacakan aksi, bukan keadaan tombolnya.
 */
export function PasswordInput({
  invalid = false,
  describedBy,
  className = '',
  toggleLabel = 'Tampilkan kata sandi',
  ...rest
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input
        {...rest}
        type={visible ? 'text' : 'password'}
        invalid={invalid}
        describedBy={describedBy}
        // Ruang kanan untuk tombol, supaya isian panjang tidak tertutup ikon.
        className={`pe-12 ${className}`}
      />
      <IconButton
        // type="button" wajib: tanpa itu tombol ikut men-submit form.
        type="button"
        label={toggleLabel}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 end-0 h-auto"
      >
        <Icon aria-hidden="true" className="size-5 shrink-0" />
      </IconButton>
    </div>
  );
}
