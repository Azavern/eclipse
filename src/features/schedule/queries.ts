import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Schedule } from '@/lib/supabase/database.types';

/** Kolom yang dibutuhkan form edit; bukan seluruh baris. */
export type ScheduleEditRow = Pick<
  Schedule,
  'id' | 'title' | 'description' | 'start_at' | 'end_at' | 'location' | 'type' | 'url'
>;

/**
 * Satu baris jadwal untuk halaman edit.
 *
 * RLS `schedules_select` mengizinkan pembaca halaman ATAU pemegang
 * `schedule.manage`; halaman edit sudah di-gate permission, jadi baris ini
 * hanya terpakai oleh pengelola.
 */
export const getScheduleById = cache(async (id: string): Promise<ScheduleEditRow | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('schedules')
    .select('id, title, description, start_at, end_at, location, type, url')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[schedule] gagal membaca jadwal', { message: error.message });
    return null;
  }
  return data ?? null;
});

/**
 * Satu entri daftar jadwal gabungan (§19): jadwal, event, dan tenggat tugas
 * aktif. `until` adalah akhir kegiatan; untuk tugas sama dengan deadline.
 * `href` diisi untuk entri yang punya halaman asal; jadwal tidak punya halaman
 * detail, tautan edit-nya ditentukan halaman karena bergantung permission.
 */
export type ScheduleEntry = {
  kind: 'class' | 'activity' | 'event' | 'task';
  id: string;
  title: string;
  /** Waktu mulai (untuk tugas: deadline). ISO UTC. */
  at: string;
  until: string;
  location: string | null;
  /** Deskripsi jadwal untuk disclosure di baris; event/tugas memakai halaman asal. */
  description: string | null;
  url: string | null;
};

/** Maksimal entri yang ditampilkan ke depan (§19). */
export const SCHEDULE_ENTRY_LIMIT = 100;

/**
 * Gabungan tiga sumber secara read-only (V-08), sudah urut waktu.
 *
 * Masing-masing sumber dibatasi 100 baris lebih dulu agar penggabungan di
 * memori tidak pernah menerima hasil tak terbatas (§9.4, §12); RLS menyaring
 * baris yang tidak boleh dilihat viewer.
 */
export const getScheduleEntries = cache(async (): Promise<ScheduleEntry[]> => {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const [schedules, events, tasks] = await Promise.all([
    supabase
      .from('schedules')
      .select('id, title, description, start_at, end_at, location, type, url')
      .gte('end_at', nowIso)
      .order('start_at', { ascending: true })
      .limit(SCHEDULE_ENTRY_LIMIT),
    supabase
      .from('events')
      .select('id, title, start_at, end_at, location')
      .gte('end_at', nowIso)
      .order('start_at', { ascending: true })
      .limit(SCHEDULE_ENTRY_LIMIT),
    supabase
      .from('tasks')
      .select('id, title, deadline, target')
      .eq('status', 'active')
      .gte('deadline', nowIso)
      .order('deadline', { ascending: true })
      .limit(SCHEDULE_ENTRY_LIMIT),
  ]);

  // Satu sumber gagal tidak boleh mengosongkan seluruh halaman; yang lain tetap
  // ditampilkan dan kegagalannya sudah dicatat di log masing-masing query.
  const entries: ScheduleEntry[] = [];

  for (const s of schedules.data ?? []) {
    entries.push({
      kind: s.type,
      id: s.id,
      title: s.title,
      at: s.start_at,
      until: s.end_at,
      location: s.location,
      description: s.description,
      url: s.url,
    });
  }

  for (const e of events.data ?? []) {
    entries.push({
      kind: 'event',
      id: e.id,
      title: e.title,
      at: e.start_at,
      until: e.end_at,
      location: e.location,
      description: null,
      url: null,
    });
  }

  for (const t of tasks.data ?? []) {
    entries.push({
      kind: 'task',
      id: t.id,
      title: t.title,
      at: t.deadline,
      until: t.deadline,
      location: t.target,
      description: null,
      url: null,
    });
  }

  entries.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  return entries.slice(0, SCHEDULE_ENTRY_LIMIT);
});
