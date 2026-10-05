import type { ReactNode } from 'react';
import { SkipLink } from '@/components/ui/Section';
import { SidebarNav } from './SidebarNav';
import { BottomNav } from './BottomNav';
import { TopBar, type ClassIdentity } from './TopBar';
import type { NavEntry } from './NavItems';
import type { Viewer } from '@/lib/visibility/types';

/**
 * Shell aplikasi.
 *
 * Navigasi bertransformasi, bukan menyusut (§16): SidebarNav tampil pada
 * >=1024px, BottomNav pada <1024px. Keduanya dibangun dari data nav yang sama,
 * sehingga tidak bisa menjadi dua produk berbeda.
 *
 * Pengunjung anonim tidak mendapat sidebar maupun bottom nav; TopBar
 * menampilkan tautan ke halaman yang terlihat plus tombol "Masuk".
 */
export function AppShell({
  viewer,
  navItems,
  identity,
  timezone,
  children,
}: {
  viewer: Viewer;
  navItems: NavEntry[];
  identity: ClassIdentity;
  timezone: string;
  children: ReactNode;
}) {
  const isAnonymous = !viewer.isSignedIn;

  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />

      <TopBar viewer={viewer} navItems={navItems} identity={identity} timezone={timezone} />

      {isAnonymous ? (
        // Tanpa navigasi lateral: identitas kelas dan halaman publik saja.
        <main id="main" className="mx-auto w-full max-w-content flex-1 px-4 py-6 lg:px-6 lg:py-8">
          {children}
        </main>
      ) : (
        <div className="flex flex-1">
          <SidebarNav items={navItems} />
          <main
            id="main"
            className="mx-auto w-full max-w-content flex-1 px-4 py-6 pb-24 md:px-6 lg:px-8 lg:py-8 lg:pb-8"
          >
            {children}
          </main>
        </div>
      )}

      {/* Bottom nav hanya untuk pengguna yang sudah masuk (§16). */}
      {isAnonymous ? null : <BottomNav items={navItems} />}
    </div>
  );
}
