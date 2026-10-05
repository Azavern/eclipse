'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/visibility/server';
import { fail, forbidden, ok, type FormState } from '@/lib/result';
import { removeObjectQuietly, uploadImage } from '@/lib/storage/upload';
import {
  buildClassLinkSchema,
  CLASS_LINK_PLATFORMS,
  classIdentitySchema,
  type ClassLinkPlatform,
} from './schemas';

/** FormData mungkin `null` (field absent) atau `File`; keduanya bukan string. */
function str(fd: FormData, key: string): string {
  const value = fd.get(key);
  return typeof value === 'string' ? value : '';
}

/**
 * Simpan identitas kelas.
 *
 * Otorisasi tetap di RLS: `classes_update` menuntut `class.manage` untuk baris
 * itu. Gerbang di sini hanya untuk UX — supaya formulir menampilkan pesan jelas,
 * bukan kesalahan PostgREST yang tidak dimengerti pengguna.
 *
 * Kolom yang boleh diubah sudah dibatasi GRANT di database
 * (`update (name, code, …, timezone, theme)`), jadi pengguna tidak bisa
 * menulis kolom lain walau nama field-nya dimanipulasi.
 */
export async function updateClassIdentity(_prev: FormState, fd: FormData): Promise<FormState> {
  const gate = await requirePermission('class.manage');
  if (!gate) return forbidden();

  const parsed = classIdentitySchema.safeParse({
    name: str(fd, 'name'),
    code: str(fd, 'code'),
    tagline: str(fd, 'tagline'),
    description: str(fd, 'description'),
    highlight_text: str(fd, 'highlight_text'),
    highlight_url: str(fd, 'highlight_url'),
    timezone: str(fd, 'timezone'),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key !== 'string') continue;
      (fieldErrors[key] ??= []).push(issue.message);
    }

    // Isian dikembalikan ke form supaya tidak hilang saat validasi gagal (§15.1).
    return fail(
      {
        code: 'validation',
        message: 'Periksa kembali isian yang ditandai.',
        fieldErrors,
      },
      {
        name: str(fd, 'name'),
        code: str(fd, 'code'),
        tagline: str(fd, 'tagline'),
        description: str(fd, 'description'),
        highlight_text: str(fd, 'highlight_text'),
        highlight_url: str(fd, 'highlight_url'),
        timezone: str(fd, 'timezone'),
      },
    );
  }

  const supabase = await createClient();

  const { data: row, error: readError } = await supabase
    .from('classes')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (readError || !row) {
    console.error('[class] gagal menemukan baris kelas', { message: readError?.message });
    return fail({ code: 'unknown', message: 'Kelas tidak ditemukan. Muat ulang halaman.' });
  }

  // `.select('id')` memaksa PostgREST mengembalikan baris yang terpengaruh.
  // Tanpa itu, update yang tidak cocok dengan apa pun akan dilaporkan sebagai
  // sukses padahal tidak ada yang berubah (§10).
  const { data: updated, error: updateError } = await supabase
    .from('classes')
    .update(parsed.data)
    .eq('id', row.id)
    .select('id');

  if (updateError) {
    console.error('[class] gagal menyimpan identitas', { message: updateError.message });
    return fail({
      code: 'conflict',
      message: 'Perubahan ditolak. Periksa lagi isianmu lalu coba simpan.',
    });
  }

  if (!updated || updated.length === 0) {
    return fail({
      code: 'conflict',
      message: 'Perubahan tidak tersimpan. Muat ulang halaman dan coba lagi.',
    });
  }

  // Identitas muncul di home, halaman kelas, dan judul halaman.
  revalidatePath('/', 'layout');

  return ok(null);
}

// ---------------------------------------------------------------- tautan kelas

function readLinkForm(fd: FormData): Record<string, string> {
  return {
    platform: str(fd, 'platform'),
    label: str(fd, 'label'),
    url: str(fd, 'url'),
  };
}

/** Audience tautan kelas selalu publik; label dipotong agar tidak dipakai hosting. */
function linkFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key !== 'string') continue;
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

async function currentClassId(): Promise<string | { error: FormState }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('classes').select('id').limit(1).maybeSingle();

  if (error || !data) {
    console.error('[class] gagal menemukan kelas untuk tautan', { message: error?.message });
    return { error: fail({ code: 'unknown', message: 'Kelas tidak ditemukan.' }) };
  }
  return data.id;
}

export async function createClassLink(_prev: FormState, fd: FormData): Promise<FormState> {
  const gate = await requirePermission('class.manage');
  if (!gate) return forbidden();

  const values = readLinkForm(fd);
  const platform = values.platform as ClassLinkPlatform;

  const parsed = CLASS_LINK_PLATFORMS.includes(platform)
    ? buildClassLinkSchema(platform).safeParse(values)
    : null;

  if (!parsed || !parsed.success) {
    const error =
      parsed && !parsed.success
        ? parsed.error
        : new z.ZodError([
            { code: 'custom', path: ['platform'], message: 'Platform tidak dikenal' },
          ]);
    return fail(
      {
        code: 'validation',
        message: 'Periksa kembali isian yang ditandai.',
        fieldErrors: linkFieldErrors(error),
      },
      values,
    );
  }

  const classId = await currentClassId();
  if (typeof classId !== 'string') return classId.error;

  const supabase = await createClient();
  const { data: inserted, error: insertError } = await supabase
    .from('class_links')
    .insert({
      class_id: classId,
      platform: parsed.data.platform,
      label: parsed.data.label,
      url: parsed.data.url,
    })
    .select('id');

  if (insertError || !inserted || inserted.length === 0) {
    console.error('[class] gagal menambah tautan', { message: insertError?.message });
    return fail({ code: 'conflict', message: 'Tautan tidak tersimpan. Coba lagi.' }, values);
  }

  revalidatePath('/', 'layout');
  return ok(null);
}

export async function updateClassLink(_prev: FormState, fd: FormData): Promise<FormState> {
  const gate = await requirePermission('class.manage');
  if (!gate) return forbidden();

  const id = str(fd, 'id');
  if (!z.string().uuid().safeParse(id).success) {
    return fail({ code: 'validation', message: 'Tautan tidak valid.' });
  }

  const values = readLinkForm(fd);
  const platform = values.platform as ClassLinkPlatform;

  const parsed = CLASS_LINK_PLATFORMS.includes(platform)
    ? buildClassLinkSchema(platform).safeParse(values)
    : null;

  if (!parsed || !parsed.success) {
    const error =
      parsed && !parsed.success
        ? parsed.error
        : new z.ZodError([
            { code: 'custom', path: ['platform'], message: 'Platform tidak dikenal' },
          ]);
    return fail(
      {
        code: 'validation',
        message: 'Periksa kembali isian yang ditandai.',
        fieldErrors: linkFieldErrors(error),
      },
      values,
    );
  }

  const supabase = await createClient();
  // `.select('id')` memastikan baris benar-benar terpengaruh; update yang
  // tidak cocok dengan apa pun harus dilaporkan gagal, bukan sukses (§10).
  const { data: updated, error: updateError } = await supabase
    .from('class_links')
    .update({ platform: parsed.data.platform, label: parsed.data.label, url: parsed.data.url })
    .eq('id', id)
    .select('id');

  if (updateError || !updated || updated.length === 0) {
    console.error('[class] gagal memperbarui tautan', { message: updateError?.message });
    return fail(
      { code: 'conflict', message: 'Tautan tidak diperbarui. Muat ulang halaman lalu coba lagi.' },
      values,
    );
  }

  revalidatePath('/', 'layout');
  return ok(null);
}

export async function deleteClassLink(_prev: FormState, fd: FormData): Promise<FormState> {
  const gate = await requirePermission('class.manage');
  if (!gate) return forbidden();

  const id = str(fd, 'id');
  if (!z.string().uuid().safeParse(id).success) {
    return fail({ code: 'validation', message: 'Tautan tidak valid.' });
  }

  const supabase = await createClient();
  const { data: deleted, error: deleteError } = await supabase
    .from('class_links')
    .delete()
    .eq('id', id)
    .select('id');

  if (deleteError || !deleted || deleted.length === 0) {
    console.error('[class] gagal menghapus tautan', { message: deleteError?.message });
    return fail({ code: 'conflict', message: 'Tautan tidak terhapus. Coba lagi.' });
  }

  revalidatePath('/', 'layout');
  return ok(null);
}

// ---------------------------------------------------------------- gambar kelas

/**
 * Unggah logo atau cover kelas.
 *
 * Urutannya penting (§13.4): unggah dulu, baru tulis `logo_path`/`cover_path`.
 * Bila penulisan baris gagal, objek yang barusan diunggah **dirollback** agar
 * tidak tertinggal yatim di bucket. Objek lama baru dibuang SETELAH baris
 * berhasil diperbarui — membersihkan sebelum semua langkah dependen sukses
 * bisa membuat kelas kehilangan gambarnya.
 */
export async function uploadClassImage(_prev: FormState, fd: FormData): Promise<FormState> {
  const gate = await requirePermission('class.manage');
  if (!gate) return forbidden();

  const folder = str(fd, 'folder');
  if (folder !== 'logo' && folder !== 'cover') {
    return fail({ code: 'validation', message: 'Jenis gambar tidak dikenal.' });
  }

  const file = fd.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return fail({
      code: 'validation',
      message: 'Pilih gambar terlebih dahulu.',
      fieldErrors: { file: ['Belum ada gambar yang dipilih'] },
    });
  }

  const classId = await currentClassId();
  if (typeof classId !== 'string') return classId.error;

  const supabase = await createClient();
  const result = await uploadImage(supabase, { bucket: 'class-media', classId, folder }, file);
  if (!result.ok) {
    return fail({
      code: 'validation',
      message: result.message,
      fieldErrors: { file: [result.message] },
    });
  }

  const before = await supabase
    .from('classes')
    .select('id, logo_path, cover_path')
    .eq('id', classId)
    .maybeSingle();

  // Kunci kolom ditulis sebagai union literal, bukan kunci dinamis, supaya tipe
  // Update dari database.types tetap terpenuhi.
  const patch = folder === 'logo' ? { logo_path: result.path } : { cover_path: result.path };

  const { data: updated, error: updateError } = await supabase
    .from('classes')
    .update(patch)
    .eq('id', classId)
    .select('id');

  if (updateError || !updated || updated.length === 0) {
    console.error('[class] gagal menyimpan path gambar', { message: updateError?.message });
    // Kompensasi: hapus objek baru supaya tidak ada file yatim.
    await result.rollback();
    return fail({ code: 'conflict', message: 'Gambar tidak tersimpan. Coba lagi.' });
  }

  // Baris sudah menunjuk objek baru; objek lama sekarang tidak terpakai.
  const previous = folder === 'logo' ? before?.data?.logo_path : before?.data?.cover_path;
  await removeObjectQuietly(supabase, 'class-media', previous);

  revalidatePath('/', 'layout');

  return ok(null);
}
