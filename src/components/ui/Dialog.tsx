'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { IconButton } from './Button';
import { X } from 'lucide-react';

/**
 * Dialog berbasis elemen `<dialog>` native dengan showModal().
 *
 * Alasan memilih native (D-15): focus trap, Escape untuk menutup, dan inert
 * konten di belakang sudah ditangani browser, sehingga tidak perlu dependensi
 * dialog tambahan. Yang kita tambahkan hanya yang native tidak berikan:
 * state pending, error, dan pemulihan fokus.
 *
 * Layar penuh di mobile, terpusat di tablet/desktop (§16).
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  busy = false,
  error,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Aksi di footer sedang berjalan: tombol nonaktif, dialog tidak tertutup. */
  busy?: boolean;
  error?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      // Simpan elemen pemicu agar fokus kembali ke sana setelah ditutup (§17.7).
      triggerRef.current = document.activeElement;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Pemulihan fokus: kembalikan ke pemicu yang menyimpan konteks pengguna.
  useEffect(() => {
    if (open) return;
    const trigger = triggerRef.current;
    if (trigger instanceof HTMLElement && document.contains(trigger)) {
      trigger.focus();
      triggerRef.current = null;
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      aria-describedby={description ? 'dialog-description' : undefined}
      // Menutup dengan Escape tetap diizinkan walau ada aksi yang sedang berjalan:
      // pengguna boleh membatalkan, tapi footer menampilkan statusnya.
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-0 max-h-full w-full max-w-lg bg-surface p-0 text-text backdrop:bg-black/40 backdrop:backdrop-blur-[2px] md:m-auto md:rounded-lg md:p-0 open:flex open:flex-col"
    >
      <div className="flex items-start justify-between gap-4 border-b border-border-subtle p-4">
        <div className="flex flex-col gap-1">
          <h2 id="dialog-title" className="text-h3 font-semibold">
            {title}
          </h2>
          {description ? (
            <p id="dialog-description" className="text-small text-text-muted">
              {description}
            </p>
          ) : null}
        </div>
        <IconButton label="Tutup" onClick={onClose} disabled={busy}>
          <X aria-hidden="true" className="size-5" />
        </IconButton>
      </div>

      <div className="flex-1 overflow-y-auto p-4">{children}</div>

      {error ? (
        <p role="alert" className="border-t border-border-subtle px-4 py-3 text-small text-error">
          {error}
        </p>
      ) : null}

      {footer ? (
        <div className="flex flex-wrap justify-end gap-2 border-t border-border-subtle p-4">
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}
