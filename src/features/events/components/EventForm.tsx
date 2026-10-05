'use client';

import { useActionState, useState } from 'react';
import { createEvent, deleteEvent, updateEvent } from '@/features/events/actions';
import { MAX_IMAGE_BYTES, UPLOAD_ERROR_MESSAGE } from '@/lib/storage/magic-bytes';
import { FormField } from '@/components/ui/FormField';
import { Input, Textarea } from '@/components/ui/Input';
import { FormStatus } from '@/components/ui/FormStatus';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import type { FormState } from '@/lib/result';

const ACCEPT = 'image/jpeg,image/png,image/webp';

/** Nilai awal form; waktu sudah dikonversi ke waktu dinding zona kelas. */
export type EventDefaults = {
  title: string;
  description: string;
  start_at: string;
  end_at: string;
  location: string;
  organizer: string;
  url: string;
};

const EMPTY: EventDefaults = {
  title: '',
  description: '',
  start_at: '',
  end_at: '',
  location: '',
  organizer: '',
  url: '',
};

function fieldErrors(state: FormState): Record<string, string[]> | undefined {
  return state && !state.ok ? state.error.fieldErrors : undefined;
}

function EventFields({
  defaults,
  values,
  errors,
}: {
  defaults: EventDefaults;
  values?: Record<string, string>;
  errors?: Record<string, string[]>;
}) {
  const first = (name: string) => errors?.[name]?.[0];
  const value = (name: keyof EventDefaults) => values?.[name] ?? defaults[name];

  return (
    <>
      <FormField id="event-title" label="Judul" error={first('title')} required>
        {(describedBy) => (
          <Input
            id="event-title"
            name="title"
            required
            maxLength={120}
            defaultValue={value('title')}
            invalid={Boolean(first('title'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField
        id="event-start"
        label="Mulai"
        hint="Waktu di zona kelas, bukan zona perangkatmu."
        error={first('start_at')}
        required
      >
        {(describedBy) => (
          <Input
            id="event-start"
            name="start_at"
            type="datetime-local"
            required
            defaultValue={value('start_at')}
            invalid={Boolean(first('start_at'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField id="event-end" label="Selesai" error={first('end_at')} required>
        {(describedBy) => (
          <Input
            id="event-end"
            name="end_at"
            type="datetime-local"
            required
            defaultValue={value('end_at')}
            invalid={Boolean(first('end_at'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField id="event-location" label="Lokasi" error={first('location')}>
        {(describedBy) => (
          <Input
            id="event-location"
            name="location"
            maxLength={120}
            defaultValue={value('location')}
            invalid={Boolean(first('location'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField id="event-organizer" label="Penyelenggara" error={first('organizer')}>
        {(describedBy) => (
          <Input
            id="event-organizer"
            name="organizer"
            maxLength={80}
            defaultValue={value('organizer')}
            invalid={Boolean(first('organizer'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField
        id="event-url"
        label="Tautan"
        hint="Opsional. Harus diawali https://."
        error={first('url')}
      >
        {(describedBy) => (
          <Input
            id="event-url"
            name="url"
            type="url"
            inputMode="url"
            maxLength={2048}
            defaultValue={value('url')}
            invalid={Boolean(first('url'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField id="event-description" label="Deskripsi" error={first('description')}>
        {(describedBy) => (
          <Textarea
            id="event-description"
            name="description"
            rows={5}
            maxLength={2000}
            defaultValue={value('description')}
            invalid={Boolean(first('description'))}
            describedBy={describedBy}
          />
        )}
      </FormField>
    </>
  );
}

function CoverField({
  existing = false,
  error,
}: {
  /** Di form ubah: jelaskan bahwa mengosongkan berarti mempertahankan cover. */
  existing?: boolean;
  error?: string;
}) {
  return (
    <FormField
      id="event-cover"
      label={existing ? 'Ganti cover' : 'Cover'}
      hint={`Opsional. ${UPLOAD_ERROR_MESSAGE} Batas ${Math.round(
        MAX_IMAGE_BYTES / 1024 / 1024,
      )} MB.${existing ? ' Kosongkan untuk mempertahankan cover sekarang.' : ''}`}
      error={error}
    >
      {(describedBy) => (
        <Input
          id="event-cover"
          name="cover"
          type="file"
          accept={ACCEPT}
          invalid={Boolean(error)}
          describedBy={describedBy}
        />
      )}
    </FormField>
  );
}

/** Form buat event. Setelah sukses aksi mengarahkan ke halaman detail event. */
export function CreateEventForm() {
  const [state, action] = useActionState(createEvent, null);
  const values = state && !state.ok ? state.values : undefined;
  const errors = fieldErrors(state);

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormStatus state={state} successMessage="Event tersimpan." />
      <EventFields defaults={EMPTY} values={values} errors={errors} />
      <CoverField error={errors?.cover?.[0]} />
      <SubmitButton pendingLabel="Menyimpan…">Simpan event</SubmitButton>
    </form>
  );
}

/** Form ubah event + hapus. */
export function EditEventForm({
  id,
  title,
  defaults,
  hasCover,
}: {
  id: string;
  /** Judul baris untuk teks konfirmasi hapus. */
  title: string;
  defaults: EventDefaults;
  hasCover: boolean;
}) {
  const [state, action] = useActionState(updateEvent, null);
  const [removeState, removeAction] = useActionState(deleteEvent, null);
  const [confirming, setConfirming] = useState(false);

  const values = state && !state.ok ? state.values : undefined;
  const errors = fieldErrors(state);

  return (
    <div className="flex flex-col gap-4">
      <FormStatus state={removeState} successMessage="Event dihapus." />

      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="id" value={id} />
        <EventFields defaults={defaults} values={values} errors={errors} />
        <CoverField existing={hasCover} error={errors?.cover?.[0]} />

        <div className="flex flex-wrap gap-2">
          <SubmitButton pendingLabel="Menyimpan…">Simpan event</SubmitButton>
          <Button type="button" variant="danger" onClick={() => setConfirming(true)}>
            Hapus
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={async () => {
          setConfirming(false);
          const fd = new FormData();
          fd.set('id', id);
          await removeAction(fd);
        }}
        title={`Hapus ${title}?`}
        consequence="Event ini beserta covernya akan dihapus permanen dan tidak dapat dibatalkan."
        confirmLabel="Hapus event"
        pendingLabel="Menghapus…"
      />
    </div>
  );
}
