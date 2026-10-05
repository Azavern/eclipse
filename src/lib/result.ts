// Bentuk hasil Server Action yang seragam (blueprint §9.3).

export type ErrorCode =
  | 'validation'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'unknown';

export type ActionError = {
  code: ErrorCode;
  message: string;
  /** Pesan per field, sudah dalam bahasa Indonesia. */
  fieldErrors?: Record<string, string[]>;
};

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: ActionError };

/**
 * State untuk `useActionState`. `values` berisi echo input non-rahasia supaya isi
 * form tidak hilang saat validasi gagal. JANGAN pernah menyertakan password di sini.
 */
export type FormState = (ActionResult<unknown> & { values?: Record<string, string> }) | null;

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });

export const fail = (
  error: ActionError,
  values?: Record<string, string>,
): FormState => ({ ok: false, error, values });

export const validationError = (
  message: string,
  fieldErrors: Record<string, string[]>,
  values?: Record<string, string>,
): FormState => fail({ code: 'validation', message, fieldErrors }, values);

export const forbidden = (): FormState =>
  fail({ code: 'forbidden', message: 'Kamu tidak punya izin untuk tindakan ini.' });

export const unauthenticated = (): FormState =>
  fail({ code: 'unauthenticated', message: 'Kamu harus masuk terlebih dahulu.' });
