import { createClient } from '@/lib/supabase/server';
import { signMany } from '@/lib/storage/sign';

/**
 * `<img>` biasa, bukan `next/image`: gambar sudah di-resize di klien dan
 * disajikan dari signed URL, sehingga optimizer Next tidak dipakai (§13.5).
 *
 * Path datang dari DB dan ditandatangani di server memakai client JWT user,
 * sehingga policy Storage ikut dievaluasi. Bila penandatanganan gagal, komponen
 * ini mengembalikan `fallback` alih-alih gambar rusak (AC-STORAGE-4).
 */
export async function StorageImage({
  path,
  alt,
  width,
  height,
  className,
  bucket = 'class-media',
  fallback = null,
  priority = false,
}: {
  path: string | null | undefined;
  /** Wajib: gambar yang bermakna harus punya alternatif teks (§17.7). */
  alt: string;
  width: number;
  height: number;
  className?: string;
  bucket?: 'class-media' | 'member-media';
  fallback?: React.ReactNode;
  priority?: boolean;
}) {
  if (!path) return <>{fallback}</>;

  const supabase = await createClient();
  const signed = await signMany(supabase, bucket, [path]);
  const url = signed.get(path);

  if (!url) return <>{fallback}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- optimizer tidak dipakai (§13.5)
    <img
      src={url}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
    />
  );
}
