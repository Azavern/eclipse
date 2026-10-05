import { z } from 'zod';
import {
  SOCIAL_PLATFORMS,
  socialUrlSchema,
  type SocialPlatformName,
} from '@/lib/social';
import { AUDIENCES } from '@/lib/visibility/registry';

/**
 * Skema tautan sosial milik seorang anggota.
 *
 * `social_links` memakai enum `public.social_platform` yang sama dengan
 * `class_links`, tapi tabelnya punya kolom `visibility` (override per item,
 * §7.3) dan batas jumlah 10 baris per anggota (trigger `social_limit`, EC040).
 *
 * CHECK `platform <> 'custom' or label is not null` di database dicerminkan di
 * `.refine` terakhir supaya pesan errornya muncul sebelum ke database.
 */
export function buildSocialLinkSchema(platform: SocialPlatformName) {
  return z
    .object({
      platform: z.enum(SOCIAL_PLATFORMS),
      label: z
        .string()
        .trim()
        .max(40, 'Label maksimal 40 karakter')
        .transform((v) => (v.length === 0 ? null : v))
        .nullable(),
      url: socialUrlSchema(platform),
      // NULL = ikut aturan bagian "Tautan sosial" milik anggota ini.
      visibility: z.enum(AUDIENCES).nullable(),
    })
    .refine((v) => v.platform !== 'custom' || v.label !== null, {
      path: ['label'],
      message: 'Platform "Lainnya" wajib punya label',
    });
}

export type SocialLinkValues = z.output<ReturnType<typeof buildSocialLinkSchema>>;

/** Contoh tautan per platform; hanya petunjuk, tidak membatasi input. */
export const SOCIAL_PLATFORM_EXAMPLE: Partial<Record<SocialPlatformName, string>> = {
  instagram: 'https://instagram.com/namakelas',
  linkedin: 'https://linkedin.com/in/namakelas',
  github: 'https://github.com/namakelas',
  tiktok: 'https://tiktok.com/@namakelas',
  x: 'https://x.com/namakelas',
};

/**
 * Platform "Lainnya" butuh label, platform lain memakai namanya sendiri sebagai
 * nama tampilan sehingga baris tidak perlu label dummy.
 */
export function needsLabel(platform: string): boolean {
  return platform === 'custom';
}