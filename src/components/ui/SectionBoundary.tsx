'use client';

import { Component, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ErrorState } from './States';

type SectionBoundaryProps = {
  children: ReactNode;
  /** Judul error state; default-nya menyebut "section" supaya tidak menyesatkan. */
  title?: string;
  description?: string;
};

/**
 * Pemicu "Coba lagi". Dipisah dari class boundary supaya `useRouter` dipanggil
 * di komponen fungsi yang valid.
 *
 * Refresh Router penting: tanpa itu, subtree section hanya dirender ulang dari
 * payload RSC yang sama sehingga data yang tadi gagal tetap tidak ada.
 */
function SectionError({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry: () => void;
}) {
  const router = useRouter();

  return (
    <ErrorState
      title={title}
      description={description}
      onRetry={() => {
        onRetry();
        router.refresh();
      }}
    />
  );
}

/**
 * Error boundary per section (§15.1).
 *
 * Diletakkan DI LUAR `<Suspense>`: dengan susunan itu, kegagalan render satu
 * section berhenti di batas ini, sedangkan section yang datanya sudah selesai
 * tetap tampil. `error.tsx` di level grup route tetap menjadi jaring
 * pengaman terakhir untuk kegagalan yang lebih luas.
 */
export class SectionBoundary extends Component<SectionBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error & { digest?: string }) {
    // Digest aman dicatat sebagai pengenal korelasi; detail teknis tidak pernah
    // masuk ke UI.
    console.error('[render] section gagal', { digest: error.digest });
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <SectionError
        title={this.props.title ?? 'Bagian ini gagal dimuat'}
        description={
          this.props.description ??
          'Terjadi kesalahan saat mengambil data bagian ini. Bagian lain tetap bisa dibaca.'
        }
        onRetry={() => this.setState({ failed: false })}
      />
    );
  }
}