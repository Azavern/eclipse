import Link from 'next/link';
import { BookOpen, CalendarDays, ListChecks, Ticket } from 'lucide-react';
import { getViewer, requireView } from '@/lib/visibility/server';
import { getClassIdentity } from '@/features/class/queries';
import { getScheduleEntries, type ScheduleEntry } from '@/features/schedule/queries';
import { dayKey, formatDay, formatTime, formatTimeRange } from '@/lib/time';
import { PageHeader, Section, List, ListItem } from '@/components/ui/Section';
import { EmptyState, NoAccess } from '@/components/ui/States';
import { ButtonLink } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

/**
 * Label tipe selalu teks + ikon, bukan warna saja (§17.7, AC-SCHEDULE-2).
 * Ikon dirender di Server Component — tidak menyeberangi batas klien.
 */
const TYPE_META = {
  class: { label: 'Jadwal kuliah', Icon: BookOpen },
  activity: { label: 'Kegiatan', Icon: CalendarDays },
  event: { label: 'Event', Icon: Ticket },
  task: { label: 'Tenggat', Icon: ListChecks },
} as const;

/** Waktu baris: rentang untuk kegiatan, jam tunggal untuk tenggat tugas. */
function entryTime(entry: ScheduleEntry, timezone: string): string {
  if (entry.kind === 'task') return formatTime(entry.at, timezone);
  return formatTimeRange(entry.at, entry.until, timezone);
}

/**
 * Halaman jadwal gabungan (§19, V-08).
 *
 * Menggabungkan `schedules`, `events`, dan tenggat `tasks` aktif secara
 * read-only; RLS sudah menyaring sumber yang tidak boleh dilihat viewer, jadi
 * entri tersembunyi tidak pernah sampai ke halaman ini. Daftar dikelompokkan
 * per hari menurut timezone kelas, bukan timezone browser.
 */
export default async function SchedulePage() {
  const gate = await requireView('page.schedule', '/schedule');
  if (!gate) {
    return (
      <NoAccess
        message="Jadwal kelas belum dibuka untuk akunmu. Ketua kelas bisa mengubahnya."
        backHref="/"
      />
    );
  }

  const [viewer, identity, entries] = await Promise.all([
    getViewer(),
    getClassIdentity(),
    getScheduleEntries(),
  ]);
  const timezone = identity?.timezone ?? 'Asia/Jakarta';
  const canManage = viewer.can('schedule.manage');

  // Entri sudah urut waktu, jadi pengelompokan cukup satu lintasan.
  const days: { key: string; label: string; entries: ScheduleEntry[] }[] = [];
  for (const entry of entries) {
    const key = dayKey(entry.at, timezone);
    const last = days[days.length - 1];
    if (last && last.key === key) {
      last.entries.push(entry);
    } else {
      days.push({ key, label: formatDay(entry.at, timezone), entries: [entry] });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Jadwal"
        description="Jadwal kuliah, kegiatan, event, dan tenggat tugas dalam satu daftar."
        action={canManage ? <ButtonLink href="/schedule/new">Tambah jadwal</ButtonLink> : undefined}
      />

      {days.length === 0 ? (
        <EmptyState
          title="Belum ada jadwal"
          description={
            canManage
              ? 'Tambahkan jadwal kuliah atau kegiatan agar semua anggota melihatnya.'
              : 'Jadwal kuliah dan kegiatan kelas akan tampil di sini.'
          }
          action={canManage ? { href: '/schedule/new', label: 'Tambah jadwal' } : undefined}
        />
      ) : (
        days.map((day) => (
          <Section key={day.key} title={day.label}>
            <List>
              {day.entries.map((entry) => {
                const meta = TYPE_META[entry.kind];
                const Icon = meta.Icon;
                return (
                  <ListItem key={`${entry.kind}-${entry.id}`}>
                    <article className="flex flex-col gap-1">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-text-muted">
                        <Icon aria-hidden="true" className="size-4 shrink-0" />
                        <span className="font-semibold">{meta.label}</span>
                        <span>{entryTime(entry, timezone)}</span>
                      </p>

                      <h3 className="text-body font-semibold text-text">{entry.title}</h3>

                      {entry.location ? (
                        <p className="text-small text-text-muted">{entry.location}</p>
                      ) : null}

                      {/* Jadwal tidak punya halaman detail: deskripsi dan tautan
                          dibuka di baris ini lewat disclosure native. */}
                      {entry.kind !== 'event' && entry.kind !== 'task' ? (
                        <>
                          {entry.description || entry.url ? (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-small font-semibold text-primary underline">
                                Detail
                              </summary>
                              <div className="mt-2 flex flex-col gap-2">
                                {entry.description ? (
                                  <p className="whitespace-pre-line text-small text-text">
                                    {entry.description}
                                  </p>
                                ) : null}
                                {entry.url ? (
                                  <a
                                    href={entry.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-small text-primary underline"
                                  >
                                    Buka tautan
                                  </a>
                                ) : null}
                              </div>
                            </details>
                          ) : null}

                          {canManage ? (
                            <Link
                              href={`/schedule/${entry.id}/edit`}
                              className="mt-1 text-small text-primary underline"
                            >
                              Ubah
                            </Link>
                          ) : null}
                        </>
                      ) : null}

                      {entry.kind === 'event' ? (
                        <Link
                          href={`/events/${entry.id}`}
                          className="mt-1 text-small text-primary underline"
                        >
                          Lihat event
                        </Link>
                      ) : null}

                      {entry.kind === 'task' ? (
                        <Link
                          href={`/tasks/${entry.id}`}
                          className="mt-1 text-small text-primary underline"
                        >
                          Lihat tugas
                        </Link>
                      ) : null}
                    </article>
                  </ListItem>
                );
              })}
            </List>
          </Section>
        ))
      )}
    </div>
  );
}
