import { notFound } from 'next/navigation';
import { getViewer, requireView } from '@/lib/visibility/server';
import { getClassIdentity } from '@/features/class/queries';
import { getEventById } from '@/features/events/queries';
import { formatRange } from '@/lib/time';
import { StorageImage } from '@/components/storage/StorageImage';
import { PageHeader, Section } from '@/components/ui/Section';
import { NoAccess } from '@/components/ui/States';
import { ButtonLink } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Detail event — gate `page.events`.
 *
 * `null` dari query berarti baris tidak ada ATAU tidak terlihat viewer; dua-duanya
 * berakhir di `notFound()` yang sama supaya keberadaan event lain tidak bocor
 * dari perbedaan status (AC-EVENTS-4).
 */
export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const gate = await requireView('page.events', '/events');
  if (!gate) {
    return (
      <NoAccess
        message="Halaman event belum dibuka untuk akunmu. Ketua kelas bisa mengubahnya."
        backHref="/"
      />
    );
  }

  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const [event, identity, viewer] = await Promise.all([
    getEventById(id),
    getClassIdentity(),
    getViewer(),
  ]);
  if (!event) notFound();

  const timezone = identity?.timezone ?? 'Asia/Jakarta';
  const canManage = viewer.can('events.manage');

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={event.title}
        description={formatRange(event.start_at, event.end_at, timezone)}
        action={canManage ? <ButtonLink href={`/events/${event.id}/edit`}>Ubah event</ButtonLink> : undefined}
      />

      {event.cover_path ? (
        <StorageImage
          path={event.cover_path}
          alt={`Cover ${event.title}`}
          width={1200}
          height={400}
          priority
          className="w-full rounded-lg border border-border-subtle object-cover"
        />
      ) : null}

      <Section title="Keterangan">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-caption font-semibold text-text-muted">Lokasi</dt>
            <dd className="text-body text-text">{event.location ?? 'Belum diisi'}</dd>
          </div>
          <div>
            <dt className="text-caption font-semibold text-text-muted">Penyelenggara</dt>
            <dd className="text-body text-text">{event.organizer ?? 'Belum diisi'}</dd>
          </div>
        </dl>

        {event.description ? (
          <p className="whitespace-pre-line text-body text-text">{event.description}</p>
        ) : null}

        {event.url ? (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-small text-primary underline"
          >
            Buka tautan event
          </a>
        ) : null}
      </Section>
    </div>
  );
}
