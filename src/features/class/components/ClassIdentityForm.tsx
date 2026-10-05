'use client';

import { useActionState } from 'react';
import { updateClassIdentity } from '@/features/class/actions';
import { CLASS_TIMEZONES, CLASS_TIMEZONE_LABELS } from '@/features/class/schemas';
import { FormField } from '@/components/ui/FormField';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { FormStatus } from '@/components/ui/FormStatus';
import { SubmitButton } from '@/components/ui/SubmitButton';

export type ClassIdentityDefaults = {
  name: string;
  code: string | null;
  tagline: string | null;
  description: string | null;
  highlight_text: string | null;
  highlight_url: string | null;
  timezone: string;
};

/**
 * Formulir identitas kelas.
 *
 * Nilai awal berasal dari server. Setelah aksi gagal, `values` dari Server
 * Action yang menang supaya isian tidak hilang (§15.1).
 * Validasi klien hanya untuk UX; server dan CHECK DB tetap berwenang (§14.1).
 */
export function ClassIdentityForm({ defaults }: { defaults: ClassIdentityDefaults }) {
  const [state, action] = useActionState(updateClassIdentity, null);

  const values = state && !state.ok ? state.values : undefined;
  const fieldErrors = state && !state.ok ? state.error.fieldErrors : undefined;
  const first = (name: string) => fieldErrors?.[name]?.[0];

  const text = (name: string, fallback: string | null) => values?.[name] ?? fallback ?? '';

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormStatus state={state} successMessage="Identitas kelas tersimpan." />

      <FormField id="name" label="Nama kelas" error={first('name')} required>
        {(describedBy) => (
          <Input
            id="name"
            name="name"
            required
            maxLength={60}
            defaultValue={text('name', defaults.name)}
            invalid={Boolean(first('name'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField
        id="code"
        label="Kode kelas"
        hint="2-20 karakter: huruf, angka, dan tanda hubung. Boleh dikosongkan."
        error={first('code')}
      >
        {(describedBy) => (
          <Input
            id="code"
            name="code"
            maxLength={20}
            defaultValue={text('code', defaults.code)}
            invalid={Boolean(first('code'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField id="tagline" label="Tagline" error={first('tagline')}>
        {(describedBy) => (
          <Input
            id="tagline"
            name="tagline"
            maxLength={120}
            defaultValue={text('tagline', defaults.tagline)}
            invalid={Boolean(first('tagline'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField id="description" label="Deskripsi" error={first('description')}>
        {(describedBy) => (
          <Textarea
            id="description"
            name="description"
            rows={5}
            maxLength={800}
            defaultValue={text('description', defaults.description)}
            invalid={Boolean(first('description'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField id="highlight_text" label="Teks sorotan" error={first('highlight_text')}>
        {(describedBy) => (
          <Input
            id="highlight_text"
            name="highlight_text"
            maxLength={160}
            defaultValue={text('highlight_text', defaults.highlight_text)}
            invalid={Boolean(first('highlight_text'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField
        id="highlight_url"
        label="Tautan sorotan"
        hint="Harus diawali https://. Boleh dikosongkan."
        error={first('highlight_url')}
      >
        {(describedBy) => (
          <Input
            id="highlight_url"
            name="highlight_url"
            type="url"
            inputMode="url"
            maxLength={2048}
            defaultValue={text('highlight_url', defaults.highlight_url)}
            invalid={Boolean(first('highlight_url'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField
        id="timezone"
        label="Zona waktu kelas"
        hint="Semua jadwal, event, dan tugas ditampilkan pada zona ini, bukan zona perangkat pembaca."
        error={first('timezone')}
        required
      >
        {(describedBy) => (
          <Select
            id="timezone"
            name="timezone"
            required
            defaultValue={values?.timezone ?? defaults.timezone}
            invalid={Boolean(first('timezone'))}
            describedBy={describedBy}
          >
            {CLASS_TIMEZONES.map((zone) => (
              <option key={zone} value={zone}>
                {CLASS_TIMEZONE_LABELS[zone]}
              </option>
            ))}
          </Select>
        )}
      </FormField>

      <SubmitButton pendingLabel="Menyimpan…">Simpan perubahan</SubmitButton>
    </form>
  );
}
