import {
  Bricolage_Grotesque,
  Fraunces,
  Nunito,
  Nunito_Sans,
  Public_Sans,
  Source_Sans_3,
} from 'next/font/google';
import type { Theme } from './schema';

/**
 * Preset font (§17.4). Font di-host sendiri saat build lewat next/font — bukan
 * Google Fonts CDN — karena catatan privasi melarang skrip pihak ketiga (§23).
 * Hanya preset yang SEDANG AKTIF yang diberi class di root layout, sehingga hanya
 * pasangan itu yang di-preload.
 *
 * Default `editorial` memakai Fraunces + Source Sans 3. Ini juga yang dipakai
 * desain Stitch "Warm Paper & Deep Ink Academic System", sehingga konsisten
 * dengan artefak yang sudah ada di stitch_ui_system/.
 */

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-class-display',
  axes: ['opsz', 'SOFT', 'WONK'],
});

const sourceSans3 = Source_Sans_3({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-class-body',
});

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-class-display',
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-class-body',
});

const nunito = Nunito({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-class-display',
});

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-class-body',
});

type Preset = {
  label: string;
  /** Karakter produk, ditampilkan di editor theme (§17.5). */
  character: string;
  className: string;
};

export const FONT_PRESETS: Record<Theme['font_preset'], Preset> = {
  editorial: {
    label: 'Editorial',
    character: 'Serif hangat dan personal; cocok untuk identitas kelas.',
    className: `${fraunces.variable} ${sourceSans3.variable}`,
  },
  grotesk: {
    label: 'Grotesk',
    character: 'Tegas dan modern, enak untuk data padat.',
    className: `${bricolage.variable} ${publicSans.variable}`,
  },
  rounded: {
    label: 'Rounded',
    character: 'Ramah dan informal, cocok untuk kelas yang santai.',
    className: `${nunito.variable} ${nunitoSans.variable}`,
  },
};

export function fontPresetClass(preset: Theme['font_preset']): string {
  return FONT_PRESETS[preset].className;
}
