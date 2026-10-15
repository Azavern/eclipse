import Link from 'next/link';
import { SearchX } from 'lucide-react';

/**
 * 404 untuk resource yang tidak ada ATAU tidak terlihat. Pesannya sengaja sama
 * untuk keduanya supaya keberadaan konten tidak bocor (blueprint §9).
 *
 * Halaman ini juga bagian dari "resep layar" DESIGN.md Appendix D: ilustrasi
 * sederhana, apa yang terjadi, apa langkah berikutnya, satu tombol kembali.
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-5 rounded-lg border border-border-subtle bg-surface p-6">
      <span className="icon-tile icon-tile-neutral size-12" aria-hidden="true">
        <SearchX className="size-6" />
      </span>

      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h2 font-semibold text-text">Tidak ditemukan</h1>
        <p className="max-w-prose text-body text-text-muted">
          Halaman atau data yang kamu cari tidak tersedia. Mungkin tautannya salah, atau isinya
          memang belum dibuka untuk akunmu.
        </p>
      </div>

      <Link
        href="/"
        className="press inline-flex min-h-11 items-center rounded-md border border-primary bg-surface px-4 text-label font-semibold text-primary hover:bg-primary hover:text-on-primary"
      >
        Kembali ke beranda
      </Link>
    </div>
  );
}
