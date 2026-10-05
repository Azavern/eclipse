import type { TaskStatus } from '@/lib/supabase/database.types';

/**
 * Ambang "due soon" dalam jam (A-09). Dikirim juga ke RPC get_home_overview
 * supaya angka di Home dan di halaman Tugas memakai definisi yang sama.
 */
export const DUE_SOON_HOURS = 72;

export type TaskDisplayStatus = 'completed' | 'archived' | 'overdue' | 'due_soon' | 'active';

export const TASK_STATUS_LABEL: Record<TaskDisplayStatus, string> = {
  active: 'Aktif',
  due_soon: 'Segera berakhir',
  overdue: 'Lewat tenggat',
  completed: 'Selesai',
  archived: 'Diarsipkan',
};

/**
 * Status turunan untuk tampilan. Tidak disimpan di DB: hanya `active|completed|
 * archived` yang persisted, sisanya dihitung dari deadline (§19).
 *
 * `now` disuntikkan agar fungsi ini murni dan bisa dites tanpa jam sistem.
 */
export function taskDisplayStatus(
  task: { status: TaskStatus; deadline: Date | string },
  now: Date,
): TaskDisplayStatus {
  if (task.status === 'completed') return 'completed';
  if (task.status === 'archived') return 'archived';

  const deadline =
    task.deadline instanceof Date ? task.deadline : new Date(task.deadline);
  if (deadline.getTime() < now.getTime()) return 'overdue';
  if (deadline.getTime() - now.getTime() <= DUE_SOON_HOURS * 3_600_000) return 'due_soon';
  return 'active';
}

/**
 * Username awal dari nama lengkap: huruf kecil, diakritik dihapus, karakter
 * lain menjadi `_`, panjang 3-30, dan bentrok diselesaikan dengan sufiks
 * angka (§9.6). `taken` dipakai agar kandidat berikutnya dicoba.
 */
export function slugifyUsername(fullName: string, taken: ReadonlySet<string> = new Set()): string {
  const base =
    fullName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // tanda diakritik gabungan
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 30) || 'anggota';

  const root = base.length >= 3 ? base : base.padEnd(3, '_');
  if (!taken.has(root)) return root;

  for (let n = 2; n <= 99; n += 1) {
    const suffix = `_${n}`;
    const candidate = `${root.slice(0, 30 - suffix.length)}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }

  // Kasus sangat jarang (>99 bentrok): tambahkan angka turunan dari nama.
  return `${root.slice(0, 26)}_${(root.length % 90) + 10}`;
}

/** Event/schedule yang masih berjalan atau akan datang tetap ditampilkan (§19). */
export function isUpcoming(endIso: string, now: Date): boolean {
  return new Date(endIso).getTime() >= now.getTime();
}
