import { requirePermission, getVisibilityMap } from '@/lib/visibility/server';
import { CLASS_SCOPE_KEYS } from '@/lib/visibility/registry';
import { getClassVisibilityOverrides } from '@/features/visibility/queries';
import {
  VisibilityEditor,
  type SelectionMap,
} from '@/features/visibility/components/VisibilityEditor';
import { PageHeader } from '@/components/ui/Section';
import { CARD_BASE, CARD_TIER_CLASSES } from '@/components/ui/Card';
import { NoAccess } from '@/components/ui/States';
import { SettingsBackLink } from '@/components/settings/SettingsBackLink';

export const dynamic = 'force-dynamic';

/**
 * Pengaturan visibilitas kelas — gate `class.manage` (§10).
 *
 * Nilai awal diambil dari `own_audience` yang sudah resolve override, jadi form
 * selalu menampilkan keadaan yang benar-benar berlaku, bukan nilai katalog
 * mentah.
 */
export default async function SettingsVisibilityPage() {
  const gate = await requirePermission('class.manage');
  if (!gate) {
    return <NoAccess message="Aturan visibilitas hanya untuk pengelola kelas." backHref="/" />;
  }

  const [map, overrides] = await Promise.all([getVisibilityMap(), getClassVisibilityOverrides()]);

  // Key tanpa override tampil sebagai "bawaan katalog" (nilai kosong). Key yang
  // punya override ditampilkan apa adanya supaya keadaan sebenarnya terlihat.
  const initial = Object.fromEntries(
    CLASS_SCOPE_KEYS.map((key) => [key, overrides[key] ?? '']),
  ) as SelectionMap;

  return (
    <div className="flex flex-col gap-8">
      <SettingsBackLink />

      <PageHeader
        title="Aturan visibilitas"
        description="Atur siapa yang boleh melihat setiap bagian. Bagian yang tidak terlihat tidak pernah dirender — bukan disembunyikan dengan CSS."
      />

      <div className={`${CARD_BASE} ${CARD_TIER_CLASSES.primary} max-w-content p-5`}>
        <VisibilityEditor initial={initial} map={map} />
      </div>
    </div>
  );
}
