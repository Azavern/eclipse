'use client';

import { useActionState, useState } from 'react';
import { updateTheme } from '@/features/theme/actions';
import {
  contrastPairs,
  hasContrastFailure,
  PALETTE_KEYS,
  PALETTE_LABELS,
  ThemeSchema,
  type PaletteKey,
  type Theme,
} from '@/lib/theme/schema';
import { DEFAULT_THEME } from '@/lib/theme/defaults';
import { FormField } from '@/components/ui/FormField';
import { Input, Select } from '@/components/ui/Input';
import { FormStatus } from '@/components/ui/FormStatus';
import { SubmitButton } from '@/components/ui/SubmitButton';

const LAYOUTS = [
  { value: 'standard', label: 'Standar' },
  { value: 'profile_focused', label: 'Fokus profil' },
] as const;

const FONTS = [
  { value: 'editorial', label: 'Editorial (serif)' },
  { value: 'grotesk', label: 'Grotesk (sans-serif)' },
  { value: 'rounded', label: 'Rounded (lembut)' },
] as const;

export type ThemeDefaults = Theme;

/** Label kontras — teksnya, bukan hanya warna hijau/merah. */
function ratioLabel(passes: boolean): string {
  return passes ? 'terbaca' : 'kurang kontras';
}

/**
 * Editor tema.
 *
 * Pratinjau kontras dihitung di browser pada setiap perubahan warna, memakai
 * fungsi `contrastPairs` yang sama dengan validasi server dan `ThemeSchema` —
 * jadi angka yang dilihat Ketua sama dengan angka yang jadi dasar penolakan.
 * Penyimpanan tetap boleh gagal bila skema menolak; tidak ada jalan pintas.
 */
export function ThemeEditor({ defaults }: { defaults: ThemeDefaults }) {
  const [state, action] = useActionState(updateTheme, null);

  const [layout, setLayout] = useState(defaults.layout);
  const [fontPreset, setFontPreset] = useState(defaults.font_preset);
  const [palette, setPalette] = useState<Record<PaletteKey, string>>(defaults.palette);

  const candidate = { layout, font_preset: fontPreset, palette };

  // Palet cacat tidak boleh lolos diam-diam: kalau skema gagal, editor
  // menampilkan pasangan yang gagal dan tombol simpan tetap aktif supaya server
  // yang menolak dengan pesan lengkap.
  const valid = ThemeSchema.safeParse(candidate).success;
  const pairs = valid ? contrastPairs(candidate as Theme) : [];
  const broken = hasContrastFailure(candidate as Theme);

  const fieldErrors = state && !state.ok ? state.error.fieldErrors : undefined;
  const first = (name: string) => fieldErrors?.[name]?.[0];

  // `<input type="color">` menolak nilai yang bukan hex lengkap, jadi saat
  // pengguna tengah mengetik palet dipakai warna bawaan bertoken — bukan hex
  // hardcoded yang lolos dari sistem token.
  const safeSwatch = DEFAULT_THEME.palette.text_primary;

  return (
    <form action={action} className="flex flex-col gap-8">
      <FormStatus state={state} successMessage="Tema kelas tersimpan." />

      <div className="flex flex-wrap gap-6">
        <div className="flex min-w-56 flex-1 flex-col gap-4">
          <FormField id="layout" label="Tata letak beranda" error={first('layout')} required>
            {(describedBy) => (
              <Select
                id="layout"
                name="layout"
                value={layout}
                describedBy={describedBy}
                onChange={(e) => setLayout(e.target.value as Theme['layout'])}
              >
                {LAYOUTS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </Select>
            )}
          </FormField>

          <FormField id="font_preset" label="Pasangan font" error={first('font_preset')} required>
            {(describedBy) => (
              <Select
                id="font_preset"
                name="font_preset"
                value={fontPreset}
                describedBy={describedBy}
                onChange={(e) => setFontPreset(e.target.value as Theme['font_preset'])}
              >
                {FONTS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-label font-semibold text-text">Kontras teks</h2>
          {!valid ? (
            <p className="text-small text-text-muted">
              Isi semua warna dengan format hex lengkap untuk melihat hasil kontras.
            </p>
          ) : pairs.length === 0 ? (
            <p className="text-small text-text-muted">Belum ada pasangan yang bisa diukur.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {pairs.map((p) => (
                <li key={`${p.fg}-${p.bg}`} className="text-small">
                  <span className={p.passes ? 'text-success' : 'text-error'}>
                    {p.passes ? '✓' : '✕'}
                  </span>{' '}
                  <span className="text-text">
                    {PALETTE_LABELS[p.fg]} di atas {PALETTE_LABELS[p.bg].toLowerCase()} —{' '}
                    {PALETTE_LABELS[p.fg]} di atas {PALETTE_LABELS[p.bg].toLowerCase()} —{' '}
                    {p.ratio.toFixed(2)}:1 ({ratioLabel(p.passes)})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-h2 font-semibold text-text">Warna</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {PALETTE_KEYS.map((key) => {
            const error = first(`palette_${key}`);
            return (
              <FormField
                key={key}
                id={`palette_${key}`}
                label={PALETTE_LABELS[key]}
                error={error}
                required
              >
                {(describedBy) => (
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label={`${PALETTE_LABELS[key]} — pemilih warna`}
                      value={/^#[0-9a-fA-F]{6}$/.test(palette[key]) ? palette[key] : safeSwatch}
                      onChange={(e) =>
                        setPalette((prev) => ({ ...prev, [key]: e.target.value.toLowerCase() }))
                      }
                      className="size-11 shrink-0 cursor-pointer rounded-md border border-control-border bg-surface p-1"
                    />
                    <Input
                      id={`palette_${key}`}
                      name={`palette_${key}`}
                      defaultValue={palette[key]}
                      maxLength={7}
                      pattern="#[0-9a-fA-F]{6}"
                      spellCheck={false}
                      invalid={Boolean(error)}
                      describedBy={describedBy}
                    />
                  </div>
                )}
              </FormField>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <SubmitButton pendingLabel="Menyimpan…">Simpan tema</SubmitButton>
        {valid && broken ? (
          <p className="text-small text-error">
            Ada pasangan warna yang belum terbaca. Perbaiki dulu supaya semua pengguna dapat membaca
            isi halaman.
          </p>
        ) : (
          <p className="text-small text-text-muted">
            Warna dipakai seluruh aplikasi. Semua kombinasi teks diperiksa terhadap rasio minimal
            4,5:1.
          </p>
        )}
      </div>
    </form>
  );
}
