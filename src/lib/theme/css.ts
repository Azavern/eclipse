import { readableOn, relativeLuminance } from './contrast';
import { PALETTE_KEYS, type Theme } from './schema';

// Pola ini adalah satu-satunya tempat nilai hex masuk ke CSS. Semua nilai di sini
// sudah lolos ThemeSchema, dan fungsi tetap memverifikasi ulang polanya sebelum
// menulis apa pun ke style tag — tidak ada string bebas yang bisa masuk (§17.4).
const HEX_ONLY = /^#[0-9a-fA-F]{6}$/;

function varName(key: string): string {
  return `--theme-${key.replace(/_/g, '-')}`;
}

/**
 * Membangun blok `:root { --theme-* }` dari theme yang sudah tervalidasi.
 * Mengembalikan string CSS, bukan objek style, supaya bisa dirender sebagai
 * <style nonce> di root layout.
 */
export function buildThemeCss(theme: Theme): string {
  const lines: string[] = [];

  for (const key of PALETTE_KEYS) {
    const value = theme.palette[key];
    if (!HEX_ONLY.test(value)) continue; // fail closed: lewati nilai tak terduga
    lines.push(`  ${varName(key)}: ${value};`);
  }

  // Token turunan (dihitung, tidak dikonfigurasi).
  const onPrimary = readableOn(theme.palette.primary);
  const onSecondary = readableOn(theme.palette.secondary);
  lines.push(`  --theme-on-primary: ${onPrimary};`);
  lines.push(`  --theme-on-secondary: ${onSecondary};`);
  // Batas input memakai text_secondary agar >= 3:1 (batas komponen >= 4.5:1).
  lines.push(`  ${varName('control_border')}: ${theme.palette.text_secondary};`);
  lines.push(`  ${varName('focus')}: ${theme.palette.text_primary};`);

  // Native controls (select, checkbox, scrollbar) mengikuti tema agar tidak
  // terlihat asing di atas palet gelap.
  const dark = relativeLuminance(theme.palette.background) < 0.35;
  lines.push(`  color-scheme: ${dark ? 'dark' : 'light'};`);

  return `:root {\n${lines.join('\n')}\n}`;
}
