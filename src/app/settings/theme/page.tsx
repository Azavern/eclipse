import { requirePermission } from '@/lib/visibility/server';
import { getClassTheme } from '@/features/class/queries';
import { ThemeEditor } from '@/features/theme/components/ThemeEditor';
import { PageHeader } from '@/components/ui/Section';
import { NoAccess } from '@/components/ui/States';

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
      <PageHeader
        title="Tema kelas"
        description="Warna dan tata letak yang dipakai seluruh aplikasi. Semua kombinasi teks diperiksa terhadap rasio kontras minimal 4,5:1."
      />

      <div className="max-w-content">
        <ThemeEditor defaults={theme} />
      </div>
    </div>
  );
}
