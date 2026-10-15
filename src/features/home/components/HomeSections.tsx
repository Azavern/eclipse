import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Clock3,
  Megaphone,
  Sparkles,
  Users,
} from 'lucide-react';
import { Section } from '@/components/ui/Section';
import {
  CARD_BASE,
  CARD_INTERACTIVE,
  CARD_TIER_CLASSES,
  CARD_TONE_CLASSES,
  type CardTier,
  type CardTone,
} from '@/components/ui/Card';
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
 * (blueprint §11.1).
 *
 * Bahasa visualnya tetap milik sistem desain kelas "Warm Paper & Deep Ink"
 * (stitch_ui_system/): kertas hangat, tinta pekat, satu aksen, tipografi
 * display untuk judul. Yang mengikuti revisi DESIGN.md adalah susunannya —
 * hirarki lewat ukuran dan jarak, tile ikon sebagai jangkar visual, permukaan
 * ber-tint untuk kelompok yang berbeda, dan angka besar bertabular untuk metrik.
 *
 * Yang TIDAK diambil dari desain Stitch karena tidak ada sumber datanya di skema:
 * tahun akademik, semester, "Program Studi", jumlah mahasiswa, dan sakelar
 * peran. Lihat docs/STATUS.md untuk catatan lengkap.
 */

/** Elemen paling berani di halaman ini: hero identitas kelas (DESIGN.md §6). */
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
      className="h-40 w-full rounded-md border border-border-subtle object-cover md:h-56"
    />
  ) : null;

  return (
    <section
      className={`${CARD_BASE} ${CARD_TIER_CLASSES.primary} ${CARD_TONE_CLASSES.accent} flex flex-col gap-5 overflow-hidden p-5`}
      aria-labelledby="hero-name"
    >
      {cover}

      <div className="flex flex-col gap-2">
        <h1 id="hero-name" className="font-display text-display font-semibold text-text">
          {name}
        </h1>
        {tagline ? <p className="font-display text-h3 text-text-muted">{tagline}</p> : null}
        {description ? (
          <p data-pre-line className="max-w-prose text-body-lg text-text-muted">
            {description}
          </p>
        ) : null}
        <p className="flex items-center gap-1.5 text-caption text-text-muted">
          <Clock3 aria-hidden="true" className="size-3.5 shrink-0" />
          Zona waktu kelas: {zoneLabel(timezone)}
        </p>
      </div>

      {/* Sorotan = satu teks + tautan opsional (A-10). */}
      {highlightText ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-border-subtle bg-surface px-4 py-3">
          <span className="icon-tile size-8" aria-hidden="true">
            <Megaphone className="size-4" />
          </span>
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
              <ArrowRight aria-hidden="true" className="size-4" />
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

const KIND_META = {
  schedule: { label: 'Jadwal kuliah', Icon: CalendarDays, tone: 'icon-tile-info' },
  event: { label: 'Event', Icon: Sparkles, tone: 'icon-tile' },
  task: { label: 'Tenggat tugas', Icon: ClipboardList, tone: 'icon-tile-warning' },
} as const;

/**
 * Tiga daftar (jadwal | event | tugas), masing-masing dengan judul sectionnya.
 * Tiap baris adalah satu kartu dengan tile ikon: judul dan waktu terbaca tanpa
 * membuka halaman lain (AC-HOME-3), dan jenis agenda dikenali dari ikonnya
 * sebelum dibaca (DESIGN.md §6).
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
        title="Belum ada agenda mendatang."
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
    <div className="flex flex-col gap-3">
      {entries.map((entry) => {
        const { label, Icon, tone } = KIND_META[entry.kind];
        const body = (
          <div className="flex items-start gap-3">
            <span className={`${tone} size-10`} aria-hidden="true">
              <Icon className="size-5" />
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="text-body font-semibold text-text">{entry.title}</span>
                <span className="tabular-nums text-small text-text-muted">
                  {formatDay(entry.at, timezone)} · {formatTime(entry.at, timezone)}
                </span>
              </div>
              <span className="text-small text-text-muted">
                {label}
                {entry.meta ? <span> · {entry.meta}</span> : null}
              </span>
            </div>

            {entry.href ? (
              <ArrowRight
                aria-hidden="true"
                className="mt-2.5 size-4 shrink-0 text-text-muted"
              />
            ) : null}
          </div>
        );

        /*
         * Tiap agenda satu kartu. Hanya entri yang punya tujuan yang memasang
         * `CARD_INTERACTIVE` — entri tanpa tautan sengaja diam saat disentuh,
         * supaya gerakan hover selalu berarti "ini bisa dibuka".
         */
        const key = `${entry.kind}-${entry.at}-${entry.title}`;

        return entry.href ? (
          <Link
            key={key}
            href={entry.href}
            className={`${CARD_TIER_CLASSES.tertiary} ${CARD_INTERACTIVE} block p-4`}
          >
            {body}
          </Link>
        ) : (
          <div key={key} className={`${CARD_TIER_CLASSES.tertiary} p-4`}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Metrik overview sebagai tile KPI (DESIGN.md Appendix D: „a row of 3–4 KPI
 * tiles — icon in a tinted square, number, label“).
 *
 * Nilai NULL tidak dirender sama sekali; nilai 0 ditulis sebagai kalimat, bukan
 * angka besar "0" (AC-HOME-4). Label tetap berada di DOM sebelum nilainya
 * (`dt` → `dd`) tapi tampil di bawah angka lewat `flex-col-reverse`, sehingga
 * struktur datanya benar dan susunan visual tetap "angka dulu".
 */
export function OverviewStats({ overview }: { overview: HomeOverview }) {
  const metrics: {
    label: string;
    value: number | null;
    empty: string;
    Icon: typeof Users;
    tone: string;
  }[] = [
    {
      label: 'Anggota aktif',
      value: overview.members_count,
      empty: 'Belum ada anggota aktif',
      Icon: Users,
      tone: 'icon-tile',
    },
    {
      label: 'Event mendatang',
      value: overview.upcoming_events_count,
      empty: 'Tidak ada event mendatang',
      Icon: Sparkles,
      tone: 'icon-tile-info',
    },
    {
      label: 'Tugas aktif',
      value: overview.active_tasks_count,
      empty: 'Tidak ada tugas aktif',
      Icon: ClipboardList,
      tone: 'icon-tile',
    },
    {
      label: 'Segera berakhir',
      value: overview.due_soon_tasks_count,
      empty: 'Tidak ada tugas yang segera berakhir',
      Icon: Clock3,
      tone: 'icon-tile-warning',
    },
  ];

  const visible = metrics.filter((m) => m.value !== null);
  if (visible.length === 0) return null;

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {visible.map((m) => (
        <div
          key={m.label}
          className="flex flex-col gap-3 rounded-md border border-border-subtle bg-surface p-4"
        >
          <span className={`${m.tone} size-10`} aria-hidden="true">
            <m.Icon className="size-5" />
          </span>
          <div className="flex flex-col-reverse gap-0.5">
            <dt className="text-small text-text-muted">{m.label}</dt>
            <dd className="text-h2 font-semibold tabular-nums text-text">
              {m.value === 0 ? (
                <span className="text-small font-normal text-text-muted">{m.empty}</span>
              ) : (
                m.value
              )}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

/**
 * Grafik batang SVG yang dirender di server. Tanpa library chart karena hanya
 * satu grafik batang sederhana (DESIGN.md §14: pakai yang sudah ada, jangan
 * tambah dependensi untuk satu kebutuhan).
 *
 * Judul dan angka selalu tersedia sebagai teks, jadi informasinya tidak hanya
 * visual (DESIGN.md §10): nilai tiap minggu ditulis di bawah grafik.
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
  const total = rows.reduce((sum, row) => sum + row.activity_count, 0);

  // Geometri tetap di viewBox supaya tandanya tidak berubah saat lebar berubah;
  // SVG-nya sendiri mengambil lebar kontainer dan menyesuaikan diri.
  const areaHeight = 132;
  const barWidth = 34;
  const gap = 16;
  const chartWidth = rows.length * (barWidth + gap) - gap;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <p className="text-small text-text-muted">
          <span className="text-h3 font-semibold tabular-nums text-text">{total}</span> kejadian
          dalam 4 minggu
        </p>
        <p className="text-caption tabular-nums text-text-muted">Tertinggi {max} / minggu</p>
      </div>

      <svg
        role="img"
        aria-label={`Aktivitas 4 minggu terakhir. Total ${total} kejadian, terbanyak ${max} dalam satu minggu.`}
        viewBox={`0 0 ${chartWidth} ${areaHeight + 1}`}
        className="h-36 w-full text-primary"
        // `meet` menjaga proporsi batang: grafik menyesuaikan diri ke tinggi
        // yang tersedia alih-alih melar mengikuti lebar kontainer.
        preserveAspectRatio="xMidYMax meet"
      >
        {/* Garis dasar: mengikat batang ke satu bidang, bukan menggantung. */}
        <line
          x1="0"
          y1={areaHeight}
          x2={chartWidth}
          y2={areaHeight}
          className="stroke-current opacity-25"
          strokeWidth="1"
        />
        {rows.map((row, i) => {
          const height = Math.round((row.activity_count / max) * (areaHeight - 12));
          return (
            <rect
              key={row.week_start}
              x={i * (barWidth + gap)}
              y={areaHeight - height}
              width={barWidth}
              height={Math.max(height, 2)}
              rx="4"
              className="fill-current"
            />
          );
        })}
      </svg>

      {/* Angka tetap terbaca sebagai teks agar bukan hanya mengandalkan visual. */}
      <ul className="flex flex-wrap gap-x-6 gap-y-1">
        {rows.map((row) => (
          <li key={row.week_start} className="text-caption text-text-muted">
            <span className="font-semibold tabular-nums text-text">{row.activity_count}</span>{' '}
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
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {members.map((m) => (
          <li key={m.user_id}>
            <Link
              href={`/members/${m.username}`}
              className={`${CARD_TIER_CLASSES.tertiary} ${CARD_INTERACTIVE} flex items-center gap-3 p-3`}
            >
              <AvatarFromPath
                path={m.avatar_path}
                signedUrl={m.avatar_path ? signedAvatars.get(m.avatar_path) : undefined}
                name={m.full_name}
                size="md"
              />
              <span className="min-w-0 truncate text-small font-semibold text-text">
                {m.full_name}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href="/members"
        className="press inline-flex min-h-11 items-center gap-1 self-start rounded-md px-1 text-label font-semibold text-primary underline underline-offset-4 hover:bg-surface-dim"
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
  tier,
  tone,
  icon,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Tingkat prioritas card di beranda; lihat `Card.tsx`. */
  tier: CardTier;
  tone?: CardTone;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Section title={title} description={description} action={action} tier={tier} tone={tone} icon={icon}>
      {children}
    </Section>
  );
}
