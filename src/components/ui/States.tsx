import type { ReactNode } from 'react';
import Link from 'next/link';
import { AlertTriangle, Inbox, ShieldOff } from 'lucide-react';
import { Button } from './Button';

/**
 * Empty state harus memberi tahu APA yang terjadi dan APA langkah berikutnya
 * (DESIGN.md §11), bukan sekadar ruang kosong dengan kalimat sopan.
 *
 * Bentuknya mengikuti resep empty state DESIGN.md Appendix D: satu komposisi
 * ikon ber-tint, judul yang menyebut apa yang tinggal di sini, satu kalimat
 * bantuan, dan satu aksi utama. Ikonnya bisa diganti pemanggil supaya konteks
 * section tetap terbaca (mis. ikon kalender untuk jadwal).
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className = '',
}: {
  title: string;
  description: string;
  action?: { href: string; label: string } | ReactNode;
  /** Ikon konteks; default kotak masuk. */
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-start gap-4 rounded-md border border-border-subtle bg-band p-6 ${className}`}
    >
      <span className="icon-tile size-12" aria-hidden="true">
        {icon ?? <Inbox className="size-6" />}
      </span>

      <div className="flex flex-col gap-1">
        <p className="text-h3 font-semibold text-text">{title}</p>
        <p className="max-w-prose text-small text-text-muted">{description}</p>
      </div>

      {action ? (
        typeof action === 'object' && action !== null && 'href' in action ? (
          <Link
            href={action.href}
            className="press inline-flex min-h-11 items-center rounded-md border border-primary bg-primary px-4 text-label font-semibold text-on-primary hover:brightness-105 hover:shadow-medium"
          >
            {action.label}
          </Link>
        ) : (
          <div>{action}</div>
        )
      ) : null}
    </div>
  );
}

/**
 * Error state tidak pernah menampilkan stack trace atau query (DESIGN.md §10).
 * Detail ada di log server. Warnanya dibawa oleh latar dan ikon, sedangkan
 * teksnya tetap memakai token teks supaya kontrasnya tidak bergantung pada
 * palet kelas.
 */
export function ErrorState({
  title = 'Halaman ini gagal dimuat',
  description = 'Terjadi kesalahan saat mengambil data. Coba lagi.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-4 rounded-md border border-error-edge bg-error-soft p-6"
    >
      <span className="icon-tile icon-tile-error size-12" aria-hidden="true">
        <AlertTriangle className="size-6" />
      </span>

      <div className="flex flex-col gap-1">
        <p className="text-h3 font-semibold text-text">{title}</p>
        <p className="max-w-prose text-small text-text-muted">{description}</p>
      </div>

      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          Coba lagi
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Ditampilkan ketika pengguna sudah masuk tetapi tidak punya akses. Pesannya
 * sengaja tidak dibuat berbeda dari "tidak ditemukan" di halaman lain supaya
 * keberadaan konten tidak bocor (blueprint §7.8).
 */
export function NoAccess({
  message = 'Halaman ini tidak tersedia untuk akunmu.',
  backHref = '/',
  backLabel = 'Kembali ke beranda',
}: {
  message?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex flex-col items-start gap-5 rounded-lg border border-border-subtle bg-surface p-6">
      <span className="icon-tile icon-tile-neutral size-12" aria-hidden="true">
        <ShieldOff className="size-6" />
      </span>

      <div className="flex flex-col gap-2">
        <h1 className="text-h2 font-semibold text-text">Tidak tersedia</h1>
        <p className="max-w-prose text-body text-text-muted">{message}</p>
      </div>

      <Link
        href={backHref}
        className="press inline-flex min-h-11 items-center rounded-md border border-primary bg-surface px-4 text-label font-semibold text-primary hover:bg-primary hover:text-on-primary"
      >
        {backLabel}
      </Link>
    </div>
  );
}
