import type { Theme } from './schema';

/**
 * Default theme "Eclipse" — WAJIB identik dengan seed di
 * supabase/migrations/0008_reference_data.sql. Kesetaraan dijaga tes unit
 * `theme-parity.test.ts` (§22.4).
 *
 * Alasan nilai (§17.4): kertas hangat + tinta pekat + satu aksen amber terbakar.
 * Nama kelas "Eclipse" (gelap pekat dengan satu cahaya hangat), kontras tinggi
 * untuk dibaca di ponsel, dan menghindari gradien ungu-biru generik (§17.6).
 */
export const DEFAULT_THEME: Theme = {
  layout: 'standard',
  font_preset: 'editorial',
  palette: {
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
  },
};
