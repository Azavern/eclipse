import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/visibility/server';
import { getClassIdentity } from '@/features/class/queries';
import { getTaskById } from '@/features/tasks/queries';
import { EditTaskForm } from '@/features/tasks/components/TaskForm';
import { DEFAULT_TIMEZONE, utcIsoToLocalInput } from '@/lib/time';
import { PageHeader } from '@/components/ui/Section';
import { NoAccess } from '@/components/ui/States';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ubah tugas — gate `tasks.manage`; tenggat dikembalikan ke waktu dinding kelas. */
export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const gate = await requirePermission('tasks.manage');
  if (!gate) {
    return (
      <NoAccess
        message="Hanya pengelola kelas yang bisa mengubah tugas."
        backHref="/tasks"
        backLabel="Kembali ke tugas"
      />
    );
  }

  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const [task, identity] = await Promise.all([getTaskById(id), getClassIdentity()]);
  if (!task) notFound();

  const timezone = identity?.timezone ?? DEFAULT_TIMEZONE;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Ubah tugas" description="Kosongkan sebuah isian untuk menghapus nilainya." />

      <div className="max-w-form">
        <EditTaskForm
          id={task.id}
          title={task.title}
          defaults={{
            title: task.title,
            description: task.description ?? '',
            deadline: utcIsoToLocalInput(task.deadline, timezone),
            target: task.target,
            url: task.url ?? '',
          }}
        />
      </div>
    </div>
  );
}
