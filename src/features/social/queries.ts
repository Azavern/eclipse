import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserId } from '@/lib/visibility/server';

export type SocialLinkRow = {
  id: string;
  platform: string;
  label: string | null;
  url: string;
  visibility: string | null;
};

const COLUMNS = 'id, platform, label, url, visibility' as const;

/**
 * Tautan sosial seorang anggota untuk halaman profil publik.
 *
 * RLS `social_select` sudah menerapkan `app.can_view(class_id,
 * 'item.social_link', user_id, visibility)`; baris tersembunyi tidak pernah
 * sampai ke kueri.
 */
export const getMemberSocialLinks = cache(
  async (userId: string): Promise<SocialLinkRow[]> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('social_links')
      .select(COLUMNS)
      .eq('user_id', userId)
      // Batas trigger `social_limit` adalah 10 baris per anggota.
      .order('platform', { ascending: true })
      .limit(10);

    if (error) {
      console.error('[social] gagal membaca tautan anggota', { message: error.message });
      return [];
    }
    return (data ?? []) as SocialLinkRow[];
  },
);

/** Tautan milik viewer sendiri, untuk form di `/settings/profile`. */
export const getMySocialLinks = cache(async (): Promise<SocialLinkRow[]> => {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  return getMemberSocialLinks(userId);
});

/** Batas jumlah tautan per anggota; cerminan trigger `social_limit`. */
export const SOCIAL_LINK_LIMIT = 10;