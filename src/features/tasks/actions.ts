'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getViewer, requirePermission } from '@/lib/visibility/server';
import { fail, forbidden, ok, type ActionError, type FormState } from '@/lib/result';
import { mapDbError } from '@/lib/errors';
import { getClassIdentity } from '@/features/class/queries';
import { DEFAULT_TIMEZONE } from '@/lib/time';
import { buildTaskSchema, TASK_STATUSES, type TaskStatusName } from './schemas';

function str(fd: FormData, key: string): string {
  const value = fd.get(key);
  return typeof value === 'string' ? value : '';
}

function readForm(fd: FormData): Record<string, string> {
  return {
    title: str(fd, 'title'),
    description: str(fd, 'description'),
    deadline: str(fd, 'deadline'),
    target: str(fd, 'target'),
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

function mappedFailure(
  error: { code?: string; message?: string; details?: string } | null,
  context: string,
  values: Record<string, string>,
): FormState {
  if (!error) {
    return fail({ code: 'not_found', message: 'Tugas tidak ditemukan.' }, values);
  }
  const mapped = mapDbError(error, context);
  if (mapped && !mapped.ok) return { ...mapped, values };
  return fail({ code: 'unknown', message: 'Tugas tidak tersimpan. Coba lagi.' }, values);
}

export async function createTask(_prev: FormState, fd: FormData): Promise<FormState> {
  const gate = await requirePermission('tasks.manage');
  if (!gate) return forbidden();

  const context = await writerContext();
  if ('error' in context) return fail(context.error);

  const values = readForm(fd);
  const parsed = buildTaskSchema(context.timezone).safeParse(values);
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
    .from('tasks')
    .insert({
      class_id: context.classId,
      title: parsed.data.title,
      description: parsed.data.description,
      deadline: parsed.data.deadline,
      target: parsed.data.target,
      url: parsed.data.url,
      status: 'active',
    })
    .select('id');

  if (error || !inserted || inserted.length === 0 || !inserted[0]) {
    return mappedFailure(error, 'create_task', values);
  }

  // Tugas muncul di /tasks, /schedule, dan Home.
  revalidatePath('/', 'layout');
  redirect(`/tasks/${inserted[0].id}`);
}

export async function updateTask(_prev: FormState, fd: FormData): Promise<FormState> {
  const gate = await requirePermission('tasks.manage');
  if (!gate) return forbidden();

  const id = str(fd, 'id');
  if (!z.string().uuid().safeParse(id).success) {
    return fail({ code: 'validation', message: 'Tugas tidak valid.' });
  }

  const context = await writerContext();
  if ('error' in context) return fail(context.error);

  const values = readForm(fd);
  const parsed = buildTaskSchema(context.timezone).safeParse(values);
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
  const { data: updated, error } = await supabase
    .from('tasks')
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      deadline: parsed.data.deadline,
      target: parsed.data.target,
      url: parsed.data.url,
    })
    .eq('id', id)
    .select('id');

  if (error || !updated || updated.length === 0) {
    return mappedFailure(error, 'update_task', values);
  }

  revalidatePath('/', 'layout');
  redirect(`/tasks/${id}`);
}

export async function deleteTask(_prev: FormState, fd: FormData): Promise<FormState> {
  const gate = await requirePermission('tasks.manage');
  if (!gate) return forbidden();

  const id = str(fd, 'id');
  if (!z.string().uuid().safeParse(id).success) {
    return fail({ code: 'validation', message: 'Tugas tidak valid.' });
  }

  const supabase = await createClient();
  const { data: deleted, error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .select('id');

  if (error || !deleted || deleted.length === 0) {
    console.error('[tasks] gagal menghapus tugas', { message: error?.message });
    return fail({ code: 'conflict', message: 'Tugas tidak terhapus. Coba lagi.' });
  }

  revalidatePath('/', 'layout');
  redirect('/tasks');
}

/**
 * Ubah status tersimpan sebuah tugas.
 *
 * Aktivitas `completed` TIDAK ditulis di sini: trigger `tasks_activity_upd`
 * mencatatnya saat status bertransisi ke `completed` (A-17). Menulisnya dari
 * aplikasi akan menghasilkan dua baris aktivitas untuk satu kejadian.
 */
export async function setTaskStatus(_prev: FormState, fd: FormData): Promise<FormState> {
  const gate = await requirePermission('tasks.manage');
  if (!gate) return forbidden();

  const id = str(fd, 'id');
  const next = str(fd, 'status');
  if (!z.string().uuid().safeParse(id).success) {
    return fail({ code: 'validation', message: 'Tugas tidak valid.' });
  }
  if (!TASK_STATUSES.includes(next as TaskStatusName)) {
    return fail({ code: 'validation', message: 'Status tidak dikenal.' });
  }

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from('tasks')
    .update({ status: next as TaskStatusName })
    .eq('id', id)
    .select('id');

  if (error || !updated || updated.length === 0) {
    console.error('[tasks] gagal mengubah status', { message: error?.message });
    return fail({ code: 'conflict', message: 'Status tidak berubah. Coba lagi.' });
  }

  revalidatePath('/', 'layout');
  return ok(null);
}
