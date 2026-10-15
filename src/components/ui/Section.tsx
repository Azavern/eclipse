import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import {
  CARD_BASE,
  CARD_INTERACTIVE,
  CARD_TIER_CLASSES,
  CARD_TONE_CLASSES,
  type CardTier,
  type CardTone,
} from './Card';

export function SkipLink() {
  return (
    <a href="#main" className="skip-link text-label font-semibold text-text">
      Lewati ke konten
    </a>
  );
}

/**
 * Jejak navigasi untuk halaman detail (DESIGN.md Appendix D). Setiap langkah
 * kecuali yang terakhir adalah tautan; langkah terakhir menandai posisi
 * sekarang lewat `aria-current`, bukan lewat warna saja.
 */
export function Breadcrumb({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Jejak navigasi">
      <ol className="flex flex-wrap items-center gap-1 text-small text-text-muted">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="rounded-sm underline underline-offset-4 transition-func hover:text-text"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className="text-text">
                  {item.label}
                </span>
              )}
              {last ? null : <ChevronRight aria-hidden="true" className="size-3.5 shrink-0" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Judul halaman + aksi utama.
 *
 * Satu header per halaman, dengan hierarki yang jelas (DESIGN.md §5): judul
 * terbesar di halaman, satu baris penjelas yang boleh memuat jumlah data, lalu
 * aksi utama di sisi kanan. Aksi hanya dirender bila memang ada (mis. tombol
 * "Buat event" hanya untuk pemegang events.manage), bukan disembunyikan dengan
 * CSS.
 *
 * Garis pemisah di bawah header sengaja tetap ada: ia batas antara chrome
 * halaman dan isinya, dan itulah yang membuat daftar panjang tidak terasa
 * mengapung.
 */
export function PageHeader({
  title,
  description,
  action,
  breadcrumb,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Jejak navigasi opsional, khusus halaman detail. */
  breadcrumb?: ReactNode;
  /**
   * Ikon konteks halaman, dirender di tile ber-tint di samping judul. Ini
   * jangkar non-teks yang diminta DESIGN.md §5 („setiap layar punya minimal
   * satu jangkar visual") untuk halaman yang isinya murni teks dan kontrol.
   */
  icon?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-border-subtle pb-5">
      {breadcrumb}

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 items-start gap-3">
          {icon ? (
            <span className="icon-tile size-11" aria-hidden="true">
              {icon}
            </span>
          ) : null}

          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="font-display text-h1 font-semibold text-text">{title}</h1>
            {description ? (
              <p className="max-w-prose text-body text-text-muted">{description}</p>
            ) : null}
          </div>
        </div>

        {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
      </div>
    </header>
  );
}

/**
 * Kelompok informasi berjudul, dirender sebagai card.
 *
 * Hierarki dibangun dari ukuran, jarak, garis, dan bayangan — bukan dari
 * membuat semua elemen tebal atau berwarna (DESIGN.md §5). `tier` menyatakan
 * prioritas (lihat `Card.tsx`), `tone` menyatakan apakah kelompok ini perlu
 * latar yang berbeda dari permukaan biasa.
 *
 * `tier` sengaja WAJIB, bukan punya nilai bawaan: prioritas tiap section adalah
 * keputusan per halaman, dan nilai bawaan akan membuat semuanya tampak sama
 * kuat — persis yang tidak diinginkan.
 */
export function Section({
  title,
  description,
  action,
  tier,
  icon,
  tone = 'plain',
  interactive = false,
  children,
  className = '',
  id,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  tier: CardTier;
  /** Ikon konteks section; dirender di tile ber-tint di samping judul. */
  icon?: ReactNode;
  /** Warna latar card; lihat `CardTone`. */
  tone?: CardTone;
  /**
   * `true` hanya bila card-nya sendiri yang bisa diklik. Section yang isinya
   * teks dan tombol-tombol terpisah TIDAK ini: yang bisa diklik adalah tombol
   * di dalamnya, dan tombol itu sudah punya hover sendiri.
   */
  interactive?: boolean;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`${interactive ? CARD_INTERACTIVE : ''} ${CARD_TIER_CLASSES[tier]} ${CARD_TONE_CLASSES[tone]} ${CARD_BASE} flex flex-col gap-4 p-5 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b border-border-subtle pb-3">
        <div className="flex min-w-0 items-start gap-3">
          {icon ? (
            <span className="icon-tile mt-0.5 size-10" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-h2 font-semibold text-text">{title}</h2>
            {description ? (
              <p className="max-w-prose text-small text-text-muted">{description}</p>
            ) : null}
          </div>
        </div>
        {/* Aksi dipisah dari teks judul, dan hanya dirender bila memang ada. */}
        {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
