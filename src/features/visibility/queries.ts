import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Audience } from '@/lib/visibility/registry';

/**
 * Override visibilitas tingkat kelas (`owner_id is null`).
 *
 * `getVisibilityMap` mengembalikan `own_audience` yang SUDAH resolve override,
 * jadi dari situ tidak bisa dibedakan mana yang bawaan katalog dan mana yang
 * benar-benar di-override. Form butuh pembedaan itu: menampilkan "bawaan"
 * untuk key yang sebenarnya punya override akan membuat Ketua menyimpan nilai
 * yang salah tanpa sadar.
 *
 * RLS hanya mengizinkan baris ini dibaca oleh pemegang `class.manage`, sesuai
 * policy `vis_rules_select`.
 */
export const getClassVisibilityOverrides = cache(
  async (): Promise<Partial<Record<string, Audience>>> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('visibility_rules')
      .select('key, audience')
      .is('owner_id', null);

    if (error) {
      console.error('[visibility] gagal membaca override', { message: error.message });
      return {};
    }

    const overrides: Partial<Record<string, Audience>> = {};
    for (const row of data ?? []) overrides[row.key] = row.audience;
    return overrides;
  },
);
