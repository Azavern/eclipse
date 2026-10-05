import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/visibility/server';
import { PWD_SETUP_COOKIE, PWD_SETUP_VALUE } from '@/features/auth/constants';
import { SetPasswordForm } from '@/features/auth/components/SetPasswordForm';
import { getClassIdentity } from '@/features/class/queries';

export const dynamic = 'force-dynamic';

/**
 * Tentukan kata sandi setelah tautan akses terverifikasi (§6.2).
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
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-12"
    >
      <div className="flex w-full max-w-form flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-display text-h1 font-semibold text-text">
            {mode === 'activate' ? 'Tentukan kata sandi' : 'Kata sandi baru'}
          </h1>
          <p className="text-body text-text-muted">
            {mode === 'activate'
              ? `Keanggotaanmu di ${identity?.name ?? 'kelas ini'} aktif setelah langkah ini.`
              : (identity?.name ?? 'Kelas')}
          </p>
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface p-6">
          <SetPasswordForm mode={mode} />
        </div>
      </div>
    </main>
  );
}
