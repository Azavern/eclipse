import { z } from 'zod';
import { HTTPS_URL, optionalText, requiredText } from '@/lib/validation';
import { isValidLocalInput, localInputToUtcIso } from '@/lib/time';

/**
 * Skema event. Factory karena waktu form adalah waktu dinding tanpa zona dan
 * konversinya butuh timezone kelas (§14.4).
 *
 * Batas disalin dari CHECK `events`: `title` 1–120, `description` ≤ 2000,
 * `location` ≤ 120, `organizer` ≤ 80, `url` https ≤ 2048, `end_at >= start_at`.
 */
export function buildEventSchema(timezone: string) {
  return z
    .object({
      title: requiredText(1, 120, 'Judul'),
      description: optionalText(2000, 'Deskripsi'),
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
      organizer: optionalText(80, 'Penyelenggara'),
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

export type EventValues = z.output<ReturnType<typeof buildEventSchema>>;

/** Filter daftar event: yang masih berlangsung/mendatang atau yang sudah lewat. */
export const EVENT_WHEN = ['upcoming', 'past'] as const;
export type EventWhen = (typeof EVENT_WHEN)[number];

export function toEventWhen(raw: string | undefined): EventWhen {
  return raw === 'past' ? 'past' : 'upcoming';
}
