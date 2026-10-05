import { z } from 'zod';
import { HTTPS_URL, optionalText, requiredText } from '@/lib/validation';
import { isValidLocalInput, localInputToUtcIso } from '@/lib/time';

/**
 * Status tugas yang tersimpan — salinan dari enum `public.task_status`.
 * "Due soon" dan "lewat tenggat" BUKAN status tersimpan, melainkan turunan
 * `taskDisplayStatus` dari deadline (A-09, §19).
 */
export const TASK_STATUSES = ['active', 'completed', 'archived'] as const;
export type TaskStatusName = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABEL: Record<TaskStatusName, string> = {
  active: 'Aktif',
  completed: 'Selesai',
  archived: 'Arsip',
};

/** Filter daftar tugas; nilai tak dikenal jatuh ke `active` (default). */
export function toTaskStatus(raw: string | undefined): TaskStatusName {
  return TASK_STATUSES.find((s) => s === raw) ?? 'active';
}

/**
 * Sasaran yang boleh dipilih. `target` tetap label teks informasional, bukan
 * assignment per orang (A-13), tetapi nilainya dibatasi ke daftar ini supaya
 * tugas tidak bisa ditulis dengan sasaran bebas yang salah ketik.
 *
 * Kolomnya tidak diubah ke enum karena nilainya sudah tersimpan dan dibaca
 * beberapa halaman; daftar ini adalah satu-satunya sumber kebenaran di aplikasi.
 */
export const TASK_TARGETS = ['Seluruh kelas', 'Ketua', 'Anggota', 'Hanya aku'] as const;
export type TaskTarget = (typeof TASK_TARGETS)[number];

/** Sasaran default; sama dengan default kolom di DB (A-13, §14.2). */
export const DEFAULT_TASK_TARGET: TaskTarget = 'Seluruh kelas';

/**
 * Skema tugas. Factory karena `deadline` adalah waktu dinding tanpa zona dan
 * konversinya butuh timezone kelas (§14.4).
 *
 * Batas disalin dari CHECK `tasks`: `title` 1–120, `description` ≤ 2000,
 * `target` 1–80, `course` 1–80.
 */
export function buildTaskSchema(timezone: string) {
  return z
    .object({
      title: requiredText(1, 120, 'Judul'),
      course: requiredText(1, 80, 'Mata kuliah'),
      description: optionalText(2000, 'Deskripsi'),
      deadline: z
        .string()
        .trim()
        .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Tenggat harus berisi tanggal dan jam')
        .refine((v) => isValidLocalInput(v, timezone), 'Tenggat tidak valid'),
      target: z
        .string()
        .trim()
        .max(80, 'Sasaran maksimal 80 karakter')
        .transform((v) => (v.length === 0 ? DEFAULT_TASK_TARGET : v))
        .refine(
          (v): v is TaskTarget => TASK_TARGETS.includes(v as TaskTarget),
          'Sasaran tidak dikenal',
        ),
      url: optionalText(2048, 'Tautan').refine(
        (v) => v === null || HTTPS_URL.safeParse(v).success,
        'Tautan harus berupa URL https yang valid',
      ),
    })
    .transform((v, ctx) => {
      const deadline = localInputToUtcIso(v.deadline, timezone);
      if (!deadline) {
        ctx.addIssue({ code: 'custom', path: ['deadline'], message: 'Tenggat tidak valid' });
        return z.NEVER;
      }
      return { ...v, deadline };
    });
}

export type TaskValues = z.output<ReturnType<typeof buildTaskSchema>>;
