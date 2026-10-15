'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavEntry } from './NavItems';
import { NAV_ICONS } from './NavIcons';

/**
 * Sidebar untuk desktop (>=1024px). Pada lebar lebih kecil digantikan
 * BottomNav, bukan diperkecil (blueprint §16, DESIGN.md §8: navigasi
 * bertransformasi, bukan menyusut).
 *
 * Penanda aktif dibangun dari tiga hal sekaligus — pil berlatar tint aksen,
 * bilah aksen di tepi kiri, dan `aria-current="page"` — bukan dari warna teks
 * saja. Labelnya tetap memakai token teks, sedangkan warnanya dibawa oleh bilah
 * dan ikon, karena teks berwarna di atas latar ber-tint tidak dijamin ≥4.5:1
 * untuk palet kelas mana pun (DESIGN.md §10).
 */
export function SidebarNav({ items }: { items: readonly NavEntry[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama"
      className="sticky top-16 hidden h-dvh w-sidebar shrink-0 self-start overflow-y-auto border-r border-border-subtle bg-surface lg:block"
    >
      <ul className="flex flex-col gap-1 p-3">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = NAV_ICONS[item.key];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`press relative flex min-h-11 items-center gap-3 rounded-md px-3 text-body ${
                  active
                    ? 'bg-primary-soft font-semibold text-text'
                    : 'text-text-muted hover:bg-surface-dim hover:text-text'
                }`}
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-2 start-0 w-0.5 rounded-full bg-primary"
                  />
                ) : null}
                <Icon
                  aria-hidden="true"
                  className={`size-5 shrink-0 ${active ? 'text-primary' : ''}`}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** `/` hanya aktif persis; halaman lain aktif juga untuk sub-rutenya. */
export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
