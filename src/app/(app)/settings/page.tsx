import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight, CircleAlert } from 'lucide-react';
import { getViewer } from '@/lib/visibility/server';
import { PageHeader, Section } from '@/components/ui/Section';
import { CARD_BASE, CARD_INTERACTIVE, CARD_TIER_CLASSES } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/States';
import { SettingsNav } from '@/components/settings/SettingsNav';
import { SETTINGS_GROUPS } from '@/components/settings/entries';

export const dynamic = 'force-dynamic';

/**
 * Daftar semua pengaturan — rumah untuk `/settings/**`.
 *
 * Dulu rute ini hanya mengalihkan ke `/settings/profile`, sehingga sidebar
 * ("Pengaturan") mendarat langsung di satu halaman sementara enam halaman
 * pengaturan lain tidak punya pintu masuk sama sekali. Sekarang rute ini jadi
 * indeks: tiga kelompok menurut siapa yang boleh mengubahnya, dan tiap entri
 * menyebut **fungsi konkret** halaman tersebut, bukan sekadar namanya.
 *
 * Aturan yang dijaga di sini:
 *  - Entri yang tidak boleh dibuka viewer ini **tidak dirender**, bukan
 *    disembunyikan dengan CSS (§7.8) — aturan yang sama dipakai nav di layout.
 *  - Halaman pengaturan tidak saling menaut: tiap halaman punya
 *    "Semua pengaturan" di atas judulnya, jadi jalur masuk dan keluar jelas dari
 *    mana pun (§10.1).
 */



/**
 * `/settings` — indeks pengaturan.
 *
 * Butuh sesi saja: halaman ini daftar, bukan tempat mengubah apa pun.
 * Pengunjung anonim diarahkan ke halaman masuk dengan `next` yang aman.
 */
export default async function SettingsIndexPage() {
  const viewer = await getViewer();
  if (!viewer.isSignedIn) redirect('/login?next=%2Fsettings');

  // Grup yang seluruh entrinya tidak boleh dibuka tidak muncul sama sekali,
  // supaya daftar ini tidak pernah menjanjikan halaman yang akan menolak.
  const groups = SETTINGS_GROUPS.map((group) => ({
    ...group,
    entries: group.entries.filter(
      (entry) => entry.permission === null || viewer.can(entry.permission),
    ),
  })).filter((group) => group.entries.length > 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Pengaturan"
        description="Semua halaman pengaturan dikelompokkan menurut siapa yang boleh mengubahnya."
      />

      <SettingsNav active="/settings" />

      {viewer.isActiveMember ? null : (
        <p
          role="status"
          className="flex items-start gap-3 rounded-md border border-warning-edge bg-warning-soft px-4 py-3 text-small text-text"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" />
          Keanggotaanmu sedang tidak aktif. Kamu tetap bisa mengganti kata sandi di bagian Akun,
          tapi halaman profil tidak bisa dibuka. Hubungi Ketua untuk mengaktifkan kembali
          keanggotaanmu.
        </p>
      )}

      {groups.length === 0 ? (
        <EmptyState
          title="Belum ada pengaturan untukmu"
          description="Pengaturan yang bisa kamu ubah akan muncul di sini."
        />
      ) : (
        <div className="card-grid max-w-content">
          {groups.map((group) => (
            <Section
              key={group.title}
              tier="secondary"
              title={group.title}
              description={group.description}
            >
              {/*
                Kartu besar = kategori (beranda pengaturan ini), datar dan tidak
                bisa diklik sebagai satu kesatuan. Kartu kecil = satu unit
                informasi di dalamnya — dan karena tiap unit memang sebuah tujuan
                navigasi, hanya unit yang menerima hover.
              */}
              <div className="grid gap-3 sm:grid-cols-2">
                {group.entries.map((entry) => (
                  <Link
                    key={entry.href}
                    href={entry.href}
                    className={`${CARD_BASE} ${CARD_TIER_CLASSES.tertiary} ${CARD_INTERACTIVE} flex items-start justify-between gap-3 p-4`}
                  >
                    <span className="flex flex-col gap-1">
                      <span className="text-body font-semibold text-text">{entry.title}</span>
                      <span className="text-small text-text-muted">{entry.purpose}</span>
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="mt-0.5 size-5 shrink-0 text-text-muted"
                    />
                  </Link>
                ))}
              </div>
            </Section>
          ))}
        </div>
      )}
    </div>
  );
}