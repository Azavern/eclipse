import { HTTPS_URL } from './validation';

// Platform tautan sosial — salinan dari enum `public.social_platform`.
//
// Satu daftar dipakai bersama oleh tautan kelas (`class_links`) dan tautan
// anggota (`social_links`) karena keduanya memakai enum yang sama. Daftar ini
// pendek dan stabil, jadi tidak perlu di-generate dari database.

export const SOCIAL_PLATFORMS = [
  'instagram',
  'linkedin',
  'github',
  'tiktok',
  'x',
  'website',
  'custom',
] as const;

export type SocialPlatformName = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_PLATFORM_LABEL: Record<SocialPlatformName, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  tiktok: 'TikTok',
  x: 'X',
  website: 'Situs web',
  custom: 'Lainnya',
};

/** Host yang diterima per platform (§14.3). `null` = host https bebas. */
export const SOCIAL_HOSTS = {
  instagram: ['instagram.com'],
  linkedin: ['linkedin.com'],
  github: ['github.com'],
  tiktok: ['tiktok.com'],
  x: ['x.com', 'twitter.com'],
  website: null,
  custom: null,
} as const satisfies Record<SocialPlatformName, readonly string[] | null>;

const hostMatches = (hostname: string, domain: string) =>
  hostname === domain || hostname.endsWith(`.${domain}`);

export function socialUrlSchema(platform: SocialPlatformName) {
  return HTTPS_URL.superRefine((value, ctx) => {
    const allowed = SOCIAL_HOSTS[platform];
    if (!allowed) return; // website/custom: host bebas (tetap wajib https)
    let hostname: string;
    try {
      hostname = new URL(value).hostname.toLowerCase();
    } catch {
      return; // sudah dilaporkan oleh HTTPS_URL
    }
    if (!allowed.some((d) => hostMatches(hostname, d))) {
      ctx.addIssue({
        code: 'custom',
        message: `Tautan harus berada di ${allowed.join(' atau ')}`,
      });
    }
  });
}