import { redirect } from 'next/navigation';
import { getClassIdentity } from '@/features/class/queries';
import { getViewer } from '@/lib/visibility/server';
import { safeRedirect } from '@/lib/safe-redirect';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { StorageImage } from '@/components/storage/StorageImage';
import { Card } from '@/components/ui/Card';

export const dynamic = 'force-dynamic';

/**
 * Halaman masuk. Publik, tapi hanya menampilkan bagian kelas yang boleh
 * dilihat anonim (§10). Pengunjung yang sudah masuk langsung dialihkan.
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
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-12"
    >
      <div className="flex w-full max-w-form flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          {identity?.logo_path ? (
            <StorageImage
              path={identity.logo_path}
              alt={`Logo ${identity.name}`}
              width={64}
              height={64}
              priority
              className="size-16 rounded-md object-contain"
            />
          ) : null}
          <h1 className="font-display text-h1 font-semibold text-text">
            {identity?.name ?? 'Kelas'}
          </h1>
          {identity?.tagline ? (
            <p className="text-body text-text-muted">{identity.tagline}</p>
          ) : null}
        </div>

        <Card tier="primary" className="p-6">
          <LoginForm next={target} />
        </Card>
      </div>
    </main>
  );
}
