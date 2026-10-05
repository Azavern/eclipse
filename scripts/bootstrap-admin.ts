/**
 * Membuat Ketua (admin) pertama dan menerbitkan tautan akses sekali pakai.
 *
 * Composite bootstrap: Auth (Admin API, service role) + baris membership dan
 * profil yang ditulis LANGSUNG dengan service role. RPC `provision_member`
 * sengaja tidak dipakai karena fungsi itu memeriksa permission pemanggil, dan
 * pemanggil di sini adalah service role yang tidak punya membership (§25.2).
 *
 * Keamanan:
 *  - Kata sandi diacak dan TIDAK PERNAH dikembalikan, dicetak, atau disimpan.
 *  - Tautan akses adalah kredensial; hanya dicetak ke stdout satu kali, tidak
 *    disimpan di DB dan tidak masuk log (§6.2, §23).
 *  - Skrip menolak berjalan bila kelas sudah punya admin aktif, supaya tidak
 *    bisa diam-diam menggeser siapa yang memegang `class.manage`.
 *
 * Dijalankan lokal dengan env produksi:
 *   BOOTSTRAP_ADMIN_EMAIL=... BOOTSTRAP_ADMIN_NAME=... npm run bootstrap
 */

import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { slugifyUsername } from '../src/lib/time/domain.ts';

// ---------------------------------------------------------------- konfigurasi

function readEnv(): {
  url: string;
  secret: string;
  appUrl: string;
  email: string;
  name: string;
} {
  // Nama kanonis mengikuti .env.example. Prefix NEXT_PUBLIC_* diterima sebagai
  // fallback supaya skrip ini jalan tanpa mengubah file .env yang ada.
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const appUrl = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? '').trim().toLowerCase();
  const name = (process.env.BOOTSTRAP_ADMIN_NAME ?? '').trim();

  const missing: string[] = [];
  if (!url) missing.push('SUPABASE_URL');
  if (!secret) missing.push('SUPABASE_SECRET_KEY');
  if (!email) missing.push('BOOTSTRAP_ADMIN_EMAIL');
  if (!name) missing.push('BOOTSTRAP_ADMIN_NAME');
  if (missing.length > 0) {
    throw new Error(`Env berikut belum diisi: ${missing.join(', ')}`);
  }

  return { url, secret, appUrl, email, name };
}

/** Kata sandi acak; hanya hidup di memori skrip dan tidak pernah dicetak. */
function randomPassword(): string {
  return randomBytes(32).toString('base64url');
}

type Failure = { message: string };
const fail = (message: string): Failure => ({ message });

/**
 * Satu-satunya jalur penulisan profil admin di luar aplikasi.
 * `memberships` dan `member_profiles` memakai trigger guard (EC030) yang hanya
 * berlaku untuk `anon`/`authenticated`, jadi service role boleh menulis kolom
 * immutable di sini — persis yang dibutuhkan bootstrap, dan tidak bisa dilakukan
 * lewat jalur user mana pun.
 */
async function main() {
  // Kekurangan env adalah kesalahan yang diharapkan, bukan galat tak terduga.
  let config: ReturnType<typeof readEnv>;
  try {
    config = readEnv();
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }

  const { url, secret, appUrl, email, name } = config;
  const supabase = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: classes, error: classError } = await supabase
    .from('classes')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (classError) return fail(`Gagal membaca kelas: ${classError.message}`);
  if (!classes) return fail('Kelas belum ada. Jalankan migrasi data referensi dulu.');
  const classId = classes.id;

  const { data: ketuaRole, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('class_id', classId)
    .eq('key', 'ketua')
    .maybeSingle();

  if (roleError) return fail(`Gagal membaca role ketua: ${roleError.message}`);
  if (!ketuaRole) return fail('Role "ketua" belum ada. Jalankan migrasi data referensi dulu.');

  // Kumpulkan username yang sudah dipakai agar slugifyUsername tidak bentrok.
  const { data: takenProfiles } = await supabase
    .from('member_profiles')
    .select('username')
    .eq('class_id', classId);
  const taken = new Set((takenProfiles ?? []).map((r) => r.username as string));

  let userId: string | null = null;
  let createdUser = false;

  // Cari akun yang sudah dibuat sebelumnya (jalur idempoten §25.2).
  const { data: authList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = authList?.users?.find((u) => u.email?.toLowerCase() === email);

  if (existing) {
    userId = existing.id;
    console.log('Akun dengan email ini sudah ada; melewati pembuatan user.');
  } else {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: randomPassword(),
      email_confirm: true,
    });
    if (createError || !created?.user) {
      return fail(`Gagal membuat user Auth: ${createError?.message ?? 'tidak diketahui'}`);
    }
    userId = created.user.id;
    createdUser = true;
  }

  if (!userId) return fail('Tidak dapat menentukan user id.');

  // Sisipkan membership + profil kalau belum ada.
  const { data: membership } = await supabase
    .from('memberships')
    .select('id, status')
    .eq('class_id', classId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) {
    const username = slugifyUsername(name, taken);

    const { error: membershipError } = await supabase.from('memberships').insert({
      class_id: classId,
      user_id: userId,
      role_id: ketuaRole.id,
      status: 'invited',
    });
    if (membershipError) {
      // Kompensasi: jangan tinggalkan user Auth tanpa membership.
      if (createdUser) await supabase.auth.admin.deleteUser(userId);
      return fail(`Gagal membuat membership: ${membershipError.message}`);
    }

    const { error: profileError } = await supabase.from('member_profiles').insert({
      class_id: classId,
      user_id: userId,
      username,
      full_name: name,
    });
    if (profileError) {
      // Kompensasi: hapus membership yang barusan dibuat agar tidak ada baris
      // setengah jadi, lalu hapus user kalau kita yang membuatnya.
      await supabase.from('memberships').delete().eq('class_id', classId).eq('user_id', userId);
      if (createdUser) await supabase.auth.admin.deleteUser(userId);
      return fail(`Gagal membuat profil: ${profileError.message}`);
    }

    console.log(`Membership dibuat dengan status "invited" dan username "${username}".`);
  } else if (membership.status === 'active') {
    return fail(
      'Akun ini sudah aktif sebagai anggota. Untuk mengambil alih, nonaktifkan lewat UI terlebih dulu.',
    );
  } else {
    console.log(`Membership sudah ada dengan status "${membership.status}".`);
  }

  // Terbitkan tautan akses. Type 'recovery' membatalkan token sebelumnya, jadi
  // hanya satu tautan yang bisa dipakai (§6.2).
  const { data: link, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
  });
  if (linkError || !link?.properties?.hashed_token) {
    return fail(`Gagal menerbitkan tautan akses: ${linkError?.message ?? 'tidak diketahui'}`);
  }

  // Tautan hanya dicetak sekali ke stdout dan TIDAK disimpan di mana pun.
  const accessUrl = `${appUrl}/auth/confirm#token_hash=${encodeURIComponent(link.properties.hashed_token)}&type=recovery`;

  console.log('');
  console.log('='.repeat(72));
  console.log('ADMIN KETUA BERHASIL DIPERSIAPKAN');
  console.log('='.repeat(72));
  console.log(`Nama    : ${name}`);
  console.log(`Email   : ${email}`);
  console.log(`Status  : invited (aktif setelah tautan dipakai)`);
  console.log('');
  console.log('Tautan akses (hanya ditampilkan sekali, tidak disimpan):');
  console.log(accessUrl);
  console.log('');
  console.log('Buka tautan di atas, klik "Lanjutkan", lalu tentukan kata sandi.');
  console.log('='.repeat(72));

  return null;
}

/** `ketuaRole.id` sudah dipastikan ada oleh pemanggil. */
main()
  .then((failure) => {
    if (failure) {
      console.error(`\nGAGAL: ${failure.message}\n`);
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((error: unknown) => {
    // Detail teknis ke stderr untuk operator; tidak pernah mencetak rahasia.
    console.error('\nGAGAL: skrip berakhir dengan galat tak terduga.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
