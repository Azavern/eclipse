import Link from 'next/link';
import { getViewer } from '@/lib/visibility/server';
import { SETTINGS_GROUPS } from './entries';

/**
 * Sub-navigasi halaman pengaturan (DESIGN.md Appendix D: „Settings / profile —
 * sub-navigation“).
 *
 * Yang menentukan `active` adalah pemanggilnya, bukan `usePathname`, supaya
 * komponen ini tetap Server Component dan tidak mengirim satu pun JavaScript ke
 * browser hanya untuk menandai menu yang sedang dibuka.
 *
 * Bentuknya deretan chip yang menggulir mendatar, bukan rel di sisi kiri.
 * Deviasi dari resep itu disengaja: daftar pengaturan di aplikasi ini hanya enam
 * entri, dan kelas pengguna sering membuka aplikasi dari ponsel — rel kiri akan
 * memakan setengah lebar layar dan menyisakan kolom isian yang sempit. Bentuk
 * chip-nya sendiri sama dengan penyaring di halaman daftar, jadi satu bahasa
 * visual untuk "pilihan yang sekaligus tautan".
 *
 * Entri yang tidak boleh dibuka viewer tidak dirender sama sekali (blueprint
 * §7.8). `getViewer` dibungkus `cache` React, jadi pemanggilannya di sini tidak
 * menambah satu pun permintaan.
 */
export async function SettingsNav({ active }: { active: string }) {
  const viewer = await getViewer();

  const entries = [
    { href: '/settings', title: 'Semua pengaturan', permission: null },
    ...SETTINGS_GROUPS.flatMap((group) => group.entries),
  ].filter((entry) => entry.permission === null || viewer.can(entry.permission));

  return (
    <nav aria-label="Navigasi pengaturan" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {entries.map((entry) => {
        const isActive = entry.href === active;
        return (
          <Link
            key={entry.href}
            href={entry.href}
            aria-current={isActive ? 'page' : undefined}
            className={`press inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-label ${
              isActive
                ? 'border-primary bg-primary-soft font-semibold text-text'
                : 'border-border-strong bg-surface text-text-muted hover:bg-surface-dim hover:text-text'
            }`}
          >
            {entry.title}
          </Link>
        );
      })}
    </nav>
  );
}
