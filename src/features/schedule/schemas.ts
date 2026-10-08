import { z } from 'zod';
import { HTTPS_URL, optionalText, requiredText } from '@/lib/validation';
import { isSemester } from '@/lib/semester';

/**
 * Tipe jadwal — salinan dari enum `public.schedule_type`.
 * `class` = jadwal kuliah, `activity` = kegiatan kelas (A-08).
 */
export const SCHEDULE_TYPES = ['class', 'activity'] as const;
export type ScheduleTypeName = (typeof SCHEDULE_TYPES)[number];

export const SCHEDULE_TYPE_LABEL: Record<ScheduleTypeName, string> = {
  class: 'Jadwal kuliah',
  activity: 'Kegiatan',
};

/**
 * Hari dalam minggu, mengikuti `isodow` Postgres: 1 = Senin … 7 = Minggu.
 * Nilainya dipakai apa adanya sebagai `day_of_week`, jadi hari tidak pernah
 * masuk sebagai teks bebas dan urutannya sama di form, halaman, dan database.
 */
export const WEEKDAY_LABEL = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
  7: 'Minggu',
} as const;

export type WeekdayValue = keyof typeof WEEKDAY_LABEL;

export const WEEKDAYS = ([1, 2, 3, 4, 5, 6, 7] as const).map((value) => ({
  value,
  label: WEEKDAY_LABEL[value],
}));

/** "08:00" — 24 jam, dua digit, sama dengan bentuk kolom `time`. */
export const TIME_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

function toMinutes(time: string): number {
  const [hour, minute] = time.split(':');
  return Number(hour) * 60 + Number(minute);
}

/**
 * Skema jadwal mingguan: hari + jam mulai/selesai + semester, tanpa tanggal.
 *
 * Kuliah berulang mingguan sepanjang semester, jadi satu baris cukup dibuat
 * sekali dan dipakai terus. Tidak ada konversi waktu di sini — jamnya jam
 * dinding zona kelas, dan zona itu hanya dipakai saat menampilkan (label WIB/
 * WITA/WIT), bukan saat menyimpan.
 *
 * Semua batas panjang disalin dari CHECK constraint `schedules`: `title` 1–120,
 * `description` ≤ 1000, `location` ≤ 120, `url` https ≤ 2048, hari 1–7,
 * `end_time > start_time`, dan format semester yang sama dengan
 * `schedules_semester_check`.
 */
export function buildScheduleSchema() {
  return z
    .object({
      title: requiredText(1, 120, 'Judul'),
      description: optionalText(1000, 'Deskripsi'),
      day_of_week: z
        .string()
        .trim()
        .regex(/^[1-7]$/, 'Pilih hari dari daftar'),
      start_time: z
        .string()
        .trim()
        .regex(TIME_PATTERN, 'Jam mulai harus dalam bentuk 08:00 (24 jam)'),
      end_time: z
        .string()
        .trim()
        .regex(TIME_PATTERN, 'Jam selesai harus dalam bentuk 09:40 (24 jam)'),
      semester: z.string().trim().refine(isSemester, 'Semester harus seperti "2026/2027 Ganjil"'),
      location: optionalText(120, 'Lokasi'),
      type: z.enum(SCHEDULE_TYPES),
      url: optionalText(2048, 'Tautan').refine(
        (v) => v === null || HTTPS_URL.safeParse(v).success,
        'Tautan harus berupa URL https yang valid',
      ),
    })
    .refine((v) => toMinutes(v.end_time) > toMinutes(v.start_time), {
      path: ['end_time'],
      message: 'Jam selesai harus setelah jam mulai',
    })
    .transform((v) => ({ ...v, day_of_week: Number(v.day_of_week) }));
}

export type ScheduleValues = z.output<ReturnType<typeof buildScheduleSchema>>;

/**
 * Jumlah jadwal maksimum dalam satu kali simpan. Batasnya kecil dengan sengaja:
 * fiturnya untuk mengisi beberapa mata kuliah sekaligus, bukan impor massal.
 */
export const MAX_SCHEDULE_ROWS = 10;

/**
 * Skema form multi-jadwal: satu semester dipilih sekali untuk semua baris, lalu
 * setiap baris memakai aturan jadwal yang sama dengan form satu jadwal.
 *
 * Aksi menyalin semester bersama ke tiap baris sebelum validasi, jadi tidak ada
 * aturan kedua yang bisa menyimpang dari `buildScheduleSchema`.
 */
export function buildScheduleListSchema() {
  return z.object({
    semester: z.string().trim().refine(isSemester, 'Semester harus seperti "2026/2027 Ganjil"'),
    rows: z
      .array(buildScheduleSchema())
      .min(1, 'Tambahkan minimal satu jadwal.')
      .max(MAX_SCHEDULE_ROWS, `Maksimal ${MAX_SCHEDULE_ROWS} jadwal sekali simpan.`),
  });
}

/** Field satu baris form multi-jadwal; semester dipilih sekali di luar baris. */
const SCHEDULE_ROW_FIELDS = [
  'title',
  'description',
  'day_of_week',
  'start_time',
  'end_time',
  'location',
  'type',
  'url',
] as const;

/**
 * Nama input baris ke-`index`: `title-0`, `start_time-1`, ….
 * Dipakai form (nama input) dan pembacaan FormData dari sumber yang sama,
 * supaya keduanya tidak bisa menyimpang.
 */
export function scheduleRowField(field: string, index: number): string {
  return `${field}-${index}`;
}

export type RawScheduleRow = {
  /** Nomor asli dari nama field (`title-2` → 2), dipakai untuk pesan error form. */
  index: number;
  values: Record<string, string>;
};

/** FormData bisa memuat `File`; nilainya bukan teks. */
function asText(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value : '';
}

/**
 * FormData → baris multi-jadwal bernomor.
 *
 * Nomor baris diambil dari field `title-<n>` karena judul wajib ada di setiap
 * baris; baris tanpa judul tidak dikarang di sini, melainkan ditolak skema.
 * Jumlahnya tidak dipotong diam-diam: satu baris di atas batas tetap dibaca,
 * supaya skema bisa menolaknya dengan pesan yang jelas.
 */
export function readScheduleRows(fd: FormData): RawScheduleRow[] {
  const indexes = new Set<number>();
  for (const key of fd.keys()) {
    const match = /^title-(\d{1,3})$/.exec(key);
    if (match) indexes.add(Number(match[1]));
  }

  return [...indexes]
    .sort((a, b) => a - b)
    .slice(0, MAX_SCHEDULE_ROWS + 1)
    .map((index) => ({
      index,
      values: Object.fromEntries(
        SCHEDULE_ROW_FIELDS.map((field) => [field, asText(fd.get(scheduleRowField(field, index)))]),
      ),
    }));
}
