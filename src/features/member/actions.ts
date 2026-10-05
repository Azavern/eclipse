'use server';

import { randomBytes } from 'node:crypto';
import { cache } from 'react';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getViewer, requirePermission } from '@/lib/visibility/server';
import { fail, forbidden, ok, type FormState } from '@/lib/result';
import { removeObjectQuietly, uploadImage } from '@/lib/storage/upload';
import { createAdminClient } from '@/lib/supabase/admin';
import { emailField, requiredText, USERNAME } from '@/lib/validation';
import { z } from 'zod';
import { env } from '@/lib/env';
import { myProfileSchema } from './schemas';
import { getMembers, type MemberSummary } from './queries';

function str(fd: FormData, key: string): string {
  const value = fd.get(key);
  return typeof value === 'string' ? value : '';
}

/**
 * Perbarui profil milik sendiri.
 *
 * Tidak memakai RPC `update_member_identity` — fungsi itu menuntut
 * `members.manage` dan hanya untuk moderasi oleh Ketua. Anggota mengedit baris
 * sendiri lewat policy `member_profiles_update_own`, yang juga mensyaratkan
 * status aktif.
 *
 * Username yang sudah dipakai anggota lain ditolak constraint unik; pesan itu
 * diterjemahkan menjadi teks yang bisa dibaca, bukan error PostgREST mentah.
 */
export async function updateMyProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return fail({ code: 'unauthenticated', message: 'Sesi tidak berlaku lagi. Masuk kembali.' });
  }

  const values = {
    full_name: str(fd, 'full_name'),
    username: str(fd, 'username'),
    nickname: str(fd, 'nickname'),
    bio: str(fd, 'bio'),
  };

  const parsed = myProfileSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return fail(
      { code: 'validation', message: 'Periksa kembali isian yang ditandai.', fieldErrors },
      values,
    );
  }

  // Tidak termasuk `avatar_path`: gambar ditangani aksi terpisah supaya
  // profil dan Storage tidak saling menggagalkan.
  const { data: updated, error } = await supabase
    .from('member_profiles')
    .update({
      full_name: parsed.data.full_name,
      username: parsed.data.username,
      nickname: parsed.data.nickname,
      bio: parsed.data.bio,
    })
    .eq('user_id', userData.user.id)
    .select('user_id');

  if (error) {
    const isDuplicate = error.code === '23505' || error.message.includes('duplicate key');
    console.error('[member] gagal menyimpan profil', { code: error.code, message: error.message });
    return fail(
      {
        code: isDuplicate ? 'conflict' : 'unknown',
        message: isDuplicate
          ? 'Username itu sudah dipakai anggota lain. Pilih yang lain.'
          : 'Profil tidak tersimpan. Coba lagi.',
      },
      values,
    );
  }

  // Update yang tidak cocok baris manapun harus dianggap gagal, bukan sukses.
  if (!updated || updated.length === 0) {
    return fail(
      {
        code: 'conflict',
        message: 'Profil tidak tersimpan. Akunmu mungkin belum aktif.',
      },
      values,
    );
  }

  revalidatePath('/', 'layout');
  return ok(null);
}

/**
 * Unggah avatar milik viewer sendiri.
 *
 * Bucket `member-media` dipisah dari `class-media` supaya policy Storage bisa
 * membedakan siapa pemilik objeknya (§13.2).
 */
export async function uploadMyAvatar(_prev: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    return fail({ code: 'unauthenticated', message: 'Sesi tidak berlaku lagi. Masuk kembali.' });
  }

  const file = fd.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return fail({
      code: 'validation',
      message: 'Pilih gambar terlebih dahulu.',
      fieldErrors: { file: ['Belum ada gambar yang dipilih'] },
    });
  }

  const { data: profile } = await supabase
    .from('member_profiles')
    .select('class_id, avatar_path')
    .eq('user_id', userId)
    .maybeSingle();

  const classId = profile?.class_id;
  if (!classId) {
    return fail({ code: 'conflict', message: 'Profilmu belum siap. Muat ulang halaman.' });
  }

  const result = await uploadImage(
    supabase,
    { bucket: 'member-media', classId, userId, folder: 'avatar' },
    file,
  );
  if (!result.ok) {
    return fail({
      code: 'validation',
      message: result.message,
      fieldErrors: { file: [result.message] },
    });
  }

  const { data: updated, error } = await supabase
    .from('member_profiles')
    .update({ avatar_path: result.path })
    .eq('user_id', userId)
    .select('user_id');

  if (error || !updated || updated.length === 0) {
    console.error('[member] gagal menyimpan path avatar', { message: error?.message });
    await result.rollback();
    return fail({ code: 'conflict', message: 'Avatar tidak tersimpan. Coba lagi.' });
  }

  // Baris sudah menunjuk objek baru; yang lama baru dibuang sekarang.
  await removeObjectQuietly(supabase, 'member-media', profile?.avatar_path);

  revalidatePath('/', 'layout');
  return ok(null);
}

// ---------------------------------------------------------------
// Moderasi anggota — satu-satunya tempat di aplikasi ini yang memakai
// Auth Admin API (service role). Kode ini TIDAK bisa dipindah ke
// queries.ts: aturan `no-restricted-imports` di eslint.config.mjs hanya
// mengecualikan `features/**/actions.ts` dan `scripts/**` untuk impor
// `@/lib/supabase/admin`. Aturan itu sengaja ketat supaya service role
// tidak dipakai membaca konten; Admin API hanya untuk Auth dan
// membersihkan Storage. --------------------------------------------------------

/** Ban Supabase untuk akun yang dinonaktifkan (100 tahun). */
const BAN_DURATION = '876000h';

const inviteSchema = z.object({
  email: emailField,
  full_name: requiredText(1, 80, 'Nama lengkap'),
  username: USERNAME,
  role: z.enum(['ketua', 'member']),
});

/**
 * Undang anggota baru dan terbitkan tautan akses sekali pakai.
 *
 * Urutannya mengikuti blueprint §10.2 dan penting: user Auth dibuat lebih dulu,
 * lalu `provision_member` dipanggil lewat **JWT Ketua** (bukan service role),
 * karena RPC itu memeriksa permission pemanggil dan service role tidak punya
 * keanggotaan. Bila RPC gagal, user Auth dihapus kembali — kalau tidak, ada akun
 * yatim tanpa membership yang tidak bisa diaktifkan siapa pun.
 *
 * Kata sandi diacak dan tidak pernah dikembalikan, dicetak, atau disimpan.
 * Tautan akses adalah kredensial: hanya dikembalikan ke dialog sekali.
 */
export async function inviteMember(_prev: FormState, fd: FormData): Promise<FormState> {
  const gate = await requirePermission('members.manage');
  if (!gate) return forbidden();

  const values = {
    email: str(fd, 'email'),
    full_name: str(fd, 'full_name'),
    username: str(fd, 'username'),
    role: str(fd, 'role') || 'member',
  };

  const parsed = inviteSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return fail(
      { code: 'validation', message: 'Periksa kembali isian yang ditandai.', fieldErrors },
      values,
    );
  }

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: randomBytes(32).toString('base64url'),
    email_confirm: true,
  });

  if (createError || !created?.user) {
    // 422/email_exists berarti email sudah dipakai — pesan jujur, bukan generik.
    const taken = createError?.message.toLowerCase().includes('already');
    console.error('[member] gagal membuat user Auth', { code: createError?.code });
    return fail(
      {
        code: taken ? 'conflict' : 'unknown',
        message: taken
          ? 'Email itu sudah punya akun. Minta anggota itu membuka tautan akses, atau pakai email lain.'
          : 'Gagal membuat akun. Coba lagi.',
      },
      values,
    );
  }

  const newUserId = created.user.id;
  const supabase = await createClient();

  // Role diambil lewat RLS `roles_select` yang menuntut `members.manage`.
  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('key', parsed.data.role)
    .maybeSingle();

  if (roleError || !role) {
    await admin.auth.admin.deleteUser(newUserId);
    return fail({ code: 'unknown', message: 'Role tidak ditemukan.' });
  }

  const { error: provisionError } = await supabase.rpc('provision_member', {
    p_user_id: newUserId,
    p_full_name: parsed.data.full_name,
    p_username: parsed.data.username,
    p_role_id: role.id,
  });

  if (provisionError) {
    // Kompensasi: jangan tinggalkan akun Auth tanpa membership.
    await admin.auth.admin.deleteUser(newUserId);
    const duplicate = provisionError.code === '23505';
    console.error('[member] provision_member gagal', { code: provisionError.code });
    return fail(
      {
        code: duplicate ? 'conflict' : 'unknown',
        message: duplicate
          ? 'Username itu sudah dipakai. Pilih username lain.'
          : 'Gagal menambahkan anggota. Akun yang terlanjur dibuat sudah dibersihkan.',
      },
      values,
    );
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: parsed.data.email,
  });

  if (linkError || !link?.properties?.hashed_token) {
    // Keanggotaan sudah ada; kehabisan tautan bukan alasan membatalkan undangan.
    return fail(
      {
        code: 'conflict',
        message:
          'Anggota sudah ditambahkan, tetapi tautan akses gagal diterbitkan. Buat ulang tautannya dari daftar anggota.',
      },
      values,
    );
  }

  revalidatePath('/', 'layout');

  return ok({
    accessUrl: `${env.APP_URL}/auth/confirm#token_hash=${encodeURIComponent(link.properties.hashed_token)}&type=recovery`,
    email: parsed.data.email,
  });
}

/**
 * Aktifkan atau nonaktifkan anggota.
 *
 * Status di database memutus akses seketika karena `app.is_active_member` dan
 * `app.is_signed_in` membaca kolom itu — bukan dari isi JWT. Ban di Auth
 * ditambahkan sebagai lapis kedua supaya sesi lama ikut mati (§6.2).
 *
 * Transisi `invited → active` TIDAK mungkin di sini: trigger `memberships_guard`
 * (EC021) menolaknya, dan satu-satunya jalur sah adalah RPC
 * `activate_my_membership` yang dipanggil anggota sendiri lewat tautan akses.
 */
export async function setMemberActive(_prev: FormState, fd: FormData): Promise<FormState> {
  const gate = await requirePermission('members.manage');
  if (!gate) return forbidden();

  const userId = str(fd, 'user_id');
  const next = str(fd, 'next');
  if (!z.string().uuid().safeParse(userId).success || (next !== 'active' && next !== 'inactive')) {
    return fail({ code: 'validation', message: 'Permintaan tidak valid.' });
  }

  const supabase = await createClient();
  const { data: viewerRows } = await supabase.rpc('get_viewer_context');
  const viewerUserId = viewerRows?.[0]?.user_id;

  // Menonaktifkan diri sendiri lewat tabel ini akan mengunci akun Ketua tanpa
  // jalan keluar lain, jadi ditolak di sini.
  if (next === 'inactive' && userId === viewerUserId) {
    return fail({
      code: 'forbidden',
      message: 'Kamu tidak bisa menonaktifkan akunmu sendiri.',
    });
  }

  const { data: updated, error } = await supabase
    .from('memberships')
    .update({ status: next })
    .eq('user_id', userId)
    .select('user_id');

  if (error || !updated || updated.length === 0) {
    console.error('[member] gagal mengubah status anggota', { code: error?.code });
    const isTransition = error?.message.includes('invalid status transition');
    return fail({
      code: isTransition ? 'conflict' : 'unknown',
      message: isTransition
        ? 'Status hanya bisa diubah antara aktif dan tidak aktif. Anggota yang belum pernah mengaktifkan diri tidak bisa diubah dari sini.'
        : 'Status tidak berubah. Coba lagi.',
    });
  }

  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(userId, {
    ban_duration: next === 'active' ? 'none' : BAN_DURATION,
  });

  revalidatePath('/', 'layout');
  return ok(null);
}

/**
 * Hapus anggota beserta akunnya.
 *
 * Menghapus lewat `auth.admin.deleteUser` karena tabel `memberships` sengaja
 * tidak punya policy/grant DELETE — penghapusan harus
 * berantai dari `auth.users`. Baris profil, jadwal, tugas, dan media ikut
 * hilang karena cascade.
 *
 * Objek Storage dibersihkan setelah akun benar-benar terhapus, jadi tidak ada
 * metadata yang menunjuk user yang sudah tidak ada (§8).
 */
export async function deleteMember(_prev: FormState, fd: FormData): Promise<FormState> {
  const gate = await requirePermission('members.manage');
  if (!gate) return forbidden();

  const userId = str(fd, 'user_id');
  if (!z.string().uuid().safeParse(userId).success) {
    return fail({ code: 'validation', message: 'Anggota tidak valid.' });
  }

  const supabase = await createClient();
  const { data: viewerRows } = await supabase.rpc('get_viewer_context');
  const viewerUserId = viewerRows?.[0]?.user_id;

  if (userId === viewerUserId) {
    return fail({ code: 'forbidden', message: 'Kamu tidak bisa menghapus akunmu sendiri.' });
  }

  // Prasyarat: kelas harus punya lebih dari satu admin aktif. Kalau ini satu-satunya,
  // menghapus berarti kelas tanpa pengelola sama sekali.
  //
  // Embedding `role:roles(key)` tidak bisa dipakai: `database.types.ts` ditulis
  // manual dan belum mendeklarasikan relasi antartabel, jadi PostgREST tidak
  // bisa dibuktikan tipenya. Dua kueri biasa + join di memori lebih jujur.
  const [{ data: activeMembers, error: memberError }, { data: roles }] = await Promise.all([
    supabase.from('memberships').select('user_id, role_id').eq('status', 'active'),
    supabase.from('roles').select('id, key'),
  ]);

  if (memberError) {
    console.error('[member] gagal menghitung admin aktif', { message: memberError.message });
    return fail({ code: 'unknown', message: 'Tidak bisa memeriksa daftar admin. Coba lagi.' });
  }

  const adminRoleIds = new Set((roles ?? []).filter((r) => r.key === 'ketua').map((r) => r.id));
  const adminRows = (activeMembers ?? []).filter((m) => adminRoleIds.has(m.role_id));

  const targetIsAdmin = adminRows.some((m) => m.user_id === userId);

  if (targetIsAdmin && adminRows.length <= 1) {
    return fail({
      code: 'conflict',
      message: 'Ini admin aktif terakhir. Angkat admin lain sebelum menghapusnya.',
    });
  }

  // Bersihkan media milik anggota dulu? Tidak — akun harus dihapus lebih dulu,
  // lalu sisanya dibuang best-effort.
  const { data: before } = await supabase
    .from('member_profiles')
    .select('class_id, avatar_path')
    .eq('user_id', userId)
    .maybeSingle();

  const admin = createAdminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);

  if (deleteError) {
    console.error('[member] gagal menghapus user Auth', { message: deleteError.message });
    return fail({ code: 'conflict', message: 'Gagal menghapus akun. Coba lagi.' });
  }

  if (before?.class_id) {
    // Avatar sudah tidak dirujuk baris mana pun; sekarang dibuang best-effort.
    await removeObjectQuietly(supabase, 'member-media', before.avatar_path);
  }

  revalidatePath('/', 'layout');
  return ok(null);
}

export type ManagedMember = MemberSummary & {
  email: string | null;
  /** True bila akun sedang diblokir di sisi Auth. */
  banned: boolean;
  /**
   * Signed URL avatar, diisi oleh halaman server. Disimpan terpisah dari
   * `avatar_path` supaya tabel klien tidak pernah menyentuh Storage.
   */
  avatarUrl?: string | null;
};

export const getManagedMembers = cache(async (): Promise<ManagedMember[]> => {
  // Fungsi ini diekspor dari modul `'use server'`, jadi Next.js juga
  // mendaftarkannya sebagai Server Action yang bisa dipanggil klien. Ia memakai
  // service role untuk membaca email, maka permission WAJIB diperiksa di sini —
  // gate di halaman hanya defense in depth dan tidak melindungi pemanggilan
  // langsung (§9, §3.3).
  const viewer = await getViewer();
  if (!viewer.can('members.manage')) return [];

  const members = await getMembers();
  if (members.length === 0) return [];

  const admin = createAdminClient();

  // Satu panggilan daftar user, lalu dipetakan by id. Untuk satu kelas satu
  // halaman sudah lebih dari cukup; kelas yang lebih besar belum relevan.
  const { data: userList, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    console.error('[member] gagal membaca daftar user Auth', { message: error.message });
    return members.map((m) => ({ ...m, email: null, banned: false }));
  }

  const byId = new Map(
    (userList.users ?? []).map((u) => [
      u.id,
      {
        email: u.email ?? null,
        // `banned_until` berupa tanggal; akun tanpa nilai itu tidak diblokir.
        banned: typeof u.banned_until === 'string' && u.banned_until.length > 0,
      },
    ]),
  );

  return members.map((m) => ({
    ...m,
    email: byId.get(m.user_id)?.email ?? null,
    banned: byId.get(m.user_id)?.banned ?? false,
  }));
});
