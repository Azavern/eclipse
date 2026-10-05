import { redirect } from 'next/navigation';
import { getViewer, getMemberVisibilityRules, getVisibilityMap } from '@/lib/visibility/server';
import { getMyProfile } from '@/features/member/queries';
import { getMyPortfolio } from '@/features/portfolio/queries';
import { getMySocialLinks } from '@/features/social/queries';
import { ProfileForm } from '@/features/member/components/ProfileForm';
import { AvatarUpload } from '@/features/member/components/AvatarUpload';
import { MemberVisibilityEditor } from '@/features/member/components/MemberVisibilityEditor';
import { PortfolioEditor } from '@/features/portfolio/components/PortfolioEditor';
import { SocialLinksEditor } from '@/features/social/components/SocialLinksEditor';
import { AvatarFromPath } from '@/components/storage/AvatarFromPath';
import { PageHeader, Section } from '@/components/ui/Section';
import { NoAccess } from '@/components/ui/States';

export const dynamic = 'force-dynamic';

/**
 * Pengaturan profil — butuh login dan keanggotaan **aktif** (§10).
 *
 * Anggota `invited` atau `inactive` punya sesi tapi belum berhak mengedit
 * profil, jadi halaman ini tidak sekadar mengecek `isSignedIn`.
 *
 * `?onboarding=1` dipakai `setPassword` setelah aktivasi lewat tautan akses.
 */
export default async function SettingsProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string }>;
}) {
  const viewer = await getViewer();
  const userId = viewer.userId;

  // `userId` dipakai lagi di bawah untuk membaca aturan visibilitas milik sendiri,
  // jadi sesi dicek sekali di sini, bukan lewat pemeriksaan terpisah.
  if (!viewer.isSignedIn || !userId) redirect('/login?next=%2Fsettings%2Fprofile');
  if (!viewer.isActiveMember) {
    return (
      <NoAccess
        message="Profil hanya bisa disunting setelah keanggotaanmu aktif. Minta Ketua membuat tautan akses baru."
        backHref="/"
      />
    );
  }

  const profile = await getMyProfile();
  if (!profile) {
    return (
      <NoAccess
        message="Profilmu belum siap. Muat ulang halaman."
        backHref="/"
        backLabel="Kembali"
      />
    );
  }

  const [{ onboarding }, portfolio, socialLinks, visibilityMap, ownRules] = await Promise.all([
    searchParams,
    getMyPortfolio(),
    getMySocialLinks(),
    getVisibilityMap(),
    getMemberVisibilityRules(userId),
  ]);
  const justActivated = onboarding === '1';

  // Aturan milik anggota sendiri: nilai kosong berarti "pakai bawaan katalog",
  // jadi Select menampilkan opsi bawaan, bukan nilai effective yang sudah dipangkas.
  const visibilityInitial = Object.fromEntries(
    Object.entries(ownRules).map(([key, audience]) => [key, audience ?? '']),
  );

  return (
    <div className="flex flex-col gap-8">
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

      <div className="flex max-w-content flex-col gap-10">
        <Section title="Foto" description="Dipakai di daftar anggota dan komentar.">
          <div className="flex items-center gap-4">
            <AvatarFromPath path={profile.avatar_path} name={profile.full_name} size="lg" />
            <div className="max-w-form">
              <AvatarUpload />
            </div>
          </div>
        </Section>

        <Section title="Informasi" description="Username dipakai pada tautan profil.">
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

        <Section
          title="Tautan sosial"
          description="Tautan kontak dan media sosial yang muncul di profilmu."
        >
          <SocialLinksEditor links={socialLinks} map={visibilityMap} />
        </Section>

        <Section title="Portofolio" description="Proyek, prestasi, dan pengalaman yang kamu tampilkan.">
          <PortfolioEditor items={portfolio} map={visibilityMap} />
        </Section>

        <Section
          title="Visibilitas profil"
          description="Atur siapa yang boleh melihat bagian profilmu. Aturan kelas tetap menjadi batas terluar."
        >
          <div className="max-w-form">
            <MemberVisibilityEditor initial={visibilityInitial} map={visibilityMap} />
          </div>
        </Section>
      </div>
    </div>
  );
}