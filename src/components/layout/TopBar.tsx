import Link from 'next/link';
import type { Viewer } from '@/lib/visibility/types';
import { toViewerData } from '@/lib/visibility/types';
import { ButtonLink } from '@/components/ui/Button';
import { UserMenu } from './UserMenu';
import { StorageImage } from '@/components/storage/StorageImage';
import { zoneLabel } from '@/lib/time';
import type { NavItem } from './NavItems';

export type ClassIdentity = { name: string; logoPath: string | null };

/**
 * TopBar: identitas kelas + konteks pengguna.
 *
 * Untuk anonim, navigasi lived di sini sebagai tautan teks (hanya yang terlihat),
 * karena tidak ada sidebar maupun bottom nav untuk non-member. Untuk yang sudah
 * masuk, muncul UserMenu (§11.5).
 *
 * Nama kelas selalu tampil, apa pun konfigurasi visibility: seluruh halaman —
 * termasuk login — perlu identitas untuk merender (A-01, §7.4).
 */
export function TopBar({
  viewer,
  navItems,
  identity,
  timezone,
}: {
  viewer: Viewer;
  navItems: NavItem[];
  identity: ClassIdentity;
  timezone: string;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-surface">
      <div className="mx-auto flex min-h-16 w-full max-w-content items-center justify-between gap-4 px-4 lg:px-6">
        <Link href="/" className="flex min-h-11 items-center gap-3">
          {identity.logoPath ? (
            <StorageImage
              path={identity.logoPath}
              alt={`Logo ${identity.name}`}
              width={32}
              height={32}
              className="size-8 rounded-sm object-contain"
              priority
            />
          ) : null}
          <span className="text-h3 font-semibold text-text">{identity.name}</span>
          <span className="hidden text-caption text-text-muted sm:inline">{zoneLabel(timezone)}</span>
        </Link>

        {viewer.isSignedIn ? (
          // `can` dibuang di sini: UserMenu adalah Client Component dan objek
          // Viewer mentah berisi fungsi yang tidak bisa diserialisasi React.
          <UserMenu viewer={toViewerData(viewer)} />
        ) : (
          <nav aria-label="Halaman kelas" className="flex items-center gap-1">
            {navItems
              .filter((item) => item.href !== '/')
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex min-h-11 items-center px-3 text-label text-text-muted transition-func hover:text-text"
                >
                  {item.label}
                </Link>
              ))}
            <ButtonLink href="/login" size="md">
              Masuk
            </ButtonLink>
          </nav>
        )}
      </div>
    </header>
  );
}
