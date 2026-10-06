import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserId } from '@/lib/visibility/server';
import { USERNAME } from '@/lib/validation';
import type { MembershipStatus } from '@/lib/supabase/database.types';

/**
 * Baris profil milik viewer sendiri.
 *
 * Dibaca dari tabel dasar, bukan view: yang diedit adalah nilai aslinya, dan
 * hanya pemilik aktif yang boleh mengubahnya (`member_profiles_update_own`).
 * View `member_profile_v` sudah apply masking visibility, sehingga nickname dan
 * bio bisa NULL di sana padahal aslinya tidak NULL di tabel.
 */
export const getMyProfile = cache(async () => {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('member_profiles')
    .select('full_name, username, nickname, bio, avatar_path')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[member] gagal membaca profil sendiri', { message: error.message });
    return null;
  }
  return data ?? null;
});

export type MemberSummary = {
  user_id: string;
  username: string;
  full_name: string;
  role_name: string;
  /** NULL bukan berarti tidak ada avatar, melainkan tidak terlihat oleh viewer ini. */
  avatar_path: string | null;
  joined_at: string | null;
  /** `invited` = belum pernah memakai tautan akses, jadi belum bisa masuk. */
  status: MembershipStatus;
};

/**
 * Daftar anggota untuk halaman `/members`.
 *
 * Membaca `member_profile_v`, bukan `member_profiles`: RLS dan policy select
 * pada tabel dasar tidak cukup untuk menentukan apa yang boleh dilihat,
 * sedangkan view sudah menerjemahkan aturan visibility menjadi baris (§7.8).
 * Baris yang tidak terlihat tidak pernah sampai ke kueri.
 */
export const getMembers = cache(async (): Promise<MemberSummary[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('member_profile_v')
    .select('user_id, username, full_name, role_name, avatar_path, joined_at, status')
    .order('full_name', { ascending: true })
    .limit(100);

  if (error) {
    console.error('[member] gagal membaca daftar anggota', { message: error.message });
    return [];
  }
  return (data ?? []) as MemberSummary[];
});

/**
 * Satu profil anggota untuk halaman `/members/[username]`.
 *
 * Mengembalikan `null` baik saat baris tidak ada maupun saat baris ada tapi tidak
 * terlihat oleh viewer ini — keduanya harus berakhir di `notFound()` yang sama
 * supaya keberadaan anggota lain tidak bocor dari perbedaan status HTTP.
 *
 * `username` diperiksa dengan skema yang sama seperti form signup supaya URL
 * dengan bentuk aneh ditolak sebelum menyentuh database.
 */
export const getMemberByUsername = cache(async (username: string) => {
  if (!USERNAME.safeParse(username).success) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('member_profile_v')
    .select('user_id, username, full_name, nickname, bio, avatar_path, role_name, joined_at')
    .eq('username', username)
    .maybeSingle();

  if (error) {
    console.error('[member] gagal membaca profil anggota', { message: error.message });
    return null;
  }
  return data ?? null;
});

export type MemberProfileDetail = NonNullable<Awaited<ReturnType<typeof getMemberByUsername>>>;
