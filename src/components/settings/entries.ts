import type { Permission } from '@/lib/visibility/types';

/**
 * Satu entri pengaturan.
 *
 * `purpose` menyebut fungsi konkret halamannya, bukan sekadar namanya: ini satu-
 * satunya tempat pengguna bisa tahu apa yang terjadi di halaman itu sebelum
 * membukanya.
 */
export type SettingsEntry = {
  href: string;
  title: string;
  /** Fungsi konkret halaman ini, supaya pengguna tahu apa yang terjadi di sana. */
  purpose: string;
  /** Izin yang dibutuhkan; `null` berarti cukup punya sesi. */
  permission: Permission | null;
};

export type SettingsGroup = {
  title: string;
  description: string;
  entries: SettingsEntry[];
};

/**
 * Daftar pengaturan, dikelompokkan menurut siapa yang boleh mengubahnya.
 *
 * Satu daftar dipakai dua tempat — indeks `/settings` dan sub-navigasi tiap
 * halaman pengaturan — supaya sebuah halaman tidak bisa muncul di satu tempat
 * dan hilang di tempat lain. Entri yang tidak boleh dibuka viewer TIDAK
 * dirender, bukan disembunyikan dengan CSS (blueprint §7.8); penyaringan izin
 * dilakukan pemanggilnya karena viewer-nya berbeda per permintaan.
 */
export const SETTINGS_GROUPS: SettingsGroup[] = [
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
