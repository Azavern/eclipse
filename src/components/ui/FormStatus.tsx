'use client';

import type { FormState } from '@/lib/result';

/**
 * Pembungkus hasil aksi form. Pesan berhasil diumumkan dengan role="status"
 * (polite), sedangkan pesan error memakai role="alert" supaya langsung dibaca,
 * sesuai §15.1.
 *
 * Isi input tidak hilang saat error: `values` di echo oleh Server Action dan
 * dikembalikan ke field oleh masing-masing form.
 */
export function FormStatus({ state }: { state: FormState }) {
  if (!state) return null;

  if (state.ok) {
    return (
      <p
        role="status"
        className="rounded-md border border-success px-3 py-2 text-small text-success"
      >
        Berhasil disimpan.
      </p>
    );
  }

  return (
    <div
      role="alert"
      className="rounded-md border border-error px-3 py-2 text-small text-error"
    >
      {state.error.message}
    </div>
  );
}
