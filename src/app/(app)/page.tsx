import { requireView, canShow, getViewer } from '@/lib/visibility/server';
import { getClassIdentity } from '@/features/class/queries';
import {
  getActivityTrend,
  getHomeOverview,
  getRecentMembers,
  getUpcoming,
} from '@/features/home/queries';
import { HOME_LAYOUTS, mobileOrderClass } from '@/features/home/layouts';
import {
  ActivityTrend,
  HomeHero,
  HomeSection,
  MembersStrip,
  OverviewStats,
  UpcomingList,
} from '@/features/home/components/HomeSections';
import { ButtonLink } from '@/components/ui/Button';
import { getClassTheme } from '@/features/class/queries';

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
 */
export default async function HomePage() {
  await requireView('page.home', '/');

  const [viewer, identity, theme] = await Promise.all([
    getViewer(),
    getClassIdentity(),
    getClassTheme(),
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

  // Data diambil hanya untuk section yang dirender; tidak ada query sia-sia.
  const [upcoming, overview, trend, members] = await Promise.all([
    anyUpcoming ? getUpcoming() : Promise.resolve([]),
    showOverview ? getHomeOverview() : Promise.resolve(null),
    showActivity ? getActivityTrend() : Promise.resolve([]),
    showMembers ? getRecentMembers() : Promise.resolve([]),
  ]);

  // Urutan section mengikuti preset layout yang dipilih Ketua (§18).
  const sections = HOME_LAYOUTS[theme.layout];

  const rendered: Record<string, React.ReactNode> = {
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

    // Tiga daftar bersekat: jadwal | tugas | event. Urutan mengikuti prioritas
    // mobile PRD — tugas naik ke atas jadwal (AC-HOME-2, §16).
    upcoming: anyUpcoming ? (
      <div className="flex flex-col gap-8">
        {showSchedule ? (
          <HomeSection
            title="Jadwal"
            description="Jadwal kuliah dan kegiatan kelas."
            action={<ButtonLink href="/schedule" variant="ghost" size="md">Buka jadwal</ButtonLink>}
          >
            <UpcomingList
              entries={upcoming.filter((e) => e.kind === 'schedule')}
              timezone={identity.timezone}
              canManage={viewer.can('schedule.manage')}
            />
          </HomeSection>
        ) : null}

        {showTasks ? (
          <HomeSection
            title="Tugas"
            description="Tugas dengan tenggat terdekat."
            action={<ButtonLink href="/tasks" variant="ghost" size="md">Buka tugas</ButtonLink>}
          >
            <UpcomingList
              entries={upcoming.filter((e) => e.kind === 'task')}
              timezone={identity.timezone}
              canManage={viewer.can('tasks.manage')}
            />
          </HomeSection>
        ) : null}

        {showEvents ? (
          <HomeSection
            title="Event"
            description="Event mendatang."
            action={<ButtonLink href="/events" variant="ghost" size="md">Buka event</ButtonLink>}
          >
            <UpcomingList
              entries={upcoming.filter((e) => e.kind === 'event')}
              timezone={identity.timezone}
              canManage={viewer.can('events.manage')}
            />
          </HomeSection>
        ) : null}
      </div>
    ) : null,

    overview:
      showOverview && overview ? (
        <HomeSection title="Ringkasan" description="Angka agregat kelas minggu ini.">
          <OverviewStats overview={overview} />
        </HomeSection>
      ) : null,

    activity: showActivity ? (
      <HomeSection title="Aktivitas" description="Jumlah kejadian dalam 4 minggu terakhir.">
        <ActivityTrend rows={trend} timezone={identity.timezone} />
      </HomeSection>
    ) : null,

    members: showMembers ? (
      <HomeSection title="Anggota" description="Anggota yang terbaru bergabung.">
        <MembersStrip members={members} />
      </HomeSection>
    ) : null,
  };

  return (
    <div className="flex flex-col gap-10">
      {sections.map((key) =>
        // `mobileOrderClass` mengatur urutan mobile sesuai PRD; `lg:order-none`
        // mengembalikan desktop ke urutan preset yang dipilih Ketua (§16).
        rendered[key] ? (
          <div key={key} className={`lg:order-none ${mobileOrderClass(key)}`}>
            {rendered[key]}
          </div>
        ) : null,
      )}

      {/* Fallback ketika preset tidak menghasilkan section sama sekali. */}
      {sections.every((key) => !rendered[key]) ? (
        <p className="text-body text-text-muted">
          Tidak ada bagian yang bisa ditampilkan untuk akunmu saat ini.
        </p>
      ) : null}
    </div>
  );
}
