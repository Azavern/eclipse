import Link from 'next/link';

/**
 * 404 untuk resource yang tidak ada ATAU tidak terlihat. Pesannya sengaja sama
 * untuk keduanya supaya keberadaan konten tidak bocor (§9).
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-3 py-8">
      <h1 className="text-h2 font-semibold text-text">Tidak ditemukan</h1>
      <p className="text-body text-text-muted">
        Halaman atau data yang kamu cari tidak tersedia.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-md border border-primary px-4 text-label font-semibold text-primary transition-func hover:bg-primary hover:text-on-primary"
      >
        Kembali ke beranda
      </Link>
    </div>
  );
}
