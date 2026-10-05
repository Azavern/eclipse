import { AppShell } from '@/components/layout/AppShell';
import { NAV_ITEMS, type NavItem } from '@/components/layout/NavItems';
import { getViewer, getVisibilityMap } from '@/lib/visibility/server';
import { getClassIdentity } from '@/features/class/queries';

/**
 * Layout untuk seluruh halaman dalam grup `(app)`.
 *
 * Viewer, peta visibilitas, dan identitas kelas dibaca SATU KALI per request lalu
 * dipakai semua halaman di bawahnya. Ini memenuhi prinsip "evaluasi visibility
 * satu kali per request" (§7.10) tanpa menyimpan state di klien.
 *
 * Injeksi theme tetap di root layout, jadi tidak diulang di sini.
 */
export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const [viewer, map, identity] = await Promise.all([
    getViewer(),
    getVisibilityMap(),
    getClassIdentity(),
  ]);

  // Nav hanya menampilkan halaman yang benar-benar boleh dibuka viewer ini.
  const navItems: NavItem[] = NAV_ITEMS.filter((item) => map[item.key]?.allowed);

  return (
    <AppShell
      viewer={viewer}
      navItems={navItems}
      identity={{
        name: identity?.name ?? 'Kelas',
        logoPath: identity?.logo_path ?? null,
      }}
      timezone={identity?.timezone ?? 'Asia/Jakarta'}
    >
      {children}
    </AppShell>
  );
}
