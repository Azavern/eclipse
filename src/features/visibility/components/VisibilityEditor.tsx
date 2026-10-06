'use client';

import { useActionState, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { saveClassVisibility } from '@/features/visibility/actions';
import {
  ALLOW_DEFAULT,
  AUDIENCE_HINT,
  AUDIENCE_LABEL,
  allowedAudiences,
  ceilingNote,
  CLASS_SCOPE_KEYS,
  GROUP_ORDER,
  publicVisibility,
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

export type SelectionMap = Record<VisibilityKey, string>;

/** Ambil hanya key yang dikenal dari nilai yang di-echo Server Action. */
function pickKnownKeys(values: Record<string, string>, fallback: SelectionMap): SelectionMap {
  const out = { ...fallback };
  for (const key of CLASS_SCOPE_KEYS) {
    const value = values[`vis_${key}`];
    if (typeof value === 'string') out[key] = value;
  }
  return out;
}

/**
 * Editor visibilitas kelas.
 *
 * Satu select per key. Nilai kosong = pakai bawaan katalog; daftar opsi sudah
 * dibatasi `allowedAudiences(key)` sehingga Ketua tidak pernah diberi audience
 * yang lebih luas dari yang schema izinkan.
 *
 * Setiap pilihan menampilkan **dua** penjelasan:
 *  - plafon halaman induk (`ceilingNote`), dan
 *  - akibatnya bagi pengunjung tanpa login (`publicVisibility`).
 *
 * Yang kedua adalah jawaban langsung atas pertanyaan yang paling sering muncul
 * di pengaturan: "kenapa beranda saya masih kosong buat pengunjung?". Kenapa
 * diperlukan: `section.home.*` mewarisi aturan page-nya sendiri, jadi membuka
 * satu section saja tidak cukup untuk membuat apa pun tampak — page sumbernya
 * juga harus terbuka. Tanpa pratinjau, itu harus ditebak.
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
    state && !state.ok && state.values ? pickKnownKeys(state.values, initial) : initial,
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

  const noteFor = (key: VisibilityKey): string | null => {
    const chosen = selection[key];
    if (chosen === '') return null;
    return ceilingNote(key, chosen as Audience, map);
  };

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
              const options = allowedAudiences(key);
              const note = noteFor(key);
              const isPublic = publicView[key];

              return (
                <FormField
                  key={key}
                  id={inputId(key)}
                  label={meta.label}
                  hint={
                    note ??
                    (options.length === 0
                      ? 'Bagian ini tidak punya pilihan lain.'
                      : AUDIENCE_HINT[options[0] as Audience])
                  }
                  error={errorFor(key)}
                >
                  {(describedBy) => (
                    <>
                      <Select
                        id={inputId(key)}
                        name={inputId(key)}
                        value={selection[key]}
                        describedBy={describedBy}
                        invalid={Boolean(errorFor(key))}
                        onChange={(event) =>
                          setSelection((prev) => ({ ...prev, [key]: event.target.value }))
                        }
                      >
                        <option value={ALLOW_DEFAULT}>
                          Bawaan katalog ({WIDEST_AUDIENCE[key]} —{' '}
                          {AUDIENCE_LABEL[WIDEST_AUDIENCE[key]]})
                        </option>
                        {options.map((audience) => (
                          <option key={audience} value={audience}>
                            {AUDIENCE_LABEL[audience]}
                          </option>
                        ))}
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