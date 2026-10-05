import { z } from 'zod';
import { HTTPS_URL, optionalText, requiredText } from '@/lib/validation';
import { AUDIENCES, type Audience } from '@/lib/visibility/registry';

/**
 * Jenis item portofolio — salinan dari enum `public.portfolio_kind`.
 * Label dalam bahasa Indonesia supaya daftar di form tidak perlu diterjemahkan
 * ulang di komponen.
 */
export const PORTFOLIO_KINDS = [
  'project',
  'achievement',
  'organization',
  'competition',
  'creative_work',
  'certificate',
  'experience',
] as const;

/**
 * Batas jumlah item per anggota; cerminan trigger `portfolio_limit` di database.
 *
 * Ditempatkan di modul ini, bukan di `queries.ts`, karena editor klien perlu
 * menampilkan batas yang sama tanpa menarik modul `server-only` ke bundel.
 */
export const PORTFOLIO_LIMIT = 50;

export type PortfolioKind = (typeof PORTFOLIO_KINDS)[number];

export const PORTFOLIO_KIND_LABEL: Record<PortfolioKind, string> = {
  project: 'Proyek',
  achievement: 'Prestasi',
  organization: 'Organisasi',
  competition: 'Lomba',
  creative_work: 'Karya',
  certificate: 'Sertifikat',
  experience: 'Pengalaman',
};

/**
 * Tanggal `YYYY-MM-DD` yang benar-benar ada di kalender.
 *
 * Kolomnya `date` di database, jadi hanya tanggal yang disimpan; `input
 * type="date"` memang mengirim format itu juga. Regex saja akan menerima
 * "2026-02-30", jadi kebenarannya diperiksa lewat Date UTC yang bisa diulang.
 */
const ISO_DATE = z
  .string()
  .trim()
  .regex(/^(\d{4})-(\d{2})-(\d{2})$/, 'Tanggal harus berformat YYYY-MM-DD')
  .refine((value) => {
    const [, y, m, d] = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) ?? [];
    if (!y || !m || !d) return false;
    const asUtc = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    return (
      asUtc.getUTCFullYear() === Number(y) &&
      asUtc.getUTCMonth() === Number(m) - 1 &&
      asUtc.getUTCDate() === Number(d)
    );
  }, 'Tanggal tidak valid');

/**
 * Skema item portofolio milik sendiri.
 *
 * Batas panjang disalin dari CHECK constraint di `portfolio_items`:
 * `title` 1–100, `description` ≤ 1000, `url` wajib `https://` dan ≤ 2048.
 * `visibility` NULL berarti "ikut aturan bagian Portofolio" (§7.3) — form
 * mengirim string kosong untuk itu, yang diterjemahkan jadi NULL di aksi.
 */
export const portfolioItemSchema = z.object({
  kind: z.enum(PORTFOLIO_KINDS),
  title: requiredText(1, 100, 'Judul'),
  description: optionalText(1000, 'Deskripsi'),
  occurred_on: ISO_DATE,
  url: optionalText(2048, 'Tautan').refine(
    (v) => v === null || HTTPS_URL.safeParse(v).success,
    'Tautan harus berupa URL https yang valid',
  ),
  visibility: z.enum(AUDIENCES).nullable(),
});

export type PortfolioItemInput = z.input<typeof portfolioItemSchema>;
export type PortfolioItemValues = z.output<typeof portfolioItemSchema>;

/**
 * Nilai select yang berarti "ikut aturan", bukan audience tertentu.
 * Sama dengan `ALLOW_DEFAULT` di registry; di sini memakai nama yang menjelaskan
 * maksudnya di level item.
 */
export const VISIBILITY_INHERIT = '';

/**
 * Ubah nilai select menjadi kolom `visibility`.
 *
 * `VISIBILITY_INHERIT` menjadi NULL (hapus override), sedangkan string lain
 * harus benar-benar salah satu audience — input tak tetrusted tidak boleh
 * diteruskan apa adanya ke database (§9).
 */
export function toItemAudience(raw: string): Audience | null | undefined {
  if (raw === VISIBILITY_INHERIT) return null;
  return (AUDIENCES as readonly string[]).includes(raw) ? (raw as Audience) : undefined;
}