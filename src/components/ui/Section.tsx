import type { ReactNode } from 'react';
import { CARD_BASE, CARD_TIER_CLASSES, CARD_INTERACTIVE, type CardTier } from './Card';

export function SkipLink() {
  return (
    <a href="#main" className="skip-link text-label font-semibold text-text">
      Lewati ke konten
    </a>
  );
}

/**
 * Judul halaman + aksi utama. Aksi hanya dirender bila memang ada (mis. tombol
 * "Buat event" hanya untuk pemegang events.manage), bukan disembunyikan dengan CSS.
 */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border-subtle pb-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 font-semibold text-text">{title}</h1>
        {description ? <p className="text-body text-text-muted">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </header>
  );
}

/**
 * Kelompok informasi berjudul, dirender sebagai card bergaris tegas.
 *
 * Hierarki dibangun dari ukuran, jarak, dan garis — bukan dari membuat semua
 * elemen tebal atau berwarna (§2). Garis card adalah batas kelompok, sedangkan
 * garis tipis di bawah judul memisahkan judul dari isinya, sehingga jelas mana
 * judul, mana isi, dan mana aksi.
 *
 * `tier` sengaja WAJIB, bukan punya nilai bawaan: prioritas tiap section adalah
 * keputusan per halaman, dan nilai bawaan akan membuat semuanya tampak sama
 * kuat — persis yang tidak diinginkan. Tingkatnya dijelaskan di `Card.tsx`.
 */
export function Section({
  title,
  description,
  action,
  tier,
  interactive = false,
  children,
  className = '',
  id,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  tier: CardTier;
  /**
   * `true` hanya bila card-nya sendiri yang bisa diklik. Section yang isinya
   * teks dan tombol-tombol terpisah TIDAK ini: yang bisa diklik adalah tombol
   * di dalamnya, dan tombol itu sendiri yang sudah punya hover sendiri.
   */
  interactive?: boolean;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`${interactive ? CARD_INTERACTIVE : ''} ${CARD_TIER_CLASSES[tier]} ${CARD_BASE} flex flex-col gap-4 p-5 ${className}`}
    >
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border-subtle pb-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-h2 font-semibold text-text">{title}</h2>
          {description ? <p className="text-small text-text-muted">{description}</p> : null}
        </div>
        {/* Aksi dipisah dari teks judul, dan hanya dirender bila memang ada. */}
        {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

