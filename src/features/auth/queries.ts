import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { PasswordResetRequest } from '@/lib/supabase/database.types';

/** Batas baris antrean per render — cukup untuk satu kelas (§12). */
const RESET_REQUEST_LIMIT = 20;

/**
 * Berapa lama baris `issued` tetap terlihat.
 *
 * Tautan hanya ditampilkan sekali, jadi barisnya harus tetap ada di layar
 * selama Ketua masih menyalinnya. Setelah itu cukup status "sudah terbit" —
 * jejaknya tidak perlu mengganggu beranda.
 */
const ISSUED_VISIBLE_MS = 60 * 60 * 1000; // 1 jam

/** Permintaan yang menggantung lebih dari ini tidak lagi ditampilkan. */
const PENDING_MAX_AGE_DAYS = 30;

export type ResetRequestSummary = PasswordResetRequest;

/**
 * Antrean permintaan ganti kata sandi untuk satu kelas.
 *
 * Hanya baris `pending` dan baris `issued` yang baru saja terbit yang diambil,
 * jadi beranda Ketua tidak pernah menampilkan arsip bertumpuk. Baris lain tetap
 * ada di tabel sebagai jejak audit, hanya tidak dirender.
 *
 * Pembacaan lewat RLS `members.manage`; pemanggil tanpa izin menerima array
 * kosong dari database, bukan daftar yang dikoreksi di sini (§9.3).
 */
export const getResetRequests = cache(async (): Promise<ResetRequestSummary[]> => {
  const now = Date.now();
  const issuedSince = new Date(now - ISSUED_VISIBLE_MS).toISOString();
  const pendingSince = new Date(
    now - PENDING_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('password_reset_requests')
    .select('id, class_id, email, status, created_at, issued_at')
    .or(`status.eq.pending,issued_at.gt.${issuedSince}`)
    .gte('created_at', pendingSince)
    .order('created_at', { ascending: false })
    .limit(RESET_REQUEST_LIMIT);

  if (error) {
    console.error('[auth] gagal membaca antrean ganti sandi', { message: error.message });
    return [];
  }

  return data ?? [];
});
