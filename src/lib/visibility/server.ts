import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Audience, VisibilityEntry, VisibilityKey } from '@/lib/visibility/registry';
import { ceilingNote, VISIBILITY_BY_KEY } from '@/lib/visibility/registry';
import { safeRedirect } from '@/lib/safe-redirect';
import type { Permission, Viewer } from '@/lib/visibility/types';

// Tipe `Viewer` didefinisikan di ./types supaya komponen klien bisa memakainya
// tanpa mengimpor modul server-only.
export type { Permission, Viewer };

/**
 * Konteks viewer untuk request ini, dibaca lewat RPC `get_viewer_context`.
 *
 * Catatan: JWT tetap valid setelah akun dinonaktifkan, jadi status selalu dibaca
 * dari DB setiap kali halaman dirender — bukan dari isi cookie (E9).
 *
 * Fungsi ini BUKAN sumber kebenaran otorisasi; RLS/view/RPC yang menegakkan.
 * Gunanya untuk UX: menentukan shell navigasi dan pesan mana yang tampil.
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const { data, error } = await supabase.rpc('get_viewer_context');
  // Fungsi SQL mengembalikan TABLE, jadi PostgREST mengirim array satu baris.
  const row = error ? null : data?.[0];

  const permissions = (row?.permissions ?? []) as Permission[];
  const status = row?.status ?? null;

  return {
    classId: row?.class_id ?? null,
    userId,
    status,
    roleName: row?.role_name ?? null,
    permissions,
    isSignedIn: userId !== null,
    // Anggota nonaktif tetap punya sesi, tetapi kehilangan akses non-publik (§7.2).
    isActiveMember: status === 'active',
    can: (permission) => status === 'active' && permissions.includes(permission),
  };
});

/**
 * Bentuk satu baris peta visibilitas. Didefinisikan di sini agar modul server
 * tetap punya satu nama; definisi aslinya ada di ./registry supaya editor
 * visibilitas bisa memakainya tanpa menarik modul server-only.
 */
export type { VisibilityEntry };

/** Logika murni; implementasi ada di ./registry agar bisa dipakai komponen klien. */
export { ceilingNote };

/**
 * Peta visibilitas untuk viewer saat ini, satu RPC per request (27 baris).
 * Elemen berscope member dihitung pada tingkat kelas; nilai milik anggota
 * sendiri dibaca terpisah lewat getMemberVisibilityMap.
 */
export const getVisibilityMap = cache(async (): Promise<Record<VisibilityKey, VisibilityEntry>> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_visibility_map');

  const map = {} as Record<VisibilityKey, VisibilityEntry>;
  for (const row of data ?? []) {
    const key = row.key as VisibilityKey;
    // Key tak dikenal diabaikan; di sisi DB key itu sudah gagal tertutup.
    if (!(key in VISIBILITY_BY_KEY)) continue;
    map[key] = {
      own: row.own_audience,
      effective: row.effective_audience,
      allowed: row.allowed,
    };
  }
  return map;
});

/**
 * Aturan visibilitas milik seorang anggota (scope member). Dibaca dari
 * visibility_rules, karena get_visibility_map hanya mengevaluasi tingkat kelas.
 */
export const getMemberVisibilityRules = cache(
  async (userId: string): Promise<Partial<Record<VisibilityKey, Audience>>> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from('visibility_rules')
      .select('key, audience')
      .eq('owner_id', userId);

    const rules: Partial<Record<VisibilityKey, Audience>> = {};
    for (const row of data ?? []) {
      const key = row.key as VisibilityKey;
      if (key in VISIBILITY_BY_KEY) rules[key] = row.audience;
    }
    return rules;
  },
);

/**
 * Apakah section/field boleh ditampilkan?
 *
 * Selain `allowed` dari DB, section Home yang mengambil data dari halaman lain
 * ikut mensyaratkan page sumber datanya terlihat (E7). Tanpa ini,section bisa
 * tampil kosong padahal RLS menyaring semua barisnya.
 */
export async function canShow(key: VisibilityKey): Promise<boolean> {
  const map = await getVisibilityMap();
  const entry = map[key];
  if (!entry?.allowed) return false;

  const dataSource = VISIBILITY_BY_KEY[key].dataSource as VisibilityKey | undefined;
  if (dataSource && !map[dataSource]?.allowed) return false;

  return true;
}

/**
 * Gate halaman. Anonim diarahkan ke login dengan `next` yang aman; pengguna
 * login yang tidak berhak mendapat `null` dan halaman merender `NoAccess`.
 *
 * `next` diambil dari header referer server-side karena requireView berjalan di
 * Server Component, bukan di browser.
 */
export async function requireView(key: VisibilityKey, currentPath = '/'): Promise<true | null> {
  const viewer = await getViewer();
  if (await canShow(key)) return true;

  if (!viewer.isSignedIn) {
    redirect(`/login?next=${encodeURIComponent(safeRedirect(currentPath, '/'))}`);
  }

  return null;
}

/** Gate permission untuk halaman/aksi admin. */
export async function requirePermission(permission: Permission): Promise<true | null> {
  const viewer = await getViewer();
  if (!viewer.isSignedIn) {
    redirect(`/login?next=${encodeURIComponent('/settings')}`);
  }
  if (!viewer.can(permission)) return null;
  return true;
}
