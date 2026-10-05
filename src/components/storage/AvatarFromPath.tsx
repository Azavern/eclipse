import { createClient } from '@/lib/supabase/server';
import { signMany } from '@/lib/storage/sign';
import { Avatar, type AvatarSize } from '@/components/ui/Avatar';

/**
 * Avatar untuk data anggota. Path Storage ditandatangani di server memakai
 * client JWT user sehingga policy Storage ikut dievaluasi — viewer yang tidak
 * berhak melihat avatar tidak mendapat URL sama sekali.
 *
 * Pemisahan ini penting: `Avatar` sendiri bebas server-only supaya bisa dipakai
 * dari komponen klien (UserMenu), sedangkan wrapper ini yang menyentuh Storage.
 *
 * `signedUrl` dipakai halaman yang menandatangani SEKALI untuk seluruh daftar
 * (batch) lalu meneruskan URL-nya ke sini. Tanpa itu, setiap baris daftar
 * menembak satu permintaan Storage sendiri — N+1 jaringan yang butuh ratusan
 * permintaan pada daftar anggota yang panjang. `undefined` berarti "belum
 * ditandatangani, tanda tangani sendiri"; `null` berarti "sudah ditandatangani
 * dan tidak menghasilkan URL", jadi komponen ini tidak menembak Storage lagi.
 */
export async function AvatarFromPath({
  path,
  name,
  size = 'md',
  signedUrl,
}: {
  path: string | null | undefined;
  name: string;
  size?: AvatarSize;
  /** Hasil batch `signMany`; biarkan `undefined` untuk penandatangan tunggal. */
  signedUrl?: string | null;
}) {
  if (!path) return <Avatar name={name} size={size} />;

  let url: string | null;
  if (signedUrl === undefined) {
    const supabase = await createClient();
    const signed = await signMany(supabase, 'member-media', [path]);
    url = signed.get(path) ?? null;
  } else {
    url = signedUrl;
  }

  // Penandatanganan gagal -> fallback inisial, bukan gambar rusak (AC-STORAGE-4).
  return <Avatar src={url} name={name} size={size} />;
}