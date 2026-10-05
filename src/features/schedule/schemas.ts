import { z } from 'zod';
import { HTTPS_URL, optionalText, requiredText } from '@/lib/validation';
import { isValidLocalInput, localInputToUtcIso } from '@/lib/time';

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
 * Skema jadwal. Dibuat sebagai factory karena `datetime-local` adalah waktu
 * dinding tanpa zona: konversinya baru bisa dilakukan setelah tahu timezone
 * kelas (§14.4).
 *
 * Semua batas panjang disalin dari CHECK constraint `schedules`: `title` 1–120,
 * `description` ≤ 1000, `location` ≤ 120, `url` https ≤ 2048, dan
 * `end_at >= start_at` (diperiksa SETELAH konversi, seperti pesan blueprint).
 */
export function buildScheduleSchema(timezone: string) {
  return z
    .object({
      title: requiredText(1, 120, 'Judul'),
      description: optionalText(1000, 'Deskripsi'),
      start_at: z
        .string()
        .trim()
        .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Waktu mulai harus berisi tanggal dan jam')
        .refine((v) => isValidLocalInput(v, timezone), 'Waktu mulai tidak valid'),
      end_at: z
        .string()
        .trim()
        .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Waktu selesai harus berisi tanggal dan jam')
        .refine((v) => isValidLocalInput(v, timezone), 'Waktu selesai tidak valid'),
      location: optionalText(120, 'Lokasi'),
      type: z.enum(SCHEDULE_TYPES),
      url: optionalText(2048, 'Tautan').refine(
        (v) => v === null || HTTPS_URL.safeParse(v).success,
        'Tautan harus berupa URL https yang valid',
      ),
    })
    .transform((v, ctx) => {
      const start = localInputToUtcIso(v.start_at, timezone);
      const end = localInputToUtcIso(v.end_at, timezone);
      if (!start || !end) {
        ctx.addIssue({ code: 'custom', path: ['start_at'], message: 'Waktu tidak valid' });
        return z.NEVER;
      }
      // Setelah konversi, bukan sekadar membandingkan string: waktu dinding
      // yang tampak berurutan pun bisa berbeda urutan setelah zona diterapkan.
      if (new Date(end).getTime() < new Date(start).getTime()) {
        ctx.addIssue({
          code: 'custom',
          path: ['end_at'],
          message: 'Waktu selesai tidak boleh sebelum waktu mulai',
        });
        return z.NEVER;
      }
      return { ...v, start_at: start, end_at: end };
    });
}

export type ScheduleValues = z.output<ReturnType<typeof buildScheduleSchema>>;
