import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/visibility/server';
import { getScheduleById, getScheduleSemesters } from '@/features/schedule/queries';
import { EditScheduleForm } from '@/features/schedule/components/ScheduleForm';
import { recentSemesters, sortSemestersDesc } from '@/lib/semester';
import { PageHeader } from '@/components/ui/Section';
import { NoAccess } from '@/components/ui/States';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ubah jadwal — gate `schedule.manage`.
 *
 * Tidak ada konversi waktu di sini: hari dan jam disimpan apa adanya sebagai
 * jam dinding zona kelas, jadi nilai dari database langsung dipakai sebagai
 * nilai awal form. Semester yang sedang dipakai baris ini selalu ikut masuk
 * daftar pilihan walau sudah tidak ditawarkan lagi.
 */
export default async function EditSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const gate = await requirePermission('schedule.manage');
  if (!gate) {
    return (
      <NoAccess
        message="Hanya pengelola kelas yang bisa mengubah jadwal."
        backHref="/schedule"
        backLabel="Kembali ke jadwal"
      />
    );
  }

  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const [schedule, stored] = await Promise.all([getScheduleById(id), getScheduleSemesters()]);
  if (!schedule) notFound();

  const semesters = sortSemestersDesc([...stored, ...recentSemesters(), schedule.semester]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Ubah jadwal"
        description="Perubahan berlaku untuk setiap minggu di semester ini."
      />

      <div className="max-w-form">
        <EditScheduleForm
          id={schedule.id}
          title={schedule.title}
          semesters={semesters}
          defaults={{
            title: schedule.title,
            description: schedule.description ?? '',
            day_of_week: String(schedule.day_of_week),
            start_time: schedule.start_time.slice(0, 5),
            end_time: schedule.end_time.slice(0, 5),
            semester: schedule.semester,
            location: schedule.location ?? '',
            type: schedule.type,
            url: schedule.url ?? '',
          }}
        />
      </div>
    </div>
  );
}
