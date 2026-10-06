import { describe, expect, it } from 'vitest';
import { resetRequestSchema } from '@/features/auth/schemas';

describe('resetRequestSchema', () => {
  it('menormalkan email ke huruf kecil dan memangkas spasi', () => {
    // Email di Auth selalu huruf kecil; bentuk yang sama harus sampai ke tabel
    // supaya bisa dibandingkan dan tidak melanggar CHECK `email = lower(email)`.
    const parsed = resetRequestSchema.safeParse({ email: '  Ketua@Eclipse.Sch.ID ' });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.email).toBe('ketua@eclipse.sch.id');
  });

  it('menolak email yang bukan email', () => {
    expect(resetRequestSchema.safeParse({ email: 'bukan-email' }).success).toBe(false);
    expect(resetRequestSchema.safeParse({ email: 'a@b' }).success).toBe(false);
  });

  it('menolak email kosong, tanda @ saja, dan email kepanjangan', () => {
    expect(resetRequestSchema.safeParse({ email: '' }).success).toBe(false);
    expect(resetRequestSchema.safeParse({ email: '@' }).success).toBe(false);
    const long = `${'a'.repeat(250)}@contoh.sch.id`;
    expect(resetRequestSchema.safeParse({ email: long }).success).toBe(false);
  });

  it('menolak isian yang bukan string (FormData bisa mengirim File)', () => {
    expect(resetRequestSchema.safeParse({ email: new File(['x'], 'x.txt') }).success).toBe(false);
    expect(resetRequestSchema.safeParse({ email: null }).success).toBe(false);
    expect(resetRequestSchema.safeParse({}).success).toBe(false);
  });

  it('menyimpan kata sandi apa pun di luar email? tidak ada kolomnya', () => {
    // Skema ini hanya menerima email: tidak ada jalan untuk memasukkan data
    // lain ke antrean lewat form ini.
    const parsed = resetRequestSchema.safeParse({ email: 'a@b.co', password: 'Rahasia' });
    expect(parsed.success).toBe(true);
    expect(Object.keys(parsed.data ?? {})).toEqual(['email']);
  });
});
