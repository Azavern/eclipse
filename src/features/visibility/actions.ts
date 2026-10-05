'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getViewer, requirePermission } from '@/lib/visibility/server';
import { fail, forbidden, ok, unauthenticated, type FormState } from '@/lib/result';
import {
  allowedAudiences,
  CLASS_SCOPE_KEYS,
  MEMBER_SCOPE_KEYS,
  type Audience,
  type VisibilityKey,
} from '@/lib/visibility/registry';

/**
 * Bentuk apa pun yang dikirim form: map key → nilai select.
 *
 * Bentuk persisnya tidak divalidasi lewat skema objek karena key-nya berasal
 * dari katalog (27 nilai dinamis); sebagai gantinya setiap key diperiksa satu
 * per satu di bawah.
 */
const selectionSchema = z.record(z.string(), z.string());

type Rule = { key: VisibilityKey; audience: Audience | null };

/**
 * Baca pilihan form untuk sekumpulan key dan ubah menjadi payload RPC.
 *
 * Nilai kosong berarti "pakai bawaan katalog" dan dikirim sebagai `audience: null`
 * supaya RPC menghapus override-nya.
 *
 * Opsi yang diterima diperiksa ulang di server dengan `allowedAudiences(key)`:
 * komponen klien memakai fungsi yang sama untuk menampilkan opsi, tapi form
 * adalah input tak tepercaya (§9).
 */
function prepareRules(
  keys: readonly VisibilityKey[],
  fd: FormData,
): { ok: true; rules: Rule[]; submitted: Record<string, string> } | { ok: false; state: FormState } {
  const submitted: Record<string, string> = {};
  for (const key of keys) {
    const raw = fd.get(`vis_${key}`);
    submitted[key] = typeof raw === 'string' ? raw : '';
  }

  const parsed = selectionSchema.safeParse(submitted);
  if (!parsed.success) {
    return {
      ok: false,
      state: fail({ code: 'validation', message: 'Periksa kembali pilihan yang ditandai.' }, submitted),
    };
  }

  const fieldErrors: Record<string, string[]> = {};
  for (const key of keys) {
    const value = parsed.data[key];
    if (value === '' || value === undefined) continue;
    if (!(allowedAudiences(key) as string[]).includes(value)) {
      (fieldErrors[`vis_${key}`] ??= []).push('Pilihan tidak valid untuk bagian ini');
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      state: fail(
        { code: 'validation', message: 'Periksa kembali pilihan yang ditandai.', fieldErrors },
        submitted,
      ),
    };
  }

  return {
    ok: true,
    submitted,
    rules: keys.map((key) => ({
      key,
      audience: parsed.data[key] ? (parsed.data[key] as Audience) : null,
    })),
  };
}

export async function saveClassVisibility(_prev: FormState, fd: FormData): Promise<FormState> {
  const gate = await requirePermission('class.manage');
  if (!gate) return forbidden();

  const prepared = prepareRules(CLASS_SCOPE_KEYS, fd);
  if (!prepared.ok) return prepared.state;

  const supabase = await createClient();
  const { error } = await supabase.rpc('save_class_visibility', { p_rules: prepared.rules });

  if (error) {
    console.error('[visibility] gagal menyimpan aturan kelas', { message: error.message });
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

/**
 * Simpan aturan visibilitas milik anggota sendiri.
 *
 * Tidak butuh permission: `save_my_visibility` hanya menulis baris
 * `visibility_rules` dengan `owner_id = auth.uid()`, jadi seorang anggota hanya
 * bisa mempersempit isi miliknya sendiri dan tidak pernah teammate-nya (§7.3).
 */
export async function saveMyVisibility(_prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer.isSignedIn) return unauthenticated();

  const prepared = prepareRules(MEMBER_SCOPE_KEYS, fd);
  if (!prepared.ok) return prepared.state;

  const supabase = await createClient();
  const { error } = await supabase.rpc('save_my_visibility', { p_rules: prepared.rules });

  if (error) {
    console.error('[visibility] gagal menyimpan aturan anggota', { message: error.message });
    return fail({
      code: 'conflict',
      message: 'Aturan tidak tersimpan. Periksa lagi pilihanmu lalu coba simpan.',
    });
  }

  revalidatePath('/', 'layout');
  return ok(null);
}