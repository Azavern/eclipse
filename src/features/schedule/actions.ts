'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getViewer, requirePermission } from '@/lib/visibility/server';
import { fail, forbidden, type ActionError, type FormState } from '@/lib/result';
import { mapDbError } from '@/lib/errors';
import {
  buildScheduleListSchema,
  buildScheduleSchema,
  readScheduleRows,
  scheduleRowField,
  type RawScheduleRow,
} from './schemas';

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
 * Error skema multi-jadwal → peta fieldErrors form: isu baris ke-`n` menjadi
 * `title-0`, `start_time-1`, dst. Isu semester bersama cukup tampil sekali di
 * field atas, tidak diulang untuk setiap baris; isu jumlah baris tidak menempel
 * ke field mana pun, jadi dikembalikan sebagai pesan tersendiri.
 */
function listFieldErrors(
  error: z.ZodError,
  rows: RawScheduleRow[],
): { fieldErrors: Record<string, string[]>; countMessage?: string } {
  const fieldErrors: Record<string, string[]> = {};
  let countMessage: string | undefined;

  for (const issue of error.issues) {
    const [head, position, field] = issue.path;
    if (head === 'semester') {
      (fieldErrors.semester ??= []).push(issue.message);
      continue;
    }
    if (head !== 'rows') continue;
    if (typeof position !== 'number') {
      countMessage ??= issue.message;
      continue;
    }
    const row = rows[position];
    if (!row || typeof field !== 'string' || field === 'semester') continue;
    (fieldErrors[scheduleRowField(field, row.index)] ??= []).push(issue.message);
  }

  return { fieldErrors, countMessage };
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

/**
 * Membuat satu atau beberapa jadwal sekaligus (§12: beberapa mata kuliah dalam
 * sekali input, tanpa bolak-balik).
 *
 * Form memakai nama field berakhiran nomor baris (`title-0`, `title-1`, …) dan
 * satu semester bersama; aksi menyalin semester itu ke tiap baris agar aturan
 * validasi per jadwal tetap satu sumber.
 */
export async function createSchedule(_prev: FormState, fd: FormData): Promise<FormState> {
  const gate = await requirePermission('schedule.manage');
  if (!gate) return forbidden();

  const context = await writerContext();
  if ('error' in context) return fail(context.error);

  const semester = str(fd, 'semester');
  const rows = readScheduleRows(fd);

  // Echo isian: seluruh field baris + semester bersama, supaya isian tidak
  // hilang saat validasi gagal (§15.1).
  const values: Record<string, string> = { semester };
  for (const row of rows) {
    for (const [field, value] of Object.entries(row.values)) {
      values[scheduleRowField(field, row.index)] = value;
    }
  }

  const parsed = buildScheduleListSchema().safeParse({
    semester,
    // Semester dipilih sekali untuk semua baris, lalu disalin ke tiap baris
    // supaya `buildScheduleSchema` tetap menjadi satu-satunya aturan jadwal.
    rows: rows.map((row) => ({ ...row.values, semester })),
  });
  if (!parsed.success) {
    const { fieldErrors, countMessage } = listFieldErrors(parsed.error, rows);
    const hasFieldErrors = Object.keys(fieldErrors).length > 0;
    return fail(
      {
        code: 'validation',
        message: hasFieldErrors
          ? 'Periksa kembali isian yang ditandai.'
          : (countMessage ?? 'Periksa kembali isian yang ditandai.'),
        fieldErrors: hasFieldErrors ? fieldErrors : undefined,
      },
      values,
    );
  }

  const supabase = await createClient();
  // Satu INSERT memuat semua baris: bila satu baris gagal, tidak ada yang
  // setengah tersimpan (§8). Jumlah baris yang kembali dicocokkan supaya aksi
  // tidak pernah melaporkan sukses untuk baris yang tidak masuk (§10).
  const { data: inserted, error } = await supabase
    .from('schedules')
    .insert(
      parsed.data.rows.map((row) => ({
        class_id: context.classId,
        title: row.title,
        description: row.description,
        day_of_week: row.day_of_week,
        start_time: row.start_time,
        end_time: row.end_time,
        semester: row.semester,
        location: row.location,
        type: row.type,
        url: row.url,
      })),
    )
    .select('id');

  if (error || !inserted || inserted.length !== parsed.data.rows.length) {
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
