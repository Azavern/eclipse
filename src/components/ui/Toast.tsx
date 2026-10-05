'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { CheckCircle2, X } from 'lucide-react';

/**
 * SATU pola notifikasi untuk seluruh aplikasi (§15.1).
 *
 * Notifikasi sukses dikirim lewat `toast.success(...)` dari Client Component
 * mana pun. `<Toaster />` dirender sekali di root layout, jadi tidak ada
 * formulir yang harus mengelola notifikasi sendiri.
 *
 * Hanya ada satu jenis notifikasi, dan itu disengaja: **error tidak lewat
 * sini**. Error aksi tampil inline di `FormStatus` dengan `role="alert"`
 * supaya menempel pada field yang bermasalah, dan error section tampil sebagai
 * `ErrorState` dengan tombol "Coba lagi". Toast untuk keduanya akan jauh dari
 * tempat pengguna sedang membaca.
 *
 * Store sengaja dibuat tanpa library: array di modul + `subscribe`. Snapshot
 * server selalu array kosong yang konstan supaya tidak ada ketidakcocokan
 * hidrasi ketika halaman datang dari cache Router.
 */

type ToastItem = {
  id: number;
  message: string;
};

/** Dipakai sebagai `getServerSnapshot`; harus referensi yang selalu sama. */
const EMPTY: ToastItem[] = [];

/** Lama notifikasi menetap sebelum ditutup otomatis atau oleh pengguna. */
const TOAST_TTL_MS = 5000;

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function push(message: string): void {
  items = [...items, { id: nextId++, message }];
  emit();
}

function dismiss(id: number): void {
  const next = items.filter((item) => item.id !== id);
  if (next.length !== items.length) {
    items = next;
    emit();
  }
}

/**
 * Pemanggil notifikasi. Dipakai Client Component setelah Server Action
 * (`useActionState`) selesai, karena Server Action tidak bisa menyentuh state
 * klien secara langsung.
 */
export const toast = {
  success: (message: string) => push(message),
};

/**
 * Wadah notifikasi. Sekali di root layout.
 *
 * Satu wilayah `aria-live="polite"` supaya pembaca layar dapat membaca pengumuman
 * baru tanpa memindahkan fokus. Letak di bawah navigasi bawah pada mobile agar
 * tidak menutupi target sentuh (§16).
 */
export function Toaster() {
  const current = useSyncExternalStore(subscribe, () => items, () => EMPTY);

  // Satu timer untuk notifikasi terlama; sisanya mengikuti saat ditutup.
  useEffect(() => {
    const oldest = current[0];
    if (!oldest) return;
    const timer = setTimeout(() => dismiss(oldest.id), TOAST_TTL_MS);
    return () => clearTimeout(timer);
  }, [current]);

  const dismissAll = useCallback(() => {
    items = [];
    emit();
  }, []);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex flex-col items-stretch gap-2 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-96"
    >
      {current.map((item) => (
        <div
          key={item.id}
          className="pointer-events-auto flex items-start gap-3 rounded-md border border-success bg-surface px-3 py-2 text-small"
        >
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
          <p className="flex-1 text-text">{item.message}</p>
          <button
            type="button"
            onClick={() => dismiss(item.id)}
            className="-me-1 -ms-1 flex size-8 shrink-0 items-center justify-center rounded-md text-text-muted transition-func hover:bg-surface-dim"
          >
            <X aria-hidden="true" className="size-4" />
            <span className="sr-only">Tutup notifikasi</span>
          </button>
        </div>
      ))}

      {/* Semua notifikasi bisa ditutup sekaligus lewat satu tombol; sekaligus
          menjadi jangkar fokus untuk pengguna keyboard. */}
      {current.length > 1 ? (
        <button
          type="button"
          onClick={dismissAll}
          className="pointer-events-auto self-end text-caption text-text-muted underline underline-offset-4"
        >
          Tutup semua
        </button>
      ) : null}
    </div>
  );
}