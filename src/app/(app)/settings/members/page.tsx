import { getViewer, requirePermission } from '@/lib/visibility/server';
import { createClient } from '@/lib/supabase/server';
import { signMany } from '@/lib/storage/sign';
import { getManagedMembers } from '@/features/member/actions';
import { MembersManager } from '@/features/member/components/MembersManager';
import { Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/Section';
import { Card } from '@/components/ui/Card';
import { NoAccess } from '@/components/ui/States';
import { SettingsNav } from '@/components/settings/SettingsNav';

export const dynamic = 'force-dynamic';

/**
 * Pengelolaan anggota — gate `members.manage` (§10.2).
 *
 * Email tidak ada di tabel profil maupun di view; satu-satunya sumbernya Auth
 * Admin API, jadi `getManagedMembers` menggabungkan keduanya. Modul itu berada
 * di `actions.ts` karena itulah tempat proyek mengizinkan pemakaian service
 * role (ditegakkan `no-restricted-imports`).
 */
export default async function SettingsMembersPage() {
  const gate = await requirePermission('members.manage');
  if (!gate) {
    return <NoAccess message="Pengelolaan anggota hanya untuk pengelola kelas." backHref="/" />;
  }

  const [viewer, members] = await Promise.all([getViewer(), getManagedMembers()]);

  // Avatar ditandatangani DI SINI, sekali untuk seluruh baris, lalu URL-nya
  // yang dikirim ke tabel klien. `MembersManager` adalah Client Component dan
  // tidak boleh menarik modul server-only — itulah gunanya `Avatar` (T-02).
  // Penandatanganan batch menghindari N+1 (§12).
  const supabase = await createClient();
  const signed = await signMany(
    supabase,
    'member-media',
    members.map((m) => m.avatar_path),
  );
  const rows = members.map((m) => ({
    ...m,
    avatarUrl: m.avatar_path ? (signed.get(m.avatar_path) ?? null) : null,
  }));

  return (
    <div className="flex flex-col gap-8">
      <SettingsNav active="/settings/members" />

      <PageHeader
        title="Anggota"
        description="Undang anggota baru, nonaktifkan yang tidak aktif lagi, atau hapus beserta seluruh isinya."
        icon={<Users className="size-5" />}
      />

      <Card tier="primary" className="max-w-content p-5">
        <MembersManager members={rows} viewerId={viewer.userId} />
      </Card>
    </div>
  );
}
