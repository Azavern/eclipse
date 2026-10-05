import 'server-only';

import type { SupabaseClient } from '@/lib/supabase/server';

/**
 * TTL signed URL. Persempitan visibility TIDAK menarik URL yang sudah terbit;
 * tautan lama tetap berlaku paling lama selama TTL ini (§13.6, D-10).
 */
export const SIGNED_URL_TTL_SECONDS = 3600;

/**
 * Tandatangani banyak path sekaligus dengan client JWT user.
 *
 * Signed URL dibuat lewat client user (bukan admin) supaya policy Storage ikut
 * dievaluasi: path yang tidak terlihat viewer menghasilkan entri tanpa
 * `signedUrl`, bukan URL yang bocor (§3.4-5).
 *
 * Batch menghindari N+1 saat menggambar daftar anggota atau portofolio.
 */
export async function signMany(
  supabase: SupabaseClient,
  bucket: 'class-media' | 'member-media',
  paths: readonly (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => typeof p === 'string' && p.length > 0))];
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    console.error('[storage] penandatanganan gagal', { bucket, message: error?.message });
    return new Map();
  }

  const map = new Map<string, string>();
  for (const entry of data) {
    if (entry.path && entry.signedUrl) map.set(entry.path, entry.signedUrl);
  }
  return map;
}
