'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient, type SupabaseClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/visibility/server';
import { fail, ok, type ActionError, type FormState } from '@/lib/result';
import { mapDbError } from '@/lib/errors';
import { removeObjectQuietly, uploadImage } from '@/lib/storage/upload';
import { portfolioItemSchema, toItemAudience } from './schemas';

/** FormData mungkin `null` (field absent) atau `File`; keduanya bukan string. */
function str(fd: FormData, key: string): string {
  const value = fd.get(key);
  return typeof value === 'string' ? value : '';
}

type OwnIdentity = { userId: string; classId: string };

/**
 * Identitas pemilik yang sah.
 *
 * `class_id` diambil dari baris `member_profiles` milik viewer sendiri, bukan
 * dari form: kalau ismu bisa menulis kolom itu ke baris milik orang lain, aturan
 * ini jadi tak berarti. Policy `portfolio_insert`/`_update`/`_delete` tetap
 * memeriksa `user_id = auth.uid()` dan keanggotaan aktif di database.
 */
async function ownIdentity(): Promise<OwnIdentity | { error: ActionError }> {
  const viewer = await getViewer();
  const userId = viewer.userId;

  if (!userId) {
    return { error: { code: 'unauthenticated', message: 'Sesi tidak berlaku lagi. Masuk kembali.' } };
  }
  if (!viewer.isActiveMember) {
    return {
      error: {
        code: 'forbidden',
        message: 'Portofolio hanya bisa disunting setelah keanggotaanmu aktif.',
      },
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('member_profiles')
    .select('class_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    console.error('[portfolio] profil sendiri tidak ditemukan', { message: error?.message });
    return { error: { code: 'unknown', message: 'Profilmu belum siap. Muat ulang halaman.' } };
  }
  return { userId, classId: data.class_id };
}

function fieldErrorsOf(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key !== 'string') continue;
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

type ItemRead =
  | { parsed: z.output<typeof portfolioItemSchema>; values: Record<string, string> }
  | { error: z.ZodError; values: Record<string, string> };

/**
 * Baca dan validasi isian item portofolio dari form.
 *
 * Nilai `visibility` tidak ikut skema objek di bawah secara langsung karena
 * string kosong di form berarti "ikut aturan" (NULL di database); select yang
 * dimanipulasi menghasilkan error validasi, bukan nilai enum sembarangan.
 */
function readItem(fd: FormData): ItemRead {
  const values = {
    kind: str(fd, 'kind'),
    title: str(fd, 'title'),
    description: str(fd, 'description'),
    occurred_on: str(fd, 'occurred_on'),
    url: str(fd, 'url'),
  };
  const audience = toItemAudience(str(fd, 'visibility'));

  if (audience === undefined) {
    return {
      error: new z.ZodError([
        { code: 'custom', path: ['visibility'], message: 'Pilihan tidak valid' },
      ]),
      values,
    };
  }

  const parsed = portfolioItemSchema.safeParse({ ...values, visibility: audience });
  return parsed.success ? { parsed: parsed.data, values } : { error: parsed.error, values };
}

/** Terjemahkan error PostgREST menjadi pesan yang bisa dibaca pengguna. */
function mappedFailure(
  error: { code?: string; message?: string; details?: string } | null,
  context: string,
  values: Record<string, string>,
): FormState {
  if (!error) {
    // Tidak ada error tapi juga tidak ada baris terpengaruh: nama/id-nya tidak
    // milik viewer ini, atau barisnya sudah hilang di antara dua permintaan.
    return fail({ code: 'not_found', message: 'Item tidak ditemukan atau bukan milikmu.' }, values);
  }
  const mapped = mapDbError(error, context);
  if (mapped && !mapped.ok) return { ...mapped, values };
  return fail({ code: 'unknown', message: 'Item tidak tersimpan. Coba lagi.' }, values);
}

/**
 * Unggah media item portofolio bila form menyertakan file baru.
 *
 * Mengembalikan `null` tanpa file, atau hasil `uploadImage` supaya pemanggil
 * bisa melakukan rollback bila penyimpanan baris gagal setelahnya.
 */
async function uploadOptionalMedia(
  supabase: SupabaseClient,
  identity: OwnIdentity,
  fd: FormData,
): Promise<
  | { kind: 'none' }
  | { kind: 'invalid'; message: string }
  | { kind: 'uploaded'; path: string; rollback: () => Promise<void> }
> {
  const file = fd.get('file');
  if (!(file instanceof File) || file.size === 0) return { kind: 'none' };

  const uploaded = await uploadImage(
    supabase,
    {
      bucket: 'member-media',
      classId: identity.classId,
      userId: identity.userId,
      folder: 'portfolio',
    },
    file,
  );
  if (!uploaded.ok) return { kind: 'invalid', message: uploaded.message };
  return { kind: 'uploaded', path: uploaded.path, rollback: uploaded.rollback };
}

export async function createPortfolioItem(_prev: FormState, fd: FormData): Promise<FormState> {
  const identity = await ownIdentity();
  if ('error' in identity) return fail(identity.error);

  const read = readItem(fd);
  if ('error' in read) {
    return fail(
      {
        code: 'validation',
        message: 'Periksa kembali isian yang ditandai.',
        fieldErrors: fieldErrorsOf(read.error),
      },
      read.values,
    );
  }

  const supabase = await createClient();
  const media = await uploadOptionalMedia(supabase, identity, fd);
  if (media.kind === 'invalid') {
    return fail(
      { code: 'validation', message: media.message, fieldErrors: { file: [media.message] } },
      read.values,
    );
  }

  const { data: inserted, error } = await supabase
    .from('portfolio_items')
    .insert({
      class_id: identity.classId,
      user_id: identity.userId,
      kind: read.parsed.kind,
      title: read.parsed.title,
      description: read.parsed.description,
      occurred_on: read.parsed.occurred_on,
      url: read.parsed.url,
      media_path: media.kind === 'uploaded' ? media.path : null,
      visibility: read.parsed.visibility,
    })
    .select('id');

  if (error || !inserted || inserted.length === 0) {
    if (media.kind === 'uploaded') await media.rollback();
    return mappedFailure(error, 'create_portfolio_item', read.values);
  }

  revalidatePath('/', 'layout');
  return ok(null);
}

export async function updatePortfolioItem(_prev: FormState, fd: FormData): Promise<FormState> {
  const identity = await ownIdentity();
  if ('error' in identity) return fail(identity.error);

  const id = str(fd, 'id');
  if (!z.string().uuid().safeParse(id).success) {
    return fail({ code: 'validation', message: 'Item portofolio tidak valid.' });
  }

  const read = readItem(fd);
  if ('error' in read) {
    return fail(
      {
        code: 'validation',
        message: 'Periksa kembali isian yang ditandai.',
        fieldErrors: fieldErrorsOf(read.error),
      },
      read.values,
    );
  }

  const supabase = await createClient();

  const media = await uploadOptionalMedia(supabase, identity, fd);
  if (media.kind === 'invalid') {
    return fail(
      { code: 'validation', message: media.message, fieldErrors: { file: [media.message] } },
      read.values,
    );
  }

  const { data: before } = await supabase
    .from('portfolio_items')
    .select('media_path')
    .eq('id', id)
    .maybeSingle();

  // `media_path` sengaja TIDAK ditulis saat tidak ada file baru: walaupun policy
  // mengizinkan kolom itu, menulis NULL karena form kosong akan menghapus gambar
  // tanpa sepengetahuan pengguna.
  const patch = {
    kind: read.parsed.kind,
    title: read.parsed.title,
    description: read.parsed.description,
    occurred_on: read.parsed.occurred_on,
    url: read.parsed.url,
    visibility: read.parsed.visibility,
    ...(media.kind === 'uploaded' ? { media_path: media.path } : {}),
  };

  const { data: updated, error } = await supabase
    .from('portfolio_items')
    .update(patch)
    .eq('id', id)
    .select('id');

  if (error || !updated || updated.length === 0) {
    if (media.kind === 'uploaded') await media.rollback();
    return mappedFailure(error, 'update_portfolio_item', read.values);
  }

  // Baris sudah menunjuk objek baru (bila ada); yang lama baru dibuang sekarang.
  if (media.kind === 'uploaded') {
    await removeObjectQuietly(supabase, 'member-media', before?.media_path);
  }

  revalidatePath('/', 'layout');
  return ok(null);
}

/**
 * Hapus item portofolio.
 *
 * Objek Storage dibuang SETELAH baris terhapus, jadi tidak pernah ada metadata
 * yang menunjuk file yang sudah tidak ada. Kegagalan hapus objek tidak
 * menggagalkan aksi: baris sudah tidak merujuk apa pun (§13.6, D-13).
 */
export async function deletePortfolioItem(_prev: FormState, fd: FormData): Promise<FormState> {
  const identity = await ownIdentity();
  if ('error' in identity) return fail(identity.error);

  const id = str(fd, 'id');
  if (!z.string().uuid().safeParse(id).success) {
    return fail({ code: 'validation', message: 'Item portofolio tidak valid.' });
  }

  const supabase = await createClient();

  // `media_path` ikut terpilih supaya bisa dibuang setelah baris hilang.
  const { data: deleted, error } = await supabase
    .from('portfolio_items')
    .delete()
    .eq('id', id)
    .select('id, media_path');

  if (error || !deleted || deleted.length === 0) {
    console.error('[portfolio] gagal menghapus item', { message: error?.message });
    return fail({ code: 'conflict', message: 'Item tidak terhapus. Coba lagi.' });
  }

  await removeObjectQuietly(supabase, 'member-media', deleted[0]?.media_path);

  revalidatePath('/', 'layout');
  return ok(null);
}