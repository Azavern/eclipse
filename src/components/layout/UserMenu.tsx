'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { Disclosure, DisclosureItem } from '@/components/ui/Disclosure';
import { Avatar } from '@/components/ui/Avatar';
import type { ViewerData } from '@/lib/visibility/types';
import { signOut } from '@/features/auth/actions';

/**
 * Menu pengguna: identitas dan keluar.
 *
 * "Pengaturan" TIDAK ada di sini — ia item navigasi seperti halaman lain, jadi
 * ada di sidebar (desktop) dan bottom nav (mobile), dan hanya muncul untuk
 * viewer yang punya izin (§10.1). Yang tetap ada di sini adalah "Profil saya":
 * pintasan ke profil milik viewer sendiri, bukan area pengaturan.
 */
export function UserMenu({ viewer }: { viewer: ViewerData }) {
  const router = useRouter();

  return (
    <Disclosure
      label="Menu pengguna"
      trigger={
        <>
          <Avatar name={viewer.roleName ?? 'Anggota'} size="sm" />
          <span className="hidden text-label text-text sm:inline">
            {viewer.roleName ?? 'Anggota'}
          </span>
          <ChevronDown aria-hidden="true" className="size-4 text-text-muted" />
        </>
      }
    >
      {(close) => (
        <>
          <Link
            href="/settings/profile"
            role="menuitem"
            onClick={close}
            className="flex min-h-11 items-center gap-2 rounded-sm px-3 py-2 text-body text-text transition-func hover:bg-surface-dim"
          >
            <UserRound aria-hidden="true" className="size-4" />
            Profil saya
          </Link>

          <DisclosureItem
            onSelect={async () => {
              close();
              await signOut();
              router.push('/');
              router.refresh();
            }}
          >
            <LogOut aria-hidden="true" className="size-4" />
            Keluar
          </DisclosureItem>
        </>
      )}
    </Disclosure>
  );
}
