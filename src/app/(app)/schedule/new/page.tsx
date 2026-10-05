import { requirePermission } from '@/lib/visibility/server';
import { CreateScheduleForm } from '@/features/schedule/components/ScheduleForm';
import { PageHeader } from '@/components/ui/Section';
import { NoAccess } from '@/components/ui/States';

export const dynamic = 'force-dynamic';

/** Tambah jadwal — gate `schedule.manage` (§10). */
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

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Tambah jadwal"
        description="Waktu diisi dalam zona waktu kelas; sistem menyimpannya dalam UTC."
      />

      <div className="max-w-form">
        <CreateScheduleForm />
      </div>
    </div>
  );
}
