import {
  CalendarDays,
  ClipboardList,
  Home,
  School,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { VisibilityKey } from '@/lib/visibility/registry';

export type NavItem = {
  href: string;
  label: string;
  key: VisibilityKey;
  icon: LucideIcon;
};

/**
 * Satu daftar untuk SidebarNav dan BottomNav, supaya transformasi navigasi
 * benar-benar memakai komponen dan ikon yang sama (§16).
 *
 * Ikon dari lucide-react, bukan Material Symbols via CDN: font ikon pihak ketiga
 * menambah permintaan jaringan dan melanggar aturan privasi "tanpa skrip pihak
 * ketiga" (§23).
 *
 * Setiap item punya `key` page untuk pemeriksaan visibility, sehingga menu
 * otomatis menyesuaikan endowongan (§10.1).
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Beranda', key: 'page.home', icon: Home },
  { href: '/schedule', label: 'Jadwal', key: 'page.schedule', icon: CalendarDays },
  { href: '/events', label: 'Event', key: 'page.events', icon: Sparkles },
  { href: '/tasks', label: 'Tugas', key: 'page.tasks', icon: ClipboardList },
  { href: '/members', label: 'Anggota', key: 'page.members', icon: Users },
  { href: '/class', label: 'Kelas', key: 'page.class_about', icon: School },
];
