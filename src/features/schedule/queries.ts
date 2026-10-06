import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { sortSemestersDesc } from '@/lib/semester';
import type { Schedule } from '@/lib/supabase/database.types';

/**
 * Kolom yang dibutuhkan daftar dan form edit. Jamnya `time` tanpa tanggal —
 * jadwal berulang mingguan, jadi tidak ada instan UTC yang dihitung di sini;
 * kemunculan berikutnya baru dihitung `nextOccurrence` saat ditampilkan.
 */
export type ScheduleRow = Pick<
  Schedule,
  | 'id'
  | 'title'
  | 'description'
  | 'day_of_week'
  | 'start_time'
  | 'end_time'
  | 'semester'
  | 'location'
  | 'type'
  | 'url'
>;

const COLUMNS =
  'id, title, description, day_of_week, start_time, end_time, semester, location, type, url';

/** Maksimal baris yang dibaca untuk satu semester (§12). */
export const SCHEDULE_LIMIT = 100;

/**
 * Satu baris jadwal untuk halaman edit.
 *
 * RLS `schedules_select` mengizinkan pembaca halaman ATAU pemegang
 * `schedule.manage`; halaman edit sudah di-gate permission, jadi baris ini
 * hanya terpakai oleh pengelola.
 */
export const getScheduleById = cache(async (id: string): Promise<ScheduleRow | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('schedules')
    .select(COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[schedule] gagal membaca jadwal', { message: error.message });
    return null;
  }
  return data ?? null;
});

/**
 * Jadwal satu semester, urut hari lalu jam — urutan yang sama dengan tampilan.
 * RLS menyaring baris yang tidak boleh dilihat viewer, jadi tidak ada
 * penyaringan kedua di sini.
 */
export const getSchedulesBySemester = cache(async (semester: string): Promise<ScheduleRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('schedules')
    .select(COLUMNS)
    .eq('semester', semester)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(SCHEDULE_LIMIT);

  if (error) {
    console.error('[schedule] gagal membaca daftar jadwal', { message: error.message });
    return [];
  }
  return (data ?? []) as ScheduleRow[];
});

/**
 * Semester yang sudah punya jadwal, terbaru dulu.
 *
 * Halaman memakai ini supaya semester lama tetap bisa dibuka kembali, bukan
 * hanya semester yang ditawarkan form. Satu kelas tidak akan pernah punya
 * ratusan semester; batasnya hanya pengaman agar tidak ada query tanpa batas.
 */
export const getScheduleSemesters = cache(async (): Promise<string[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('schedules')
    .select('semester')
    .order('semester', { ascending: false })
    .limit(500);

  if (error) {
    console.error('[schedule] gagal membaca daftar semester', { message: error.message });
    return [];
  }
  return sortSemestersDesc((data ?? []).map((row) => row.semester));
});
