import {
  CalendarDays,
  ClipboardList,
  Home,
  School,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { NavKey } from './NavItems';

/**
 * Pemetaan ikon navigasi, di sisi klien saja.
 *
 * Ikon adalah komponen fungsi, jadi TIDAK BOLEH ikut di `NAV_ITEMS`: daftar itu
 * dikirim dari Server Component ke SidebarNav/BottomNav yang `'use client'`, dan
 * React menolak menyerialisasi fungsi — beranda 500 untuk setiap anggota login.
 * Yang dikirim hanya metadata; pemetaan ini diselesaikan di browser.
 *
 * Tipe `Record<NavKey, LucideIcon>` membuat additions di `NAV_ITEMS` gagal
 * compile sampai ikonnya ditambahkan di sini, jadi tidak ada item tanpa ikon.
 *
 * Ikon dari lucide-react, bukan Material Symbols via CDN: font ikon pihak ketiga
 * menambah permintaan jaringan dan melanggar aturan privasi "tanpa skrip pihak
 * ketiga" (§23).
 */
export const NAV_ICONS: Record<NavKey, LucideIcon> = {
  'page.home': Home,
  'page.schedule': CalendarDays,
  'page.events': Sparkles,
  'page.tasks': ClipboardList,
  'page.members': Users,
  'page.class_about': School,
};
