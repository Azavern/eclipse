import { requirePermission } from '@/lib/visibility/server';
import { CreateTaskForm } from '@/features/tasks/components/TaskForm';
import { PageHeader } from '@/components/ui/Section';
import { CARD_BASE, CARD_TIER_CLASSES } from '@/components/ui/Card';
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

      <div className={`${CARD_BASE} ${CARD_TIER_CLASSES.primary} max-w-form p-5`}>
        <CreateTaskForm />
      </div>
    </div>
  );
}
