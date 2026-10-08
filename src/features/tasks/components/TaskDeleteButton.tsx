'use client';

import { useActionState, useState } from 'react';
import { X } from 'lucide-react';
import { deleteTask } from '@/features/tasks/actions';
import { IconButton } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormStatus } from '@/components/ui/FormStatus';

/**
 * Tombol hapus (X) di daftar tugas, dipakai baris yang sudah lewat tenggat.
 *
 * Tugas lewat tenggat tidak lagi ditawari tombol centang: yang masuk akal
 * adalah menghapusnya, karena barisnya tidak lagi relevan dikerjakan. Tugas
 * aktif lain tetap memakai `TaskCompleteForm`.
 *
 * Berdiri di modulnya sendiri dengan alasan yang sama seperti
 * `TaskCompleteForm`: daftar tugas tidak perlu mengirim seluruh isi
 * `TaskForm.tsx` ke browser hanya demi satu tombol (§12).
 *
 * Menghapus itu permanen, jadi selalu lewat `ConfirmDialog` yang menyebut
 * konsekuensinya — bukan konfirmasi "hapus?" yang ambigu (§7 §15.1). Aksinya
 * `deleteTask`, sama dengan di halaman detail; gate `tasks.manage` di dalamnya
 * tidak dilonggarkan oleh tombol ini. Aksi itu berakhir dengan
 * `redirect('/tasks')`, dan baris lewat tenggat memang hanya ada di tab Aktif
 * (`/tasks`), jadi pengguna mendarat pada tampilan yang sama dengan data
 * terbaru dari server.
 *
 * Ikon saja supaya setiap baris tidak mengulang kalimat yang sama; nama
 * aksesibelnya menyebut judul tugas, jadi pembaca layar mendengar
 * "Hapus tugas: <judul>" alih-alih deretan tombol identik.
 */
export function TaskDeleteButton({ id, title }: { id: string; title: string }) {
  const [removeState, removeAction] = useActionState(deleteTask, null);
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <IconButton
        type="button"
        label={`Hapus tugas: ${title}`}
        variant="danger"
        onClick={() => setConfirming(true)}
      >
        <X aria-hidden="true" className="size-5" />
      </IconButton>

      {/*
        Kegagalan aksi tampil inline di dekat barisnya. Jalur sukses berakhir
        pada redirect, jadi toast di bawah ini praktis tidak pernah muncul —
        tetap dipasang supaya kegagalan tidak hilang diam-diam.
      */}
      <FormStatus state={removeState} successMessage="Tugas dihapus." />

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={async () => {
          setConfirming(false);
          const fd = new FormData();
          fd.set('id', id);
          await removeAction(fd);
        }}
        title={`Hapus ${title}?`}
        consequence="Tugas ini akan dihapus permanen dan tidak dapat dibatalkan."
        confirmLabel="Hapus tugas"
        pendingLabel="Menghapus…"
      />
    </>
  );
}
