import Link from 'next/link';
import { getViewer, requireView } from '@/lib/visibility/server';
import { getClassIdentity } from '@/features/class/queries';
import { getEvents } from '@/features/events/queries';
import { toEventWhen } from '@/features/events/schemas';
import { formatRange } from '@/lib/time';
import { PageHeader, List, ListItem } from '@/components/ui/Section';
import { EmptyState, NoAccess } from '@/components/ui/States';
import { ButtonLink } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

/**
 * Daftar event dengan filter `?when=upcoming|past` (§10).
 *
 * Filter disimpan di URL supaya bisa di-bookmark dan dibagikan (§12). Anonim
 * hanya sampai ke halaman ini bila `page.events` memang terbuka untuknya; RLS
 * tetap menjaga barisnya.
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

  const tabs = [
    { when: 'upcoming' as const, label: 'Mendatang', href: '/events' },
    { when: 'past' as const, label: 'Sudah lewat', href: '/events?when=past' },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Event"
        description="Kegiatan kelas yang akan datang dan yang sudah berlangsung."
        action={canManage ? <ButtonLink href="/events/new">Buat event</ButtonLink> : undefined}
      />

      <nav aria-label="Filter event" className="flex flex-wrap gap-4 border-b border-border-subtle">
        {tabs.map((tab) => {
          const active = tab.when === when;
          return (
            <Link
              key={tab.when}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`-mb-px border-b-2 px-1 pb-2 text-label font-semibold transition-func ${
                active ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {events.length === 0 ? (
        when === 'upcoming' ? (
          <EmptyState
            title="Belum ada event mendatang"
            description={
              canManage
                ? 'Tambahkan event agar semua anggota melihatnya.'
                : 'Kegiatan kelas akan muncul di sini.'
            }
            action={canManage ? { href: '/events/new', label: 'Buat event' } : undefined}
          />
        ) : (
          <EmptyState
            title="Belum ada event yang sudah lewat"
            description="Event yang sudah berlangsung akan tampil di sini."
          />
        )
      ) : (
        <List>
          {events.map((event) => (
            <ListItem key={event.id} className="flex flex-col gap-1">
              <h2 className="text-body font-semibold text-text">{event.title}</h2>
              <p className="text-small text-text-muted">
                {formatRange(event.start_at, event.end_at, timezone)}
              </p>
              {event.location || event.organizer ? (
                <p className="text-small text-text-muted">
                  {[event.location, event.organizer].filter(Boolean).join(' · ')}
                </p>
              ) : null}
              <Link
                href={`/events/${event.id}`}
                className="mt-1 text-small text-primary underline"
              >
                Lihat event
              </Link>
            </ListItem>
          ))}
        </List>
      )}
    </div>
  );
}
