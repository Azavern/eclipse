import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/visibility/server';
import { getClassIdentity } from '@/features/class/queries';
import { getEventById } from '@/features/events/queries';
import { EditEventForm } from '@/features/events/components/EventForm';
import { DEFAULT_TIMEZONE, utcIsoToLocalInput } from '@/lib/time';
import { StorageImage } from '@/components/storage/StorageImage';
import { PageHeader } from '@/components/ui/Section';
import { NoAccess } from '@/components/ui/States';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ubah event — gate `events.manage`; waktu dikembalikan ke waktu dinding kelas. */
export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const gate = await requirePermission('events.manage');
  if (!gate) {
    return (
      <NoAccess
        message="Hanya pengelola kelas yang bisa mengubah event."
        backHref="/events"
        backLabel="Kembali ke event"
      />
    );
  }

  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const [event, identity] = await Promise.all([getEventById(id), getClassIdentity()]);
  if (!event) notFound();

  const timezone = identity?.timezone ?? DEFAULT_TIMEZONE;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Ubah event" description="Kosongkan sebuah isian untuk menghapus nilainya." />

      <div className="flex max-w-form flex-col gap-6">
        {event.cover_path ? (
          <StorageImage
            path={event.cover_path}
            alt={`Cover ${event.title} saat ini`}
            width={800}
            height={320}
            className="w-full rounded-lg border border-border-subtle object-cover"
          />
        ) : null}

        <EditEventForm
          id={event.id}
          title={event.title}
          hasCover={Boolean(event.cover_path)}
          defaults={{
            title: event.title,
            description: event.description ?? '',
            start_at: utcIsoToLocalInput(event.start_at, timezone),
            end_at: utcIsoToLocalInput(event.end_at, timezone),
            location: event.location ?? '',
            organizer: event.organizer ?? '',
            url: event.url ?? '',
          }}
        />
      </div>
    </div>
  );
}
