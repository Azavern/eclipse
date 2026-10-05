import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { ClassIdentity, ClassLinkSummary } from '@/lib/supabase/database.types';
import { DEFAULT_THEME } from '@/lib/theme/defaults';
import { ThemeSchema } from '@/lib/theme/schema';
import type { Theme } from '@/lib/theme/schema';

/**
 * Identitas kelas dari view bermasker.
 *
 * Nama, theme, dan timezone sengaja tidak pernah dimasker; field sisanya
 * (`code`, `tagline`, `description`, `highlight_*`, `*_path`) bernilai NULL bila
 * viewer tidak berhak, dan UI TIDAK merender label kosong untuk nilai NULL
 * supaya tidak membocorkan "ada tapi disembunyikan" (§7.8).
 *
 * Semua halaman dinamis: tidak ada cache lintas request, karena cache tidak
 * boleh mengalahkan otorisasi (D-14, §3.2-4). `cache` React hanya berlaku
 * dalam satu request.
 */
export const getClassIdentity = cache(async (): Promise<ClassIdentity | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('class_identity_v')
    .select('id, name, theme, timezone, code, tagline, description, highlight_text, highlight_url, logo_path, cover_path')
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[class] gagal membaca identitas', { message: error.message });
    return null;
  }
  return data ?? null;
});

/**
 * Theme kelas, sudah divalidasi. Nilai yang gagal validasi diganti default agar
 * halaman tetap punya kontras terjamin.
 */
export async function getClassTheme(): Promise<Theme> {
  const identity = await getClassIdentity();
  if (!identity) return DEFAULT_THEME;

  const parsed = ThemeSchema.safeParse(identity.theme);
  if (parsed.success) return parsed.data;

  console.error('[theme] theme tidak valid, memakai default');
  return DEFAULT_THEME;
}

/**
 * Row `classes` mentah. Hanya Ketua yang bisa membacanya lewat RLS, jadi
 * pemanggil wajib sudah mengecek permission `class.manage`.
 */
export async function getEditableClass() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('classes')
    .select('id, name, code, tagline, description, highlight_text, highlight_url, logo_path, cover_path, timezone')
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[class] gagal membaca kelas', { message: error.message });
    return null;
  }
  return data ?? null;
}

/**
 * Tautan kelas (kontak/media sosial kelas). RLS memfilternya berdasarkan
 * `section.class.links`, jadi baris yang tidak terlihat tidak pernah sampai di
 * sini.
 */
export const getClassLinks = cache(async (): Promise<ClassLinkSummary[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('class_links')
    .select('id, class_id, platform, label, url')
    .order('platform', { ascending: true })
    .limit(20);

  if (error) {
    console.error('[class] gagal membaca tautan', { message: error.message });
    return [];
  }
  return data ?? [];
});
