'use client';

import { useState } from 'react';
import { Select } from '@/components/ui/Input';
import {
  ALLOW_DEFAULT,
  AUDIENCE_HINT,
  AUDIENCE_LABEL,
  allowedAudiences,
  ceilingNote,
  WIDEST_AUDIENCE,
  type Audience,
  type VisibilityEntry,
  type VisibilityKey,
} from '@/lib/visibility/registry';

/**
 * Select audience dengan penjelasan langsung.
 *
 * Satu komponen dipakai di dua tempat dengan aturan berbeda: pengaturan
 * anggota (`/settings/profile`) dan override per item portofolio/tautan. Yang
 * penting, penjelasan plafon dihitung oleh `ceilingNote` yang sama dengan yang
 * dipakai server dan editor kelas — bukan implementasi terpisah yang bisa
 * berbeda (§7.8).
 *
 * Nilai kosong berarti "pakai bawaan", bukan audience tertentu; teks opsinya
 * menyebut nilai bawaan supaya pengguna tahu apa yang sebenarnya berlaku.
 */
export function AudienceSelect({
  id,
  name,
  visibilityKey,
  value,
  map,
  defaultLabel = 'Ikut aturan bawaan',
  describedBy,
  invalid = false,
  onChange,
}: {
  id: string;
  name: string;
  /** Key katalog: menentukan opsi yang boleh dipilih dan plafon halamannya. */
  visibilityKey: VisibilityKey;
  value: string;
  map: Record<VisibilityKey, VisibilityEntry>;
  /** Label opsi "pakai bawaan"; teksnya menyesuaikan konteks pemanggil. */
  defaultLabel?: string;
  describedBy?: string;
  invalid?: boolean;
  onChange?: (value: string) => void;
}) {
  const [internal, setInternal] = useState(value);
  const chosen = onChange ? value : internal;

  const options = allowedAudiences(visibilityKey);
  const note =
    chosen === ALLOW_DEFAULT
      ? null
      : ceilingNote(visibilityKey, chosen as Audience, map);

  const handleChange = (next: string) => {
    if (!onChange) setInternal(next);
    onChange?.(next);
  };

  return (
    <div className="flex flex-col gap-1">
      <Select
        id={id}
        name={name}
        value={chosen}
        describedBy={describedBy}
        invalid={invalid}
        onChange={(event) => handleChange(event.target.value)}
      >
        <option value={ALLOW_DEFAULT}>{defaultLabel}</option>
        {options.map((audience) => (
          <option key={audience} value={audience}>
            {AUDIENCE_LABEL[audience]}
          </option>
        ))}
      </Select>

      {/*
        Catatan plafon diumumkan lewat aria-live supaya perubahan select langsung
        terdengar oleh pembaca layar, bukan hanya terlihat.
      */}
      <p aria-live="polite" className="text-caption text-text-muted">
        {note ??
          (chosen === ALLOW_DEFAULT
            ? `Ikut aturan bawaan bagian ini (${WIDEST_AUDIENCE[visibilityKey]}).`
            : AUDIENCE_HINT[chosen as Audience])}
      </p>
    </div>
  );
}