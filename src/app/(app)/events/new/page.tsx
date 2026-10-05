import { requirePermission } from '@/lib/visibility/server';
import { CreateEventForm } from '@/features/events/components/EventForm';
import { PageHeader } from '@/components/ui/Section';
import { NoAccess } from '@/components/ui/States';

export const dynamic = 'force-dynamic';

/** Buat event — gate `events.manage` (§10). */
export default async function NewEventPage() {
  const gate = await requirePermission('events.manage');
  if (!gate) {
    return (
      <NoAccess
        message="Hanya pengelola kelas yang bisa membuat event."
        backHref="/events"
        backLabel="Kembali ke event"
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Buat event"
        description="Waktu diisi dalam zona waktu kelas; sistem menyimpannya dalam UTC."
      />

      <div className="max-w-form">
        <CreateEventForm />
      </div>
    </div>
  );
}
