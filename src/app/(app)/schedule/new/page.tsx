import { requirePermission } from '@/lib/visibility/server';
import { getScheduleSemesters } from '@/features/schedule/queries';
import { CreateScheduleForm } from '@/features/schedule/components/ScheduleForm';
import { recentSemesters, semesterFor, sortSemestersDesc } from '@/lib/semester';
import { PageHeader } from '@/components/ui/Section';
import { CARD_BASE, CARD_TIER_CLASSES } from '@/components/ui/Card';
import { NoAccess } from '@/components/ui/States';

export const dynamic = 'force-dynamic';

/**
 * Tambah jadwal — gate `schedule.manage` (§10).
 *
 * Daftar semester digabung dengan semester yang sudah ada di database, supaya
 * jadwal semester lama pun bisa ditambah atau diperbaiki.
 */
export default async function NewSchedulePage() {
  const gate = await requirePermission('schedule.manage');
  if (!gate) {
    return (
      <NoAccess
        message="Hanya pengelola kelas yang bisa menambah jadwal."
        backHref="/schedule"
        backLabel="Kembali ke jadwal"
      />
    );
  }

  const stored = await getScheduleSemesters();
  const semesters = sortSemestersDesc([...stored, ...recentSemesters()]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Tambah jadwal"
        description="Cukup hari dan jam: jadwal berlaku setiap minggu sepanjang semester, jadi tidak perlu diisi ulang tiap minggu."
      />

      <div className={`${CARD_BASE} ${CARD_TIER_CLASSES.primary} max-w-form p-5`}>
        <CreateScheduleForm semesters={semesters} defaultSemester={semesterFor(new Date())} />
      </div>
    </div>
  );
}
