import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/visibility/server';
import { PWD_SETUP_COOKIE, PWD_SETUP_VALUE } from '@/features/auth/constants';
import { SetPasswordForm } from '@/features/auth/components/SetPasswordForm';
import { getClassIdentity } from '@/features/class/queries';
import { AuthShell } from '@/components/layout/AuthShell';

export const dynamic = 'force-dynamic';

/**
 * Tentukan kata sandi setelah tautan akses terverifikasi (blueprint §6.2).
 *
 * Gate-nya cookie flag `pwd_setup` yang hanya bisa dibuat oleh
 * `confirmAccessLink`. Tanpa flag ini, sesi login biasa tidak punya jalur
 * mengganti kata sandi tanpa password lama — jalur itu ada di `/settings/account`.
 *
 * Mode ditentukan status keanggotaan: `invited` = aktivasi, selain itu = reset.
 */
export default async function SetPasswordPage() {
  const store = await cookies();
  if (store.get(PWD_SETUP_COOKIE)?.value !== PWD_SETUP_VALUE) redirect('/login');

  // Sesi harus benar-benar ada; flag tanpa sesi tidak berarti apa-apa.
  const viewer = await getViewer();
  if (!viewer.isSignedIn) redirect('/login');

  const mode = viewer.status === 'invited' ? 'activate' : 'reset';
  const identity = await getClassIdentity();

  return (
    <AuthShell
      identity={
        identity
          ? { name: identity.name, tagline: identity.tagline, logoPath: identity.logo_path }
          : null
      }
      title={mode === 'activate' ? 'Tentukan kata sandi' : 'Kata sandi baru'}
      description={
        mode === 'activate'
          ? `Keanggotaanmu di ${identity?.name ?? 'kelas ini'} aktif setelah langkah ini.`
          : `Tentukan kata sandi baru untuk akunmu di ${identity?.name ?? 'kelas ini'}.`
      }
    >
      <SetPasswordForm mode={mode} />
    </AuthShell>
  );
}
