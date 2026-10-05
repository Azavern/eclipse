import { describe, expect, it } from 'vitest';
import {
  PORTFOLIO_KINDS,
  portfolioItemSchema,
  toItemAudience,
  VISIBILITY_INHERIT,
} from '@/features/portfolio/schemas';
import { buildSocialLinkSchema, needsLabel } from '@/features/social/schemas';
import { SOCIAL_PLATFORMS, SOCIAL_PLATFORM_LABEL } from '@/lib/social';

// Enum dari supabase/migrations/20261005120000_initial_schema.sql. Tes paritas
// menjaga daftar platform di TypeScript dan enum di database tidak berbeda.
const DB_PLATFORMS = ['instagram', 'linkedin', 'github', 'tiktok', 'x', 'website', 'custom'];

const validItem = {
  kind: 'project',
  title: 'Aplikasi undercut',
  description: ' Deskripsi  ',
  occurred_on: '2026-05-01',
  url: ' https://example.com/porto ',
  visibility: null,
};

describe('portfolioItemSchema', () => {
  it('menerima isian valid dan menormalkan spasi', () => {
    const parsed = portfolioItemSchema.safeParse(validItem);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.title).toBe('Aplikasi undercut');
    expect(parsed.data.description).toBe('Deskripsi');
    expect(parsed.data.url).toBe('https://example.com/porto');
  });

  it('menolak tanggal yang tidak ada di kalender, bukan cuma formatnya', () => {
    for (const occurred_on of ['2026-02-30', '2026-13-01', '2026-00-10', '05-01-2026']) {
      const parsed = portfolioItemSchema.safeParse({ ...validItem, occurred_on });
      expect(parsed.success, occurred_on).toBe(false);
    }
  });

  it('menerima 29 Februari pada tahun kabisat dan menolak pada tahun biasa', () => {
    expect(portfolioItemSchema.safeParse({ ...validItem, occurred_on: '2028-02-29' }).success).toBe(
      true,
    );
    expect(portfolioItemSchema.safeParse({ ...validItem, occurred_on: '2027-02-29' }).success).toBe(
      false,
    );
  });

  it('menolak url yang bukan https', () => {
    expect(portfolioItemSchema.safeParse({ ...validItem, url: 'http://example.com' }).success).toBe(
      false,
    );
  });

  it('judul kosong ditolak, judul 100 karakter diterima', () => {
    expect(portfolioItemSchema.safeParse({ ...validItem, title: '   ' }).success).toBe(false);
    expect(portfolioItemSchema.safeParse({ ...validItem, title: 'a'.repeat(100) }).success).toBe(
      true,
    );
    expect(portfolioItemSchema.safeParse({ ...validItem, title: 'a'.repeat(101) }).success).toBe(
      false,
    );
  });

  it('visibility harus salah satu audience atau null', () => {
    expect(portfolioItemSchema.safeParse({ ...validItem, visibility: 'self' }).success).toBe(true);
    expect(portfolioItemSchema.safeParse({ ...validItem, visibility: 'everyone' }).success).toBe(
      false,
    );
  });
});

describe('toItemAudience', () => {
  it('string kosong berarti ikut aturan (NULL)', () => {
    expect(toItemAudience(VISIBILITY_INHERIT)).toBeNull();
  });

  it('nilai_UNKNOWN ditolak agar tidak lolos ke database', () => {
    expect(toItemAudience('everyone')).toBeUndefined();
  });

  it('nilai audience diteruskan apa adanya', () => {
    expect(toItemAudience('self')).toBe('self');
    expect(toItemAudience('class_admin')).toBe('class_admin');
  });
});

describe('paritas platform sosial dengan enum DB', () => {
  it('daftar platform identik dan lengkap', () => {
    expect([...SOCIAL_PLATFORMS].sort()).toEqual([...DB_PLATFORMS].sort());
  });

  it('setiap platform punya label', () => {
    for (const platform of SOCIAL_PLATFORMS) {
      expect(SOCIAL_PLATFORM_LABEL[platform]).toBeTruthy();
    }
  });
});

describe('buildSocialLinkSchema', () => {
  it('platform "Lainnya" wajib punya label', () => {
    const schema = buildSocialLinkSchema('custom');
    expect(schema.safeParse({ platform: 'custom', label: null, url: 'https://contoh.id', visibility: null }).success).toBe(false);
    expect(schema.safeParse({ platform: 'custom', label: 'Portofolio', url: 'https://contoh.id', visibility: null }).success).toBe(true);
    expect(needsLabel('custom')).toBe(true);
    expect(needsLabel('github')).toBe(false);
  });

  it('host harus sesuai platform', () => {
    const schema = buildSocialLinkSchema('github');
    expect(schema.safeParse({ platform: 'github', label: null, url: 'https://github.com/aku', visibility: null }).success).toBe(true);
    expect(schema.safeParse({ platform: 'github', label: null, url: 'https://instagram.com/aku', visibility: null }).success).toBe(false);
  });

  it('subdomain milik platform yang sama tetap diterima, domain meniru ditolak', () => {
    const schema = buildSocialLinkSchema('x');
    expect(schema.safeParse({ platform: 'x', label: null, url: 'https://www.twitter.com/aku', visibility: null }).success).toBe(true);
    expect(schema.safeParse({ platform: 'x', label: null, url: 'https://x.com.evil.test/aku', visibility: null }).success).toBe(false);
  });

  it('website menerima host apa pun asal https', () => {
    const schema = buildSocialLinkSchema('website');
    expect(schema.safeParse({ platform: 'website', label: null, url: 'https://porto.saya.id', visibility: null }).success).toBe(true);
    expect(schema.safeParse({ platform: 'website', label: null, url: 'http://porto.saya.id', visibility: null }).success).toBe(false);
  });

  it('kredensial di url ditolak', () => {
    const schema = buildSocialLinkSchema('website');
    expect(schema.safeParse({ platform: 'website', label: null, url: 'https://user:rahasia@porto.id', visibility: null }).success).toBe(false);
  });

  it('semua jenis portofolio punya label', () => {
    for (const kind of PORTFOLIO_KINDS) {
      expect(portfolioItemSchema.safeParse({ ...validItem, kind }).success, kind).toBe(true);
    }
  });
});