'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getViewer, requirePermission } from '@/lib/visibility/server';
import { fail, forbidden, type ActionError, type FormState } from '@/lib/result';
import { mapDbError } from '@/lib/errors';
import { removeObjectQuietly, uploadImage } from '@/lib/storage/upload';
import { getClassIdentity } from '@/features/class/queries';
import { DEFAULT_TIMEZONE } from '@/lib/time';
import { buildEventSchema } from './schemas';

function str(fd: FormData, key: string): string {
  const value = fd.get(key);
  return typeof value === 'string' ? value : '';
}

function readForm(fd: FormData): Record<string, string> {
  return {
    title: str(fd, 'title'),
    description: str(fd, 'description'),
    start_at: str(fd, 'start_at'),
    end_at: str(fd, 'end_at'),
    location: str(fd, 'location'),
    organizer: str(fd, 'organizer'),
    url: str(fd, 'url'),
  };
}

function fieldErrorFrom(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key !== 'string') continue;
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

async function writerContext(): Promise<
  { classId: string; timezone: string } | { error: ActionError }
> {
  const [viewer, identity] = await Promise.all([getViewer(), getClassIdentity()]);
  if (!viewer.classId) {
    return { error: { code: 'unknown', message: 'Kelas tidak ditemukan. Muat ulang halaman.' } };
  }
  return { classId: viewer.classId, timezone: identity?.timezone ?? DEFAULT_TIMEZONE };
}

/**
 * Unggah cover event bila form menyertakan file baru.
 *
 * Mengembalikan `rollback` supaya pemanggil bisa membersihkan objek baru bila
 * penyimpanan baris gagal — kompensasi lintas sistem yang wajib (§13.4-5).
 */
async function uploadOptionalCover(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classId: string,
  fd: FormData,
): Promise<
  | { kind: 'none' }
  | { kind: 'invalid'; message: string }
  | { kind: 'uploaded'; path: string; rollback: () => Promise<void> }
> {
  const file = fd.get('cover');
  if (!(file instanceof File) || file.size === 0) return { kind: 'none' };

  const uploaded = await uploadImage(
    supabase,
    { bucket: 'class-media', classId, folder: 'events' },
    file,
  );
  if (!uploaded.ok) return { kind: 'invalid', message: uploaded.message };
  return { kind: 'uploaded', path: uploaded.path, rollback: uploaded.rollback };
}

function mappedFailure(
  error: { code?: string; message?: string; details?: string } | null,
  context: string,
  values: Record<string, string>,
): FormState {
  if (!error) {
    return fail({ code: 'not_found', message: 'Event tidak ditemukan.' }, values);
  }
  const mapped = mapDbError(error, context);
  if (mapped && !mapped.ok) return { ...mapped, values };
  return fail({ code: 'unknown', message: 'Event tidak tersimpan. Coba lagi.' }, values);
}

export async function createEvent(_prev: FormState, fd: FormData): Promise<FormState> {
  const gate = await requirePermission('events.manage');
  if (!gate) return forbidden();

  const context = await writerContext();
  if ('error' in context) return fail(context.error);

  const values = readForm(fd);
  const parsed = buildEventSchema(context.timezone).safeParse(values);
  if (!parsed.success) {
    return fail(
      {
        code: 'validation',
        message: 'Periksa kembali isian yang ditandai.',
        fieldErrors: fieldErrorFrom(parsed.error),
      },
      values,
    );
  }

  const supabase = await createClient();
  const cover = await uploadOptionalCover(supabase, context.classId, fd);
  if (cover.kind === 'invalid') {
    return fail(
      { code: 'validation', message: cover.message, fieldErrors: { cover: [cover.message] } },
      values,
    );
  }

  const { data: inserted, error } = await supabase
    .from('events')
    .insert({
      class_id: context.classId,
      title: parsed.data.title,
      description: parsed.data.description,
      start_at: parsed.data.start_at,
      end_at: parsed.data.end_at,
      location: parsed.data.location,
      organizer: parsed.data.organizer,
      url: parsed.data.url,
      cover_path: cover.kind === 'uploaded' ? cover.path : null,
    })
    .select('id');

  if (error || !inserted || inserted.length === 0 || !inserted[0]) {
    if (cover.kind === 'uploaded') await cover.rollback();
    return mappedFailure(error, 'create_event', values);
  }

  revalidatePath('/', 'layout');
  redirect(`/events/${inserted[0].id}`);
}

export async function updateEvent(_prev: FormState, fd: FormData): Promise<FormState> {
  const gate = await requirePermission('events.manage');
  if (!gate) return forbidden();

  const id = str(fd, 'id');
  if (!z.string().uuid().safeParse(id).success) {
    return fail({ code: 'validation', message: 'Event tidak valid.' });
  }

  const context = await writerContext();
  if ('error' in context) return fail(context.error);

  const values = readForm(fd);
  const parsed = buildEventSchema(context.timezone).safeParse(values);
  if (!parsed.success) {
    return fail(
      {
        code: 'validation',
        message: 'Periksa kembali isian yang ditandai.',
        fieldErrors: fieldErrorFrom(parsed.error),
      },
      values,
    );
  }

  const supabase = await createClient();
  const cover = await uploadOptionalCover(supabase, context.classId, fd);
  if (cover.kind === 'invalid') {
    return fail(
      { code: 'validation', message: cover.message, fieldErrors: { cover: [cover.message] } },
      values,
    );
  }

  const { data: before } = await supabase
    .from('events')
    .select('cover_path')
    .eq('id', id)
    .maybeSingle();

  // `cover_path` sengaja tidak ditulis saat tidak ada file baru: form kosong
  // tidak boleh menghapus cover tanpa sepengetahuan pengguna.
  const patch = {
    title: parsed.data.title,
    description: parsed.data.description,
    start_at: parsed.data.start_at,
    end_at: parsed.data.end_at,
    location: parsed.data.location,
    organizer: parsed.data.organizer,
    url: parsed.data.url,
    ...(cover.kind === 'uploaded' ? { cover_path: cover.path } : {}),
  };

  const { data: updated, error } = await supabase
    .from('events')
    .update(patch)
    .eq('id', id)
    .select('id');

  if (error || !updated || updated.length === 0) {
    if (cover.kind === 'uploaded') await cover.rollback();
    return mappedFailure(error, 'update_event', values);
  }

  // Baris sudah menunjuk objek baru; cover lama baru dibuang sekarang.
  if (cover.kind === 'uploaded') {
    await removeObjectQuietly(supabase, 'class-media', before?.cover_path);
  }

  revalidatePath('/', 'layout');
  redirect(`/events/${id}`);
}

export async function deleteEvent(_prev: FormState, fd: FormData): Promise<FormState> {
  const gate = await requirePermission('events.manage');
  if (!gate) return forbidden();

  const id = str(fd, 'id');
  if (!z.string().uuid().safeParse(id).success) {
    return fail({ code: 'validation', message: 'Event tidak valid.' });
  }

  const supabase = await createClient();
  const { data: deleted, error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)
    .select('id, cover_path');

  if (error || !deleted || deleted.length === 0) {
    console.error('[events] gagal menghapus event', { message: error?.message });
    return fail({ code: 'conflict', message: 'Event tidak terhapus. Coba lagi.' });
  }

  // Objek dibuang SETELAH baris terhapus, jadi tidak ada metadata yang menunjuk
  // file yang sudah tidak ada.
  await removeObjectQuietly(supabase, 'class-media', deleted[0]?.cover_path);

  revalidatePath('/', 'layout');
  redirect('/events');
}
