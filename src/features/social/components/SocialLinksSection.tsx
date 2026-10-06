import { getMySocialLinks } from '@/features/social/queries';
import { getVisibilityMap } from '@/lib/visibility/server';
import { Section } from '@/components/ui/Section';
import { SocialLinksEditor } from './SocialLinksEditor';

/**
 * Section "Tautan sosial" di `/settings/profile`.
 *
 * Server Component async: datanya sendiri yang diambil di sini, bukan dari
 * halaman. `getVisibilityMap` sudah ditunggu layout `(app)` dan dibungkus
 * `cache`, jadi pemanggilan kedua pada request yang sama tidak menambah
 * permintaan jaringan.
 */
export async function SocialLinksSection() {
  const [links, map] = await Promise.all([getMySocialLinks(), getVisibilityMap()]);

  return (
    <Section
      tier="secondary"
      title="Tautan sosial"
      description="Tautan kontak dan media sosial yang muncul di profilmu."
    >
      <SocialLinksEditor links={links} map={map} />
    </Section>
  );
}