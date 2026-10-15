import type { ReactNode } from 'react';
import { CalendarDays, ShieldCheck, Users } from 'lucide-react';
import { StorageImage } from '@/components/storage/StorageImage';

/**
 * Kerangka halaman yang dilalui sebelum masuk: masuk, aktivasi, dan konfirmasi
 * tautan sekali pakai.
 *
 * Susunannya mengikuti resep "Sign in" DESIGN.md Appendix D: di desktop, panel
 * aksen selebar ±45% di sisi kiri — logo, nama kelas, satu kalimat tentang
 * kelas, dan tiga butir kemampuan yang benar-benar ada di aplikasi ini — di
 * samping kolom formulir yang lebarnya dibatasi 40rem dan dipusatkan secara
 * vertikal. Di mobile panel merek tidak ikut ditumpuk di atas form; yang
 * tersisa hanya strip identitas tipis, supaya pengguna langsung sampai ke
 * isian.
 *
 * Seluruh teks di panel merek duduk di kartu `surface`. Lihat catatan
 * `.brand-panel` di `globals.css`: warna kelas hanya dijamin kontras terhadap
 * latar rata, jadi teks tidak boleh menempel langsung di atas gradien.
 */
export function AuthShell({
  identity,
  title,
  description,
  children,
}: {
  identity: { name: string; tagline: string | null; logoPath: string | null } | null;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const name = identity?.name ?? 'Kelas';

  return (
    <div className="flex min-h-dvh flex-col lg:grid lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)]">
      {/* Panel merek: hanya di >=1024px. */}
      <aside className="brand-panel relative hidden flex-col justify-center gap-8 overflow-hidden p-10 lg:flex xl:p-14">
        <div className="flex flex-col gap-6 rounded-lg border border-border-subtle bg-surface p-7 shadow-high">
          <div className="flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-md border border-primary-edge bg-primary-soft p-1.5">
              {identity?.logoPath ? (
                <StorageImage
                  path={identity.logoPath}
                  alt={`Logo ${name}`}
                  width={40}
                  height={40}
                  priority
                  className="size-9 rounded-sm object-contain"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="font-display text-h2 font-semibold text-primary"
                >
                  {name.trim().charAt(0).toUpperCase() || 'K'}
                </span>
              )}
            </span>
            <span className="font-display text-h2 font-semibold text-text">{name}</span>
          </div>

          <p className="max-w-prose text-body-lg text-text-muted">
            {identity?.tagline ?? 'Rumah digital kelas: jadwal, tugas, event, dan profil anggota.'}
          </p>

          <ul className="flex flex-col gap-3 border-t border-border-subtle pt-5">
            {[
              {
                Icon: CalendarDays,
                text: 'Jadwal kuliah, event, dan tenggat tugas di satu beranda.',
              },
              { Icon: Users, text: 'Profil anggota dengan portofolio dan tautan kontak.' },
              {
                Icon: ShieldCheck,
                text: 'Aturan visibilitas: kelas menentukan siapa melihat apa.',
              },
            ].map(({ Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span className="icon-tile size-8" aria-hidden="true">
                  <Icon className="size-4" />
                </span>
                <span className="text-small text-text">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-caption text-text-muted">
          Akses hanya untuk anggota kelas. Beranda bisa dibaca pengunjung sesuai aturan visibilitas
          kelas.
        </p>
      </aside>

      {/* Strip identitas untuk mobile/tablet: satu baris, tanpa panel merek. */}
      <div className="flex items-center gap-3 border-b border-border-subtle bg-surface px-4 py-3 lg:hidden">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-primary-edge bg-primary-soft p-1">
          {identity?.logoPath ? (
            <StorageImage
              path={identity.logoPath}
              alt={`Logo ${name}`}
              width={32}
              height={32}
              priority
              className="size-8 rounded-sm object-contain"
            />
          ) : (
            <span aria-hidden="true" className="font-display text-h3 font-semibold text-primary">
              {name.trim().charAt(0).toUpperCase() || 'K'}
            </span>
          )}
        </span>
        <span className="truncate font-display text-h3 font-semibold text-text">{name}</span>
      </div>

      <main
        id="main"
        className="flex flex-1 flex-col items-center justify-center px-4 py-8 md:px-6 lg:px-10 lg:py-12"
      >
        <div className="flex w-full max-w-form flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-h1 font-semibold text-text">{title}</h1>
            {description ? (
              <p className="max-w-prose text-body text-text-muted">{description}</p>
            ) : null}
          </div>

          <div className="rounded-lg border border-border-strong bg-surface p-6 shadow-medium">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
