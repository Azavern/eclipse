import { z } from 'zod';
import { emailField, loginPassword, newPassword } from '@/lib/validation';

/**
 * Skema auth dipakai bersama oleh form klien dan Server Action. Server adalah
 * otoritas: validasi klien hanya untuk UX (§14.1).
 */
export const loginSchema = z.object({
  email: emailField,
  password: loginPassword,
});

export type LoginInput = z.infer<typeof loginSchema>;

export const setPasswordSchema = z
  .object({
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Konfirmasi kata sandi tidak sama',
  });

export type SetPasswordInput = z.infer<typeof setPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: loginPassword,
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Konfirmasi kata sandi tidak sama',
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** FormData -> objek biasa; File tidak ikut agar tidak masuk echo `values`. */
export function formDataToObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of fd.entries()) {
    if (typeof value === 'string') out[key] = value;
  }
  return out;
}

/** Zod issues -> peta fieldErrors untuk FormField. */
export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key !== 'string') continue;
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export function validationErrorFrom(
  error: z.ZodError,
  values: Record<string, string>,
) {
  return {
    ok: false as const,
    error: {
      code: 'validation' as const,
      message: 'Periksa kembali isian yang ditandai.',
      fieldErrors: toFieldErrors(error),
    },
    values,
  };
}

/** Buang nilai sensitif sebelum echo balik ke form (§9.3). */
export const ECHO_EXCLUDED = new Set(['password', 'confirmPassword', 'currentPassword', 'token']);

export function echoValues(fd: FormData): Record<string, string> {
  const values = formDataToObject(fd);
  for (const key of Object.keys(values)) {
    if (ECHO_EXCLUDED.has(key)) delete values[key];
  }
  return values;
}
