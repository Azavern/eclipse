import { notFound } from 'next/navigation';
import { getViewer, requireView } from '@/lib/visibility/server';
import { getClassIdentity } from '@/features/class/queries';
import { getTaskById, getTaskCreatorName } from '@/features/tasks/queries';
import { TASK_DISPLAY_META } from '@/features/tasks/display';
import { taskDisplayStatus } from '@/lib/time/domain';
import { formatDateTime } from '@/lib/time';
import { TaskStatusForm } from '@/features/tasks/components/TaskForm';
import { Badge } from '@/components/ui/Badge';
import { PageHeader, Section } from '@/components/ui/Section';
import { NoAccess } from '@/components/ui/States';
import { ButtonLink } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Label mata kuliah untuk baris lama yang belum punya nilai (kolom nullable). */
function courseLabel(course: string | null): string {
  return course && course.length > 0 ? course : 'Tanpa mata kuliah';
}

/**
 * Detail tugas — gate `page.tasks`.
 *
 * Nama pembuat hanya dirender bila baris profilnya terlihat viewer ini; kalau
 * tidak, bagiannya hilang sama sekali, bukan menampilkan placeholder (§19,
 * AC-TASKS-8).
 */
export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const gate = await requireView('page.tasks', '/tasks');
  if (!gate) {
    return (
      <NoAccess
        message="Halaman tugas belum dibuka untuk akunmu. Ketua kelas bisa mengubahnya."
        backHref="/"
      />
    );
  }

  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const [task, identity, viewer] = await Promise.all([
    getTaskById(id),
    getClassIdentity(),
    getViewer(),
  ]);
  if (!task) notFound();

  const creatorName = task.created_by ? await getTaskCreatorName(task.created_by) : null;
  const timezone = identity?.timezone ?? 'Asia/Jakarta';
  const canManage = viewer.can('tasks.manage');
  const display = taskDisplayStatus(
    { status: task.status, deadline: new Date(task.deadline) },
    new Date(),
  );
  const meta = TASK_DISPLAY_META[display];

  return (
    <div className="card-grid">
      {/*
        "Buat tugas lagi" duduk di sebelah "Ubah tugas" dengan sengaja. Tanpa
        itu, menambah tugas kedua selalu dimulai dari form ubah — dan form itu
        menimpa tugas yang sedang dibuka.
      */}
      <PageHeader
        title={task.title}
        description={`${courseLabel(task.course)} · Tenggat ${formatDateTime(task.deadline, timezone)}`}
        action={
          canManage ? (
            <>
              <ButtonLink href={`/tasks/${task.id}/edit`} variant="secondary">
                Ubah tugas
              </ButtonLink>
              <ButtonLink href="/tasks/new">Buat tugas lagi</ButtonLink>
            </>
          ) : undefined
        }
      />

      <Section tier="primary" title="Keterangan">
        <div className="flex flex-col gap-4">
          <Badge tone={meta.tone} icon={<meta.Icon className="size-3.5" />}>
            {meta.label}
          </Badge>

          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-caption font-semibold text-text-muted">Mata kuliah</dt>
              <dd className="text-body text-text">{courseLabel(task.course)}</dd>
            </div>
            <div>
              <dt className="text-caption font-semibold text-text-muted">Sasaran</dt>
              <dd className="text-body text-text">{task.target}</dd>
            </div>
            <div>
              <dt className="text-caption font-semibold text-text-muted">Dibuat oleh</dt>
              <dd className="text-body text-text">{creatorName ?? 'Tidak ditampilkan'}</dd>
            </div>
          </dl>

          {task.description ? (
            <p className="whitespace-pre-line text-body text-text">{task.description}</p>
          ) : null}

          {task.url ? (
            <a
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-small text-primary underline"
            >
              Buka tautan tugas
            </a>
          ) : null}
        </div>
      </Section>

      {canManage ? (
        <Section
          tier="secondary"
          title="Status"
          description="Menandai selesai mencatat aktivitas `completed` di riwayat kelas."
        >
          <div className="flex flex-wrap items-start gap-3">
            {task.status === 'active' ? (
              <TaskStatusForm id={task.id} next="completed" label="Tandai selesai" variant="primary" />
            ) : null}
            {task.status !== 'active' ? (
              <TaskStatusForm id={task.id} next="active" label="Aktifkan lagi" />
            ) : null}
            {task.status !== 'archived' ? (
              <TaskStatusForm id={task.id} next="archived" label="Arsipkan" />
            ) : null}
          </div>
        </Section>
      ) : null}
    </div>
  );
}