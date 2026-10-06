import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/visibility/server';
import type { Permission } from '@/lib/visibility/types';
import { PageHeader, Section, List, ListItem } from '@/components/ui/Section';
import { EmptyState } from '@/components/ui/States';

export const dynamic = 'force-dynamic';

/**
 * Daftar semua pengaturan — rumah untuk `/settings/**`.
 *
 * Dulu rute ini hanya mengalihkan ke `/settings/profile`, sehingga sidebar
 * ("Pengaturan") mendarat langsung di satu halaman sementara enam halaman
 * pengaturan lain tidak punya pintu masuk sama sekali. Sekarang rute ini jadi
 * indeks: tiga kelompok menurut siapa yang boleh mengubahnya, dan tiap entri
 * menyebut **fungsi konkret** halaman tersebut, bukan sekadar namanya.
 *
 * Aturan yang dijaga di sini:
 *  - Entri yang tidak boleh dibuka viewer ini **tidak dirender**, bukan
 *    disembunyikan dengan CSS (§7.8) — aturan yang sama dipakai nav di layout.
 *  - Halaman pengaturan tidak saling menaut: tiap halaman punya
 *    "Semua pengaturan" di atas judulnya, jadi jalur masuk dan keluar jelas dari
 *    mana pun (§10.1).
 */

type SettingsEntry = {
  href: string;
  title: string;
  /** Fungsi konkret halaman ini, supaya pengguna tahu apa yang terjadi di sana. */
  purpose: string;
  /** Izin yang dibutuhkan; `null` berarti cukup punya sesi. */
  permission: Permission | null;
};

type SettingsGroup = {
  title: string;
  description: string;
  entries: SettingsEntry[];
};

const GROUPS: SettingsGroup[] = [
  {
    title: 'Umum',
    description: 'Berlaku untuk akunmu sendiri, bukan untuk kelas.',
    entries: [
      {
        href: '/settings/profile',
        title: 'Profil saya',
        purpose:
          'Nama, username, nama panggilan, bio, foto profil, tautan sosial, portofolio, dan aturan visibilitas data pribadimu.',
        permission: null,
      },
      {
        href: '/settings/account',
        title: 'Akun & kata sandi',
        purpose:
          'Ganti kata sandi dan perbarui keamanan akun. Halaman ini tetap bisa dipakai walau keanggotaanmu sedang tidak aktif.',
        permission: null,
      },
    ],
  },
  {
    title: 'Kelas',
    description: 'Tampilan dan isi kelas. Hanya untuk pengelola kelas.',
    entries: [
      {
        href: '/class',
        title: 'Identitas kelas',
        purpose:
          'Nama, kode, tagline, deskripsi, sorotan, zona waktu, logo, cover, dan tautan kontak kelas. Halamannya ada di luar Pengaturan karena isinya adalah tampilan kelas itu sendiri.',
        permission: 'class.manage',
      },
      {
        href: '/settings/theme',
        title: 'Tema kelas',
        purpose:
          'Warna, tipografi, dan tata letak yang dipakai seluruh aplikasi, lengkap dengan laporan kontras tiap pasangan teks.',
        permission: 'class.manage',
      },
    ],
  },
  {
    title: 'Pengelolaan kelas',
    description: 'Khusus pengelola kelas (Ketua).',
    entries: [
      {
        href: '/settings/visibility',
        title: 'Aturan visibilitas',
        purpose:
          'Tentukan siapa boleh membuka tiap halaman dan melihat tiap bagian, lengkap dengan pratinjau apa yang dilihat pengunjung tanpa login. Aturan kelas selalu menjadi batas terluar di atas aturan pribadi anggota.',
        permission: 'class.manage',
      },
      {
        href: '/settings/members',
        title: 'Anggota',
        purpose:
          'Undang anggota, terbitkan tautan akses sekali pakai, aktifkan atau nonaktifkan, dan hapus beserta seluruh isinya.',
        permission: 'members.manage',
      },
    ],
  },
];

/**
 * `/settings` — indeks pengaturan.
 *
 * Butuh sesi saja: halaman ini daftar, bukan tempat mengubah apa pun.
 * Pengunjung anonim diarahkan ke halaman masuk dengan `next` yang aman.
 */
export default async function SettingsIndexPage() {
  const viewer = await getViewer();
  if (!viewer.isSignedIn) redirect('/login?next=%2Fsettings');

  // Grup yang seluruh entrinya tidak boleh dibuka tidak muncul sama sekali,
  // supaya daftar ini tidak pernah menjanjikan halaman yang akan menolak.
  const groups = GROUPS.map((group) => ({
    ...group,
    entries: group.entries.filter(
      (entry) => entry.permission === null || viewer.can(entry.permission),
    ),
  })).filter((group) => group.entries.length > 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Pengaturan"
        description="Semua halaman pengaturan dikelompokkan menurut siapa yang boleh mengubahnya."
      />

      {viewer.isActiveMember ? null : (
        <p className="rounded-md border border-warning px-3 py-2 text-small text-warning">
          Keanggotaanmu sedang tidak aktif. Kamu tetap bisa mengganti kata sandi di bagian Akun,
          tapi halaman profil tidak bisa dibuka. Hubungi Ketua untuk mengaktifkan kembali
          keanggotaanmu.
        </p>
      )}

      {groups.length === 0 ? (
        <EmptyState
          title="Belum ada pengaturan untukmu"
          description="Pengaturan yang bisa kamu ubah akan muncul di sini."
        />
      ) : (
        <div className="flex max-w-content flex-col gap-10">
          {groups.map((group) => (
            <Section key={group.title} title={group.title} description={group.description}>
              <List>
                {group.entries.map((entry) => (
                  <ListItem key={entry.href} className="flex flex-col gap-1">
                    <Link
                      href={entry.href}
                      className="text-body font-semibold text-primary underline underline-offset-4"
                    >
                      {entry.title}
                    </Link>
                    <p className="text-small text-text-muted">{entry.purpose}</p>
                  </ListItem>
                ))}
              </List>
            </Section>
          ))}
        </div>
      )}
    </div>
  );
}