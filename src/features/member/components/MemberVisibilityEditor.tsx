'use client';

import { useActionState, useState } from 'react';
import { saveMyVisibility } from '@/features/visibility/actions';
import {
  ALLOW_DEFAULT,
  AUDIENCE_LABEL,
  allowedAudiences,
  ceilingNote,
  MEMBER_SCOPE_KEYS,
  VISIBILITY_BY_KEY,
  WIDEST_AUDIENCE,
  type Audience,
  type VisibilityEntry,
  type VisibilityKey,
} from '@/lib/visibility/registry';
import { FormField } from '@/components/ui/FormField';
import { Select } from '@/components/ui/Input';
import { FormStatus } from '@/components/ui/FormStatus';
import { SubmitButton } from '@/components/ui/SubmitButton';

export type MemberSelectionMap = Partial<Record<VisibilityKey, string>>;

/** Ambil hanya key yang dikenal dari nilai yang di-echo Server Action. */
function pickKnownKeys(values: Record<string, string>, fallback: MemberSelectionMap) {
  const out = { ...fallback };
  for (const key of MEMBER_SCOPE_KEYS) {
    const value = values[`vis_${key}`];
    if (typeof value === 'string') out[key] = value;
  }
  return out;
}

/**
 * Visibilitas milik anggota sendiri (scope member).
 *
 * Satu select per key persis seperti editor kelas, tapi daftar key-nya
 * `MEMBER_SCOPE_KEYS`: hanya bagian yang menempel pada data pribadi — foto,
 * nama panggilan, bio, portofolio, dan tautan sosial. Nilai kosong berarti
 * kembali ke bawaan katalog; `save_my_visibility` hanya menulis baris dengan
 * `owner_id = auth.uid()`, jadi anggota tidak pernah bisa mengubah milik orang
 * lain.
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
    state && !state.ok && state.values ? pickKnownKeys(state.values, initial) : initial,
  );

  const fieldErrors = state && !state.ok ? state.error.fieldErrors : undefined;
  const inputId = (key: VisibilityKey) => `vis_${key}`;
  const errorFor = (key: VisibilityKey) => fieldErrors?.[inputId(key)]?.[0];

  const noteFor = (key: VisibilityKey): string | null => {
    const chosen = selection[key] ?? ALLOW_DEFAULT;
    if (chosen === ALLOW_DEFAULT) return null;
    return ceilingNote(key, chosen as Audience, map);
  };

  return (
    <form action={action} className="flex flex-col gap-6">
      <FormStatus state={state} successMessage="Aturan visibilitas tersimpan." />

      <div className="flex flex-col">
        {MEMBER_SCOPE_KEYS.map((key) => {
          const meta = VISIBILITY_BY_KEY[key];
          const value = selection[key] ?? ALLOW_DEFAULT;
          const widest = WIDEST_AUDIENCE[key];
          const note = noteFor(key);

          return (
            <FormField
              key={key}
              id={inputId(key)}
              label={meta.label}
              hint={note ?? `Bawaan katalog: ${widest} — ${AUDIENCE_LABEL[widest]}`}
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
                    setSelection((prev) => ({ ...prev, [key]: event.target.value }))
                  }
                >
                  <option value={ALLOW_DEFAULT}>Ikut aturan bawaan</option>
                  {allowedAudiences(key).map((audience) => (
                    <option key={audience} value={audience}>
                      {AUDIENCE_LABEL[audience]}
                    </option>
                  ))}
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