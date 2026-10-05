import type { ReactNode } from 'react';

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
 * Pembatas section. Hierarki dibangun dari ukuran, jarak, dan garis pemisah —
 * bukan dari membuat semua elemen tebal atau berwarna (§2).
 */
export function Section({
  title,
  description,
  action,
  children,
  className = '',
  id,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`flex flex-col gap-4 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border-subtle pb-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-h2 font-semibold text-text">{title}</h2>
          {description ? <p className="text-small text-text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * Daftar memakai pemisah (divider), bukan kartu (§17.3). Kartu hanya dipakai
 * bila pengelompokan memang membutuhkannya, mis. grid anggota.
 */
export function List({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-col ${className}`}>{children}</div>;
}

export function ListItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`border-t border-border-subtle py-3 first:border-t-0 ${className}`}>{children}</div>;
}
