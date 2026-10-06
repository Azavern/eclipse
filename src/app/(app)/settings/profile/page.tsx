import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/visibility/server';
import { getMyProfile } from '@/features/member/queries';
import { SocialLinksSection } from '@/features/social/components/SocialLinksSection';
import { PortfolioSection } from '@/features/portfolio/components/PortfolioSection';
import { MyVisibilitySection } from '@/features/member/components/MyVisibilitySection';
import { ProfileForm } from '@/features/member/components/ProfileForm';
import { AvatarUpload } from '@/features/member/components/AvatarUpload';
import { AvatarFromPath } from '@/components/storage/AvatarFromPath';
import { PageHeader, Section } from '@/components/ui/Section';
import { NoAccess } from '@/components/ui/States';
import {
  SkeletonForm,
  SkeletonList,
  SkeletonSectionShell,
} from '@/components/ui/Skeleton';
import { SectionBoundary } from '@/components/ui/SectionBoundary';
import { SettingsBackLink } from '@/components/settings/SettingsBackLink';

export const dynamic = 'force-dynamic';

/**
 * Pengaturan profil — butuh login dan keanggotaan **aktif** (§10).
 *
 * Anggota `invited` atau `inactive` punya sesi tapi belum berhak mengedit
 * profil, jadi halaman ini tidak sekadar mengecek `isSignedIn`.
 *
 * `?onboarding=1` dipakai `setPassword` setelah aktivasi lewat tautan akses.
 *
 * Foto dan Informasi menunggu profil sendiri karena keduanya menampilkannya.
 * Tiga section sisanya (tautan sosial, portofolio, visibilitas) dirender sebagai
 * slot `<Suspense>` + `SectionBoundary`: section yang datanya sudah siap tampil
 * duluan, dan kegagalan satu section tidak menjatuhkan halaman ini.
 */
export default async function SettingsProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string }>;
}) {
  // Ketiganya independen: sesi, parameter URL, dan profil sendiri diambil
  // bersamaan. `getViewer`/`getMyProfile` berbagi satu validasi JWT lewat
  // `getCurrentUserId` yang di-cache per request.
  const [viewer, { onboarding }, profile] = await Promise.all([
    getViewer(),
    searchParams,
    getMyProfile(),
  ]);

  if (!viewer.isSignedIn || !viewer.userId) redirect('/login?next=%2Fsettings%2Fprofile');
  if (!viewer.isActiveMember) {
    return (
      <NoAccess
        message="Profil hanya bisa disunting setelah keanggotaanmu aktif. Minta Ketua membuat tautan akses baru."
        backHref="/"
      />
    );
  }

  if (!profile) {
    return (
      <NoAccess
        message="Profilmu belum siap. Muat ulang halaman."
        backHref="/"
        backLabel="Kembali"
      />
    );
  }

  const justActivated = onboarding === '1';

  return (
    <div className="flex flex-col gap-8">
      <SettingsBackLink />

      <PageHeader
        title="Profil saya"
        description="Nama, username, bio, dan foto profil yang dilihat anggota lain."
      />

      {justActivated ? (
        <p className="rounded-md border border-success px-3 py-2 text-small text-success">
          Keanggotaanmu sudah aktif. Isi profil di bawah supaya anggota lain mudah mengenali mu.
          Semua isian boleh dikosongkan kecuali nama dan username.
        </p>
      ) : null}

      <div className="card-grid max-w-content">
        <Section
          tier="tertiary"
          title="Foto"
          description="Dipakai di daftar anggota dan komentar."
        >
          <div className="flex items-center gap-4">
            <AvatarFromPath path={profile.avatar_path} name={profile.full_name} size="lg" />
            <div className="max-w-form">
              <AvatarUpload />
            </div>
          </div>
        </Section>

        <Section
          tier="primary"
          title="Informasi"
          description="Username dipakai pada tautan profil."
        >
          <div className="max-w-form">
            <ProfileForm
              defaults={{
                full_name: profile.full_name,
                username: profile.username,
                nickname: profile.nickname,
                bio: profile.bio,
                avatar_path: profile.avatar_path,
              }}
            />
          </div>
        </Section>

        <SectionBoundary title="Tautan sosial gagal dimuat">
          <Suspense fallback={<SkeletonEditorSection fields={2} />}>
            <SocialLinksSection />
          </Suspense>
        </SectionBoundary>

        <SectionBoundary title="Portofolio gagal dimuat">
          <Suspense fallback={<SkeletonEditorSection fields={3} />}>
            <PortfolioSection />
          </Suspense>
        </SectionBoundary>

        <SectionBoundary title="Visibilitas profil gagal dimuat">
          <Suspense fallback={<SkeletonEditorSection fields={5} />}>
            <MyVisibilitySection />
          </Suspense>
        </SectionBoundary>
      </div>
    </div>
  );
}

/**
 * Fallback streamed: judul section + isi daftar. Section yang gagal tampil
 * sebagai daftar baris, bukan form, karena baris-baris itu yang muncul begitu
 * data tiba (tautan, item portofolio, pilihan visibilitas).
 */
function SkeletonEditorSection({ fields }: { fields: number }) {
  return (
    <SkeletonSectionShell>
      <SkeletonForm fields={fields} />
      <SkeletonList rows={2} />
    </SkeletonSectionShell>
  );
}