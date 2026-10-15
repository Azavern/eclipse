import { requirePermission } from '@/lib/visibility/server';
import { getClassTheme } from '@/features/class/queries';
import { Palette } from 'lucide-react';
import { ThemeEditor } from '@/features/theme/components/ThemeEditor';
import { PageHeader } from '@/components/ui/Section';
import { Card } from '@/components/ui/Card';
import { NoAccess } from '@/components/ui/States';
import { SettingsNav } from '@/components/settings/SettingsNav';

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
      <SettingsNav active="/settings/theme" />

      <PageHeader
        title="Tema kelas"
        description="Warna dan tata letak yang dipakai seluruh aplikasi. Semua kombinasi teks diperiksa terhadap rasio kontras minimal 4,5:1."
        icon={<Palette className="size-5" />}
      />

      <Card tier="primary" className="max-w-content p-5">
        {/* Judul di dalam dipakai pembaca layar; teksnya sudah ada di header
            halaman, jadi tidak diulang secara visual. */}
        <h2 className="sr-only">Editor tema</h2>
        <ThemeEditor defaults={theme} />
      </Card>
    </div>
  );
}
