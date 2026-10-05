/**
 * Konstanta auth yang dipakai bersama oleh Server Action dan halaman.
 *
 * Berada di modul terpisah karena `actions.ts` memakai 'use server', yang hanya
 * boleh mengekspor fungsi async; konstanta yang juga dibutuhkan halaman
 * `/set-password` tidak bisa diekspor dari sana.
 */

/**
 * Cookie penanda bahwa sesi ini berasal dari verifikasi tautan akses, sehingga
 * `/set-password` boleh mengganti kata sandi tanpa password lama (§6.2).
 *
 * Isi flag bukan rahasia, tetapi cookie-nya httpOnly dan berumur pendek: hanya
 * 15 menit dan dihapus setelah kata sandi berhasil tersimpan.
 */
export const PWD_SETUP_COOKIE = 'pwd_setup';

/** Nilai yang dibaca `confirmAccessLink` dan diperiksa halaman. */
export const PWD_SETUP_VALUE = '1';

/** Umur flag dalam detik (15 menit). */
export const PWD_SETUP_MAX_AGE = 60 * 15;
