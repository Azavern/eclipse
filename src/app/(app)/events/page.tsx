import Link from 'next/link';
import { ChevronRight, Clock3, MapPin, Sparkles, UserRound } from 'lucide-react';
import { getViewer, requireView } from '@/lib/visibility/server';
import { getClassIdentity } from '@/features/class/queries';
import { getEvents } from '@/features/events/queries';
import { toEventWhen } from '@/features/events/schemas';
import { formatRange } from '@/lib/time';
import { PageHeader } from '@/components/ui/Section';
import { CARD_INTERACTIVE, CARD_TIER_CLASSES } from '@/components/ui/Card';
import { FilterTabs } from '@/components/ui/FilterTabs';
import { EmptyState, NoAccess } from '@/components/ui/States';
import { ButtonLink } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

/**
 * Daftar event dengan filter `?when=upcoming|past` (blueprint §10).
 *
 * Filter disimpan di URL supaya bisa di-bookmark dan dibagikan (blueprint §12).
 * Anonim hanya sampai ke halaman ini bila `page.events` memang terbuka untuknya;
 * RLS tetap menjaga barisnya.
 */
export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ when?: string }>;
}) {
  const gate = await requireView('page.events', '/events');
  if (!gate) {
    return (
      <NoAccess
        message="Halaman event belum dibuka untuk akunmu. Ketua kelas bisa mengubahnya."
        backHref="/"
      />
    );
  }

  const [{ when: rawWhen }, viewer, identity] = await Promise.all([
    searchParams,
    getViewer(),
    getClassIdentity(),
  ]);
  const when = toEventWhen(rawWhen);
  const events = await getEvents(when);
  const timezone = identity?.timezone ?? 'Asia/Jakarta';
  const canManage = viewer.can('events.manage');
  const past = when === 'past';

  const tabs = [
    { when: 'upcoming' as const, label: 'Mendatang', href: '/events' },
    { when: 'past' as const, label: 'Sudah lewat', href: '/events?when=past' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Event"
        description="Kegiatan kelas yang akan datang dan yang sudah berlangsung."
        action={canManage ? <ButtonLink href="/events/new">Buat event</ButtonLink> : undefined}
      />

      <FilterTabs
        label="Filter event"
        items={tabs.map((tab) => ({
          href: tab.href,
          label: tab.label,
          active: tab.when === when,
        }))}
      />

      {events.length === 0 ? (
        past ? (
          <EmptyState
            title="Belum ada event yang sudah lewat"
            description="Event yang sudah berlangsung akan tampil di sini."
          />
        ) : (
          <EmptyState
            icon={<Sparkles className="size-6" />}
            title="Belum ada event mendatang"
            description={
              canManage
                ? 'Tambahkan event agar semua anggota melihatnya.'
                : 'Kegiatan kelas akan muncul di sini.'
            }
            action={canManage ? { href: '/events/new', label: 'Buat event' } : undefined}
          />
        )
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((event) => (
            /*
             * Seluruh permukaan baris mengarah ke halaman event, jadi hover-lift
             * di sini bukan sinyal palsu (DESIGN.md §9).
             */
            <li key={event.id}>
              <Link
                href={`/events/${event.id}`}
                className={`${CARD_TIER_CLASSES.tertiary} ${CARD_INTERACTIVE} flex items-center gap-3 p-4`}
              >
                <span
                  className={`size-10 shrink-0 ${past ? 'icon-tile-neutral' : 'icon-tile'}`}
                  aria-hidden="true"
                >
                  <Sparkles className="size-5" />
                </span>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <h2 className="truncate text-body font-semibold text-text">{event.title}</h2>

                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-text-muted">
                    <span className="flex items-center gap-1">
                      <Clock3 aria-hidden="true" className="size-4 shrink-0" />
                      <span className="tabular-nums">
                        {formatRange(event.start_at, event.end_at, timezone)}
                      </span>
                    </span>
                    {event.location ? (
                      <span className="flex items-center gap-1">
                        <MapPin aria-hidden="true" className="size-4 shrink-0" />
                        {event.location}
                      </span>
                    ) : null}
                    {event.organizer ? (
                      <span className="flex items-center gap-1">
                        <UserRound aria-hidden="true" className="size-4 shrink-0" />
                        {event.organizer}
                      </span>
                    ) : null}
                  </p>
                </div>

                <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
