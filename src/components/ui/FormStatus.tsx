'use client';

import { useEffect, useRef } from 'react';
import { toast } from '@/components/ui/Toast';
import type { FormState } from '@/lib/result';

/**
 * Pembungkus hasil aksi form — SATU tempat umpan balik untuk semua Server
 * Action (§15.1).
 *
 * Error tetap inline dengan `role="alert"` supaya muncul dekat field yang
 * bermasalah dan terhubung ke input lewat `aria-describedby`. Sukses dikirim
 * sebagai notifikasi lewat `toast`, bukan kotak yang menetap di form: kotak
 * SUCCESS lama selalu menampilkan teks yang sama dan tidak pernah hilang.
 *
 * Isi input tidak hilang saat error: `values` di-echo oleh Server Action dan
 * dikembalikan ke field oleh masing-masing form.
 */
export function FormStatus({
  state,
  successMessage = 'Perubahan tersimpan.',
}: {
  state: FormState;
  /** Pesan sukses yang spesifik per aksi, mis. "Portofolio tersimpan." */
  successMessage?: string;
}) {
  // Notifikasi harus tepat satu kali per hasil aksi, bukan sekali per render.
  const announced = useRef<FormState>(null);

  useEffect(() => {
    if (!state) {
      announced.current = null;
      return;
    }
    if (state.ok && announced.current !== state) {
      announced.current = state;
      toast.success(successMessage);
    }
  }, [state, successMessage]);

  if (!state || state.ok) return null;

  return (
    <div
      role="alert"
      className="rounded-md border border-error px-3 py-2 text-small text-error"
    >
      {state.error.message}
    </div>
  );
}