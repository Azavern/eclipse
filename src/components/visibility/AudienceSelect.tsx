'use client';

import { useState } from 'react';
import { Select } from '@/components/ui/Input';
import {
  AUDIENCE_HINT,
  AUDIENCE_LABEL,
  AUDIENCE_LEVELS,
  ceilingNote,
  levelAllowed,
  toAudienceLevel,
  type Audience,
  type AudienceLevel,
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
 * Hanya tiga opsi — Publik, Anggota, Ketua. Tidak ada opsi "ikut aturan
 * bawaan": nilai awal `value` sudah berupa level efektif yang berlaku, jadi
 * mengosongkan pilihan tidak lagi menghapus override.
 */
export function AudienceSelect({
  id,
  name,
  visibilityKey,
  value,
  map,
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
  describedBy?: string;
  invalid?: boolean;
  onChange?: (value: string) => void;
}) {
  const [internal, setInternal] = useState(value);

  // Nilai kosong berarti "belum ada aturan baris ini"; yang berlaku adalah level
  // efektif dari bagian induknya, dan itulah yang ditampilkan.
  const raw = onChange ? value : internal;
  const fallback = toAudienceLevel(map[visibilityKey]?.effective ?? 'class_admin');
  const chosen: AudienceLevel = raw ? toAudienceLevel(raw as Audience) : fallback;

  const note = ceilingNote(visibilityKey, chosen, map);

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
        {AUDIENCE_LEVELS.map((level) => {
          const allowed = levelAllowed(visibilityKey, level);
          return (
            <option key={level} value={level} disabled={!allowed}>
              {AUDIENCE_LABEL[level]}
              {allowed ? '' : ' (tidak tersedia untuk bagian ini)'}
            </option>
          );
        })}
      </Select>

      {/*
        Catatan plafon diumumkan lewat aria-live supaya perubahan select langsung
        terdengar oleh pembaca layar, bukan hanya terlihat.
      */}
      <p aria-live="polite" className="text-caption text-text-muted">
        {note ?? AUDIENCE_HINT[chosen]}
      </p>
    </div>
  );
}
