import { z } from 'zod';

// Validasi yang dipakai BERSAMA oleh klien (UX) dan Server Action (otoritas).
// Constraint DB adalah lapisan ketiga (§14.1).

export const HTTPS_URL = z
  .string()
  .trim()
  .max(2048, 'Tautan terlalu panjang')
  .superRefine((value, ctx) => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Tautan harus berupa URL yang valid' });
      return;
    }
    if (url.protocol !== 'https:') {
      ctx.addIssue({ code: 'custom', message: 'Tautan harus diawali https://' });
    }
    if (url.username || url.password) {
      ctx.addIssue({ code: 'custom', message: 'Tautan tidak boleh memuat kredensial' });
    }
    if (!url.hostname.includes('.')) {
      ctx.addIssue({ code: 'custom', message: 'Alamat tautan tidak valid' });
    }
  });

const hostMatches = (hostname: string, domain: string) =>
  hostname === domain || hostname.endsWith(`.${domain}`);

/** Host yang diterima per platform social (§14.3). */
export const SOCIAL_HOSTS = {
  instagram: ['instagram.com'],
  linkedin: ['linkedin.com'],
  github: ['github.com'],
  tiktok: ['tiktok.com'],
  x: ['x.com', 'twitter.com'],
  website: null, // host https apa pun
  custom: null,
} as const satisfies Record<string, readonly string[] | null>;

export function socialUrlSchema(platform: keyof typeof SOCIAL_HOSTS) {
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

/** Teks satu baris: trim, dan string kosong menjadi null untuk field opsional. */
export const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} maksimal ${max} karakter`)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable();

export const requiredText = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} minimal ${min} karakter`)
    .max(max, `${label} maksimal ${max} karakter`);

export const USERNAME = z
  .string()
  .trim()
  .regex(/^[a-z0-9_]{3,30}$/, 'Username 3-30 karakter: huruf kecil, angka, dan garis bawah');

export const PASSWORD_MIN = 10;

export const newPassword = z
  .string()
  .min(PASSWORD_MIN, `Kata sandi minimal ${PASSWORD_MIN} karakter`)
  .max(72, 'Kata sandi maksimal 72 karakter');

export const loginPassword = z.string().min(1, 'Kata sandi wajib diisi').max(72);

export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email('Format email tidak valid')
  .max(254, 'Email terlalu panjang');
