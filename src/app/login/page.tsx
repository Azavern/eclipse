import { redirect } from 'next/navigation';
import { getClassIdentity } from '@/features/class/queries';
import { getViewer } from '@/lib/visibility/server';
import { safeRedirect } from '@/lib/safe-redirect';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { AuthShell } from '@/components/layout/AuthShell';

export const dynamic = 'force-dynamic';

/**
 * Halaman masuk. Publik, tapi hanya menampilkan bagian kelas yang boleh
 * dilihat anonim (blueprint §10). Pengunjung yang sudah masuk langsung
 * dialihkan.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const viewer = await getViewer();
  if (viewer.isSignedIn) redirect('/');

  const { next } = await searchParams;
  const target = safeRedirect(next, '/');

  const identity = await getClassIdentity();

  return (
    <AuthShell
      identity={
        identity
          ? { name: identity.name, tagline: identity.tagline, logoPath: identity.logo_path }
          : null
      }
      title="Masuk"
      description={`Jadwal, tugas, dan kabar ${
        identity?.name ?? 'kelas'
      } ada di balik pintu ini. Pakai email yang didaftarkan Ketua kelas.`}
    >
      <LoginForm next={target} />
    </AuthShell>
  );
}
