'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/visibility/server';
import { fail, ok, type ActionError, type FormState } from '@/lib/result';
import { mapDbError } from '@/lib/errors';
import { AUDIENCES, type Audience } from '@/lib/visibility/registry';
import { SOCIAL_PLATFORMS, type SocialPlatformName } from '@/lib/social';
import { buildSocialLinkSchema } from './schemas';

/** FormData mungkin `null` (field absent) atau `File`; keduanya bukan string. */
function str(fd: FormData, key: string): string {
  const value = fd.get(key);
  return typeof value === 'string' ? value : '';
}

/**
 * Identitas pemilik yang sah.
 *
 * Sama seperti portofolio: `class_id` dibaca dari baris profil sendiri, bukan
 * dari form, dan RLS `social_insert`/`_update`/`_delete` tetap menjadi lapisan
 * yang benar-benar menegakkan kepemilikan serta keanggotaan aktif.
 */
async function ownIdentity(): Promise<
  { userId: string; classId: string } | { error: ActionError }
> {
  const viewer = await getViewer();
  const userId = viewer.userId;

  if (!userId) {
    return { error: { code: 'unauthenticated', message: 'Sesi tidak berlaku lagi. Masuk kembali.' } };
  }
  if (!viewer.isActiveMember) {
    return {
      error: {
        code: 'forbidden',
        message: 'Tautan sosial hanya bisa disunting setelah keanggotaanmu aktif.',
      },
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('member_profiles')
    .select('class_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    console.error('[social] profil sendiri tidak ditemukan', { message: error?.message });
    return { error: { code: 'unknown', message: 'Profilmu belum siap. Muat ulang halaman.' } };
  }
  return { userId, classId: data.class_id };
}

type LinkRead =
  | {
      parsed: {
        platform: SocialPlatformName;
        label: string | null;
        url: string;
        visibility: Audience | null;
      };
      values: Record<string, string>;
    }
  | { error: z.ZodError; values: Record<string, string> };

/**
 * Validasi isian tautan. Schema bergantung pada platform yang dipilih (host URL
 * dan kewajiban label), jadi platform dibaca lebih dulu di sini — persis seperti
 * `buildClassLinkSchema` dipakai di Feature class.
 */
function readLink(fd: FormData): LinkRead {
  const values = {
    platform: str(fd, 'platform'),
    label: str(fd, 'label'),
    url: str(fd, 'url'),
  };

  const rawVisibility = str(fd, 'visibility');
  const visibility = (AUDIENCES as readonly string[]).includes(rawVisibility)
    ? (rawVisibility as Audience)
    : null;

  const platform = SOCIAL_PLATFORMS.find((p) => p === values.platform);
  if (!platform) {
    return {
      error: new z.ZodError([
        { code: 'custom', path: ['platform'], message: 'Platform tidak dikenal' },
      ]),
      values,
    };
  }

  const parsed = buildSocialLinkSchema(platform).safeParse({ ...values, visibility });
  return parsed.success ? { parsed: parsed.data, values } : { error: parsed.error, values };
}

function fieldErrorsOf(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key !== 'string') continue;
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

function mappedFailure(
  error: { code?: string; message?: string; details?: string } | null,
  context: string,
  values: Record<string, string>,
): FormState {
  if (!error) {
    return fail({ code: 'not_found', message: 'Tautan tidak ditemukan atau bukan milikmu.' }, values);
  }
  const mapped = mapDbError(error, context);
  if (mapped && !mapped.ok) return { ...mapped, values };
  return fail({ code: 'unknown', message: 'Tautan tidak tersimpan. Coba lagi.' }, values);
}

export async function createSocialLink(_prev: FormState, fd: FormData): Promise<FormState> {
  const identity = await ownIdentity();
  if ('error' in identity) return fail(identity.error);

  const read = readLink(fd);
  if ('error' in read) {
    return fail(
      {
        code: 'validation',
        message: 'Periksa kembali isian yang ditandai.',
        fieldErrors: fieldErrorsOf(read.error),
      },
      read.values,
    );
  }

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from('social_links')
    .insert({
      class_id: identity.classId,
      user_id: identity.userId,
      platform: read.parsed.platform,
      label: read.parsed.label,
      url: read.parsed.url,
      visibility: read.parsed.visibility,
    })
    .select('id');

  if (error || !inserted || inserted.length === 0) {
    return mappedFailure(error, 'create_social_link', read.values);
  }

  revalidatePath('/', 'layout');
  return ok(null);
}

export async function updateSocialLink(_prev: FormState, fd: FormData): Promise<FormState> {
  const identity = await ownIdentity();
  if ('error' in identity) return fail(identity.error);

  const id = str(fd, 'id');
  if (!z.string().uuid().safeParse(id).success) {
    return fail({ code: 'validation', message: 'Tautan tidak valid.' });
  }

  const read = readLink(fd);
  if ('error' in read) {
    return fail(
      {
        code: 'validation',
        message: 'Periksa kembali isian yang ditandai.',
        fieldErrors: fieldErrorsOf(read.error),
      },
      read.values,
    );
  }

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from('social_links')
    .update({
      platform: read.parsed.platform,
      label: read.parsed.label,
      url: read.parsed.url,
      visibility: read.parsed.visibility,
    })
    .eq('id', id)
    .select('id');

  if (error || !updated || updated.length === 0) {
    return mappedFailure(error, 'update_social_link', read.values);
  }

  revalidatePath('/', 'layout');
  return ok(null);
}

export async function deleteSocialLink(_prev: FormState, fd: FormData): Promise<FormState> {
  const identity = await ownIdentity();
  if ('error' in identity) return fail(identity.error);

  const id = str(fd, 'id');
  if (!z.string().uuid().safeParse(id).success) {
    return fail({ code: 'validation', message: 'Tautan tidak valid.' });
  }

  const supabase = await createClient();
  const { data: deleted, error } = await supabase
    .from('social_links')
    .delete()
    .eq('id', id)
    .select('id');

  if (error || !deleted || deleted.length === 0) {
    console.error('[social] gagal menghapus tautan', { message: error?.message });
    return fail({ code: 'conflict', message: 'Tautan tidak terhapus. Coba lagi.' });
  }

  revalidatePath('/', 'layout');
  return ok(null);
}