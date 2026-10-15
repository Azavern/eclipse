import { notFound } from 'next/navigation';
import { CalendarRange, ExternalLink, MapPin, UserRound } from 'lucide-react';
import { getViewer, requireView } from '@/lib/visibility/server';
import { getClassIdentity } from '@/features/class/queries';
import { getEventById } from '@/features/events/queries';
import { formatRange } from '@/lib/time';
import { StorageImage } from '@/components/storage/StorageImage';
import { Breadcrumb, PageHeader, Section } from '@/components/ui/Section';
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
 *
 * Baris fakta ringkas di bawah header memakai pola yang sama dengan detail tugas:
 * yang harus diketahui lebih dulu (kapan, di mana, siapa) terbaca sebelum
 * keterangan panjang (DESIGN.md Appendix D).
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
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={
          <Breadcrumb items={[{ href: '/events', label: 'Event' }, { label: event.title }]} />
        }
        title={event.title}
        description={formatRange(event.start_at, event.end_at, timezone)}
        action={
          canManage ? <ButtonLink href={`/events/${event.id}/edit`}>Ubah event</ButtonLink> : undefined
        }
      />

      {event.cover_path ? (
        <StorageImage
          path={event.cover_path}
          alt={`Cover ${event.title}`}
          width={1200}
          height={400}
          priority
          className="h-56 w-full rounded-lg border border-border-subtle object-cover md:h-72"
        />
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-md border border-border-subtle bg-surface p-4">
          <span className="icon-tile size-10" aria-hidden="true">
            <CalendarRange className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-caption text-text-muted">Waktu</span>
            <span className="tabular-nums text-body text-text">
              {formatRange(event.start_at, event.end_at, timezone)}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-md border border-border-subtle bg-surface p-4">
          <span className="icon-tile icon-tile-info size-10" aria-hidden="true">
            <MapPin className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-caption text-text-muted">Lokasi</span>
            <span className="text-body text-text">{event.location ?? 'Belum diisi'}</span>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-md border border-border-subtle bg-surface p-4">
          <span className="icon-tile-neutral size-10" aria-hidden="true">
            <UserRound className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-caption text-text-muted">Penyelenggara</span>
            <span className="text-body text-text">{event.organizer ?? 'Belum diisi'}</span>
          </div>
        </div>
      </div>

      <Section tier="primary" title="Keterangan" icon={<CalendarRange className="size-5" />}>
        <div className="flex flex-col gap-4">
          {event.description ? (
            <p data-pre-line className="max-w-prose text-body text-text">
              {event.description}
            </p>
          ) : (
            <p className="text-small text-text-muted">Event ini belum diberi keterangan.</p>
          )}

          {event.url ? (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 text-small font-semibold text-primary underline underline-offset-4"
            >
              Buka tautan event
              <ExternalLink aria-hidden="true" className="size-3.5" />
            </a>
          ) : null}
        </div>
      </Section>
    </div>
  );
}
