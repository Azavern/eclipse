import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { DUE_SOON_HOURS } from '@/lib/time/domain';
import type {
  ActivityTrendRow,
  HomeOverview,
  MemberProfileSummary,
} from '@/lib/supabase/database.types';

/**
 * Query untuk Home. Semua memakai client JWT user sehingga RLS tetap menjadi
 * penjaga; query di server hanya membatasi bentuk dan jumlah baris (§9.4).
 */

/** Tiga daftar yang digabung di UI Home, masing-masing maksimal 5 item. */
export const HOME_UPCOMING_LIMIT = 5;

export type UpcomingEntry =
  | { kind: 'schedule'; at: string; title: string; meta: string; href: string | null }
  | { kind: 'event'; at: string; title: string; meta: string; href: string; id: string }
  | { kind: 'task'; at: string; title: string; meta: string; href: string; id: string };

/**
 * Jadwal, event, dan tugas mendatang digabung di server lalu diurut waktu.
 *
 * `end_at >= now()` dipakai untuk upcoming, jadi kegiatan yang SEDANG berjalan
 * masih tampil (§19). Deadline tugas memakai `deadline` sebagai waktu.
 */
export const getUpcoming = cache(async (): Promise<UpcomingEntry[]> => {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  // Batas per sumber sama dengan batas gabungan: daftar terakhir hanya 5 item,
  // jadi 5 baris dari tiap sumber sudah cukup untuk mengisi 5 item itu. Mengambil
  // 20 per sumber hanya membuang 15 baris yang tidak akan pernah dirender.
  const [schedules, events, tasks] = await Promise.all([
    supabase
      .from('schedules')
      .select('title, start_at, end_at, location, type')
      .gte('end_at', nowIso)
      .order('start_at', { ascending: true })
      .limit(HOME_UPCOMING_LIMIT),
    supabase
      .from('events')
      .select('id, title, start_at, end_at, location')
      .gte('end_at', nowIso)
      .order('start_at', { ascending: true })
      .limit(HOME_UPCOMING_LIMIT),
    supabase
      .from('tasks')
      .select('id, title, deadline, target')
      .eq('status', 'active')
      .gte('deadline', nowIso)
      .order('deadline', { ascending: true })
      .limit(HOME_UPCOMING_LIMIT),
  ]);

  // Query yang gagal tidak boleh menjatuhkan seluruh halaman; daftar kosong
  // lebih baik daripada error yang membuat semua section hilang.
  const entries: UpcomingEntry[] = [];

  for (const s of schedules.data ?? []) {
    entries.push({
      kind: 'schedule',
      at: s.start_at,
      title: s.title,
      meta: s.location ?? (s.type === 'class' ? 'Jadwal kuliah' : 'Kegiatan'),
      // Baris jadwal tidak punya halaman detail terpisah; tautan edit hanya
      // untuk pengelola dan ditangani di halaman /schedule (§10).
      href: null,
    });
  }

  for (const e of events.data ?? []) {
    entries.push({
      kind: 'event',
      id: e.id,
      at: e.start_at,
      title: e.title,
      meta: e.location ?? 'Event',
      href: `/events/${e.id}`,
    });
  }

  for (const t of tasks.data ?? []) {
    entries.push({
      kind: 'task',
      id: t.id,
      at: t.deadline,
      title: t.title,
      meta: t.target,
      href: `/tasks/${t.id}`,
    });
  }

  entries.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  return entries.slice(0, HOME_UPCOMING_LIMIT);
});

/**
 * Metrik ringkas. Nilai `NULL` berarti metric-nya tidak boleh dilihat viewer ini
 * dan TIDAK boleh dirender, karena merender 0 akan membocorkan bahwa di sana ada
 * data yang disembunyikan (§7.9).
 */
export const getHomeOverview = cache(async (): Promise<HomeOverview | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_home_overview', {
    p_due_soon_hours: DUE_SOON_HOURS,
  });

  if (error) {
    console.error('[home] overview gagal', { message: error.message });
    return null;
  }
  // Fungsi mengembalikan 0 baris bila section overview tidak terlihat.
  return data?.[0] ?? null;
});

/** Tren aktivitas 4 minggu. Semua nol -> empty state, bukan chart kosong. */
export const getActivityTrend = cache(async (): Promise<ActivityTrendRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_activity_trend', { p_weeks: 4 });

  if (error) {
    console.error('[home] activity trend gagal', { message: error.message });
    return [];
  }
  return data ?? [];
});

/** Strip anggota di Home hanya memakai empat kolom ini. */
export type RecentMemberSummary = Pick<
  MemberProfileSummary,
  'user_id' | 'username' | 'full_name' | 'avatar_path'
>;

/** Anggota terbaru untuk strip di Home, maksimal 12 (§19). */
export const getRecentMembers = cache(async (): Promise<RecentMemberSummary[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('member_profile_v')
    // Hanya kolom yang benar-benar dirender strip; sisa kolom view tidak
    // dikirim ke server render Home.
    .select('user_id, username, full_name, avatar_path')
    .order('joined_at', { ascending: false })
    .limit(12);

  if (error) {
    console.error('[home] anggota terbaru gagal', { message: error.message });
    return [];
  }
  return data ?? [];
});
