'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, Settings, UserRound } from 'lucide-react';
import { Disclosure, DisclosureItem } from '@/components/ui/Disclosure';
import { Avatar } from '@/components/ui/Avatar';
import type { Viewer } from '@/lib/visibility/types';
import { signOut } from '@/features/auth/actions';

/**
 * Menu pengguna. Grup admin (Pengaturan) hanya muncul bila memang punya izin,
 * bukan disembunyikan lalu masih bisa dijangkau lewat URL (§10.1).
 */
export function UserMenu({ viewer }: { viewer: Viewer }) {
  const router = useRouter();

  const hasAnyPermission = viewer.permissions.length > 0;

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

          {hasAnyPermission ? (
            <Link
              href="/settings"
              role="menuitem"
              onClick={close}
              className="flex min-h-11 items-center gap-2 rounded-sm px-3 py-2 text-body text-text transition-func hover:bg-surface-dim"
            >
              <Settings aria-hidden="true" className="size-4" />
              Pengaturan
            </Link>
          ) : null}

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
