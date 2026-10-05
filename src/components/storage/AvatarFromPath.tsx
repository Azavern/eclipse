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
 */
export async function AvatarFromPath({
  path,
  name,
  size = 'md',
}: {
  path: string | null | undefined;
  name: string;
  size?: AvatarSize;
}) {
  if (!path) return <Avatar name={name} size={size} />;

  const supabase = await createClient();
  const signed = await signMany(supabase, 'member-media', [path]);
  const url = signed.get(path);

  // Penandatanganan gagal -> fallback inisial, bukan gambar rusak (AC-STORAGE-4).
  return <Avatar src={url ?? null} name={name} size={size} />;
}
