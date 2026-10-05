import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_THEME } from '@/lib/theme/defaults';
import { ThemeSchema, type Theme } from '@/lib/theme/schema';
import { buildThemeCss } from '@/lib/theme/css';
import { fontPresetClass } from '@/lib/theme/fonts';
import '@/styles/globals.css';

export const metadata: Metadata = {
  // Nama kelas dibaca per-request lewat generateMetadata; nilai ini hanya fallback.
  title: 'Eclipse',
  description: 'Rumah digital kelas mahasiswa.',
  // Public ≠ ingin diindeks; SEO/share adalah Phase 2 (D-12).
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const theme = await resolveTheme();

  // Nonce dibuat per request di src/proxy.ts dan diteruskan lewat header CSP,
  // sehingga style tag di sini boleh inline tanpa melonggarkan CSP.
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="id" className={fontPresetClass(theme.font_preset)}>
      <head>
        <style nonce={nonce} dangerouslySetInnerHTML={{ __html: buildThemeCss(theme) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

/**
 * Baca theme dari `class_identity_v`.
 *
 * Nama dan theme sengaja tidak pernah dimasker: seluruh halaman — termasuk
 * login — perlu tahu nama dan palet kelas agar bisa merender (§7.4). Field
 * lain pada view itu tetap dimasker sesuai visibility.
 *
 * Kalau theme gagal divalidasi (mis. ada yang mengeditnya langsung di DB),
 * jatuh ke DEFAULT_THEME dan catat di log — halaman tetap bisa dirender dengan
 * kontras yang terjamin, bukan gagal total.
 */
async function resolveTheme(): Promise<Theme> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('class_identity_v').select('theme').limit(1);
    const raw = data?.[0]?.theme;
    if (!raw) return DEFAULT_THEME;

    const parsed = ThemeSchema.safeParse(raw);
    if (parsed.success) return parsed.data;

    console.error('[theme] theme tersimpan tidak lolos validasi, memakai default');
    return DEFAULT_THEME;
  } catch (cause) {
    // Saat build, Next mungkin belum menandai route sebagai dinamis sehingga
    // `cookies()` melempar. Itu kondisinormal, bukan kegagalan aplikasi.
    const message = cause instanceof Error ? cause.message : String(cause);
    if (message.includes('Dynamic server usage')) return DEFAULT_THEME;

    // Kemungkinan DB belum dijangkau. Render tetap harus jalan dengan default.
    console.error('[theme] gagal membaca theme', { message });
    return DEFAULT_THEME;
  }
}
