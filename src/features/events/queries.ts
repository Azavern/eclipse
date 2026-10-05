import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Event } from '@/lib/supabase/database.types';
import type { EventWhen } from './schemas';

/** Kolom ringkas untuk daftar; deskripsi dan tautan tidak dibawa ke daftar. */
export type EventListRow = Pick<
  Event,
  'id' | 'title' | 'start_at' | 'end_at' | 'location' | 'organizer' | 'cover_path'
>;

/** Kolom untuk halaman detail dan form edit. */
export type EventDetailRow = Pick<
  Event,
  | 'id'
  | 'title'
  | 'description'
  | 'start_at'
  | 'end_at'
  | 'location'
  | 'organizer'
  | 'cover_path'
  | 'url'
>;

/**
 * Daftar event, dibagi `when` (§19): "upcoming" memakai `end_at >= now()`
 * sehingga event yang sedang berlangsung tetap tampil; "past" memakai
 * `end_at < now()` urut terbaru dulu.
 *
 * RLS `events_select` menyaring baris yang tidak boleh dilihat viewer.
 */
export const getEvents = cache(async (when: EventWhen): Promise<EventListRow[]> => {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const base = supabase
    .from('events')
    .select('id, title, start_at, end_at, location, organizer, cover_path')
    .limit(50);

  const { data, error } =
    when === 'past'
      ? await base.lt('end_at', nowIso).order('start_at', { ascending: false })
      : await base.gte('end_at', nowIso).order('start_at', { ascending: true });

  if (error) {
    console.error('[events] gagal membaca daftar event', { message: error.message });
    return [];
  }
  return data ?? [];
});

/**
 * Satu event untuk halaman detail/edit; `null` bila tidak ada ATAU tidak
 * terlihat viewer, sehingga keduanya berakhir di `notFound()` yang sama.
 */
export const getEventById = cache(async (id: string): Promise<EventDetailRow | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .select('id, title, description, start_at, end_at, location, organizer, cover_path, url')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[events] gagal membaca event', { message: error.message });
    return null;
  }
  return data ?? null;
});
