'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from './NavItems';
import { isActive } from './SidebarNav';

/**
 * Bottom nav untuk mobile dan tablet (<1024px), hanya untuk pengguna login
 * (§16). Setiap item minimal 44x44px agar target sentuh memenuhi (§17.7).
 *
 * Item yang tidak boleh dibuka ikut disembunyikan di sini, sama seperti di
 * sidebar, karena keduanya membaca daftar nav yang sama.
 */
export function BottomNav({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama"
      // pb-safe menjaga tombol tidak tertutup gesture bar iOS/Android.
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border-subtle bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-content items-stretch justify-around">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 py-2 text-caption transition-func ${
                  active ? 'border-t-2 border-primary font-semibold text-primary' : 'text-text-muted'
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
