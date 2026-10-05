'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { safeRedirect } from '@/lib/safe-redirect';
import { fail, type FormState } from '@/lib/result';
import { getViewer } from '@/lib/visibility/server';
import {
  changePasswordSchema,
  echoValues,
  loginSchema,
  setPasswordSchema,
  validationErrorFrom,
} from './schemas';
import { env } from '@/lib/env';
import { PWD_SETUP_COOKIE, PWD_SETUP_MAX_AGE, PWD_SETUP_VALUE } from './constants';

/**
 * Login email + password.
 *
 * Pesan error sengaja generik: membedakan "email tidak ada" dari "sandi salah"
 * akan memungkinkan enumerasi akun (§23). Rate limit mengandalkan rate limit
 * bawaan Supabase Auth (D-09).
 */
export async function signIn(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: fd.get('email'),
    password: fd.get('password'),
  });
  const values = echoValues(fd);

  if (!parsed.success) return validationErrorFrom(parsed.error, values);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Detail teknis ke log tanpa email (§9).
    console.error('[auth] login gagal', { message: error.message });
    return fail({ code: 'unauthenticated', message: 'Email atau kata sandi salah.' }, values);
  }

  // Setelah login, validasi bahwa akun benar-benar anggota aktif: akun yang
  // dinonaktifkan mungkin masih punya sesi yang valid (§6.2).
  const viewer = await getViewer();
  if (!viewer.isActiveMember) {
    await supabase.auth.signOut();
    return fail(
      {
        code: 'forbidden',
        message: 'Akun ini belum aktif atau sudah dinonaktifkan. Minta Ketua membuat tautan akses baru.',
      },
      values,
    );
  }

  // redirect() melempar, jadi harus di luar blok kondisi apa pun.
  redirect(safeRedirect(typeof fd.get('next') === 'string' ? (fd.get('next') as string) : null));
}

/**
 * Verifikasi tautan akses sekali pakai.
 *
 * Token dibaca dari FRAGMENT URL, bukan query, sehingga tidak masuk log server
 * maupun header Referer. Verifikasi baru dilakukan saat pengguna menekan
 * tombol (POST), bukan saat GET: aplikasi chat melakukan GET untuk membuat
 * pratinjau tautan dan akan menghabiskan token sekali pakai kalau diverifikasi
 * lebih awal (§6.2).
 */
export async function confirmAccessLink(_prev: FormState, fd: FormData): Promise<FormState> {
  const tokenHash = fd.get('token_hash');
  const type = fd.get('type');

  if (typeof tokenHash !== 'string' || tokenHash.length === 0) {
    return fail({
      code: 'validation',
      message: 'Tautan ini tidak berlaku lagi. Minta Ketua membuat tautan baru.',
    });
  }

  // Hanya recovery yang diterima; tipe lain ditolak.
  if (type !== 'recovery') {
    return fail({
      code: 'validation',
      message: 'Jenis tautan tidak dikenali. Minta Ketua membuat tautan akses baru.',
    });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });

  if (error) {
    console.error('[auth] verifikasi tautan gagal', { message: error.message });
    return fail({
      code: 'unauthenticated',
      message: 'Tautan ini tidak berlaku lagi. Minta Ketua membuat tautan baru.',
    });
  }

  const store = await cookies();
  store.set(PWD_SETUP_COOKIE, PWD_SETUP_VALUE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.IS_PROD,
    path: '/',
    maxAge: PWD_SETUP_MAX_AGE,
  });

  redirect('/set-password');
}

/**
 * Set kata sandi setelah tautan terverifikasi, atau untuk akun yang sedang
 * mengganti sandi lewat tautan baru.
 *
 * Bila status keanggotaan masih `invited`, aktivasi keanggotaan terjadi di sini
 * satu-satunya jalur yang sah (§6.4-3).
 */
export async function setPassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const store = await cookies();
  const flag = store.get(PWD_SETUP_COOKIE)?.value;

  // Tanpa flag ini, sesi login biasa tidak boleh mengganti kata sandi.
  if (flag !== PWD_SETUP_VALUE) redirect('/login');

  const parsed = setPasswordSchema.safeParse({
    password: fd.get('password'),
    confirmPassword: fd.get('confirmPassword'),
  });
  const values = echoValues(fd);
  if (!parsed.success) return validationErrorFrom(parsed.error, values);

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return fail({ code: 'unauthenticated', message: 'Sesi tidak berlaku lagi. Buka tautan akses baru.' });
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    console.error('[auth] update kata sandi gagal', { message: error.message });
    return fail({ code: 'unknown', message: 'Gagal menyimpan kata sandi. Coba lagi.' }, values);
  }

  const { data: viewerRows } = await supabase.rpc('get_viewer_context');
  const wasInvited = viewerRows?.[0]?.status === 'invited';

  if (wasInvited) {
    const { error: activateError } = await supabase.rpc('activate_my_membership');
    if (activateError) {
      console.error('[auth] aktivasi keanggotaan gagal', { message: activateError.message });
      return fail(
        { code: 'conflict', message: 'Akun sudah aktif atau tidak dapat diaktifkan. Minta Ketua memeriksa.' },
        values,
      );
    }
  }

  // Flag hanya berlaku sekali.
  store.delete(PWD_SETUP_COOKIE);

  redirect(wasInvited ? '/settings/profile?onboarding=1' : '/');
}

/** Ganti kata sandi dari sesi login biasa: wajib membuktikan password lama. */
export async function changePassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: fd.get('currentPassword'),
    password: fd.get('password'),
    confirmPassword: fd.get('confirmPassword'),
  });
  const values = echoValues(fd);
  if (!parsed.success) return validationErrorFrom(parsed.error, values);

  const supabase = await createClient();

  // Re-auth: sesi yang sudah ada saja tidak cukup untuk mengganti kredensial.
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email;
  if (!email) {
    return fail({ code: 'unauthenticated', message: 'Sesi tidak berlaku lagi. Masuk kembali.' });
  }

  const { error: reauth } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.currentPassword,
  });
  if (reauth) {
    return fail({ code: 'validation', message: 'Kata sandi lama salah.' }, values);
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    console.error('[auth] ganti kata sandi gagal', { message: error.message });
    return fail({ code: 'unknown', message: 'Gagal menyimpan kata sandi. Coba lagi.' }, values);
  }

  return { ok: true, data: null };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
