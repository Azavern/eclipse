import Link from 'next/link';
import { getViewer, requireView } from '@/lib/visibility/server';
import { getClassIdentity } from '@/features/class/queries';
import { getTasks } from '@/features/tasks/queries';
import { TASK_STATUS_LABEL, toTaskStatus } from '@/features/tasks/schemas';
import { TASK_DISPLAY_META } from '@/features/tasks/display';
import { TaskCompleteForm } from '@/features/tasks/components/TaskCompleteForm';
import { TaskDeleteButton } from '@/features/tasks/components/TaskDeleteButton';
import { taskDisplayStatus } from '@/lib/time/domain';
import { formatDateTime } from '@/lib/time';
import { PageHeader } from '@/components/ui/Section';
import { CARD_BASE, CARD_TIER_CLASSES } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, NoAccess } from '@/components/ui/States';
import { ButtonLink } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

/** Label mata kuliah untuk baris lama yang belum punya nilai (kolom nullable). */
function courseLabel(course: string | null): string {
  return course && course.length > 0 ? course : 'Tanpa mata kuliah';
}

/**
 * Daftar tugas dengan filter `?status=active|completed|archived` (§10).
 *
 * `active` adalah default dan sengaja memuat tugas yang sudah lewat tenggat —
 * selama belum ditandai selesai, tugas itu masih harus terlihat dan diberi
 * label "Lewat tenggat". Arsip hanya tampil bila filternya dipilih.
 */
export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const gate = await requireView('page.tasks', '/tasks');
  if (!gate) {
    return (
      <NoAccess
        message="Halaman tugas belum dibuka untuk akunmu. Ketua kelas bisa mengubahnya."
        backHref="/"
      />
    );
  }

  const [{ status: rawStatus }, viewer, identity] = await Promise.all([
    searchParams,
    getViewer(),
    getClassIdentity(),
  ]);
  const status = toTaskStatus(rawStatus);
  const tasks = await getTasks(status);
  const timezone = identity?.timezone ?? 'Asia/Jakarta';
  const canManage = viewer.can('tasks.manage');
  const now = new Date();

  const tabs = [
    { status: 'active' as const, label: 'Aktif', href: '/tasks' },
    { status: 'completed' as const, label: 'Selesai', href: '/tasks?status=completed' },
    { status: 'archived' as const, label: 'Arsip', href: '/tasks?status=archived' },
  ];

  /*
   * Jumlah tugas yang ditampilkan, bukan satu angka diam: jelas bahwa satu orang
   * bisa punya banyak tugas sekaligus dan semuanya terdaftar di sini.
   */
  const count =
    tasks.length === 0
      ? null
      : `${tasks.length} ${TASK_STATUS_LABEL[status].toLowerCase()}`;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Tugas"
        description={
          count
            ? `${count}. Tenggat di zona waktu kelas.`
            : 'Tugas aktif, riwayat yang selesai, dan arsip.'
        }
        action={canManage ? <ButtonLink href="/tasks/new">Buat tugas</ButtonLink> : undefined}
      />

      <nav aria-label="Filter tugas" className="flex flex-wrap gap-4 border-b border-border-subtle">
        {tabs.map((tab) => {
          const active = tab.status === status;
          return (
            <Link
              key={tab.status}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`-mb-px border-b-2 px-1 pb-2 text-label font-semibold transition-func ${
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {tasks.length === 0 ? (
        status === 'active' ? (
          <EmptyState
            title="Tidak ada tugas aktif"
            description={
              canManage
                ? 'Buat tugas agar anggota tahu apa yang harus dikerjakan. Kamu bisa membuat sebanyak-banyaknya tugas.'
                : 'Tugas baru akan muncul di sini.'
            }
            action={canManage ? { href: '/tasks/new', label: 'Buat tugas' } : undefined}
          />
        ) : (
          <EmptyState
            title={`Belum ada tugas berstatus ${TASK_STATUS_LABEL[status].toLowerCase()}`}
            description="Tugas yang statusnya berubah akan tampil di sini."
          />
        )
      ) : (
        <div className={`${CARD_BASE} ${CARD_TIER_CLASSES.secondary} p-5`}>
          <div className="flex flex-col gap-3">
          {tasks.map((task) => {
            const display = taskDisplayStatus({ status: task.status, deadline: new Date(task.deadline) }, now);
            const meta = TASK_DISPLAY_META[display];
            const urgent = display === 'overdue' || display === 'due_soon';

            return (
              /*
                Satu baris = satu unit: judul + status, ringkasan, lalu aksi.
                Di mobile ketiganya ditumpuk — versi sebelumnya memaksa ketiganya
                berdampingan sehingga saling menghimpit di layar sempit. Barulah
                mulai `sm` ketiganya berdampingan lagi dengan aksi di ujung kanan.
              */
              <article
                key={task.id}
                className={`${CARD_TIER_CLASSES.tertiary} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    className={`text-body text-text ${urgent ? 'font-semibold' : 'font-normal'}`}
                  >
                    {task.title}
                  </h2>
                  <Badge tone={meta.tone} icon={<meta.Icon className="size-3.5" />}>
                    {meta.label}
                  </Badge>
                </div>
                <p className="text-small text-text-muted">
                  {courseLabel(task.course)} · {formatDateTime(task.deadline, timezone)} ·{' '}
                  {task.target}
                </p>
                {/*
                  Aksi hanya dirender kalau memang bisa dipakai: keduanya butuh
                  `tasks.manage` (gate yang sama dengan aksinya di server) dan
                  hanya masuk akal selama tugasnya masih aktif. Untuk tugas aktif,
                  tombolnya mengikuti tenggat: yang sudah lewat tenggat ditawari
                  hapus karena barisnya tidak lagi relevan dikerjakan, sedangkan
                  yang belum ditawari tandai selesai. Tugas yang sudah selesai
                  atau diarsipkan tidak diberi tombol mati — statusnya sudah
                  dibawa Badge di atas, dan mengaktifkan lagi tersedia di halaman
                  detail.
                */}
                <div className="flex flex-wrap items-center gap-2">
                  {canManage && task.status === 'active' ? (
                    display === 'overdue' ? (
                      <TaskDeleteButton id={task.id} title={task.title} />
                    ) : (
                      <TaskCompleteForm id={task.id} title={task.title} />
                    )
                  ) : null}
                  <ButtonLink href={`/tasks/${task.id}`} variant="secondary">
                    Detail
                  </ButtonLink>
                </div>
              </article>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}