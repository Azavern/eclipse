import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/visibility/server';
import { ChangePasswordForm } from '@/features/auth/components/ChangePasswordForm';
import { CircleAlert, KeyRound } from 'lucide-react';
import { PageHeader, Section } from '@/components/ui/Section';
import { SettingsNav } from '@/components/settings/SettingsNav';

export const dynamic = 'force-dynamic';

/**
 * Pengaturan akun — ganti kata sandi.
 *
 * Butuh login; tidak mensyaratkan keanggotaan aktif karena mengganti kredensial
 * adalah hak setiap akun, termasuk anggota yang sedang dinonaktifkan (§6.2).
 * Karena itu halaman ini tidak pernah merender `NoAccess`.
 */
export default async function SettingsAccountPage() {
  const viewer = await getViewer();
  if (!viewer.isSignedIn) redirect('/login?next=%2Fsettings%2Faccount');

  return (
    <div className="flex flex-col gap-8">
      <SettingsNav active="/settings/account" />

      <PageHeader title="Akun & kata sandi" description="Kata sandi dan keamanan akunmu." />

      {!viewer.isActiveMember ? (
        // Banner saja, bukan `NoAccess`: halaman ini memang bisa dipakai.
        // Menaruh blok "tidak tersedia" di sini akan bertentangan dengan
        // formulir yang tetap berfungsi di bawahnya.
        <p
          role="status"
          className="flex items-start gap-3 rounded-md border border-warning-edge bg-warning-soft px-4 py-3 text-small text-text"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" />
          Keanggotaanmu sedang tidak aktif. Kamu tetap bisa mengganti kata sandi di sini, tapi
          halaman lain tidak bisa dibuka. Hubungi Ketua untuk mengaktifkan kembali keanggotaanmu.
        </p>
      ) : null}

      <div className="flex max-w-content flex-col gap-10">
        <Section
          tier="primary"
          title="Kata sandi"
          description="Mengganti kata sandi tidak mengakhiri sesi di perangkat ini."
          icon={<KeyRound className="size-5" />}
        >
          <div className="max-w-form">
            <ChangePasswordForm />
          </div>
        </Section>
      </div>
    </div>
  );
}
