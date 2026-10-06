import { getMemberSocialLinks } from '@/features/social/queries';
import { Section } from '@/components/ui/Section';
import { SocialLinks } from './SocialLinks';

/**
 * Tautan sosial publik seorang anggota di `/members/[username]`.
 *
 * Server Component async supaya halaman profil tidak menunggu daftar tautan
 * sebelum bagian identitas selesai dirender.
 */
export async function MemberSocialSection({ userId }: { userId: string }) {
  const links = await getMemberSocialLinks(userId);

  return (
    <Section tier="tertiary" title="Tautan sosial">
      <SocialLinks links={links} />
    </Section>
  );
}