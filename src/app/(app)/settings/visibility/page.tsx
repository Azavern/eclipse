import { requirePermission, getVisibilityMap } from '@/lib/visibility/server';
import { CLASS_SCOPE_KEYS, toAudienceLevel } from '@/lib/visibility/registry';
import { getClassVisibilityOverrides } from '@/features/visibility/queries';
import {
  VisibilityEditor,
  type SelectionMap,
} from '@/features/visibility/components/VisibilityEditor';
import { Eye } from 'lucide-react';
import { PageHeader } from '@/components/ui/Section';
import { Card } from '@/components/ui/Card';
import { NoAccess } from '@/components/ui/States';
import { SettingsNav } from '@/components/settings/SettingsNav';

export const dynamic = 'force-dynamic';

/**
 * Pengaturan visibilitas kelas — gate `class.manage` (§10).
 *
 * Nilai awal diambil dari `own_audience` yang sudah resolve override, jadi form
 * selalu menampilkan keadaan yang benar-benar berlaku, bukan nilai katalog
 * mentah — dan setiap select selalu punya tiga opsi (Publik/Anggota/Ketua).
 */
export default async function SettingsVisibilityPage() {
  const gate = await requirePermission('class.manage');
  if (!gate) {
    return <NoAccess message="Aturan visibilitas hanya untuk pengelola kelas." backHref="/" />;
  }

  const [map, overrides] = await Promise.all([getVisibilityMap(), getClassVisibilityOverrides()]);

  // Tidak ada lagi opsi "bawaan katalog": nilai awal setiap key adalah level
  // yang benar-benar berlaku saat ini (override bila ada, kalau tidak nilai
  // katalog yang sudah di-resolve).
  const initial = Object.fromEntries(
    CLASS_SCOPE_KEYS.map((key) => [key, toAudienceLevel(overrides[key] ?? map[key].own)]),
  ) as SelectionMap;

  return (
    <div className="flex flex-col gap-8">
      <SettingsNav active="/settings/visibility" />

      <PageHeader
        title="Aturan visibilitas"
        description="Atur siapa yang boleh melihat setiap bagian. Bagian yang tidak terlihat tidak pernah dirender — bukan disembunyikan dengan CSS."
        icon={<Eye className="size-5" />}
      />

      <Card tier="primary" className="max-w-content p-5">
        <VisibilityEditor initial={initial} map={map} />
      </Card>
    </div>
  );
}
