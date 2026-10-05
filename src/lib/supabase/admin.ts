import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import type { Database } from './database.types';

/**
 * Client service role. KHUSUS untuk:
 *   - Auth Admin API: createUser, generateLink, updateUserById (ban), deleteUser
 *   - Pembersihan Storage dengan prefix yang diturunkan dari id terverifikasi
 *
 * TIDAK BOLEH dipakai untuk query konten: query begitu akan melewati RLS dan
 * membuka visibilitas yang seharusnya tertutup (blueprint §3.2-2).
 * Batas impor ditegakkan ESLint no-restricted-imports: hanya file actions.ts di
 * features/ dan skrip di scripts/ yang boleh mengimpor modul ini.
 */
export const createAdminClient = () =>
  createSupabaseClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

export type AdminClient = ReturnType<typeof createAdminClient>;
