/**
 * `<img>` untuk URL yang SUDAH ditandatangani di server.
 *
 * Dipisah dari `StorageImage` karena yang itu menandatangani satu path per pemanggilan.
 * Untuk daftar yang panjang (mis. portofolio dengan puluhan item) itu berarti
 * N+1 permintaan Storage; di situ penandatanganan dilakukan sekali lewat
 * `signMany` di Server Component, lalu URL-nya diteruskan ke sini.
 *
 * Komponen ini bebas server-only, aman dirender dari Server maupun Client
 * Component, dan menerima `null`/`undefined` supaya pemanggil bisa mengirim
 * hasil `Map` apa adanya tanpa memeriksa dulu.
 */
export function SignedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
}: {
  /** URL absolut hasil signed URL, atau null bila penandatanganan gagal. */
  src: string | null | undefined;
  /** Wajib: gambar bermakna harus punya alternatif teks (§17.7). */
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
}) {
  if (!src) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- optimizer tidak dipakai (§13.5)
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
    />
  );
}