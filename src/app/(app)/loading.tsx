import { SkeletonListPage } from '@/components/ui/Skeleton';

/**
 * Fallback terakhir untuk route di grup `(app)` yang tidak punya `loading.tsx`
 * sendiri.
 *
 * Route utama punya fallback khusus yang mengikuti bentuk halamannya (lihat
 * file `loading.tsx` di tiap route), jadi yang di sini sengaja dibuat netral:
 * judul halaman + judul section + daftar baris. Bentuk netral ini lebih jujur
 * daripada memakai skeleton khas Home untuk semua halaman.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat…</span>
      <SkeletonListPage rows={3} />
    </div>
  );
}