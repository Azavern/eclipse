import Link from 'next/link';
import { BookOpen, CalendarDays } from 'lucide-react';
import { getViewer, requireView } from '@/lib/visibility/server';
import { getClassIdentity } from '@/features/class/queries';
import {
  getScheduleSemesters,
  getSchedulesBySemester,
} from '@/features/schedule/queries';
import { SCHEDULE_TYPE_LABEL, WEEKDAYS } from '@/features/schedule/schemas';
import { ScheduleFilters } from '@/features/schedule/components/ScheduleFilters';
import { DEFAULT_TIMEZONE, formatWallTimeRange } from '@/lib/time';
import { isSemester, recentSemesters, semesterFor, sortSemestersDesc } from '@/lib/semester';
import { PageHeader, Section } from '@/components/ui/Section';
import { CARD_TIER_CLASSES } from '@/components/ui/Card';
import { EmptyState, NoAccess } from '@/components/ui/States';
import { ButtonLink } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

/**
 * Label jenis selalu teks + ikon, bukan warna saja (§17.7). Ikon dirender di
 * Server Component — tidak menyeberangi batas klien.
 */
const TYPE_ICON = { class: BookOpen, activity: CalendarDays } as const;

/**
 * Halaman jadwal kuliah (§19).
 *
 * Jadwal itu jadwal **kuliah**: berulang mingguan sepanjang satu semester, jadi
 * barisnya menyimpan hari + jam, bukan tanggal. Event dan tugas punya halamannya
 * sendiri (`/events`, `/tasks`) dan tidak lagi digabung di sini.
 *
 * Pilihan semester dan hari hidup di URL (`?semester=…&day=…`), jadi daftar
 * bisa di-bookmark dan dibagikan; semester lama tetap tersimpan dan tetap bisa
 * dibuka lewat penyaring semester.
 */
export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ semester?: string; day?: string }>;
}) {
  const gate = await requireView('page.schedule', '/schedule');
  if (!gate) {
    return (
      <NoAccess
        message="Jadwal kelas belum dibuka untuk akunmu. Ketua kelas bisa mengubahnya."
        backHref="/"
      />
    );
  }

  const [viewer, identity, stored, params] = await Promise.all([
    getViewer(),
    getClassIdentity(),
    getScheduleSemesters(),
    searchParams,
  ]);
  const timezone = identity?.timezone ?? DEFAULT_TIMEZONE;

  // Semester: nilai di URL dulu (divalidasi bentuknya), lalu semester berjalan
  // bila sudah punya jadwal, lalu semester terbaru yang punya jadwal — supaya
  // kelas yang belum mengisi jadwal semester ini tetap melihat jadwal terakhir.
  const requested = params.semester?.trim() ?? '';
  const current = semesterFor(new Date());
  const semester = isSemester(requested)
    ? requested
    : stored.includes(current)
      ? current
      : (stored[0] ?? current);
  const semesters = sortSemestersDesc([...stored, ...recentSemesters(), semester]);

  const dayParam = params.day?.trim() ?? '';
  const day = /^[1-7]$/.test(dayParam) ? Number(dayParam) : null;

  const rows = await getSchedulesBySemester(semester);
  const visible = day === null ? rows : rows.filter((row) => row.day_of_week === day);
  const canManage = viewer.can('schedule.manage');

  // Dikelompokkan menurut hari ISO — sama dengan urutan yang datang dari query.
  const groups = WEEKDAYS.map((weekday) => ({
    ...weekday,
    rows: visible.filter((row) => row.day_of_week === weekday.value),
  })).filter((group) => group.rows.length > 0);

  return (
    <div className="card-grid">
      <PageHeader
        title="Jadwal"
        description="Jadwal kuliah kelas, berulang setiap minggu sepanjang semester."
        action={canManage ? <ButtonLink href="/schedule/new">Tambah jadwal</ButtonLink> : undefined}
      />

      <ScheduleFilters semesters={semesters} semester={semester} day={day} />

      {rows.length === 0 ? (
        <EmptyState
          title={`Belum ada jadwal di ${semester}`}
          description={
            canManage
              ? 'Tambahkan jadwal kuliah; satu baris berlaku setiap minggu sepanjang semester ini.'
              : 'Jadwal kuliah kelas akan tampil di sini.'
          }
          action={canManage ? { href: '/schedule/new', label: 'Tambah jadwal' } : undefined}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title="Tidak ada jadwal pada hari itu"
          description="Semester ini punya jadwal di hari lain."
          action={{
            href: `/schedule?semester=${encodeURIComponent(semester)}`,
            label: 'Tampilkan semua hari',
          }}
        />
      ) : (
        groups.map((group) => (
          /*
            Kartu besar = kategori (hari), kartu kecil = satu unit informasi
            (satu jadwal). Dulu barisnya hanya dipisah garis di dalam satu kartu
            besar, sehingga tiap mata kuliah tidak punya batas sendiri. Kartu
            ini TIDAK menerima hover: yang bisa diklik hanya tautan "Ubah" di
            dalamnya, bukan seluruh kartunya.
          */
          <Section key={group.value} tier="secondary" title={group.label}>
            <div className="flex flex-col gap-3">
              {group.rows.map((row) => {
                const Icon = TYPE_ICON[row.type];
                return (
                  <article
                    key={row.id}
                    className={`${CARD_TIER_CLASSES.tertiary} flex flex-col gap-1 p-4`}
                  >
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-text-muted">
                      <Icon aria-hidden="true" className="size-4 shrink-0" />
                      <span className="font-semibold">{SCHEDULE_TYPE_LABEL[row.type]}</span>
                      <span>{formatWallTimeRange(row.start_time, row.end_time, timezone)}</span>
                    </p>

                    <h3 className="text-body font-semibold text-text">{row.title}</h3>

                    {row.location ? (
                      <p className="text-small text-text-muted">{row.location}</p>
                    ) : null}

                    {row.description || row.url ? (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-small font-semibold text-primary underline">
                          Detail
                        </summary>
                        <div className="mt-2 flex flex-col gap-2">
                          {row.description ? (
                            <p className="whitespace-pre-line text-small text-text">
                              {row.description}
                            </p>
                          ) : null}
                          {row.url ? (
                            <a
                              href={row.url}
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
                        href={`/schedule/${row.id}/edit`}
                        className="mt-1 text-small text-primary underline"
                      >
                        Ubah
                      </Link>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </Section>
        ))
      )}
    </div>
  );
}
