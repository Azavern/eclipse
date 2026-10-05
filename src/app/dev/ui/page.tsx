import { notFound } from 'next/navigation';
import { env } from '@/lib/env';
import { StateGallery } from './StateGallery';

export const dynamic = 'force-dynamic';

/**
 * Galeri state (blueprint §11.3).
 *
 * DESIGN.md §6 mewajibkan setiap komponen interaktif punya state yang benar-benar
 * didesain, bukan hanya didaftar. Halaman ini merender SETIAP primitive pada
 * SETIAP state-nya supaya bisa ditinjau langsung: kontras, fokus, label, dan
 * perilaku keyboard.
 *
 * Tidak pernah dikirim ke produksi: `notFound()` di produksi (§10).
 *
 * Halaman ini Server Component; isi yang butuh interaksi ada di StateGallery
 * ('use client').
 */
export default function DevUiPage() {
  if (env.IS_PROD) notFound();
  return <StateGallery />;
}
