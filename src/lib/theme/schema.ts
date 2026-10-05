import { z } from 'zod';
import { contrastRatio } from './contrast';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Warna harus format #RRGGBB');

export const PALETTE_KEYS = [
  'primary',
  'secondary',
  'background',
  'surface',
  'border',
  'text_primary',
  'text_secondary',
  'success',
  'warning',
  'error',
] as const;

export type PaletteKey = (typeof PALETTE_KEYS)[number];

export const PALETTE_LABELS: Record<PaletteKey, string> = {
  primary: 'Aksen utama',
  secondary: 'Aksen sekunder',
  background: 'Latar halaman',
  surface: 'Permukaan',
  border: 'Garis pemisah',
  text_primary: 'Teks utama',
  text_secondary: 'Teks sekunder',
  success: 'Sukses',
  warning: 'Peringatan',
  error: 'Galat',
};

export const ThemeSchema = z
  .object({
    layout: z.enum(['standard', 'profile_focused']),
    font_preset: z.enum(['editorial', 'grotesk', 'rounded']),
    palette: z.object({
      primary: hex,
      secondary: hex,
      background: hex,
      surface: hex,
      border: hex,
      text_primary: hex,
      text_secondary: hex,
      success: hex,
      warning: hex,
      error: hex,
    }),
  })
  .superRefine((theme, ctx) => {
    const p = theme.palette;

    // Teks, tautan, dan status harus terbaca di atas latar maupun permukaan.
    const need = (fg: PaletteKey, bg: PaletteKey, min = 4.5) => {
      if (contrastRatio(p[fg], p[bg]) < min) {
        ctx.addIssue({
          code: 'custom',
          path: ['palette', fg],
          message: `${PALETTE_LABELS[fg]} terhadap ${PALETTE_LABELS[bg].toLowerCase()} kurang dari ${min}:1`,
        });
      }
    };

    for (const bg of ['background', 'surface'] as const) {
      for (const fg of [
        'text_primary',
        'text_secondary',
        'primary',
        'secondary',
        'success',
        'warning',
        'error',
      ] as const) {
        need(fg, bg);
      }
    }

    // on_primary/on_secondary diturunkan; minimal satu dari putih atau text_primary
    // harus memenuhi 4.5:1 terhadap warna aksennya.
    for (const accent of ['primary', 'secondary'] as const) {
      const white = contrastRatio('#FFFFFF', p[accent]);
      const ink = contrastRatio(p.text_primary, p[accent]);
      if (white < 4.5 && ink < 4.5) {
        ctx.addIssue({
          code: 'custom',
          path: ['palette', accent],
          message: `Tidak ada warna teks yang terbaca di atas ${PALETTE_LABELS[accent].toLowerCase()}`,
        });
      }
    }
  });

export type Theme = z.infer<typeof ThemeSchema>;

/** Satu pasangan warna yang diuji kontrasnya, untuk ContrastReport. */
export type ContrastPair = {
  fg: PaletteKey;
  bg: PaletteKey;
  ratio: number;
  passes: boolean;
};

export const TEXT_MIN_RATIO = 4.5;

export function contrastPairs(theme: Theme): ContrastPair[] {
  const pairs: ContrastPair[] = [];
  for (const bg of ['background', 'surface'] as const) {
    for (const fg of [
      'text_primary',
      'text_secondary',
      'primary',
      'secondary',
      'success',
      'warning',
      'error',
    ] as const) {
      const ratio = contrastRatio(theme.palette[fg], theme.palette[bg]);
      pairs.push({ fg, bg, ratio, passes: ratio >= TEXT_MIN_RATIO });
    }
  }
  return pairs;
}

export function hasContrastFailure(theme: Theme): boolean {
  return contrastPairs(theme).some((p) => !p.passes);
}
