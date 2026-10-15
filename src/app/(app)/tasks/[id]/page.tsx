import { notFound } from 'next/navigation';
import { BookOpen, CalendarClock, ListChecks, Target, UserRound } from 'lucide-react';
import { getViewer, requireView } from '@/lib/visibility/server';
import { getClassIdentity } from '@/features/class/queries';
import { getTaskById, getTaskCreatorName } from '@/features/tasks/queries';
import { TASK_DISPLAY_META } from '@/features/tasks/display';
import { taskDisplayStatus } from '@/lib/time/domain';
import { formatDateTime } from '@/lib/time';
import { TaskStatusForm } from '@/features/tasks/components/TaskForm';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb, PageHeader, Section } from '@/components/ui/Section';
import { NoAccess } from '@/components/ui/States';
import { ButtonLink } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Label mata kuliah untuk baris lama yang belum punya nilai (kolom nullable). */
function courseLabel(course: string | null): string {
  return course && course.length > 0 ? course : 'Tanpa mata kuliah';
}

/** Satu fakta ringkas di strip atas: ikon, label, nilai. */
function Fact({
  icon,
  label,
  value,
  tone = 'icon-tile',
  numeric = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: string;
  numeric?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border-subtle bg-surface p-4">
      <span className={`${tone} size-10`} aria-hidden="true">
        {icon}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-caption text-text-muted">{label}</span>
        <span className={`text-body text-text ${numeric ? 'tabular-nums' : ''}`}>{value}</span>
      </div>
    </div>
  );
}

/**
 * Detail tugas — gate `page.tasks`.
 *
 * Nama pembuat hanya dirender bila baris profilnya terlihat viewer ini; kalau
 * tidak, bagiannya hilang sama sekali, bukan menampilkan placeholder (blueprint
 * §19, AC-TASKS-8).
 *
 * Susunannya mengikuti resep halaman detail DESIGN.md Appendix D: jejak
 * navigasi, header dengan status + aksi, lalu strip fakta kunci sebelum isi
 * panjang — supaya yang menjawab "tugas apa ini, kapan, untuk siapa" terbaca
 * sebelum pengguna harus menggulir.
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
        breadcrumb={
          <Breadcrumb items={[{ href: '/tasks', label: 'Tugas' }, { label: task.title }]} />
        }
        title={task.title}
        description={`${courseLabel(task.course)} · Tenggat ${formatDateTime(task.deadline, timezone)}`}
        action={
          canManage ? (
            <>
              <Badge tone={meta.tone} icon={<meta.Icon className="size-3.5" />}>
                {meta.label}
              </Badge>
              <ButtonLink href={`/tasks/${task.id}/edit`} variant="secondary">
                Ubah tugas
              </ButtonLink>
              <ButtonLink href="/tasks/new">Buat tugas lagi</ButtonLink>
            </>
          ) : (
            <Badge tone={meta.tone} icon={<meta.Icon className="size-3.5" />}>
              {meta.label}
            </Badge>
          )
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Fact
          icon={<BookOpen className="size-5" />}
          label="Mata kuliah"
          value={courseLabel(task.course)}
        />
        <Fact
          icon={<CalendarClock className="size-5" />}
          label="Tenggat"
          value={formatDateTime(task.deadline, timezone)}
          numeric
        />
        <Fact icon={<Target className="size-5" />} label="Sasaran" value={task.target} />
        <Fact
          icon={<UserRound className="size-5" />}
          label="Dibuat oleh"
          value={creatorName ?? 'Tidak ditampilkan'}
          tone="icon-tile-neutral"
        />
      </div>

      <Section tier="primary" title="Keterangan" icon={<BookOpen className="size-5" />}>
        <div className="flex flex-col gap-4">
          {task.description ? (
            <p data-pre-line className="max-w-prose text-body text-text">
              {task.description}
            </p>
          ) : (
            <p className="text-small text-text-muted">Tugas ini belum diberi keterangan.</p>
          )}

          {task.url ? (
            <a
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 text-small font-semibold text-primary underline underline-offset-4"
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
          icon={<ListChecks className="size-5" />}
        >
          <div className="flex flex-wrap items-start gap-3">
            {task.status === 'active' ? (
              <TaskStatusForm
                id={task.id}
                next="completed"
                label="Tandai selesai"
                variant="primary"
              />
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
