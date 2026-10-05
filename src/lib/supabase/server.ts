import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { env } from '@/lib/env';
import type { Database } from './database.types';

/**
 * Client JWT user untuk semua baca/tulis konten.
 *
 * Tidak ada client Supabase di browser (blueprint §3.2-3): kunci tidak pernah
 * sampai ke klien, cookie sesi tetap httpOnly, dan keputusan otorisasi selalu
 * melewati RLS yang membaca auth.uid() dari JWT ini.
 *
 * `cache` memastikan satu client per request, sehingga getViewer/getVisibilityMap
 * tidak membuka koneksi baru di setiap pemanggilan.
 */
export const createClient = cache(async () => {
  const store = await cookies();

  return createServerClient<Database>(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) {
            store.set(name, value, {
              ...options,
              httpOnly: true,
              sameSite: 'lax',
              secure: env.IS_PROD,
              path: '/',
            });
          }
        } catch {
          // Server Component tidak boleh menulis cookie; refresh sesi dilakukan
          // oleh src/proxy.ts pada request berikutnya. Kegagalan ini bukan fatal.
        }
      },
    },
  });
});

export type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
