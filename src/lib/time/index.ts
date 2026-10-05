// Zona waktu kelas dan format waktu dalam bahasa Indonesia (blueprint §19).
//
// Waktu disimpan sebagai timestamptz (UTC) dan SELALU ditampilkan memakai
// timezone kelas, bukan timezone browser. Tanpa ini, anggota di luar WIB akan
// melihat jadwal yang salah.

import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export const CLASS_TIMEZONES = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'] as const;
export type ClassTimezone = (typeof CLASS_TIMEZONES)[number];

export const DEFAULT_TIMEZONE: ClassTimezone = 'Asia/Jakarta';

export function isClassTimezone(value: string): value is ClassTimezone {
  return (CLASS_TIMEZONES as readonly string[]).includes(value);
}

/** Label singkat yang tampil di sebelah jam: WIB / WITA / WIT. */
const ZONE_LABEL: Record<ClassTimezone, string> = {
  'Asia/Jakarta': 'WIB',
  'Asia/Makassar': 'WITA',
  'Asia/Jayapura': 'WIT',
};

export function zoneLabel(timezone: string): string {
  return isClassTimezone(timezone) ? ZONE_LABEL[timezone] : timezone;
}

/** Kelas timezone dari DB; nilai tak dikenal jatuh ke default (fail safe). */
export function toClassTimezone(timezone: string): ClassTimezone {
  return isClassTimezone(timezone) ? timezone : DEFAULT_TIMEZONE;
}

/**
 * Mengonversi input `datetime-local` (waktu dinding tanpa zona) dari timezone
 * kelas menjadi ISO UTC untuk disimpan (§14.4).
 *
 * Komponen tanggal/jam harus dibaca SEBAGAI waktu dinding pada zona kelas.
 * Konstruktor TZDate multi-argumen melakukan tepat itu: argumen terakhir adalah
 * zona, dan komponen sebelumnya ditafsirkan di dalam zona tersebut. Tidak boleh
 * membuat `Date` biasa lebih dulu, karena `new Date(y, m, d, …)` memakai
 * timezone mesin dan menggeser hasilnya.
 */
export function localInputToUtcIso(localValue: string, timezone: string): string | null {
  // "YYYY-MM-DDTHH:mm" — diparse manual agar tidak bergantung pada locale mesin.
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(localValue.trim());
  if (!match) return null;
  const [, y, m, d, hh, mm] = match;

  const zone = toClassTimezone(timezone);
  const zoned = new TZDate(
    Number(y),
    Number(m) - 1,
    Number(d),
    Number(hh),
    Number(mm),
    0,
    0,
    zone,
  );

  // TZDate.toISOString() mempertahankan offset zona ("+07:00"), sedangkan kolom
  // timestampta Postgres menyimpan UTC. getTime() memberi instan yang benar,
  // lalu diformat ulang sebagai ISO Z supaya tidak ada ambiguitas saat disimpan.
  return new Date(zoned.getTime()).toISOString();
}

/** Kebalikan: ISO UTC -> nilai yang ditampilkan di input datetime-local. */
export function utcIsoToLocalInput(iso: string, timezone: string): string {
  return format(new TZDate(new Date(iso), toClassTimezone(timezone)), "yyyy-MM-dd'T'HH:mm");
}

/** "Sen, 5 Okt" */
export function formatDay(iso: string, timezone: string): string {
  return format(new TZDate(new Date(iso), toClassTimezone(timezone)), 'EEE, d MMM', {
    locale: idLocale,
  });
}

/** "Sen, 5 Okt · 08.00–09.40 WIB" */
export function formatRange(startIso: string, endIso: string, timezone: string): string {
  const zone = toClassTimezone(timezone);
  const start = format(new TZDate(new Date(startIso), zone), 'EEE, d MMM · HH.mm', {
    locale: idLocale,
  });
  const end = format(new TZDate(new Date(endIso), zone), 'HH.mm');
  return `${start}–${end} ${zoneLabel(zone)}`;
}

/** "08.00 WIB" */
export function formatTime(iso: string, timezone: string): string {
  const zone = toClassTimezone(timezone);
  return `${format(new TZDate(new Date(iso), zone), 'HH.mm', { locale: idLocale })} ${zoneLabel(zone)}`;
}

/** "5 Okt 2026, 08.00 WIB" */
export function formatDateTime(iso: string, timezone: string): string {
  const zone = toClassTimezone(timezone);
  return `${format(new TZDate(new Date(iso), zone), 'd MMM yyyy, HH.mm', {
    locale: idLocale,
  })} ${zoneLabel(zone)}`;
}

/** Key pengelompokan per hari pada jadwal, mis. "2026-10-05". */
export function dayKey(iso: string, timezone: string): string {
  return format(new TZDate(new Date(iso), toClassTimezone(timezone)), 'yyyy-MM-dd');
}
