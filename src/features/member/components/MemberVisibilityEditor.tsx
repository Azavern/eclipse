'use client';

import { useActionState, useState } from 'react';
import { saveMyVisibility } from '@/features/visibility/actions';
import {
  AUDIENCE_HINT,
  AUDIENCE_LABEL,
  AUDIENCE_LEVELS,
  ceilingNote,
  levelAllowed,
  MEMBER_SCOPE_KEYS,
  toAudienceLevel,
  VISIBILITY_BY_KEY,
  type AudienceLevel,
  type VisibilityEntry,
  type VisibilityKey,
} from '@/lib/visibility/registry';
import { FormField } from '@/components/ui/FormField';
import { Select } from '@/components/ui/Input';
import { FormStatus } from '@/components/ui/FormStatus';
import { SubmitButton } from '@/components/ui/SubmitButton';

export type MemberSelectionMap = Partial<Record<VisibilityKey, AudienceLevel>>;

/** Ambil hanya level yang dikenal dari nilai yang di-echo Server Action. */
function pickKnownLevels(values: Record<string, string>, fallback: MemberSelectionMap) {
  const out = { ...fallback };
  for (const key of MEMBER_SCOPE_KEYS) {
    const value = values[`vis_${key}`];
    if (typeof value === 'string' && (AUDIENCE_LEVELS as readonly string[]).includes(value)) {
      out[key] = value as AudienceLevel;
    }
  }
  return out;
}

/**
 * Visibilitas milik anggota sendiri (scope member).
 *
 * Satu select per key persis seperti editor kelas, dan sama-sama hanya punya
 * tiga opsi — Publik, Anggota, Ketua. Tidak ada lagi opsi "ikut aturan bawaan":
 * nilai awal sudah berupa level yang berlaku di tingkat kelas, sehingga yang
 * terlihat sama dengan yang akan tersimpan.
 *
 * Key-nya `MEMBER_SCOPE_KEYS`: hanya bagian yang menempel pada data pribadi —
 * foto, nama panggilan, bio, portofolio, dan tautan sosial. `save_my_visibility`
 * hanya menulis baris dengan `owner_id = auth.uid()`, jadi anggota tidak pernah
 * bisa mengubah milik orang lain — dan aturan kelas tetap menjadi batas terluar.
 *
 * Item (override per baris) tidak ada di sini: yang diatur lewat kolom
 * `visibility` pada form portofolio dan tautan sosial (§7.3).
 */
export function MemberVisibilityEditor({
  initial,
  map,
}: {
  initial: MemberSelectionMap;
  map: Record<VisibilityKey, VisibilityEntry>;
}) {
  const [state, action] = useActionState(saveMyVisibility, null);

  // Setelah aksi gagal, nilai yang dikirim server yang ditampilkan supaya
  // isian tidak hilang (§15.1).
  const [selection, setSelection] = useState<MemberSelectionMap>(() =>
    state && !state.ok && state.values ? pickKnownLevels(state.values, initial) : initial,
  );

  const fieldErrors = state && !state.ok ? state.error.fieldErrors : undefined;
  const inputId = (key: VisibilityKey) => `vis_${key}`;
  const errorFor = (key: VisibilityKey) => fieldErrors?.[inputId(key)]?.[0];

  return (
    <form action={action} className="flex flex-col gap-6">
      <FormStatus state={state} successMessage="Aturan visibilitas tersimpan." />

      <div className="flex flex-col">
        {MEMBER_SCOPE_KEYS.map((key) => {
          const meta = VISIBILITY_BY_KEY[key];
          const value = selection[key] ?? toAudienceLevel(map[key].own);
          const note = ceilingNote(key, value, map);

          return (
            <FormField
              key={key}
              id={inputId(key)}
              label={meta.label}
              hint={note ?? AUDIENCE_HINT[value]}
              error={errorFor(key)}
            >
              {(describedBy) => (
                <Select
                  id={inputId(key)}
                  name={inputId(key)}
                  value={value}
                  describedBy={describedBy}
                  invalid={Boolean(errorFor(key))}
                  onChange={(event) =>
                    setSelection((prev) => ({
                      ...prev,
                      [key]: event.target.value as AudienceLevel,
                    }))
                  }
                >
                  {AUDIENCE_LEVELS.map((level) => {
                    const allowed = levelAllowed(key, level);
                    return (
                      <option key={level} value={level} disabled={!allowed}>
                        {AUDIENCE_LABEL[level]}
                        {allowed ? '' : ' (tidak tersedia untuk bagian ini)'}
                      </option>
                    );
                  })}
                </Select>
              )}
            </FormField>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        <SubmitButton pendingLabel="Menyimpan…">Simpan aturan</SubmitButton>
        <p className="text-small text-text-muted">
          Memilih nilai yang lebih luas dari batas bagian tidak membuat isimu lebih terlihat; database
          tetap memangkas ke aturan yang berlaku.
        </p>
      </div>
    </form>
  );
}
