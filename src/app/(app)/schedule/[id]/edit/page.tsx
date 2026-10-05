import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/visibility/server';
import { getClassIdentity } from '@/features/class/queries';
import { getScheduleById } from '@/features/schedule/queries';
import { EditScheduleForm } from '@/features/schedule/components/ScheduleForm';
import { DEFAULT_TIMEZONE, utcIsoToLocalInput } from '@/lib/time';
import { PageHeader } from '@/components/ui/Section';
import { NoAccess } from '@/components/ui/States';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ubah jadwal — gate `schedule.manage`.
 *
 * Waktu tersimpan sebagai UTC; form menerima waktu dinding zona kelas
 * (`input type="datetime-local"`), jadi konversinya dilakukan di sini dengan
 * fungsi yang sama yang dipakai saat menyimpan (§14.4).
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

  const [schedule, identity] = await Promise.all([getScheduleById(id), getClassIdentity()]);
  if (!schedule) notFound();

  const timezone = identity?.timezone ?? DEFAULT_TIMEZONE;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Ubah jadwal"
        description="Kosongkan sebuah isian untuk menghapus nilainya."
      />

      <div className="max-w-form">
        <EditScheduleForm
          id={schedule.id}
          title={schedule.title}
          defaults={{
            title: schedule.title,
            description: schedule.description ?? '',
            start_at: utcIsoToLocalInput(schedule.start_at, timezone),
            end_at: utcIsoToLocalInput(schedule.end_at, timezone),
            location: schedule.location ?? '',
            type: schedule.type,
            url: schedule.url ?? '',
          }}
        />
      </div>
    </div>
  );
}
