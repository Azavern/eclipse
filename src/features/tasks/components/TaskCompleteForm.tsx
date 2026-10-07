'use client';

import { useActionState } from 'react';
import { Check } from 'lucide-react';
import { setTaskStatus } from '@/features/tasks/actions';
import { IconSubmitButton } from '@/components/ui/SubmitButton';
import { FormStatus } from '@/components/ui/FormStatus';

/**
 * Tombol centang di daftar tugas: menandai satu tugas selesai tanpa harus membuka
 * halamannya dulu.
 *
 * Berdiri di modulnya sendiri, bukan menumpang `TaskForm.tsx`: modul itu memuat
 * seluruh form tugas (input, select, textarea, dialog konfirmasi), dan daftar
 * tugas tidak perlu mengirim semua itu ke browser hanya demi satu tombol (§12).
 *
 * Ikon saja supaya setiap baris tidak mengulang kalimat yang sama; sisa ruangnya
 * dipakai tombol "Detail". Nama aksesibelnya menyebut judul tugas, jadi pembaca
 * layar mendengar "Tandai selesai: <judul>" alih-alih deretan tombol identik.
 *
 * Aksinya `setTaskStatus` yang sama dengan halaman detail — termasuk gate
 * `tasks.manage` di dalamnya, jadi izinnya tidak dilonggarkan oleh tombol ini.
 * Tidak ada state klien yang disinkronkan: Server Action memanggil
 * `revalidatePath`, jadi barisnya mengikuti status terbaru dari server.
 */
export function TaskCompleteForm({ id, title }: { id: string; title: string }) {
  const [state, action] = useActionState(setTaskStatus, null);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value="completed" />
      <IconSubmitButton label={`Tandai selesai: ${title}`} variant="secondary">
        <Check aria-hidden="true" className="size-5" />
      </IconSubmitButton>
      <FormStatus state={state} successMessage="Tugas ditandai selesai." />
    </form>
  );
}
