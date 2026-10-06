import { requirePermission } from '@/lib/visibility/server';
import { getClassTheme } from '@/features/class/queries';
import { ThemeEditor } from '@/features/theme/components/ThemeEditor';
import { PageHeader } from '@/components/ui/Section';
import { CARD_BASE, CARD_TIER_CLASSES } from '@/components/ui/Card';
import { NoAccess } from '@/components/ui/States';
import { SettingsBackLink } from '@/components/settings/SettingsBackLink';

export const dynamic = 'force-dynamic';

/**
 * Pengaturan tema kelas — gate `class.manage` (§10).
 *
 * Tema diinjeksi di root layout untuk seluruh aplikasi, jadi perubahan di sini
 * memengaruhi semua halaman, bukan hanya beranda.
 */
export default async function SettingsThemePage() {
  const gate = await requirePermission('class.manage');
  if (!gate) {
    return <NoAccess message="Tema kelas hanya untuk pengelola kelas." backHref="/" />;
  }

  // `getClassTheme` sudah memvalidasi lewat ThemeSchema dan mengganti nilai
  // cacat dengan default, jadi editor tidak pernah dibuka dengan data rusak.
  const theme = await getClassTheme();

  return (
    <div className="flex flex-col gap-8">
      <SettingsBackLink />

      <PageHeader
        title="Tema kelas"
        description="Warna dan tata letak yang dipakai seluruh aplikasi. Semua kombinasi teks diperiksa terhadap rasio kontras minimal 4,5:1."
      />

      <div className={`${CARD_BASE} ${CARD_TIER_CLASSES.primary} max-w-content p-5`}>
        <ThemeEditor defaults={theme} />
      </div>
    </div>
  );
}
