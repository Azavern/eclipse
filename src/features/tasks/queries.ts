import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Task } from '@/lib/supabase/database.types';
import type { TaskStatusName } from './schemas';

/** Kolom ringkas daftar tugas. */
export type TaskListRow = Pick<Task, 'id' | 'title' | 'deadline' | 'target' | 'status'>;

/** Kolom halaman detail dan form edit. */
export type TaskDetailRow = Pick<
  Task,
  'id' | 'title' | 'description' | 'deadline' | 'target' | 'url' | 'status' | 'created_by'
>;

/**
 * Daftar tugas per status tersimpan.
 *
 * `active` sengaja TIDAK memfilter deadline: tugas yang sudah lewat tenggat
 * tetap aktif sampai ditandai selesai, dan itulah yang perlu dilihat (§19,
 * AC-TASKS-4). Urutan deadline naik supaya yang terdekat berada di atas.
 */
export const getTasks = cache(async (status: TaskStatusName): Promise<TaskListRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, deadline, target, status')
    .eq('status', status)
    .order('deadline', { ascending: status === 'active' })
    .limit(50);

  if (error) {
    console.error('[tasks] gagal membaca daftar tugas', { message: error.message });
    return [];
  }
  return data ?? [];
});

/**
 * Satu tugas untuk halaman detail/edit; `null` bila tidak ada atau tidak
 * terlihat viewer (keduanya `notFound()` yang sama).
 */
export const getTaskById = cache(async (id: string): Promise<TaskDetailRow | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, description, deadline, target, url, status, created_by')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[tasks] gagal membaca tugas', { message: error.message });
    return null;
  }
  return data ?? null;
});

/**
 * Nama pembuat tugas, HANYA bila profilnya terlihat viewer ini.
 *
 * Dibaca dari `member_profile_v`, bukan join langsung ke `member_profiles`,
 * supaya visibility `page.members` tetap berlaku: baris yang tidak terlihat
 * mengembalikan `null` dan label pembuat tidak dirender (§19, AC-TASKS-8).
 */
export const getTaskCreatorName = cache(async (userId: string): Promise<string | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('member_profile_v')
    .select('full_name')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[tasks] gagal membaca profil pembuat', { message: error.message });
    return null;
  }
  return data?.full_name ?? null;
});
