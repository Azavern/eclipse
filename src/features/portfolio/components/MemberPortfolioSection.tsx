import { getMemberPortfolio } from '@/features/portfolio/queries';
import { Section } from '@/components/ui/Section';
import { PortfolioList } from './PortfolioList';

/**
 * Portofolio publik seorang anggota di `/members/[username]`.
 *
 * Server Component async: query-nya diambil di komponen yang memang
 * membutuhkannya, sehingga halaman profil bisa streamed — bagian atas
 * (identitas) tampil tanpa menunggu daftar item.
 */
export async function MemberPortfolioSection({ userId }: { userId: string }) {
  const items = await getMemberPortfolio(userId);

  return (
    <Section tier="primary" title="Portofolio" description="Proyek, prestasi, dan pengalaman.">
      <PortfolioList items={items} />
    </Section>
  );
}