import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { PORTFOLIO_LIMIT } from './schemas';

/**
 * Bentuk baris yang dipakai UI. `media_path` tetap berupa path Storage; penandatanganan
 * dilakukan terpisah (lihat `signMany`) supaya tabel klien tidak pernah menyentuh
 * modul server-only.
 */
export type PortfolioRow = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  /** Tanggal saja, `YYYY-MM-DD`. */
  occurred_on: string;
  url: string | null;
  media_path: string | null;
  visibility: string | null;
};

const COLUMNS =
  'id, kind, title, description, occurred_on, url, media_path, visibility' as const;

/**
 * Portofolio seorang anggota untuk halaman profil publik.
 *
 * RLS `portfolio_select` sudah menerapkan `app.can_view(class_id,
 * 'item.portfolio', user_id, visibility)`, jadi item yang disembunyikan tidak
 * pernah sampai ke kueri — termasuk milik viewer sendiri yang sedang aktif.
 * Owners dipanggil dengan userId dari baris profil yang sudah terbukti terlihat,
 * bukan dari parameter URL.
 */
export const getMemberPortfolio = cache(
  async (userId: string): Promise<PortfolioRow[]> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('portfolio_items')
      .select(COLUMNS)
      .eq('user_id', userId)
      // Trigger `portfolio_limit` membatasi jumlah baris per anggota; urutan di
      // sini mengikuti indeks `portfolio_items_owner_idx` (occurred_on desc).
      .order('occurred_on', { ascending: false })
      .limit(PORTFOLIO_LIMIT);

    if (error) {
      console.error('[portfolio] gagal membaca portofolio anggota', { message: error.message });
      return [];
    }
    return (data ?? []) as PortfolioRow[];
  },
);

/** Portofolio milik viewer sendiri, untuk form di `/settings/profile`. */
export const getMyPortfolio = cache(async (): Promise<PortfolioRow[]> => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];

  // Baris sendiri tetap dibaca lewat RLS yang sama, bukan tabel lain: pemilik
  // yang akunnya baru dinonaktifkan memang harus berhenti melihat isinya.
  return getMemberPortfolio(userId);
});
