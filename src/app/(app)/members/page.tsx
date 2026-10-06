import Link from 'next/link';
import { getViewer, requireView } from '@/lib/visibility/server';
import { getMembers } from '@/features/member/queries';
import { createClient } from '@/lib/supabase/server';
import { signMany } from '@/lib/storage/sign';
import { AvatarFromPath } from '@/components/storage/AvatarFromPath';
import { PageHeader, Section } from '@/components/ui/Section';
import { EmptyState } from '@/components/ui/States';
import { ButtonLink } from '@/components/ui/Button';
import { formatDateTime } from '@/lib/time';
import { getClassIdentity } from '@/features/class/queries';

export const dynamic = 'force-dynamic';

/**
 * Daftar anggota — gate `page.members`.
 *
 * Baris dibaca dari `member_profile_v`, jadi anggota yang tidak terlihat oleh
 * viewer ini tidak pernah masuk ke daftar. Tidak ada pencarian: blueprint §10
 * menyatakan pencarian sengaja tidak dibuat.
 *
 * `AvatarFromPath` menampilkan URL yang sudah ditandatangani batch di atas; bila
 * penandatanganannya gagal komponen mengembalikan inisial, bukan gambar rusak
 * (AC-STORAGE-4).
 */
export default async function MembersPage() {
  await requireView('page.members', '/members');

  const [members, identity, supabase, viewer] = await Promise.all([
    getMembers(),
    getClassIdentity(),
    createClient(),
    getViewer(),
  ]);
  const timezone = identity?.timezone ?? 'Asia/Jakarta';

  // Seluruh avatar ditandatangani DALAM SATU permintaan, lalu URL-nya yang
  // dikirim ke tiap baris. Menandatangani per baris akan berarti satu
  // permintaan Storage per anggota (N+1 jaringan) pada halaman yang bisa
  // menampilkan ratusan baris.
  const signedAvatars = await signMany(
    supabase,
    'member-media',
    members.map((member) => member.avatar_path),
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Anggota"
        description={
          viewer.can('members.manage')
            ? 'Daftar anggota kelas beserta peran dan waktu bergabung. Undang atau hapus anggota lewat tombol di kanan.'
            : 'Anggota kelas yang aktif beserta peran dan waktu bergabung.'
        }
        // Tombol hanya untuk pengelola: mengundang, menonaktifkan, atau menghapus
        // anggota butuh members.manage, jadi menampilkannya ke semua orang
        // hanya janji yang tidak bisa ditepati (§7.8).
        action={
          viewer.can('members.manage') ? (
            <ButtonLink href="/settings/members">Kelola anggota</ButtonLink>
          ) : undefined
        }
      />

      {members.length === 0 ? (
        <EmptyState
          title="Belum ada anggota yang bisa dilihat"
          description="Daftar ini mengikuti aturan visibilitas kelas. Kalau kamu baru masuk, tunggu Ketua menambahkan anggota lain."
          action={{ href: '/', label: 'Kembali ke beranda' }}
        />
      ) : (
        <Section title={`${members.length} anggota`}>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <li key={member.user_id}>
                <Link
                  href={`/members/${encodeURIComponent(member.username)}`}
                  className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface p-3 transition-func hover:bg-surface-dim"
                >
                  <AvatarFromPath
                    path={member.avatar_path}
                    signedUrl={
                      member.avatar_path ? signedAvatars.get(member.avatar_path) : undefined
                    }
                    name={member.full_name}
                    size="md"
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-body font-semibold text-text">
                      {member.full_name}
                    </span>
                    <span className="truncate text-small text-text-muted">
                      @{member.username} · {member.role_name}
                    </span>
                    {member.joined_at ? (
                      <span className="truncate text-caption text-text-muted">
                        Bergabung {formatDateTime(member.joined_at, timezone)}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
