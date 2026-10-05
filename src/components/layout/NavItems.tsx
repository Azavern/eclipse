import type { VisibilityKey } from '@/lib/visibility/registry';

export type NavItem = {
  href: string;
  label: string;
  key: VisibilityKey;
};

/**
 * Entri "Pengaturan".
 *
 * Dipisah dari `NAV_ITEMS` karena tidak punya visibility key halaman: yang
 * menentukan kelihatannya adalah apakah viewer punya izin apa pun, bukan
 * aturan visibilitas halaman (§10.1). `href` menunjuk `/settings` — bukan
 * `/settings/profile` langsung — supaya entri ini tetap aktif di seluruh
 * `/settings/**` (§16) dan hanya membutuhkan satu rute pengalihan.
 */
export const SETTINGS_NAV_ITEM = {
  href: '/settings',
  label: 'Pengaturan',
  key: 'settings',
} as const;

/**
 * Satu daftar untuk SidebarNav dan BottomNav, supaya transformasi navigasi
 * benar-benar memakai komponen yang sama (§16).
 *
 * Item TIDAK menyimpan komponen ikon. Daftar ini dibaca di Server Component
 * (`(app)/layout.tsx`) lalu dikirim ke SidebarNav dan BottomNav yang `'use
 * client'`. Nilai fungsi tidak bisa melewati batas itu — React melempar
 * "Functions cannot be passed directly to Client Components" dan halaman
 * beranda 500 untuk setiap anggota yang sudah masuk. Ikon dipetakan di sisi
 * klien lewat `NAV_ICONS`; pemetaannya dipisah supaya modul ini bebas
 * `lucide-react` dan tetap serializable.
 *
 * Setiap item punya `key` page untuk pemeriksaan visibility, sehingga menu
 * otomatis menyesuaikan tampilannya (§10.1).
 *
 * Daftar ini dipakai SidebarNav (desktop) DAN BottomNav (mobile) — navigasi
 * bertransformasi, bukan menyusut (§16). `SETTINGS_NAV_ITEM` masuk ke daftar
 * yang sama supaya pengaturan tetap bisa dibuka di kedua ukuran layar.
 */
export const NAV_ITEMS = [
  { href: '/', label: 'Beranda', key: 'page.home' },
  { href: '/schedule', label: 'Jadwal', key: 'page.schedule' },
  { href: '/events', label: 'Event', key: 'page.events' },
  { href: '/tasks', label: 'Tugas', key: 'page.tasks' },
  { href: '/members', label: 'Anggota', key: 'page.members' },
  { href: '/class', label: 'Kelas', key: 'page.class_about' },
  // `as const` menjaga key tetap literal supaya `NavKey` di bawah hanya berisi
  // enam key navigasi, bukan seluruh 27 key visibility. `satisfies` tetap
  // memverifikasi tiap item cocok dengan bentuk `NavItem`.
] as const satisfies readonly NavItem[];

/** Kumpulan key nav; dipakai untuk menguji kelengkapan pemetaan ikon. */
export type NavKey = (typeof NAV_ITEMS)[number]['key'];

/**
 * Bentuk item nav yang sudah dipersempit ke key nyata. Prop navigasi memakai
 * tipe ini, bukan `NavItem`, supaya `NAV_ICONS` bisa diindeks tanpa `any` —
 * dan supaya menambah item baru tetap menuntut ikonnya.
 */
export type NavEntry = (typeof NAV_ITEMS)[number] | typeof SETTINGS_NAV_ITEM;
