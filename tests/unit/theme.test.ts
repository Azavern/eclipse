import { describe, expect, it } from 'vitest';
import { contrastRatio, hexToRgb, readableOn, relativeLuminance } from '@/lib/theme/contrast';
import { ThemeSchema, contrastPairs, hasContrastFailure } from '@/lib/theme/schema';
import { DEFAULT_THEME } from '@/lib/theme/defaults';
import { buildThemeCss } from '@/lib/theme/css';

describe('contrastRatio (nilai acuan WCAG)', () => {
  it('hitam di atas putih = 21:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  it('warna sama dengan dirinya sendiri = 1:1', () => {
    expect(contrastRatio('#A64B00', '#A64B00')).toBeCloseTo(1, 5);
  });

  it('simetris: urutan argumen tidak memengaruhi hasil', () => {
    expect(contrastRatio('#1C1B19', '#F7F4ED')).toBeCloseTo(
      contrastRatio('#F7F4ED', '#1C1B19'),
      10,
    );
  });

  it('luminansi relatif putih = 1 dan hitam = 0', () => {
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 6);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 6);
  });

  it('fail closed untuk hex invalid: rasio 0, bukan dianggap sangat kontras', () => {
    expect(hexToRgb('bukan hex')).toBeNull();
    // Jika hex rusak dibaca sebagai hitam, rasio vs putih jadi 21 dan tema
    // kerusakannya lolos. 0 memaksa ThemeSchema menolaknya.
    expect(contrastRatio('zzz', '#FFFFFF')).toBe(0);
    expect(relativeLuminance('zzz')).toBeNaN();
  });

  it('readableOn memilih warna teks yang kontrasnya lebih tinggi', () => {
    expect(readableOn('#000000')).toBe('#FFFFFF');
    expect(readableOn('#FFFFFF')).toBe('#1C1B19');
  });

  it('readableOn tetap dapat jawaban untuk latar tidak valid', () => {
    expect(readableOn('rgb(1,2,3)')).toBe('#FFFFFF');
  });
});

describe('ThemeSchema', () => {
  it('menerima DEFAULT_THEME', () => {
    expect(ThemeSchema.safeParse(DEFAULT_THEME).success).toBe(true);
  });

  it('menolak hex yang salah format', () => {
    const bad = structuredClone(DEFAULT_THEME);
    bad.palette.primary = '#A64B0';
    const result = ThemeSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('menolak palet berkontras rendah', () => {
    // Teks terang di atas latar terang: jauh di bawah 4.5:1.
    const bad = structuredClone(DEFAULT_THEME);
    bad.palette.background = '#F7F4ED';
    bad.palette.text_primary = '#F2EDE9';
    const result = ThemeSchema.safeParse(bad);
    expect(result.success).toBe(false);
    expect(hasContrastFailure(bad)).toBe(true);
  });

  it('menolak layout dan font_preset di luar enum', () => {
    const bad = { ...structuredClone(DEFAULT_THEME), layout: 'grid' };
    expect(ThemeSchema.safeParse(bad).success).toBe(false);

    const bad2 = { ...structuredClone(DEFAULT_THEME), font_preset: 'comic' };
    expect(ThemeSchema.safeParse(bad2).success).toBe(false);
  });

  it('melaporkan pasangan yang gagal kontras secara tekstual', () => {
    const bad = structuredClone(DEFAULT_THEME);
    bad.palette.text_primary = '#F2EDE9';
    const result = ThemeSchema.safeParse(bad);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join(' ');
      expect(messages).toContain('Teks utama');
    }
  });

  it('contrastPairs mencakup latar dan permukaan', () => {
    const pairs = contrastPairs(DEFAULT_THEME);
    const backgrounds = new Set(pairs.map((p) => p.bg));
    expect(backgrounds).toEqual(new Set(['background', 'surface']));
    expect(pairs.every((p) => p.passes)).toBe(true);
  });
});

describe('buildThemeCss', () => {
  it('menghasilkan variabel untuk seluruh kunci palet', () => {
    const css = buildThemeCss(DEFAULT_THEME);
    for (const key of [
      'primary',
      'secondary',
      'background',
      'surface',
      'border',
      'text-primary',
      'text-secondary',
      'success',
      'warning',
      'error',
    ]) {
      expect(css).toContain(`--theme-${key}:`);
    }
  });

  it('menghasilkan token turunan yang dikonfigurasi tidak bisa menimpa', () => {
    const css = buildThemeCss(DEFAULT_THEME);
    expect(css).toContain('--theme-on-primary:');
    expect(css).toContain('--theme-on-secondary:');
    expect(css).toContain('--theme-control-border:');
    expect(css).toContain('--theme-focus:');
    expect(css).toContain('color-scheme:');
  });

  it('tidak pernah menulis nilai hex yang tidak tervalidasi', () => {
    // Guard terakhir: fungsi ini hanya boleh memancarkan #RRGGBB.
    const css = buildThemeCss(DEFAULT_THEME);
    const hexValues = css.match(/#[0-9a-fA-F]*/g) ?? [];
    for (const value of hexValues) {
      expect(value).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('melewati nilai yang tidak cocok pola, bukan menulisnya apa adanya', () => {
    const tampered = structuredClone(DEFAULT_THEME);
    // Sengaja rusak untuk memastikan fail-closed di lapisan CSS.
    (tampered.palette as unknown as Record<string, string>).primary = 'red; } body { display:none';
    const css = buildThemeCss(tampered);
    expect(css).not.toContain('display:none');
  });
});

describe('kesetaraan DEFAULT_THEME dengan seed SQL', () => {
  // Nilai ini disalin dari supabase/migrations/0008_reference_data.sql.
  // Tes paritas menjaga kedua sumber tetap sama (§22.4).
  const SEED = {
    primary: '#A64B00',
    secondary: '#2C4A5E',
    background: '#F7F4ED',
    surface: '#FFFFFF',
    border: '#D9D3C5',
    text_primary: '#1C1B19',
    text_secondary: '#5A564D',
    success: '#2F6B3A',
    warning: '#8A5A00',
    error: '#B3261E',
  };

  it('palet identik dengan seed migration 0008', () => {
    expect(DEFAULT_THEME.palette).toEqual(SEED);
  });

  it('layout dan font_preset identik dengan seed', () => {
    expect(DEFAULT_THEME.layout).toBe('standard');
    expect(DEFAULT_THEME.font_preset).toBe('editorial');
  });
});
