import Link from 'next/link';
import { LogIn } from 'lucide-react';
import type { Viewer } from '@/lib/visibility/types';
import { toViewerData } from '@/lib/visibility/types';
import { ButtonLink } from '@/components/ui/Button';
import { UserMenu } from './UserMenu';
import { StorageImage } from '@/components/storage/StorageImage';
import { zoneLabel } from '@/lib/time';
import type { NavEntry } from './NavItems';

export type ClassIdentity = { name: string; logoPath: string | null };

/**
 * TopBar: identitas kelas + konteks pengguna.
 *
 * Untuk anonim, navigasi hidup di sini sebagai tautan teks (hanya yang
 * terlihat), karena tidak ada sidebar maupun bottom nav untuk non-member. Untuk
 * yang sudah masuk, muncul UserMenu (blueprint §11.5).
 *
 * Nama kelas selalu tampil, apa pun konfigurasi visibility: seluruh halaman —
 * termasuk login — perlu identitas untuk merender (A-01, blueprint §7.4).
 *
 * Barnya menempel (sticky) dan memakai latar tembus pandang + blur (DESIGN.md
 * §6: „glass and blur“ boleh dipakai pada header yang menempel selama kontras
 * teksnya tetap terjaga). Latarnya tetap dicampur dari `--color-surface`, jadi
 * teks di atasnya tidak pernah bergantung pada apa yang kebetulan lewat di
 * belakangnya. Logo ditempatkan di tile ber-tint supaya identitas kelas punya
 * satu jangkar visual meski logonya belum diunggah.
 */
export function TopBar({
  viewer,
  navItems,
  identity,
  timezone,
}: {
  viewer: Viewer;
  navItems: readonly NavEntry[];
  identity: ClassIdentity;
  timezone: string;
}) {
  return (
    <header className="glass-bar sticky top-0 z-50 border-b border-border-subtle">
      <div className="mx-auto flex min-h-16 w-full max-w-content flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-1 md:px-6 lg:px-8">
        <Link
          href="/"
          className="press -ms-1 flex min-h-11 items-center gap-3 rounded-md px-1 hover:bg-surface-dim"
        >
          <span className="icon-tile size-10">
            {identity.logoPath ? (
              <StorageImage
                path={identity.logoPath}
                alt={`Logo ${identity.name}`}
                width={32}
                height={32}
                className="size-8 rounded-sm object-contain"
                priority
              />
            ) : (
              <span aria-hidden="true" className="font-display text-h3 font-semibold">
                {identity.name.trim().charAt(0).toUpperCase() || 'K'}
              </span>
            )}
          </span>

          <span className="flex min-w-0 flex-col">
            <span className="truncate font-display text-h3 font-semibold text-text">
              {identity.name}
            </span>
            <span className="hidden text-caption text-text-muted sm:block">
              {zoneLabel(timezone)}
            </span>
          </span>
        </Link>

        {viewer.isSignedIn ? (
          // `can` dibuang di sini: UserMenu adalah Client Component dan objek
          // Viewer mentah berisi fungsi yang tidak bisa diserialisasi React.
          <UserMenu viewer={toViewerData(viewer)} />
        ) : (
          /*
            Tautan anonim boleh membungkus ke baris kedua. Deretan tautan yang
            tidak bisa membungkus melebarkan halaman pada ponsel 390px — diukur
            di browser: seluruh halaman menggulir horizontal 64px sebelum ini.
            Membungkus adalah pilihan yang benar di sini karena menyembunyikan
            tautan akan menutup satu-satunya navigasi yang dimiliki pengunjung
            tanpa login (DESIGN.md §8: sembunyikan, jangan perkecil — tapi jangan
            sembunyikan satu-satunya jalan masuk).
          */
          <nav
            aria-label="Halaman kelas"
            className="flex flex-wrap items-center justify-end gap-1"
          >
            {navItems
              .filter((item) => item.href !== '/')
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="press inline-flex min-h-11 items-center rounded-md px-2 text-label text-text-muted hover:bg-surface-dim hover:text-text sm:px-3"
                >
                  {item.label}
                </Link>
              ))}
            <ButtonLink href="/login" size="md">
              <LogIn aria-hidden="true" className="size-4" />
              Masuk
            </ButtonLink>
          </nav>
        )}
      </div>
    </header>
  );
}
