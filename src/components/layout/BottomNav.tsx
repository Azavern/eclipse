'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavEntry } from './NavItems';
import { NAV_ICONS } from './NavIcons';
import { isActive } from './SidebarNav';

/**
 * Bottom nav untuk mobile dan tablet (<1024px), hanya untuk pengguna login
 * (blueprint §16). Setiap item minimal 48px agar target sentuh memenuhi
 * (DESIGN.md §10).
 *
 * Item yang tidak boleh dibuka ikut disembunyikan di sini, sama seperti di
 * sidebar, karena keduanya membaca daftar nav yang sama.
 *
 * Item aktif ditandai pil ber-tint di belakang ikon plus label semibold: labelnya
 * tetap memakai token teks sementara warnanya dibawa ikon dan latar, sehingga
 * kontrasnya tidak bergantung pada palet kelas (DESIGN.md §10).
 */
export function BottomNav({ items }: { items: readonly NavEntry[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama"
      // pb-safe menjaga tombol tidak tertutup gesture bar iOS/Android.
      className="glass-bar fixed inset-x-0 bottom-0 z-50 border-t border-border-subtle pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-content items-stretch justify-around">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = NAV_ICONS[item.key];
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`press flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 py-2 text-caption ${
                  active ? 'font-semibold text-text' : 'text-text-muted'
                }`}
              >
                <span
                  className={`flex size-8 items-center justify-center rounded-full ${
                    active ? 'bg-primary-soft text-primary' : ''
                  }`}
                >
                  <Icon aria-hidden="true" className="size-5 shrink-0" />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
