'use client';

import { useActionState, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { saveClassVisibility } from '@/features/visibility/actions';
import {
  AUDIENCE_HINT,
  AUDIENCE_LABEL,
  AUDIENCE_LEVELS,
  ceilingNote,
  CLASS_SCOPE_KEYS,
  GROUP_ORDER,
  levelAllowed,
  publicVisibility,
  VISIBILITY_BY_KEY,
  type AudienceLevel,
  type VisibilityEntry,
  type VisibilityKey,
} from '@/lib/visibility/registry';
import { FormField } from '@/components/ui/FormField';
import { Select } from '@/components/ui/Input';
import { FormStatus } from '@/components/ui/FormStatus';
import { SubmitButton } from '@/components/ui/SubmitButton';

export type SelectionMap = Record<VisibilityKey, AudienceLevel>;

/** Ambil hanya level yang dikenal dari nilai yang di-echo Server Action. */
function pickKnownLevels(values: Record<string, string>, fallback: SelectionMap): SelectionMap {
  const out = { ...fallback };
  for (const key of CLASS_SCOPE_KEYS) {
    const value = values[`vis_${key}`];
    if (typeof value === 'string' && (AUDIENCE_LEVELS as readonly string[]).includes(value)) {
      out[key] = value as AudienceLevel;
    }
  }
  return out;
}

/**
 * Editor visibilitas kelas.
 *
 * Satu select per key, dan **setiap** select hanya punya tiga opsi — Publik,
 * Anggota, Ketua — masing-masing menyebut level aksesnya. Tidak ada lagi opsi
 * "bawaan katalog": nilai awal sudah berupa level yang benar-benar berlaku
 * (`own` dari `get_visibility_map`), jadi apa yang terlihat itulah yang
 * tersimpan.
 *
 * Level yang lebih luas dari plafon katalog ditampilkan sebagai opsi
 * nonaktif, bukan dihilangkan, supaya daftar tetap tiga opsi di semua baris
 * (mis. Publik pada Tugas, yang memang tidak pernah boleh publik).
 *
 * Setiap baris menampilkan **dua** penjelasan:
 *  - akibat pilihan bagi pengunjung tanpa login (`publicVisibility`), dan
 *  - plafon halaman induk (`ceilingNote`) bila pilihan lebih longgar.
 *
 * Yang kedua adalah jawaban langsung atas pertanyaan yang paling sering muncul
 * di pengaturan: "kenapa beranda saya masih kosong buat pengunjung?".
 */
export function VisibilityEditor({
  initial,
  map,
}: {
  initial: SelectionMap;
  map: Record<VisibilityKey, VisibilityEntry>;
}) {
  const [state, action] = useActionState(saveClassVisibility, null);

  // Setelah aksi gagal, nilai yang dikirim server yang ditampilkan supaya
  // isian tidak hilang (§15.1).
  const [selection, setSelection] = useState<SelectionMap>(() =>
    state && !state.ok && state.values ? pickKnownLevels(state.values, initial) : initial,
  );

  const fieldErrors = state && !state.ok ? state.error.fieldErrors : undefined;

  // Dihitung ulang setiap kali pilihan berubah, jadi tidak perlu disimpan dulu
  // untuk tahu apa yang akan dilihat pengunjung tanpa login.
  const publicView = publicVisibility(map, selection);

  const groups = GROUP_ORDER.map((group) => ({
    group,
    keys: CLASS_SCOPE_KEYS.filter((key) => VISIBILITY_BY_KEY[key].group === group),
  })).filter((g) => g.keys.length > 0);

  const inputId = (key: VisibilityKey) => `vis_${key}`;
  const errorFor = (key: VisibilityKey) => fieldErrors?.[inputId(key)]?.[0];

  // Ringkasan di atas form: berapa bagian yang benar-benar terlihat oleh
  // pengunjung tanpa login, bukan hanya berapa select yang berisi "publik".
  const publicKeys = CLASS_SCOPE_KEYS.filter((key) => publicView[key]);
  const publicPages = CLASS_SCOPE_KEYS.filter(
    (key) => publicView[key] && VISIBILITY_BY_KEY[key].kind === 'page',
  ).map((key) => VISIBILITY_BY_KEY[key].label);

  return (
    <form action={action} className="flex flex-col gap-8">
      <FormStatus state={state} successMessage="Aturan visibilitas kelas tersimpan." />

      <div className="rounded-md border border-border-subtle px-4 py-3">
        <p className="text-body font-semibold text-text">Tampilan pengunjung tanpa login</p>
        <p className="text-small text-text-muted">
          {publicKeys.length === 0
            ? 'Belum ada apa pun yang terlihat pengunjung. Mereka hanya melihat nama kelas.'
            : `${publicKeys.length} bagian terbuka untuk umum. Halaman yang bisa dibuka: ${
                publicPages.length > 0 ? publicPages.join(', ') : 'belum ada'
              }.`}
        </p>
        <p className="text-small text-text-muted">
          Mengubah select di bawah memperbarui hitungan ini secara langsung, sebelum disimpan.
        </p>
      </div>

      {groups.map(({ group, keys }) => (
        <section key={group} className="flex flex-col gap-4">
          <h2 className="text-h2 font-semibold text-text">{group}</h2>

          <div className="flex flex-col">
            {keys.map((key) => {
              const meta = VISIBILITY_BY_KEY[key];
              const chosen = selection[key];
              const note = ceilingNote(key, chosen, map);
              const isPublic = publicView[key];

              return (
                <FormField
                  key={key}
                  id={inputId(key)}
                  label={meta.label}
                  hint={note ?? AUDIENCE_HINT[chosen]}
                  error={errorFor(key)}
                >
                  {(describedBy) => (
                    <>
                      <Select
                        id={inputId(key)}
                        name={inputId(key)}
                        value={chosen}
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

                      {/* Ikon + teks, bukan hanya warna (§17.7). */}
                      <p className="mt-1 flex items-center gap-1 text-caption text-text-muted">
                        {isPublic ? (
                          <Eye aria-hidden="true" className="size-3.5" />
                        ) : (
                          <EyeOff aria-hidden="true" className="size-3.5" />
                        )}
                        {isPublic
                          ? 'Tampak untuk pengunjung tanpa login'
                          : 'Tersembunyi dari pengunjung tanpa login'}
                      </p>
                    </>
                  )}
                </FormField>
              );
            })}
          </div>
        </section>
      ))}

      <div className="flex flex-col gap-3">
        <SubmitButton pendingLabel="Menyimpan…">Simpan aturan</SubmitButton>
        <p className="text-small text-text-muted">
          Aturan yang lebih longgar dari plafon halaman induk tetap dipangkas oleh database. Bagian
          yang tidak terlihat tidak pernah dirender sebagai label kosong.
        </p>
      </div>
    </form>
  );
}
