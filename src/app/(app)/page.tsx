import { Suspense } from 'react';
import { getViewer, requireView, canShow } from '@/lib/visibility/server';
import { getClassIdentity, getClassTheme } from '@/features/class/queries';
import { HOME_LAYOUTS, mobileOrderClass } from '@/features/home/layouts';
import { HomeHero } from '@/features/home/components/HomeSections';
import {
  ActivitySlot,
  MembersSlot,
  OverviewSlot,
  UpcomingSlot,
} from '@/features/home/components/HomeSlots';
import { SectionBoundary } from '@/components/ui/SectionBoundary';
import { ResetRequestSlot } from '@/features/auth/components/ResetRequestSlot';
import { Section } from '@/components/ui/Section';
import { ButtonLink } from '@/components/ui/Button';
import {
  SkeletonActivity,
  SkeletonAvatarStrip,
  SkeletonSectionShell,
  SkeletonSectionTitle,
  SkeletonStats,
} from '@/components/ui/Skeleton';

export const dynamic = 'force-dynamic';

/**
 * Beranda.
 *
 * Satu route untuk pengunjung anonim dan member (V-02): yang membedakan hanya
 * section mana yang terlihat. Pengunjung anonim melihat identitas kelas saja
 * pada konfigurasi default (E1).
 *
 * Setiap section di-gate dengan key-nya sendiri dan TIDAK DIRENDER sama sekali
 * saat tidak boleh dilihat — bukan disembunyikan dengan CSS (§7.8).
 *
 * Halaman hanya menunggu apa yang dibutuhkan shell: identitas kelas, tema, dan
 * peta visibilitas. Data tiap section diambil oleh slot-nya sendiri dan dibuka
 * lewat `<Suspense>`, jadi section yang sudah siap tampil duluan (streaming)
 * dan satu section yang gagal tidak menjatuhkan halaman ini.
 */
export default async function HomePage() {
  await requireView('page.home', '/');

  const [identity, theme, viewer] = await Promise.all([
    getClassIdentity(),
    getClassTheme(),
    getViewer(),
  ]);

  if (!identity) {
    return (
      <p className="text-body text-text-muted">
        Identitas kelas belum tersedia. Coba lagi beberapa saat lagi.
      </p>
    );
  }

  const [showIdentity, showSchedule, showEvents, showTasks, showOverview, showActivity, showMembers] =
    await Promise.all([
      canShow('section.home.identity'),
      canShow('section.home.schedule'),
      canShow('section.home.events'),
      canShow('section.home.tasks'),
      canShow('section.home.overview'),
      canShow('section.home.activity'),
      canShow('section.home.members'),
    ]);

  const anyUpcoming = showSchedule || showEvents || showTasks;

  // Urutan section mengikuti preset layout yang dipilih Ketua (§18).
  const sections = HOME_LAYOUTS[theme.layout];
  const timezone = identity.timezone;

  const slots: Record<string, React.ReactNode> = {
    identity: showIdentity ? (
      <HomeHero
        name={identity.name}
        tagline={identity.tagline}
        description={identity.description}
        highlightText={identity.highlight_text}
        highlightUrl={identity.highlight_url}
        coverPath={identity.cover_path}
        timezone={identity.timezone}
      />
    ) : null,

    upcoming: anyUpcoming ? (
      <UpcomingSlot
        timezone={timezone}
        show={{ schedule: showSchedule, tasks: showTasks, events: showEvents }}
      />
    ) : null,

    overview: showOverview ? <OverviewSlot /> : null,
    activity: showActivity ? <ActivitySlot timezone={timezone} /> : null,
    members: showMembers ? <MembersSlot /> : null,
  };

  // Fallback tiap section mengikuti bentuk konten section aslinya supaya tidak
  // ada lompatan layout saat data tiba.

  const fallbacks: Record<string, React.ReactNode> = {
    identity: <SkeletonHero />,
    upcoming: <SkeletonSectionTitle rows={3} />,
    overview: (
      <SkeletonSectionShell>
        <SkeletonStats />
      </SkeletonSectionShell>
    ),
    activity: (
      <SkeletonSectionShell>
        <SkeletonActivity />
      </SkeletonSectionShell>
    ),
    members: (
      <SkeletonSectionShell>
        <SkeletonAvatarStrip />
      </SkeletonSectionShell>
    ),
  };

  return (
    <div className="flex flex-col gap-10">
      {/*
        Pengelola kelas mendapat pintu masuk ke halaman yang bisa ia ubah.
        Ditaruh di atas, bukan di bawah, karena halaman ini bisa panjang.
      */}
      {viewer.can('class.manage') ? (
        <Section
          title="Kelola kelas"
          description="Pintu masuk ke semua halaman yang bisa kamu ubah. Halaman lain di menu samping dipakai untuk melihat dan mengelola isi; pengaturan kelas ada di halaman Kelas."
        >
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/class">Atur tampilan kelas</ButtonLink>
            {viewer.can('members.manage') ? (
              <ButtonLink href="/settings/members" variant="secondary">
                Kelola anggota
              </ButtonLink>
            ) : null}
            <ButtonLink href="/settings/visibility" variant="secondary">
              Aturan visibilitas
            </ButtonLink>
          </div>
        </Section>
      ) : null}

      {/*
        Antrean ganti kata sandi (A-06). Beranda adalah tempat Ketua bekerja,
        dan antrean ini adalah pekerjaan yang menunggu — bukan sekadar
        pengaturan. Slot ini sendiri yang memeriksa izin dan kekosongan, jadi
        halaman tidak perlu.
      */}
      <SectionBoundary>
        <Suspense fallback={null}>
          <ResetRequestSlot timezone={identity.timezone} />
        </Suspense>
      </SectionBoundary>

      {sections.map((key) =>
        // `mobileOrderClass` mengatur urutan mobile sesuai PRD; `lg:order-none`
        // mengembalikan desktop ke urutan preset yang dipilih Ketua (§16).
        slots[key] ? (
          <div key={key} className={`lg:order-none ${mobileOrderClass(key)}`}>
            <SectionBoundary>
              <Suspense fallback={fallbacks[key] ?? <SkeletonSectionTitle rows={2} />}>
                {slots[key]}
              </Suspense>
            </SectionBoundary>
          </div>
        ) : null,
      )}

      {/* Fallback ketika preset tidak menghasilkan section sama sekali. */}
      {sections.every((key) => !slots[key]) ? (
        <p className="text-body text-text-muted">
          Tidak ada bagian yang bisa ditampilkan untuk akunmu saat ini.
        </p>
      ) : null}
    </div>
  );
}

/** Cover + nama + deskripsi, mengikuti `HomeHero`. */
function SkeletonHero() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <div className="h-40 w-full rounded-md md:h-52" />
      <div className="flex flex-col gap-2">
        <div className="h-10 w-2/3 rounded-sm bg-surface-dim" />
        <div className="h-5 w-1/2 rounded-sm bg-surface-dim" />
        <div className="h-4 w-4/5 rounded-sm bg-surface-dim" />
      </div>
    </div>
  );
}