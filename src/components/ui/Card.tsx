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
 *           glow warna primary.
 * Sekunder— kelompok informasi utama. Garis tegas, bayangan rendah.
 * Tersier — pendukung. Garis tipis, tanpa bayangan.
 *
 * Kelas tingkat sengaja TIDAK memuat satu pun `hover:`. Efek hover (bayangan,
 * lift, up-size) hanya boleh muncul pada card yang benar-benar bisa diklik, dan
 * itu ditandai terpisah oleh `.card-interactive`. Kalau `hover:shadow-*` ditulis
 * di sini, card teks yang tidak bisa diklik ikut bereaksi — persis sinyal palsu
 * yang harus dihindari.
 *
 * `card-cell` menandai "elemen ini sebuah card", dan itu dipakai `.card-grid`
 * untuk menentukan sel mana yang mengisi kolom. Penanda ini harus terpisah dari
 * `.card-interactive`: mengisi sel grid adalah soal *card*, sedangkan bisa
 * diklik adalah soal *interaksi*, dan banyak card benar untuk yang pertama tapi
 * tidak untuk yang kedua.
 */
export const CARD_TIER_CLASSES: Record<CardTier, string> = {
  primary: 'card-cell card-tier-primary rounded-lg border-2 border-primary bg-surface shadow-glow',
  secondary:
    'card-cell card-tier-secondary rounded-lg border border-border-strong bg-surface shadow-low',
  tertiary: 'card-cell card-tier-tertiary rounded-md border border-border-subtle bg-surface',
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
 * Deretan dua kolom untuk card.
 *
 * Satu kolom di mobile, dua kolom seragam dari 1024px, dan card terakhir pada
 * jumlah ganjil melebar sendiri mengisi barisnya (`flex-grow` di `.card-grid`,
 * `globals.css`) sehingga tidak ada sel kosong yang tertinggal. Anak yang bukan
 * card tetap melebar penuh, jadi judul halaman dan bilah filter tidak ikut
 * terbagi dua kolom.
 *
 * Dipakai hanya kalau section-nya memang lebih dari satu; satu card sendirian
 * tidak perlu dibungkus.
 */
export function CardGrid({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`card-grid ${className}`}>{children}</div>;
}
