'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getViewer, requirePermission } from '@/lib/visibility/server';
import { fail, forbidden, type ActionError, type FormState } from '@/lib/result';
import { mapDbError } from '@/lib/errors';
import { buildScheduleSchema } from './schemas';

/** FormData mungkin `null` (field absent) atau `File`; keduanya bukan string. */
function str(fd: FormData, key: string): string {
  const value = fd.get(key);
  return typeof value === 'string' ? value : '';
}

function readForm(fd: FormData): Record<string, string> {
  return {
    title: str(fd, 'title'),
    description: str(fd, 'description'),
    day_of_week: str(fd, 'day_of_week'),
    start_time: str(fd, 'start_time'),
    end_time: str(fd, 'end_time'),
    semester: str(fd, 'semester'),
    location: str(fd, 'location'),
    type: str(fd, 'type') || 'class',
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

/**
 * Konteks penulis jadwal: `class_id` dari sesi terverifikasi, tidak pernah dari
 * form (§9.3). Zona waktu tidak dibutuhkan lagi — jam jadwal adalah jam dinding
 * dan zona kelas hanya dipakai saat menampilkan.
 */
async function writerContext(): Promise<{ classId: string } | { error: ActionError }> {
  const viewer = await getViewer();
  if (!viewer.classId) {
    return { error: { code: 'unknown', message: 'Kelas tidak ditemukan. Muat ulang halaman.' } };
  }
  return { classId: viewer.classId };
}

function mappedFailure(
  error: { code?: string; message?: string; details?: string } | null,
  context: string,
  values: Record<string, string>,
): FormState {
  if (!error) {
    return fail({ code: 'not_found', message: 'Jadwal tidak ditemukan.' }, values);
  }
  const mapped = mapDbError(error, context);
  if (mapped && !mapped.ok) return { ...mapped, values };
  return fail({ code: 'unknown', message: 'Jadwal tidak tersimpan. Coba lagi.' }, values);
}

export async function createSchedule(_prev: FormState, fd: FormData): Promise<FormState> {
  const gate = await requirePermission('schedule.manage');
  if (!gate) return forbidden();

  const context = await writerContext();
  if ('error' in context) return fail(context.error);

  const values = readForm(fd);
  const parsed = buildScheduleSchema().safeParse(values);
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
  const { data: inserted, error } = await supabase
    .from('schedules')
    .insert({
      class_id: context.classId,
      title: parsed.data.title,
      description: parsed.data.description,
      day_of_week: parsed.data.day_of_week,
      start_time: parsed.data.start_time,
      end_time: parsed.data.end_time,
      semester: parsed.data.semester,
      location: parsed.data.location,
      type: parsed.data.type,
      url: parsed.data.url,
    })
    .select('id');

  if (error || !inserted || inserted.length === 0) {
    return mappedFailure(error, 'create_schedule', values);
  }

  // Jadwal muncul di /schedule dan daftar upcoming Home. Semester yang baru
  // dibuat langsung dibuka supaya pengguna melihat hasilnya, bukan semester
  // lain yang kebetulan tersimpan lebih dulu.
  revalidatePath('/', 'layout');
  redirect(`/schedule?semester=${encodeURIComponent(parsed.data.semester)}`);
}

export async function updateSchedule(_prev: FormState, fd: FormData): Promise<FormState> {
  const gate = await requirePermission('schedule.manage');
  if (!gate) return forbidden();

  const id = str(fd, 'id');
  if (!z.string().uuid().safeParse(id).success) {
    return fail({ code: 'validation', message: 'Jadwal tidak valid.' });
  }

  const context = await writerContext();
  if ('error' in context) return fail(context.error);

  const values = readForm(fd);
  const parsed = buildScheduleSchema().safeParse(values);
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
  // `.select('id')` memastikan baris benar-benar terpengaruh; update yang tidak
  // cocok apa pun harus dilaporkan gagal, bukan sukses (§10).
  const { data: updated, error } = await supabase
    .from('schedules')
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      day_of_week: parsed.data.day_of_week,
      start_time: parsed.data.start_time,
      end_time: parsed.data.end_time,
      semester: parsed.data.semester,
      location: parsed.data.location,
      type: parsed.data.type,
      url: parsed.data.url,
    })
    .eq('id', id)
    .select('id');

  if (error || !updated || updated.length === 0) {
    return mappedFailure(error, 'update_schedule', values);
  }

  revalidatePath('/', 'layout');
  redirect(`/schedule?semester=${encodeURIComponent(parsed.data.semester)}`);
}

export async function deleteSchedule(_prev: FormState, fd: FormData): Promise<FormState> {
  const gate = await requirePermission('schedule.manage');
  if (!gate) return forbidden();

  const id = str(fd, 'id');
  if (!z.string().uuid().safeParse(id).success) {
    return fail({ code: 'validation', message: 'Jadwal tidak valid.' });
  }

  const supabase = await createClient();
  const { data: deleted, error } = await supabase
    .from('schedules')
    .delete()
    .eq('id', id)
    .select('id');

  if (error || !deleted || deleted.length === 0) {
    console.error('[schedule] gagal menghapus jadwal', { message: error?.message });
    return fail({ code: 'conflict', message: 'Jadwal tidak terhapus. Coba lagi.' });
  }

  revalidatePath('/', 'layout');
  redirect('/schedule');
}
