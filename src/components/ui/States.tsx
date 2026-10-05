import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from './Button';

/**
 * Empty state harus memberi tahu APA yang terjadi dan APA langkah berikutnya
 * (§15.2). Teksnya berbeda untuk pengelola dan anggota karena langkah berikutnya
 * juga berbeda. Ruang kosong yang disengaja tidak diberi pembungkus apa pun.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string } | ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-2 border-t border-border-subtle py-6">
      <p className="text-body font-semibold text-text">{title}</p>
      <p className="text-small text-text-muted">{description}</p>
      {action ? (
        typeof action === 'object' && action !== null && 'href' in action ? (
          <Link
            href={action.href}
            className="mt-1 inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-label font-semibold text-on-primary transition-func hover:brightness-110"
          >
            {action.label}
          </Link>
        ) : (
          <div className="mt-1">{action}</div>
        )
      ) : null}
    </div>
  );
}

/**
 * Error state tidak pernah menampilkan stack trace atau query (§10). Detail
 * ada di log server.
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
    <div role="alert" className="flex flex-col items-start gap-2 border-t border-border-subtle py-6">
      <p className="text-body font-semibold text-text">{title}</p>
      <p className="text-small text-text-muted">{description}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry} className="mt-1">
          Coba lagi
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Ditampilkan ketika pengguna sudah masuk tetapi tidak punya akses. Pesannya
 * sengaja tidak dibuat berbeda dari "tidak ditemukan" di halaman lain supaya
 * keberadaan konten tidak bocor (§9).
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
    <div className="flex flex-col items-start gap-3 py-8">
      <h1 className="text-h2 font-semibold text-text">Tidak tersedia</h1>
      <p className="text-body text-text-muted">{message}</p>
      <Link
        href={backHref}
        className="inline-flex min-h-11 items-center rounded-md border border-primary px-4 text-label font-semibold text-primary transition-func hover:bg-primary hover:text-on-primary"
      >
        {backLabel}
      </Link>
    </div>
  );
}
