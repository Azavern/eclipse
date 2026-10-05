import 'server-only';

import { EXTENSION_BY_KIND, validateImageFile, type ImageKind } from './magic-bytes';
import type { SupabaseClient } from '@/lib/supabase/server';

export type Bucket = 'class-media' | 'member-media';

export type UploadTarget =
  | { bucket: 'class-media'; classId: string; folder: 'logo' | 'cover' | 'events' }
  | { bucket: 'member-media'; classId: string; userId: string; folder: 'avatar' | 'portfolio' };

/**
 * Susun path objek di server. Nama file SELALU `crypto.randomUUID()` + ekstensi
 * hasil deteksi magic bytes — tidak pernah memakai nama dari pengguna (§13.2).
 */
export function buildObjectPath(target: UploadTarget, kind: ImageKind): string {
  const filename = `${crypto.randomUUID()}.${EXTENSION_BY_KIND[kind]}`;
  if (target.bucket === 'class-media') {
    return `${target.classId}/${target.folder}/${filename}`;
  }
  return `${target.classId}/${target.userId}/${target.folder}/${filename}`;
}

export type UploadResult =
  | { ok: true; path: string; rollback: () => Promise<void> }
  | { ok: false; message: string };

/**
 * Unggah lewat client JWT user, bukan admin client, sehingga policy Storage
 * menjadi lapisan otorisasi (§13.4-4). `upsert: false` karena tidak ada policy
 * UPDATE di Storage.
 *
 * Mengembalikan `rollback` untuk menghapus objek bila penyimpanan baris
 * subsequently gagal — kompensasi harus dijalankan, bukan objek dibiarkan
 * menggantung (§13.4-5).
 */
export async function uploadImage(
  supabase: SupabaseClient,
  target: UploadTarget,
  file: File,
): Promise<UploadResult> {
  const check = await validateImageFile(file);
  if (!check.ok) return { ok: false, message: check.message };

  const path = buildObjectPath(target, check.kind);
  const bucket = supabase.storage.from(target.bucket);

  const { error } = await bucket.upload(path, file, {
    upsert: false,
    contentType: check.kind,
    cacheControl: '3600',
  });

  if (error) {
    // Pesan aman untuk pengguna; path dan detail teknis untuk log.
    console.error('[storage] upload gagal', { path, message: error.message });
    return { ok: false, message: 'Gagal menyimpan gambar. Coba lagi.' };
  }

  return {
    ok: true,
    path,
    rollback: async () => {
      await bucket.remove([path]);
    },
  };
}

/**
 * Hapus objek yang telah digantikan. Best-effort: kegagalan dicatat tetapi
 * tidak menggagalkan aksi pengguna, dan tidak ada penyapu objek yatim (§13.6, D-13).
 */
export async function removeObjectQuietly(
  supabase: SupabaseClient,
  bucket: Bucket,
  path: string | null | undefined,
): Promise<void> {
  if (!path) return;
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) console.error('[storage] hapus objek gagal', { path, message: error.message });
}
