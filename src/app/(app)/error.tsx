'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/States';

/**
 * Error boundary per route group. Tanpa stack trace di UI — detail teknis ada
 * di log server (§10).
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Digest adalah pengenal korelasi yang aman untuk dicatat (tanpa PII).
    console.error('[render] halaman gagal', { digest: error.digest });
  }, [error]);

  return <ErrorState onRetry={reset} />;
}
