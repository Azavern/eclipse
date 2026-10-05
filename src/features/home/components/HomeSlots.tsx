import {
  getActivityTrend,
  getHomeOverview,
  getRecentMembers,
  getUpcoming,
} from '@/features/home/queries';
import { getViewer } from '@/lib/visibility/server';
import { ButtonLink } from '@/components/ui/Button';
import {
  ActivityTrend,
  HomeSection,
  MembersStrip,
  OverviewStats,
  UpcomingList,
} from './HomeSections';

/**
 * Slot Home: satu Server Component async per section.
 *
 * Setiap slot mengambil datanya sendiri, bukan menerima hasil query bersama
 * dari halaman. Dengan begitu halaman hanya-await yang perlu untuk shell, lalu
 * tiap section bisa dibuka sebagai `<Suspense>` dan streamed begitu datanya siap
 * — section cepat tidak lagi menunggu section lambat (§12, §15.1).
 *
 * `getViewer` dan `getClassIdentity` dibungkus `cache` React dan sudah
 * ditunggu oleh layout `(app)`, jadi pemanggilannya di sini tidak menambah
 * satu pun permintaan jaringan.
 */

/** Tiga daftar bersekat: jadwal | tugas | event, sesuai urutan prioritas. */
export async function UpcomingSlot({
  timezone,
  show,
}: {
  timezone: string;
  show: { schedule: boolean; tasks: boolean; events: boolean };
}) {
  const [entries, viewer] = await Promise.all([getUpcoming(), getViewer()]);

  return (
    <div className="flex flex-col gap-8">
      {show.schedule ? (
        <HomeSection
          title="Jadwal"
          description="Jadwal kuliah dan kegiatan kelas."
          action={<ButtonLink href="/schedule" variant="ghost" size="md">Buka jadwal</ButtonLink>}
        >
          <UpcomingList
            entries={entries.filter((e) => e.kind === 'schedule')}
            timezone={timezone}
            canManage={viewer.can('schedule.manage')}
          />
        </HomeSection>
      ) : null}

      {show.tasks ? (
        <HomeSection
          title="Tugas"
          description="Tugas dengan tenggat terdekat."
          action={<ButtonLink href="/tasks" variant="ghost" size="md">Buka tugas</ButtonLink>}
        >
          <UpcomingList
            entries={entries.filter((e) => e.kind === 'task')}
            timezone={timezone}
            canManage={viewer.can('tasks.manage')}
          />
        </HomeSection>
      ) : null}

      {show.events ? (
        <HomeSection
          title="Event"
          description="Event mendatang."
          action={<ButtonLink href="/events" variant="ghost" size="md">Buka event</ButtonLink>}
        >
          <UpcomingList
            entries={entries.filter((e) => e.kind === 'event')}
            timezone={timezone}
            canManage={viewer.can('events.manage')}
          />
        </HomeSection>
      ) : null}
    </div>
  );
}

/** Metrik ringkas. Semua NULL -> komponen mengembalikan null, section hilang. */
export async function OverviewSlot() {
  const overview = await getHomeOverview();
  if (!overview) return null;

  return (
    <HomeSection title="Ringkasan" description="Angka agregat kelas minggu ini.">
      <OverviewStats overview={overview} />
    </HomeSection>
  );
}

export async function ActivitySlot({ timezone }: { timezone: string }) {
  const rows = await getActivityTrend();

  return (
    <HomeSection title="Aktivitas" description="Jumlah kejadian dalam 4 minggu terakhir.">
      <ActivityTrend rows={rows} timezone={timezone} />
    </HomeSection>
  );
}

export async function MembersSlot() {
  const members = await getRecentMembers();

  return (
    <HomeSection title="Anggota" description="Anggota yang terbaru bergabung.">
      <MembersStrip members={members} />
    </HomeSection>
  );
}