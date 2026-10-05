import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { canShow, requireView } from '@/lib/visibility/server';
import { getMemberByUsername } from '@/features/member/queries';
import { MemberPortfolioSection } from '@/features/portfolio/components/MemberPortfolioSection';
import { MemberSocialSection } from '@/features/social/components/MemberSocialSection';
import { AvatarFromPath } from '@/components/storage/AvatarFromPath';
import { PageHeader, Section } from '@/components/ui/Section';
import { Badge } from '@/components/ui/Badge';
import { formatDateTime } from '@/lib/time';
import { getClassIdentity } from '@/features/class/queries';
import { SkeletonSectionTitle } from '@/components/ui/Skeleton';
import { SectionBoundary } from '@/components/ui/SectionBoundary';

export const dynamic = 'force-dynamic';

/**
 * Profil publik seorang anggota — gate `page.members`.
 *
 * Baris profil dibaca dari `member_profile_v`, jadi `null` berarti baris tidak
 * ada ATAU tidak terlihat oleh viewer ini. Keduanya berakhir di `notFound()`
 * yang sama supaya keberadaan anggota lain tidak bocor dari perbedaan status.
 *
 * Kolom `nickname`/`bio`/`avatar_path` tiba sebagai NULL kalau aturan
 * visibility-nya tidak mengizinkan; komponen `AvatarFromPath` sudah menangani
 * avatar yang NULL dengan inisial, dan bio/nickname tidak dirender sama sekali
 * (§7.8).
 */
export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  await requireView('page.members', '/members');

  const { username } = await params;

  // Profil, peta visibilitas, dan identitas kelas tidak bergantung satu sama
  // lain: diambil dalam satu ronde, bukan tiga ronde berurutan.
  const [member, showPortfolio, showSocial, identity] = await Promise.all([
    getMemberByUsername(username),
    canShow('section.member.portfolio'),
    canShow('section.member.social'),
    getClassIdentity(),
  ]);
  if (!member) notFound();

  const timezone = identity?.timezone ?? 'Asia/Jakarta';

  // Query konten diambil oleh section-nya sendiri saat sudah boleh dilihat,
  // jadi tidak ada baris yang diambil lalu tidak dirender.
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={member.full_name} description={`@${member.username}`} />

      <section className="flex flex-wrap items-center gap-4">
        <AvatarFromPath path={member.avatar_path} name={member.full_name} size="xl" />

        <div className="flex min-w-0 flex-col gap-2">
          {member.nickname ? (
            <p className="text-body text-text-muted">@{member.nickname}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">{member.role_name}</Badge>
            {member.joined_at ? (
              <span className="text-caption text-text-muted">
                Bergabung {formatDateTime(member.joined_at, timezone)}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {member.bio ? (
        <Section title="Bio">
          <p className="text-body text-text">{member.bio}</p>
        </Section>
      ) : null}

      {showPortfolio ? (
        <SectionBoundary title="Portofolio gagal dimuat">
          <Suspense fallback={<SkeletonSectionTitle rows={3} />}>
            <MemberPortfolioSection userId={member.user_id} />
          </Suspense>
        </SectionBoundary>
      ) : null}

      {showSocial ? (
        <SectionBoundary title="Tautan sosial gagal dimuat">
          <Suspense fallback={<SkeletonSectionTitle rows={2} />}>
            <MemberSocialSection userId={member.user_id} />
          </Suspense>
        </SectionBoundary>
      ) : null}
    </div>
  );
}