import type { Theme } from '@/lib/theme/schema';

/**
 * Layout preset adalah KONSTANTA KODE, bukan data pengguna (§18). Menambah
 * preset berarti mengubah file ini; tidak ada page builder, tidak ada
 * drag-reorder, tidak ada section kustom (§26.4).
 *
 * `upcoming` bukan section tunggal melainkan tiga daftar (jadwal, tugas, event),
 * masing-masing di-gate key section-nya sendiri.
 */
export const HOME_LAYOUTS: Record<Theme['layout'], readonly HomeSection[]> = {
  standard: ['identity', 'upcoming', 'overview', 'activity', 'members'],
  profile_focused: ['identity', 'members', 'upcoming', 'overview', 'activity'],
};

export type HomeSection = 'identity' | 'upcoming' | 'overview' | 'activity' | 'members';

/**
 * Urutan mobile TIDAK mengikuti preset; ia mengikuti urutan prioritas PRD
 * (§16): identitas, jadwal, tugas, event, anggota, lalu overview dan aktivitas.
 *
 * Bedanya nyata: di preset `standard`, overview dan aktivitas muncul sebelum
 * anggota. Di ponsel keduanya didorong ke bawah karena yang paling sering
 * dibutuhkan anggota adalah identitas, jadwal terdekat, tugas terdekat, dan
 * siapa teman sekelasnya — bukan angka agregat.
 *
 * Daftar ini diterapkan lewat `order-*` sehingga hanya berlaku di bawah 1024px;
 * desktop tetap mengikuti preset yang dipilih Ketua.
 */
export const MOBILE_HOME_ORDER: readonly HomeSection[] = [
  'identity',
  'upcoming',
  'members',
  'overview',
  'activity',
];

/** Posisi section pada urutan mobile, dipakai sebagai utility order Tailwind. */
export function mobileOrderClass(section: HomeSection): string {
  const index = MOBILE_HOME_ORDER.indexOf(section);
  // `order-first` untuk posisi 0; sisanya memakai order-1..n, yang berlaku
  // hanya di bawah lg karena dibungkus prefix `lg:` pada pemanggil.
  return index <= 0 ? 'order-first' : `order-${index}`;
}
