'use client';

import { useActionState, useState } from 'react';
import {
  createSchedule,
  deleteSchedule,
  updateSchedule,
} from '@/features/schedule/actions';
import { SCHEDULE_TYPE_LABEL, SCHEDULE_TYPES, WEEKDAYS } from '@/features/schedule/schemas';
import { FormField } from '@/components/ui/FormField';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { FormStatus } from '@/components/ui/FormStatus';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import type { FormState } from '@/lib/result';

/** Nilai awal form; jam sudah dalam bentuk yang diterima `input type="time"`. */
export type ScheduleDefaults = {
  title: string;
  description: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  semester: string;
  location: string;
  type: string;
  url: string;
};

const EMPTY: ScheduleDefaults = {
  title: '',
  description: '',
  day_of_week: '1',
  start_time: '',
  end_time: '',
  semester: '',
  location: '',
  type: 'class',
  url: '',
};

function fieldErrors(state: FormState): Record<string, string[]> | undefined {
  return state && !state.ok ? state.error.fieldErrors : undefined;
}

/**
 * Semester yang bisa dipilih: semester yang sudah ada di database digabung
 * dengan semester berjalan dan beberapa sebelumnya. Nilai yang sedang terpilih
 * selalu ikut dimasukkan supaya echo Server Action tidak pernah menghasilkan
 * select kosong.
 */
function semesterOptions(semesters: string[], value: string): string[] {
  if (!value || semesters.includes(value)) return semesters;
  return [value, ...semesters];
}

/**
 * Field yang sama dipakai form tambah dan form ubah supaya batas dan aturan
 * validasi tidak berbeda di antara keduanya.
 *
 * `defaultValue` diambil dari echo Server Action lebih dulu, lalu defaults dari
 * server, supaya isian tidak hilang saat validasi gagal (§15.1).
 */
function ScheduleFields({
  semesters,
  defaults,
  values,
  errors,
}: {
  semesters: string[];
  defaults: ScheduleDefaults;
  values?: Record<string, string>;
  errors?: Record<string, string[]>;
}) {
  const first = (name: string) => errors?.[name]?.[0];
  const value = (name: keyof ScheduleDefaults) => values?.[name] ?? defaults[name];

  return (
    <>
      <FormField id="schedule-title" label="Judul" error={first('title')} required>
        {(describedBy) => (
          <Input
            id="schedule-title"
            name="title"
            required
            maxLength={120}
            defaultValue={value('title')}
            invalid={Boolean(first('title'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField id="schedule-type" label="Jenis" error={first('type')} required>
        {(describedBy) => (
          <Select
            id="schedule-type"
            name="type"
            defaultValue={value('type')}
            describedBy={describedBy}
            invalid={Boolean(first('type'))}
          >
            {SCHEDULE_TYPES.map((type) => (
              <option key={type} value={type}>
                {SCHEDULE_TYPE_LABEL[type]}
              </option>
            ))}
          </Select>
        )}
      </FormField>

      <FormField
        id="schedule-semester"
        label="Semester"
        hint="Jadwal semester lama tetap tersimpan dan bisa dibuka lagi dari halaman Jadwal."
        error={first('semester')}
        required
      >
        {(describedBy) => (
          <Select
            id="schedule-semester"
            name="semester"
            defaultValue={value('semester')}
            describedBy={describedBy}
            invalid={Boolean(first('semester'))}
          >
            {semesterOptions(semesters, value('semester')).map((semester) => (
              <option key={semester} value={semester}>
                {semester}
              </option>
            ))}
          </Select>
        )}
      </FormField>

      <FormField id="schedule-day" label="Hari" error={first('day_of_week')} required>
        {(describedBy) => (
          <Select
            id="schedule-day"
            name="day_of_week"
            defaultValue={value('day_of_week')}
            describedBy={describedBy}
            invalid={Boolean(first('day_of_week'))}
          >
            {WEEKDAYS.map((day) => (
              <option key={day.value} value={String(day.value)}>
                {day.label}
              </option>
            ))}
          </Select>
        )}
      </FormField>

      <FormField
        id="schedule-start"
        label="Jam mulai"
        hint="Waktu di zona kelas, bukan zona perangkatmu. Contoh: 08:00."
        error={first('start_time')}
        required
      >
        {(describedBy) => (
          <Input
            id="schedule-start"
            name="start_time"
            type="time"
            step={60}
            required
            defaultValue={value('start_time')}
            invalid={Boolean(first('start_time'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField id="schedule-end" label="Jam selesai" error={first('end_time')} required>
        {(describedBy) => (
          <Input
            id="schedule-end"
            name="end_time"
            type="time"
            step={60}
            required
            defaultValue={value('end_time')}
            invalid={Boolean(first('end_time'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField id="schedule-location" label="Lokasi" error={first('location')}>
        {(describedBy) => (
          <Input
            id="schedule-location"
            name="location"
            maxLength={120}
            defaultValue={value('location')}
            invalid={Boolean(first('location'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField
        id="schedule-url"
        label="Tautan"
        hint="Opsional. Harus diawali https://."
        error={first('url')}
      >
        {(describedBy) => (
          <Input
            id="schedule-url"
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

      <FormField id="schedule-description" label="Deskripsi" error={first('description')}>
        {(describedBy) => (
          <Textarea
            id="schedule-description"
            name="description"
            rows={4}
            maxLength={1000}
            defaultValue={value('description')}
            invalid={Boolean(first('description'))}
            describedBy={describedBy}
          />
        )}
      </FormField>
    </>
  );
}

/**
 * Form tambah jadwal. Setelah sukses aksi mengarahkan ke `/schedule` untuk
 * semester yang baru dibuat.
 */
export function CreateScheduleForm({
  semesters,
  defaultSemester,
}: {
  semesters: string[];
  defaultSemester: string;
}) {
  const [state, action] = useActionState(createSchedule, null);
  const values = state && !state.ok ? state.values : undefined;

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormStatus state={state} successMessage="Jadwal tersimpan." />
      <ScheduleFields
        semesters={semesters}
        defaults={{ ...EMPTY, semester: defaultSemester }}
        values={values}
        errors={fieldErrors(state)}
      />
      <SubmitButton pendingLabel="Menyimpan…">Simpan jadwal</SubmitButton>
    </form>
  );
}

/** Form ubah jadwal + hapus. */
export function EditScheduleForm({
  id,
  semesters,
  defaults,
  title,
}: {
  id: string;
  semesters: string[];
  defaults: ScheduleDefaults;
  /** Judul baris untuk teks konfirmasi hapus. */
  title: string;
}) {
  const [state, action] = useActionState(updateSchedule, null);
  const [removeState, removeAction] = useActionState(deleteSchedule, null);
  const [confirming, setConfirming] = useState(false);

  const values = state && !state.ok ? state.values : undefined;

  return (
    <div className="flex flex-col gap-4">
      <FormStatus state={removeState} successMessage="Jadwal dihapus." />

      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="id" value={id} />
        <ScheduleFields
          semesters={semesters}
          defaults={defaults}
          values={values}
          errors={fieldErrors(state)}
        />

        <div className="flex flex-wrap gap-2">
          <SubmitButton pendingLabel="Menyimpan…">Simpan jadwal</SubmitButton>
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
        consequence="Jadwal ini akan dihapus permanen dan tidak dapat dibatalkan."
        confirmLabel="Hapus jadwal"
        pendingLabel="Menghapus…"
      />
    </div>
  );
}
