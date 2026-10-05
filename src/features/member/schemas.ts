import { z } from 'zod';
import { optionalText, USERNAME } from '@/lib/validation';

/**
 * Skema profil milik sendiri.
 *
 * Setiap batas disalin dari CHECK constraint di `member_profiles`:
 * `username ~ '^[a-z0-9_]{3,30}$'`, `full_name` 1–80, `nickname` ≤ 40,
 * `bio` ≤ 500. Username unik per kelas dan bentroknya ditangkap constraint
 * `unique (class_id, username)` di database.
 */
export const myProfileSchema = z.object({
  full_name: z.string().trim().min(1, 'Nama wajib diisi').max(80, 'Nama maksimal 80 karakter'),
  username: USERNAME,
  nickname: optionalText(40, 'Nama panggilan'),
  bio: optionalText(500, 'Bio'),
});

export type MyProfileInput = z.input<typeof myProfileSchema>;
export type MyProfileValues = z.output<typeof myProfileSchema>;

/** Bentuk baris profil yang dipakai form. */
export type ProfileDefaults = {
  full_name: string;
  username: string;
  nickname: string | null;
  bio: string | null;
  avatar_path: string | null;
};
