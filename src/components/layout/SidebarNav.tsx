'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavEntry } from './NavItems';
import { NAV_ICONS } from './NavIcons';

/**
 * Sidebar untuk desktop (>=1024px). Pada lebar lebih kecil digantikan
 * BottomNav, bukan diperkecil (§16).
 *
 * Penanda aktif memakai border kiri + latar, bukan warna teks saja, dan
 * `aria-current="page"` announcing posisi ke pembaca layar.
 */
export function SidebarNav({ items }: { items: readonly NavEntry[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama"
      className="sticky top-16 hidden h-dvh w-sidebar shrink-0 self-start overflow-y-auto border-r border-border-subtle bg-surface lg:block"
    >
      <ul className="flex flex-col gap-1 p-4">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = NAV_ICONS[item.key];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-md border-l-4 py-2 ps-3 pe-2 text-body transition-func ${
                  active
                    ? 'border-primary bg-surface-dim font-semibold text-text'
                    : 'border-transparent text-text-muted hover:bg-surface-dim hover:text-text'
                }`}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" />
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
