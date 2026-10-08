'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { createSchedule, deleteSchedule, updateSchedule } from '@/features/schedule/actions';
import {
  MAX_SCHEDULE_ROWS,
  SCHEDULE_TYPE_LABEL,
  SCHEDULE_TYPES,
  WEEKDAYS,
  scheduleRowField,
} from '@/features/schedule/schemas';
import { FormField } from '@/components/ui/FormField';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { FormStatus } from '@/components/ui/FormStatus';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button, IconButton } from '@/components/ui/Button';
import { VisuallyHidden } from '@/components/ui/VisuallyHidden';
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
 * Field semester. Form tambah memakainya sekali untuk semua baris; form ubah
 * memakainya di dalam barisnya. Satu komponen supaya batas, hint, dan
 * susunannya tidak berbeda di antara keduanya.
 */
function SemesterField({
  semesters,
  value,
  error,
  name = 'semester',
  id = 'schedule-semester',
  hint = 'Jadwal semester lama tetap tersimpan dan bisa dibuka lagi dari halaman Jadwal.',
}: {
  semesters: string[];
  value: string;
  error?: string;
  name?: string;
  id?: string;
  hint?: string;
}) {
  return (
    <FormField id={id} label="Semester" hint={hint} error={error} required>
      {(describedBy) => (
        <Select
          id={id}
          name={name}
          defaultValue={value}
          describedBy={describedBy}
          invalid={Boolean(error)}
        >
          {semesterOptions(semesters, value).map((semester) => (
            <option key={semester} value={semester}>
              {semester}
            </option>
          ))}
        </Select>
      )}
    </FormField>
  );
}

/**
 * Field satu baris jadwal. Dipakai form tambah (banyak baris) dan form ubah
 * supaya batas dan aturan validasi tidak berbeda di antara keduanya.
 *
 * `defaultValue` diambil dari echo Server Action lebih dulu, lalu defaults dari
 * server, supaya isian tidak hilang saat validasi gagal (§15.1).
 *
 * Pada form multi-jadwal, `index` memberi akhiran nama field (`title-0`) —
 * Server Action memakai akhiran yang sama untuk membedakan baris.
 */
function ScheduleFields({
  semesters,
  defaults,
  values,
  errors,
  index,
  withSemester = true,
}: {
  semesters: string[];
  defaults: ScheduleDefaults;
  values?: Record<string, string>;
  errors?: Record<string, string[]>;
  /** Nomor baris form multi-jadwal; mengisi ini memberi akhiran `-<index>`. */
  index?: number;
  /** Form tambah memilih semester sekali untuk semua baris, di luar baris. */
  withSemester?: boolean;
}) {
  const suffix = index === undefined ? '' : `-${index}`;
  const fieldId = (field: string) => `schedule-${field}${suffix}`;
  const fieldName = (field: string) =>
    index === undefined ? field : scheduleRowField(field, index);
  const first = (field: string) => errors?.[fieldName(field)]?.[0];
  const value = (field: keyof ScheduleDefaults) => values?.[fieldName(field)] ?? defaults[field];

  return (
    <>
      <FormField id={fieldId('title')} label="Judul" error={first('title')} required>
        {(describedBy) => (
          <Input
            id={fieldId('title')}
            name={fieldName('title')}
            required
            maxLength={120}
            defaultValue={value('title')}
            invalid={Boolean(first('title'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField id={fieldId('type')} label="Jenis" error={first('type')} required>
        {(describedBy) => (
          <Select
            id={fieldId('type')}
            name={fieldName('type')}
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

      {withSemester ? (
        <SemesterField
          semesters={semesters}
          value={value('semester')}
          error={first('semester')}
          name={fieldName('semester')}
          id={fieldId('semester')}
        />
      ) : null}

      <FormField id={fieldId('day')} label="Hari" error={first('day_of_week')} required>
        {(describedBy) => (
          <Select
            id={fieldId('day')}
            name={fieldName('day_of_week')}
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
        id={fieldId('start')}
        label="Jam mulai"
        hint="Waktu di zona kelas, bukan zona perangkatmu. Contoh: 08:00."
        error={first('start_time')}
        required
      >
        {(describedBy) => (
          <Input
            id={fieldId('start')}
            name={fieldName('start_time')}
            type="time"
            step={60}
            required
            defaultValue={value('start_time')}
            invalid={Boolean(first('start_time'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField id={fieldId('end')} label="Jam selesai" error={first('end_time')} required>
        {(describedBy) => (
          <Input
            id={fieldId('end')}
            name={fieldName('end_time')}
            type="time"
            step={60}
            required
            defaultValue={value('end_time')}
            invalid={Boolean(first('end_time'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField id={fieldId('location')} label="Lokasi" error={first('location')}>
        {(describedBy) => (
          <Input
            id={fieldId('location')}
            name={fieldName('location')}
            maxLength={120}
            defaultValue={value('location')}
            invalid={Boolean(first('location'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField
        id={fieldId('url')}
        label="Tautan"
        hint="Opsional. Harus diawali https://."
        error={first('url')}
      >
        {(describedBy) => (
          <Input
            id={fieldId('url')}
            name={fieldName('url')}
            type="url"
            inputMode="url"
            maxLength={2048}
            defaultValue={value('url')}
            invalid={Boolean(first('url'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField id={fieldId('description')} label="Deskripsi" error={first('description')}>
        {(describedBy) => (
          <Textarea
            id={fieldId('description')}
            name={fieldName('description')}
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
 * Form tambah jadwal multi-baris: semester dipilih sekali untuk semua baris,
 * dan tombol "Tambah jadwal" menambah baris sehingga beberapa mata kuliah bisa
 * dibuat dalam sekali simpan.
 *
 * Baris disimpan dengan kunci unik supaya menambah/menghapus baris tidak
 * memindahkan isi input yang sudah diketik. Setelah sukses aksi mengarahkan ke
 * `/schedule` untuk semester yang baru dibuat.
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
  const errors = fieldErrors(state);

  const [rowKeys, setRowKeys] = useState<number[]>([0]);
  const nextKey = useRef(1);
  // Nomor baris yang harus menerima fokus setelah render; dipakai saat menambah
  // dan menghapus baris supaya fokus keyboard tidak hilang (§17.7).
  const focusIndex = useRef<number | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (focusIndex.current === null) return;
    document.getElementById(`schedule-title-${focusIndex.current}`)?.focus();
    focusIndex.current = null;
  }, [rowKeys]);

  const atLimit = rowKeys.length >= MAX_SCHEDULE_ROWS;

  const addRow = () => {
    if (atLimit) return;
    const key = nextKey.current;
    nextKey.current += 1;
    focusIndex.current = rowKeys.length;
    setRowKeys((keys) => [...keys, key]);
    setAnnouncement(`Baris jadwal ke-${rowKeys.length + 1} ditambahkan.`);
  };

  const removeRow = (key: number, index: number) => {
    if (rowKeys.length <= 1) return;
    // Fokus pindah ke baris yang menggantikan posisinya, atau baris sebelumnya
    // bila yang dihapus baris terakhir.
    focusIndex.current = Math.min(index, rowKeys.length - 2);
    setRowKeys((keys) => keys.filter((item) => item !== key));
    setAnnouncement(`Baris jadwal ke-${index + 1} dihapus.`);
  };

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormStatus state={state} successMessage="Jadwal tersimpan." />

      <SemesterField
        semesters={semesters}
        value={values?.semester ?? defaultSemester}
        error={errors?.semester?.[0]}
        hint="Berlaku untuk semua jadwal di bawah. Semester lama tetap tersimpan dan bisa dibuka lagi dari halaman Jadwal."
      />

      <div className="flex flex-col gap-4">
        {rowKeys.map((key, index) => {
          const labelId = `schedule-row-${index}-label`;
          return (
            <div
              key={key}
              role="group"
              aria-labelledby={labelId}
              className="flex flex-col gap-4 rounded-md border border-border-subtle p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p id={labelId} className="text-label font-semibold text-text">
                  Jadwal {index + 1}
                </p>
                {rowKeys.length > 1 ? (
                  <IconButton
                    type="button"
                    variant="danger"
                    label={`Hapus baris jadwal ke-${index + 1}`}
                    onClick={() => removeRow(key, index)}
                  >
                    <X aria-hidden="true" className="size-5" />
                  </IconButton>
                ) : null}
              </div>

              <ScheduleFields
                index={index}
                withSemester={false}
                semesters={semesters}
                defaults={EMPTY}
                values={values}
                errors={errors}
              />
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button type="button" variant="secondary" onClick={addRow} disabled={atLimit}>
          <Plus aria-hidden="true" className="size-4" />
          Tambah jadwal
        </Button>
        <p className="text-caption text-text-muted">
          {atLimit
            ? `Maksimal ${MAX_SCHEDULE_ROWS} jadwal sekali simpan.`
            : `Bisa sampai ${MAX_SCHEDULE_ROWS} jadwal sekali simpan.`}
        </p>
      </div>

      <SubmitButton pendingLabel="Menyimpan…">
        {rowKeys.length > 1 ? `Simpan ${rowKeys.length} jadwal` : 'Simpan jadwal'}
      </SubmitButton>

      {/* Pembaruan baris diumumkan ke pembaca layar tanpa terlihat di layar. */}
      <VisuallyHidden>
        <span aria-live="polite">{announcement}</span>
      </VisuallyHidden>
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
