import Link from 'next/link';
import { ArrowRight, CalendarDays, ClipboardList, Sparkles } from 'lucide-react';
import { Section, List, ListItem } from '@/components/ui/Section';
import { EmptyState } from '@/components/ui/States';
import { AvatarFromPath } from '@/components/storage/AvatarFromPath';
import { StorageImage } from '@/components/storage/StorageImage';
import { createClient } from '@/lib/supabase/server';
import { signMany } from '@/lib/storage/sign';
import { formatDay, formatTime, zoneLabel } from '@/lib/time';
import type { UpcomingEntry } from '@/features/home/queries';
import type { ActivityTrendRow, HomeOverview } from '@/lib/supabase/database.types';
import type { RecentMemberSummary } from '@/features/home/queries';

/**
 * Komponen section Home. Semua Server Component; tidak ada state klien
 * (§11.1).
 *
 * Bentuk visual mengikuti sistem desain Stitch "Warm Paper & Deep Ink Academic
 * System" yang tersimpan di stitch_ui_system/: hero tipografi di atas surface
 * dengan garis pemisah 1px, tipografi Fraunces untuk heading dan Source Sans 3
 * untuk isi, daftar bersekat alih-alih kartu-kartu seragam.
 *
 * Yang TIDAK diambil dari desain Stitch karena tidak ada sumber datanya di skema:
 * tahun akademik, semester, "Program Studi", jumlah mahasiswa, dan sakelar
 * peran. Lihat docs/STATUS.md untuk catatan lengkap.
 */

/** Elemen paling berani di halaman ini: hero identitas kelas (§11.6). */
export function HomeHero({
  name,
  tagline,
  description,
  highlightText,
  highlightUrl,
  coverPath,
  timezone,
}: {
  name: string;
  tagline: string | null;
  description: string | null;
  highlightText: string | null;
  highlightUrl: string | null;
  coverPath: string | null;
  timezone: string;
}) {
  const cover = coverPath ? (
    <StorageImage
      path={coverPath}
      alt={`Cover kelas ${name}`}
      width={1600}
      height={900}
      priority
      className="h-40 w-full rounded-md border border-border-subtle object-cover md:h-52"
    />
  ) : null;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="hero-name">
      {cover}

      <div className="flex flex-col gap-2">
        <h1 id="hero-name" className="font-display text-display font-semibold text-text">
          {name}
        </h1>
        {tagline ? <p className="text-h3 text-text-muted">{tagline}</p> : null}
        {description ? (
          <p data-pre-line className="max-w-2xl text-body text-text-muted">
            {description}
          </p>
        ) : null}
        <p className="text-caption text-text-muted">Zona waktu kelas: {zoneLabel(timezone)}</p>
      </div>

      {/* Sorotan = satu teks + tautan opsional (A-10). */}
      {highlightText ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-border-subtle bg-surface px-4 py-3">
          <span className="text-label font-semibold text-primary">Sorotan</span>
          <span className="text-small text-text">{highlightText}</span>
          {highlightUrl ? (
            <a
              href={highlightUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-label font-semibold text-primary underline underline-offset-4"
            >
              Buka
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

const KIND_META = {
  schedule: { label: 'Jadwal kuliah', Icon: CalendarDays },
  event: { label: 'Event', Icon: Sparkles },
  task: { label: 'Tenggat tugas', Icon: ClipboardList },
} as const;

/**
 * Tiga daftar bersekat (jadwal | event | tugas), bukan tiga kartu identik —
 * §17.6 menolak pola "tiga kartu seragam" itu. Tiap item memuat judul dan
 * waktu supaya informasi penting terbaca tanpa membuka halaman lain (AC-HOME-3).
 */
export function UpcomingList({
  entries,
  timezone,
  canManage,
}: {
  entries: UpcomingEntry[];
  timezone: string;
  canManage: boolean;
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title={canManage ? 'Belum ada agenda mendatang.' : 'Belum ada agenda mendatang.'}
        description={
          canManage
            ? 'Jadwal, event, dan tugas yang kamu tambahkan akan muncul di sini.'
            : 'Jadwal, event, dan tugas kelas akan muncul di sini.'
        }
        action={canManage ? { href: '/events/new', label: 'Buat event pertama' } : undefined}
      />
    );
  }

  return (
    <List>
      {entries.map((entry) => {
        const { label, Icon } = KIND_META[entry.kind];
        const body = (
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="text-body font-semibold text-text">{entry.title}</span>
              <span className="text-small text-text-muted">
                {formatDay(entry.at, timezone)} · {formatTime(entry.at, timezone)}
              </span>
            </div>
            <span className="flex items-center gap-1.5 text-small text-text-muted">
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              {label}
              {entry.meta ? <span> · {entry.meta}</span> : null}
            </span>
          </div>
        );

        return (
          <ListItem key={`${entry.kind}-${entry.at}-${entry.title}`}>
            {entry.href ? (
              <Link href={entry.href} className="block transition-func hover:opacity-80">
                {body}
              </Link>
            ) : (
              body
            )}
          </ListItem>
        );
      })}
    </List>
  );
}

/**
 * Metrik overview. Nilai NULL tidak dirender sama sekali; nilai 0 ditulis
 * kalimat, bukan angka besar "0" (AC-HOME-4). Dipisah dari Upcoming dengan
 * garis, bukan kartu.
 */
export function OverviewStats({ overview }: { overview: HomeOverview }) {
  const metrics: { label: string; value: number | null; empty: string }[] = [
    {
      label: 'Anggota aktif',
      value: overview.members_count,
      empty: 'Belum ada anggota aktif',
    },
    {
      label: 'Event mendatang',
      value: overview.upcoming_events_count,
      empty: 'Tidak ada event mendatang',
    },
    {
      label: 'Tugas aktif',
      value: overview.active_tasks_count,
      empty: 'Tidak ada tugas aktif',
    },
    {
      label: 'Segera berakhir',
      value: overview.due_soon_tasks_count,
      empty: 'Tidak ada tugas yang segera berakhir',
    },
  ];

  const visible = metrics.filter((m) => m.value !== null);
  if (visible.length === 0) return null;

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
      {visible.map((m) => (
        <div key={m.label} className="flex flex-col gap-1 border-t border-border-subtle pt-3">
          <dt className="text-small text-text-muted">{m.label}</dt>
          <dd className="text-h3 font-semibold tabular-nums text-text">
            {m.value === 0 ? <span className="text-small font-normal text-text-muted">{m.empty}</span> : m.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Bar chart SVG yang dirender di server. Tanpa library chart karena hanya satu
 * grafik batang sederhana (§2). Judul dan angka selalu tersedia sebagai teks,
 * jadi informasinya tidak hanya visual.
 */
export function ActivityTrend({ rows, timezone }: { rows: ActivityTrendRow[]; timezone: string }) {
  const hasAny = rows.some((r) => r.activity_count > 0);
  if (!hasAny) {
    return (
      <EmptyState
        title="Belum ada aktivitas dalam 4 minggu terakhir."
        description="Aktivitas tercatat saat jadwal, event, atau tugas baru dibuat dan saat tugas diselesaikan."
      />
    );
  }

  const max = Math.max(...rows.map((r) => r.activity_count), 1);
  const height = 96;
  const barWidth = 28;
  const gap = 14;

  return (
    <div className="flex flex-col gap-3">
      <svg
        role="img"
        aria-label={`Aktivitas 4 minggu terakhir. Total ${rows.reduce((s, r) => s + r.activity_count, 0)} kejadian.`}
        viewBox={`0 0 ${rows.length * (barWidth + gap)} ${height}`}
        className="w-full max-w-xs text-secondary"
      >
        {rows.map((row, i) => {
          const h = Math.round((row.activity_count / max) * (height - 8));
          const x = i * (barWidth + gap);
          return (
            <rect
              key={row.week_start}
              x={x}
              y={height - h}
              width={barWidth}
              height={h}
              className="fill-current"
            />
          );
        })}
      </svg>

      {/* Angka tetap terbaca sebagai teks agar bukan hanya relying on visual. */}
      <ul className="flex flex-wrap gap-x-6 gap-y-1">
        {rows.map((row) => (
          <li key={row.week_start} className="text-caption text-text-muted">
            <span className="font-semibold text-text">{row.activity_count}</span>{' '}
            {formatDay(`${row.week_start}T00:00:00Z`, timezone)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function MembersStrip({ members }: { members: RecentMemberSummary[] }) {
  if (members.length === 0) {
    return (
      <EmptyState
        title="Belum ada anggota."
        description="Anggota kelas akan muncul di sini setelah mereka mengaktifkan akunnya."
      />
    );
  }

  // Satu batch untuk seluruh strip, bukan satu permintaan per anggota.
  const supabase = await createClient();
  const signedAvatars = await signMany(
    supabase,
    'member-media',
    members.map((m) => m.avatar_path),
  );

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-wrap gap-4">
        {members.map((m) => (
          <li key={m.user_id} className="flex flex-col items-center gap-1">
            <Link
              href={`/members/${m.username}`}
              className="flex flex-col items-center gap-1 rounded-md p-1 transition-func hover:opacity-80"
            >
              <AvatarFromPath
                path={m.avatar_path}
                signedUrl={m.avatar_path ? signedAvatars.get(m.avatar_path) : undefined}
                name={m.full_name}
                size="lg"
              />
              <span className="max-w-24 truncate text-caption text-text">{m.full_name}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/members"
        className="inline-flex min-h-11 items-center gap-1 self-start text-label font-semibold text-primary underline underline-offset-4"
      >
        Lihat semua anggota
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </div>
  );
}

export function HomeSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Section title={title} description={description} action={action}>
      {children}
    </Section>
  );
}
