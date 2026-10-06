import { getMyPortfolio } from '@/features/portfolio/queries';
import { getVisibilityMap } from '@/lib/visibility/server';
import { Section } from '@/components/ui/Section';
import { PortfolioEditor } from './PortfolioEditor';

/**
 * Section "Portofolio" di `/settings/profile`.
 *
 * Server Component async: mengambil datanya sendiri supaya halaman tidak
 * menunggu editor ini selesai sebelum bagian lain tampil. `getVisibilityMap`
 * sudah ditunggu layout `(app)` dan dibungkus `cache`, jadi tidak menambah
 * permintaan jaringan.
 */
export async function PortfolioSection() {
  const [items, map] = await Promise.all([getMyPortfolio(), getVisibilityMap()]);

  return (
    <Section
      tier="secondary"
      title="Portofolio"
      description="Proyek, prestasi, dan pengalaman yang kamu tampilkan."
    >
      <PortfolioEditor items={items} map={map} />
    </Section>
  );
}