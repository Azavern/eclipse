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

/**
 * Benar bila `localValue` adalah waktu dinding yang benar-benar ada di kalender
 * pada zona kelas.
 *
 * Regex di `localInputToUtcIso` hanya memeriksa BENTUK. Nilai seperti
 * "2026-13-45T99:99" lolos bentuk, lalu TZDate akan memutar komponennya menjadi
 * waktu lain — artinya input tak tepercaya bisa tersimpan sebagai jam yang
 * berbeda dari yang tertulis (§9). Uji bolak-balik menutup celah itu: konversi
 * ke UTC lalu kembalikan ke waktu dinding harus menghasilkan string yang sama.
 */
export function isValidLocalInput(localValue: string, timezone: string): boolean {
  const trimmed = localValue.trim();
  const utc = localInputToUtcIso(trimmed, timezone);
  if (!utc) return false;
  return utcIsoToLocalInput(utc, timezone) === trimmed;
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

/**
 * "17.30–19.00 WITA" untuk jam DINDING zona kelas — dipakai jadwal mingguan
 * yang menyimpan `time` tanpa tanggal, bukan instan UTC.
 */
export function formatWallTimeRange(startTime: string, endTime: string, timezone: string): string {
  return `${wallTimeLabel(startTime)}–${wallTimeLabel(endTime)} ${zoneLabel(toClassTimezone(timezone))}`;
}

/** "17.30 WITA" untuk satu jam dinding. */
export function formatWallTime(time: string, timezone: string): string {
  return `${wallTimeLabel(time)} ${zoneLabel(toClassTimezone(timezone))}`;
}

/**
 * "17:30:00" (bentuk kolom `time` Postgres) -> "17.30". Nilai yang bukan jam
 * dibiarkan apa adanya supaya tidak menampilkan angka yang salah.
 */
function wallTimeLabel(time: string): string {
  const match = /^(\d{2}):(\d{2})/.exec(time.trim());
  return match ? `${match[1]}.${match[2]}` : time;
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

/**
 * Tanggal tanpa jam untuk kolom `date` (mis. `portfolio_items.occurred_on`).
 *
 * Nilai seperti "2026-10-05" tidak punya zona waktu, jadi tidak boleh
 * dikonversi lewat `new Date(...)`: di mesin di negatif offset tanggalnya bisa
 * bergeser sehari. Komponen dibaca manual lalu dirender pada zona tetap.
 */
export function formatDateOnly(dateOnly: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOnly.trim());
  if (!match) return dateOnly;
  const [, y, m, d] = match;
  return format(
    new TZDate(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0, DEFAULT_TIMEZONE),
    'd MMM yyyy',
    { locale: idLocale },
  );
}

/**
 * Kemunculan berikutnya dari jadwal mingguan: hari (isodow 1–7, 1 = Senin)
 * dan jam dinding zona kelas, dihitung dari `from`.
 *
 * Dipakai Home untuk "Jadwal" terdekat: jadwal berulang tidak punya tanggal,
 * jadi tanggalnya baru dihitung saat ditampilkan. Kegiatan yang SEDANG
 * berjalan tetap dihitung sebagai yang berikutnya (selama jam selesainya belum
 * lewat) — perilaku yang sama dengan `end_at >= now()` sebelumnya.
 *
 * Mengembalikan instan UTC supaya bisa diurutkan dan diformat helper lain;
 * `null` bila masukannya tidak masuk akal (ditolak, bukan ditebak).
 */
export function nextOccurrence(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  timezone: string,
  from: Date = new Date(),
): { at: string; until: string } | null {
  const start = parseWallTime(startTime);
  const end = parseWallTime(endTime);
  if (!start || !end || !Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) {
    return null;
  }

  const zone = toClassTimezone(timezone);
  const base = new TZDate(from, zone);
  const today = Number(format(base, 'i')); // 1 = Senin … 7 = Minggu

  // Selisih hari ke depan (0 = hari ini). Komponennya dibaca dari TZDate, jadi
  // "hari ini" berarti hari menurut zona kelas, bukan zona perangkat pembaca.
  let offset = (dayOfWeek - today + 7) % 7;
  const build = (plusDays: number, hour: number, minute: number) =>
    new TZDate(base.getFullYear(), base.getMonth(), base.getDate() + plusDays, hour, minute, 0, 0, zone);

  let startAt = build(offset, start.hour, start.minute);
  let endAt = build(offset, end.hour, end.minute);

  if (endAt.getTime() <= from.getTime()) {
    offset += 7;
    startAt = build(offset, start.hour, start.minute);
    endAt = build(offset, end.hour, end.minute);
  }

  return {
    at: new Date(startAt.getTime()).toISOString(),
    until: new Date(endAt.getTime()).toISOString(),
  };
}

/** "17:30" atau "17:30:00" -> jam dan menit; `null` bila bukan jam yang masuk akal. */
function parseWallTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}
