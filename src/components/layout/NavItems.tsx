import type { VisibilityKey } from '@/lib/visibility/registry';

export type NavItem = {
  href: string;
  label: string;
  key: VisibilityKey;
};

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
 * otomatis menyesuaikan endowongan (§10.1).
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
 * Bentuk item nav yang sudah dipersempit ke enam key nyata. Prop navigasi memakai
 * tipe ini, bukan `NavItem`, supaya `NAV_ICONS` bisa diindeks tanpa `any` —
 * dan supaya menambah item baru tetap menuntut ikonnya.
 */
export type NavEntry = (typeof NAV_ITEMS)[number];
