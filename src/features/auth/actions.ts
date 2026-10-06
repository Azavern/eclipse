'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { safeRedirect } from '@/lib/safe-redirect';
import { fail, forbidden, ok, type FormState } from '@/lib/result';
import { getViewer, requirePermission } from '@/lib/visibility/server';
import {
  changePasswordSchema,
  echoValues,
  loginSchema,
  resetRequestSchema,
  setPasswordSchema,
  validationErrorFrom,
} from './schemas';
import { env } from '@/lib/env';
import { PWD_SETUP_COOKIE, PWD_SETUP_MAX_AGE, PWD_SETUP_VALUE } from './constants';
import { getClassIdentity } from '@/features/class/queries';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

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

/**
 * Permintaan ganti kata sandi mandiri (A-06).
 *
 * Tidak ada email delivery di free tier ini (A-05), jadi aksi ini tidak mengirim
 * apa pun ke siapa pun: ia hanya mendaftarkan email ke antrean yang dilihat
 * Ketua. Tautan sekali pakainya terbit terpisah, saat Ketua menekan tombol di
 * antrean itu — bukan di sini.
 *
 * Email hanya diterima bila akun itu benar-benar anggota kelas ini. Balasan
 * "belum terdaftar" sengaja dibiarkan terbuka (permintaan Knotus), jadi form ini
 * sekaligus jadi alat untuk memeriksa apakah sebuah email punya akun di kelas
 * ini; risikonya dicatat di `docs/STATUS.md`. Pesan pada form login sendiri
 * tetap generik (§23).
 *
 * Penulisan memakai service role: class_id selalu berasal dari server, bukan
 * dari isian form, dan tabelnya tidak punya INSERT untuk `anon`, jadi peramban
 * tidak punya permukaan tulis langsung ke tabel antrean (§9).
 */
export async function requestPasswordReset(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = resetRequestSchema.safeParse({ email: fd.get('email') });
  const values = echoValues(fd);
  if (!parsed.success) return validationErrorFrom(parsed.error, values);

  const email = parsed.data.email;

  // Satu kelas per deployment (A-02), jadi class_id selalu dari server.
  const identity = await getClassIdentity();
  if (!identity) {
    return fail({ code: 'unknown', message: 'Permintaan tidak bisa diproses sekarang. Coba lagi.' });
  }

  const admin = createAdminClient();

  // Permintaan yang sama sudah tercatat: jawab sama saja tanpa memanggil Auth
  // lagi. Ini sekaligus membatasi biaya endpoint anonim yang bisa diulang.
  const { data: alreadyPending } = await admin
    .from('password_reset_requests')
    .select('id')
    .eq('class_id', identity.id)
    .eq('email', email)
    .eq('status', 'pending')
    .limit(1);

  if (alreadyPending && alreadyPending.length > 0) return ok(null);

  // Email tidak ada di tabel aplikasi (hanya di Auth), jadi keberadaannya
  // dibaca lewat Auth Admin API dan dicocokkan dengan membership kelas ini.
  const [{ data: memberships }, { data: userList, error: userError }] = await Promise.all([
    admin.from('memberships').select('user_id').eq('class_id', identity.id),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  if (userError) {
    console.error('[auth] gagal membaca daftar user Auth', { code: userError.message });
    return fail({ code: 'unknown', message: 'Permintaan tidak bisa diproses sekarang. Coba lagi.' });
  }

  const memberIds = new Set((memberships ?? []).map((m) => m.user_id));
  const isMember = (userList.users ?? []).some(
    (u) => u.email?.toLowerCase() === email && memberIds.has(u.id),
  );

  if (!isMember) {
    // Email sengaja tidak dicatat (§9: data pribadi jangan masuk log).
    console.error('[auth] permintaan ganti sandi ditolak: bukan anggota kelas');
    return fail({
      code: 'not_found',
      message:
        'Email itu belum terdaftar sebagai anggota kelas ini. Minta Ketua mengundangmu lebih dulu.',
    });
  }

  const { error } = await admin.from('password_reset_requests').insert({
    class_id: identity.id,
    email,
  });

  // 23505 = permintaan yang sama masuk bersamaan di dua tab; sama saja dengan berhasil.
  if (error && error.code !== '23505') {
    console.error('[auth] gagal menyimpan permintaan ganti sandi', { code: error.code });
    return fail({ code: 'unknown', message: 'Permintaan tidak tersimpan. Coba lagi.' });
  }

  return ok(null);
}

/**
 * Terbitkan tautan ganti kata sandi untuk satu permintaan di antrean.
 *
 * Tautan adalah kredensial: dibuat di sini, dikembalikan ke dialog **sekali**,
 * tidak disimpan di database maupun di log (§6.2). Pola yang sama dengan
 * undangan anggota.
 *
 * Baris antrean ditandai `issued` tepat setelah tautan terbit, sehingga Ketua
 * melihat bahwa tautan untuk permintaan itu sudah keluar dan tidak bisa
 * menerbitkannya dua kali. Penandaan itu memakai komponen `status` saja;
 * `issued_at` diisi trigger database.
 */
export async function issuePasswordResetLink(_prev: FormState, fd: FormData): Promise<FormState> {
  const gate = await requirePermission('members.manage');
  if (!gate) return forbidden();

  const rawId = fd.get('id');
  const id = typeof rawId === 'string' ? rawId : '';
  if (!z.string().uuid().safeParse(id).success) {
    return fail({ code: 'validation', message: 'Permintaan tidak valid.' });
  }

  const supabase = await createClient();

  // RLS sudah membatasi baris ke kelas yang pemanggil boleh kelola.
  const { data: resetRequest, error: readError } = await supabase
    .from('password_reset_requests')
    .select('id, email, status')
    .eq('id', id)
    .maybeSingle();

  if (readError) {
    console.error('[auth] gagal membaca permintaan ganti sandi', { code: readError.code });
    return fail({ code: 'unknown', message: 'Permintaan tidak bisa dibaca. Coba lagi.' });
  }
  if (!resetRequest) {
    return fail({ code: 'not_found', message: 'Permintaan sudah tidak ada.' });
  }
  if (resetRequest.status !== 'pending') {
    return fail({ code: 'conflict', message: 'Tautan untuk permintaan ini sudah terbit.' });
  }

  const admin = createAdminClient();
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: resetRequest.email,
  });

  if (linkError || !link?.properties?.hashed_token) {
    console.error('[auth] gagal menerbitkan tautan ganti sandi', { code: linkError?.code });
    return fail({ code: 'unknown', message: 'Tautan gagal diterbitkan. Coba lagi.' });
  }

  // `eq('status','pending')` sebagai syarat kedua: kalau dua tab menekan tombol
  // bersamaan, hanya satu yang benar-benar mengubah baris.
  const { data: updated, error: updateError } = await supabase
    .from('password_reset_requests')
    .update({ status: 'issued' })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id');

  if (updateError || !updated || updated.length === 0) {
    console.error('[auth] gagal menandai permintaan sebagai terbit', { code: updateError?.code });
    return fail({
      code: 'conflict',
      message: 'Permintaan ini sudah ditangani. Muat ulang halaman.',
    });
  }

  revalidatePath('/', 'layout');

  return ok({
    url: `${env.APP_URL}/auth/confirm#token_hash=${encodeURIComponent(link.properties.hashed_token)}&type=recovery`,
    email: resetRequest.email,
  });
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
