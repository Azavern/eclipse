import { requirePermission } from '@/lib/visibility/server';
import { CreateTaskForm } from '@/features/tasks/components/TaskForm';
import { PageHeader } from '@/components/ui/Section';
import { NoAccess } from '@/components/ui/States';

export const dynamic = 'force-dynamic';

/** Buat tugas — gate `tasks.manage` (§10). */
export default async function NewTaskPage() {
  const gate = await requirePermission('tasks.manage');
  if (!gate) {
    return (
      <NoAccess
        message="Hanya pengelola kelas yang bisa membuat tugas."
        backHref="/tasks"
        backLabel="Kembali ke tugas"
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Buat tugas"
        description="Satu isian untuk satu tugas. Kamu bisa membuat tugas sebanyak-banyaknya; setiap tugas berdiri sendiri."
      />

      <div className="max-w-form">
        <CreateTaskForm />
      </div>
    </div>
  );
}
