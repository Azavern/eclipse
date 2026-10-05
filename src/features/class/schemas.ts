import { z } from 'zod';
import { HTTPS_URL, optionalText, requiredText, socialUrlSchema } from '@/lib/validation';

/**
 * Zona waktu yang diterima database.
 *
 * `classes.timezone` punya CHECK `in ('Asia/Jakarta','Asia/Makassar',
 * 'Asia/Jayapura')` — daftar ini BUKAN sembarang zona IANA. Menggantinya dengan
 * `Intl.supportedValuesOf('timeZone')` akan membuat form menerima nilai yang
 * lalu ditolak database.
 */
export const CLASS_TIMEZONES = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'] as const;

export type ClassTimezone = (typeof CLASS_TIMEZONES)[number];

export const CLASS_TIMEZONE_LABELS: Record<ClassTimezone, string> = {
  'Asia/Jakarta': 'WIB — Asia/Jakarta',
  'Asia/Makassar': 'WITA — Asia/Makassar',
  'Asia/Jayapura': 'WIT — Asia/Jayapura',
};

/**
 * Skema identitas kelas. Setiap batas panjang dan pola di sini SALINAN dari
 * CHECK constraint di `supabase/migrations/…_second_schema.sql`: Zod memberi
 * pesan error yang berguna, DB tetap jadi lapisan ketiga yang ultimate (§14.1).
 */
export const classIdentitySchema = z.object({
  name: requiredText(1, 60, 'Nama kelas'),

  // NULL bila dikosongkan; kolom `code` nullable di DB.
  code: optionalText(20, 'Kode kelas').refine(
    (v) => v === null || /^[A-Za-z0-9-]{2,20}$/.test(v),
    'Kode kelas 2-20 karakter: huruf, angka, dan tanda hubung',
  ),

  tagline: optionalText(120, 'Tagline'),
  description: optionalText(800, 'Deskripsi'),
  highlight_text: optionalText(160, 'Teks sorotan'),

  highlight_url: optionalText(2048, 'Tautan sorotan').refine(
    (v) => v === null || HTTPS_URL.safeParse(v).success,
    'Tautan sorotan harus berupa URL https yang valid',
  ),

  timezone: z.enum(CLASS_TIMEZONES),
});

export type ClassIdentityInput = z.input<typeof classIdentitySchema>;
export type ClassIdentityValues = z.output<typeof classIdentitySchema>;

/** Nilai form default untuk baris yang belum diisi. */
export const EMPTY_CLASS_IDENTITY: ClassIdentityValues = {
  name: '',
  code: null,
  tagline: null,
  description: null,
  highlight_text: null,
  highlight_url: null,
  timezone: 'Asia/Jakarta',
};

/**
 * Platform tautan kelas. Salinan dari enum `public.social_platform`; daftar
 * pendek dan stabil, jadi tidak perlu di-generate.
 */
export const CLASS_LINK_PLATFORMS = [
  'instagram',
  'linkedin',
  'github',
  'tiktok',
  'x',
  'website',
  'custom',
] as const;

export type ClassLinkPlatform = (typeof CLASS_LINK_PLATFORMS)[number];

export const CLASS_LINK_PLATFORM_LABEL: Record<ClassLinkPlatform, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  tiktok: 'TikTok',
  x: 'X',
  website: 'Situs web',
  custom: 'Lainnya',
};

/**
 * Skema tautan kelas.
 *
 * Host URL divalidasi per platform lewat `socialUrlSchema`, jadi tautan Instagram
 * tidak bisa berisi domain Github (§14.3). CHECK `platform <> 'custom' or label
 * is not null` di database dicerminkan di `.refine` terakhir.
 */
export function buildClassLinkSchema(platform: ClassLinkPlatform) {
  return z
    .object({
      platform: z.enum(CLASS_LINK_PLATFORMS),
      label: optionalText(40, 'Label'),
      url: socialUrlSchema(platform),
    })
    .refine((v) => v.platform !== 'custom' || v.label !== null, {
      path: ['label'],
      message: 'Platform "Lainnya" wajib punya label',
    });
}
