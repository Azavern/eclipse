'use client';

import { useActionState, useState } from 'react';
import { createTask, deleteTask, setTaskStatus, updateTask } from '@/features/tasks/actions';
import { DEFAULT_TASK_TARGET } from '@/features/tasks/schemas';
import { FormField } from '@/components/ui/FormField';
import { Input, Textarea } from '@/components/ui/Input';
import { FormStatus } from '@/components/ui/FormStatus';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button, type ButtonVariant } from '@/components/ui/Button';
import type { FormState } from '@/lib/result';

/** Nilai awal form; deadline sudah dikonversi ke waktu dinding zona kelas. */
export type TaskDefaults = {
  title: string;
  description: string;
  deadline: string;
  target: string;
  url: string;
};

const EMPTY: TaskDefaults = {
  title: '',
  description: '',
  deadline: '',
  target: DEFAULT_TASK_TARGET,
  url: '',
};

function fieldErrors(state: FormState): Record<string, string[]> | undefined {
  return state && !state.ok ? state.error.fieldErrors : undefined;
}

function TaskFields({
  defaults,
  values,
  errors,
}: {
  defaults: TaskDefaults;
  values?: Record<string, string>;
  errors?: Record<string, string[]>;
}) {
  const first = (name: string) => errors?.[name]?.[0];
  const value = (name: keyof TaskDefaults) => values?.[name] ?? defaults[name];

  return (
    <>
      <FormField id="task-title" label="Judul" error={first('title')} required>
        {(describedBy) => (
          <Input
            id="task-title"
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
        id="task-deadline"
        label="Tenggat"
        hint="Waktu di zona kelas, bukan zona perangkatmu."
        error={first('deadline')}
        required
      >
        {(describedBy) => (
          <Input
            id="task-deadline"
            name="deadline"
            type="datetime-local"
            required
            defaultValue={value('deadline')}
            invalid={Boolean(first('deadline'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField
        id="task-target"
        label="Sasaran"
        hint={`Untuk siapa tugas ini. Default "${DEFAULT_TASK_TARGET}".`}
        error={first('target')}
      >
        {(describedBy) => (
          <Input
            id="task-target"
            name="target"
            maxLength={80}
            defaultValue={value('target')}
            invalid={Boolean(first('target'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField
        id="task-url"
        label="Tautan"
        hint="Opsional. Harus diawali https://."
        error={first('url')}
      >
        {(describedBy) => (
          <Input
            id="task-url"
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

      <FormField id="task-description" label="Deskripsi" error={first('description')}>
        {(describedBy) => (
          <Textarea
            id="task-description"
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

/** Form buat tugas. Setelah sukses aksi mengarahkan ke halaman detail tugas. */
export function CreateTaskForm() {
  const [state, action] = useActionState(createTask, null);
  const values = state && !state.ok ? state.values : undefined;

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormStatus state={state} />
      <TaskFields defaults={EMPTY} values={values} errors={fieldErrors(state)} />
      <SubmitButton pendingLabel="Menyimpan…">Simpan tugas</SubmitButton>
    </form>
  );
}

/** Form ubah tugas + hapus. */
export function EditTaskForm({
  id,
  title,
  defaults,
}: {
  id: string;
  /** Judul baris untuk teks konfirmasi hapus. */
  title: string;
  defaults: TaskDefaults;
}) {
  const [state, action] = useActionState(updateTask, null);
  const [removeState, removeAction] = useActionState(deleteTask, null);
  const [confirming, setConfirming] = useState(false);

  const values = state && !state.ok ? state.values : undefined;

  return (
    <div className="flex flex-col gap-4">
      <FormStatus state={removeState} />

      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="id" value={id} />
        <TaskFields defaults={defaults} values={values} errors={fieldErrors(state)} />

        <div className="flex flex-wrap gap-2">
          <SubmitButton pendingLabel="Menyimpan…">Simpan tugas</SubmitButton>
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
        consequence="Tugas ini akan dihapus permanen dan tidak dapat dibatalkan."
        confirmLabel="Hapus tugas"
        pendingLabel="Menghapus…"
      />
    </div>
  );
}

/**
 * Tombol ubah status tugas. Satu form kecil per status supaya tidak ada state
 * klien yang perlu disinkronkan dan tombol selalu mengikuti status terbaru
 * dari server setelah `revalidatePath`.
 */
export function TaskStatusForm({
  id,
  next,
  label,
  variant = 'secondary',
}: {
  id: string;
  next: 'active' | 'completed' | 'archived';
  label: string;
  variant?: ButtonVariant;
}) {
  const [state, action] = useActionState(setTaskStatus, null);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={next} />
      <SubmitButton variant={variant} pendingLabel="Menyimpan…">
        {label}
      </SubmitButton>
      <FormStatus state={state} />
    </form>
  );
}
