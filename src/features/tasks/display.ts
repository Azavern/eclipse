import { AlertTriangle, Archive, CheckCircle2, Clock, type LucideIcon } from 'lucide-react';
import type { BadgeTone } from '@/components/ui/Badge';
import type { TaskDisplayStatus } from '@/lib/time/domain';

/**
 * Label, tone, dan ikon untuk setiap status tampilan tugas.
 *
 * Satu definisi dipakai daftar dan halaman detail supaya labelnya tidak bisa
 * berbeda di antara keduanya. Badge selalu ikon + teks; warna hanya penguat,
 * bukan pembawa makna (§17.7).
 */
export const TASK_DISPLAY_META: Record<
  TaskDisplayStatus,
  { label: string; tone: BadgeTone; Icon: LucideIcon }
> = {
  overdue: { label: 'Lewat tenggat', tone: 'danger', Icon: AlertTriangle },
  due_soon: { label: 'Segera berakhir', tone: 'warning', Icon: Clock },
  completed: { label: 'Selesai', tone: 'success', Icon: CheckCircle2 },
  archived: { label: 'Arsip', tone: 'neutral', Icon: Archive },
  active: { label: 'Aktif', tone: 'neutral', Icon: Clock },
};
