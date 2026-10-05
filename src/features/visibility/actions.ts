'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/visibility/server';
import { fail, forbidden, ok, type FormState } from '@/lib/result';
import { allowedAudiences, CLASS_SCOPE_KEYS, type Audience } from '@/lib/visibility/registry';

/**
 * Bentuk apa pun yang dikirim form: map key → nilai select.
 *
 * Bentuk persisnya tidak divalidasi lewat skema objek karena key-nya berasal
 * dari katalog (27 nilai dinamis); sebagai gantinya setiap key diperiksa satu
 * per satu di bawah.
 */
const selectionSchema = z.record(z.string(), z.string());

export async function saveClassVisibility(_prev: FormState, fd: FormData): Promise<FormState> {
  const gate = await requirePermission('class.manage');
  if (!gate) return forbidden();

  const submitted: Record<string, string> = {};
  for (const key of CLASS_SCOPE_KEYS) {
    const raw = fd.get(`vis_${key}`);
    submitted[key] = typeof raw === 'string' ? raw : '';
  }

  const parsed = selectionSchema.safeParse(submitted);
  if (!parsed.success) {
    return fail(
      { code: 'validation', message: 'Periksa kembali pilihan yang ditandai.' },
      submitted,
    );
  }

  // Opsi yang diterima DIBATAS `allowedAudiences(key)`. Client memakai fungsi
  // yang sama untuk menampilkan opsi, tapi server memeriksa ulang karena form
  // adalah input tak tepercaya (§9).
  const fieldErrors: Record<string, string[]> = {};
  for (const key of CLASS_SCOPE_KEYS) {
    const value = parsed.data[key];
    if (value === '' || value === undefined) continue;
    if (!(allowedAudiences(key) as string[]).includes(value)) {
      (fieldErrors[`vis_${key}`] ??= []).push('Pilihan tidak valid untuk bagian ini');
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return fail(
      { code: 'validation', message: 'Periksa kembali pilihan yang ditandai.', fieldErrors },
      submitted,
    );
  }

  // audience null = hapus override, kembali ke bawaan katalog.
  const rules = CLASS_SCOPE_KEYS.map((key) => ({
    key,
    audience: parsed.data[key] ? (parsed.data[key] as Audience) : null,
  }));

  const supabase = await createClient();
  const { error } = await supabase.rpc('save_class_visibility', { p_rules: rules });

  if (error) {
    console.error('[visibility] gagal menyimpan aturan', { message: error.message });
    return fail({
      code: 'conflict',
      message: 'Aturan tidak tersimpan. Periksa lagi pilihanmu lalu coba simpan.',
    });
  }

  // Visibilitas memengaruhi halaman mana yang boleh dibuka dan section mana yang
  // dirender, jadi seluruh layout perlu disegarkan.
  revalidatePath('/', 'layout');

  return ok(null);
}
