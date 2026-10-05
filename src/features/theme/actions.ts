'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/visibility/server';
import { fail, forbidden, ok, type FormState } from '@/lib/result';
import { PALETTE_KEYS, ThemeSchema } from '@/lib/theme/schema';

/**
 * Simpan tema kelas.
 *
 * Kolom `classes.theme` punya CHECK `app.theme_is_valid(jsonb)` yang memeriksa
 * bentuk, bukan kontras. Kontras divalidasi `ThemeSchema` di sini — lebih awal,
 * supaya pengguna mendapat pesan yang menyebut warna mana yang bermasalah,
 * bukan error CHECK yang tidak bisa dibaca.
 */
export async function updateTheme(_prev: FormState, fd: FormData): Promise<FormState> {
  const gate = await requirePermission('class.manage');
  if (!gate) return forbidden();

  const read = (key: string) => {
    const value = fd.get(key);
    return typeof value === 'string' ? value : '';
  };

  const layout = read('layout');
  const font_preset = read('font_preset');

  const palette = Object.fromEntries(
    PALETTE_KEYS.map((key) => [key, read(`palette_${key}`)]),
  ) as Record<(typeof PALETTE_KEYS)[number], string>;

  const parsed = ThemeSchema.safeParse({ layout, font_preset, palette });

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      // Issues palette berpath ['palette', key]; dipetakan ke nama field form.
      const field =
        issue.path[0] === 'palette' && typeof issue.path[1] === 'string'
          ? `palette_${issue.path[1]}`
          : String(issue.path[0] ?? 'theme');
      (fieldErrors[field] ??= []).push(issue.message);
    }

    return fail(
      { code: 'validation', message: 'Periksa kembali isian yang ditandai.', fieldErrors },
      {
        layout,
        font_preset,
        ...Object.fromEntries(PALETTE_KEYS.map((key) => [`palette_${key}`, palette[key]])),
      },
    );
  }

  const supabase = await createClient();
  const { data: row, error: readError } = await supabase
    .from('classes')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (readError || !row) {
    console.error('[theme] gagal menemukan kelas', { message: readError?.message });
    return fail({ code: 'unknown', message: 'Kelas tidak ditemukan. Muat ulang halaman.' });
  }

  const { data: updated, error: updateError } = await supabase
    .from('classes')
    .update({ theme: parsed.data })
    .eq('id', row.id)
    .select('id');

  if (updateError) {
    console.error('[theme] gagal menyimpan tema', { message: updateError.message });
    return fail({
      code: 'conflict',
      message: 'Tema tidak tersimpan. Periksa kontras warnanya lalu coba lagi.',
    });
  }

  if (!updated || updated.length === 0) {
    return fail({ code: 'conflict', message: 'Tema tidak tersimpan. Muat ulang halaman.' });
  }

  // Tema diinjeksi di root layout, jadi seluruh aplikasi perlu disegarkan.
  revalidatePath('/', 'layout');

  return ok(null);
}
