import type { ReactNode } from 'react';

/**
 * Tiga tingkat prioritas informasi. Dipakai di seluruh halaman supaya susunan
 * card benar-benar menyatakan prioritas, bukan sekadar membagi ruang.
 *
 * Kontras antar tingkat dibangun dari tiga hal saja — tebal garis, kekuatan
 * bayangan, dan glow — bukan dari warna latar yang berbeda. Latar tetap
 * `surface` untuk semuanya supaya tidak ada card yang terbaca sebagai pesan
 * error atau peringatan.
 */
export type CardTier = 'primary' | 'secondary' | 'tertiary';

/**
 * Primer  — informasi yang harus terbaca pertama di halamannya. Garis tertebal,
 *           glow warna primary, bayangan tinggi saat disentuh.
 * Sekunder— kelompok informasi utama. Garis tegas, bayangan rendah.
 * Tersier — pendukung. Garis tipis, datar sampai disentuh.
 *
 * `hover:` hanya mengubah bayangan; lift dan up-size-nya seragam dan berasal
 * dari `.card-interactive` (§7.9: motion yang seragam lebih terbaca sebagai
 * umpan balik interaksi daripada sebagai dekorasi).
 */
export const CARD_TIER_CLASSES: Record<CardTier, string> = {
  primary:
    'rounded-lg border-2 border-primary bg-surface shadow-glow hover:shadow-glow-high',
  secondary:
    'rounded-lg border border-border-strong bg-surface shadow-low hover:shadow-medium',
  tertiary: 'rounded-md border border-border-subtle bg-surface hover:shadow-low',
};

export const CARD_BASE = '';

/**
 * Dipasang HANYA pada card yang benar-benar bisa diklik seluruh permukaannya.
 *
 * Hover-lift itu sinyal "ini bisa kamu tekan". Kalau ditaruh di card yang isinya
 * cuma teks, sinyal itu bohong — pengguna mengarahkan kursor, cardnya melompat,
 * lalu tidak terjadi apa-apa. Jadi gerakan disimpan terpisah dari gaya visual:
 * `Card`/`Section` hanya memakainya kalau `interactive` diminta.
 */
export const CARD_INTERACTIVE = 'card-interactive';

/**
 * Kelompok informasi yang tidak punya judul section sendiri.
 *
 * `Section` memakai kelas tingkat yang sama; komponen ini untuk blok yang
 * memang bukan section, mis. kartu ringkasan atau panel berdiri sendiri.
 */
export function Card({
  tier = 'secondary',
  interactive = false,
  className = '',
  children,
}: {
  tier?: CardTier;
  /** Menaikkan kartu saat disentuh. Hanya untuk kartu yang bisa diklik. */
  interactive?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`${interactive ? CARD_INTERACTIVE : ''} ${CARD_TIER_CLASSES[tier]} ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Grid dua kolom untuk deretan card.
 *
 * Satu kolom di mobile, dua kolom seragam dari 1024px, dan card terakhir pada
 * jumlah ganjil melebar penuh supaya tidak ada setengah baris kosong. Aturan
 * kolomnya ada di `globals.css` (`.card-grid`) karena butuh pemilih
 * `:last-child:nth-child(odd)` yang tidak bisa dinyatakan sebagai utility tanpa
 * nilai arbitrer.
 *
 * Dipakai hanya kalau section-nya memang lebih dari satu; satu card sendirian
 * tidak perlu dibungkus grid.
 */
export function CardGrid({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`card-grid ${className}`}>{children}</div>;
}
