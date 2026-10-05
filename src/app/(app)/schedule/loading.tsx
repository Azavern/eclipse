import { SkeletonListPage } from '@/components/ui/Skeleton';

/**
 * Fallback instan untuk navigasi ke /schedule.
 *
 * Skeleton memakai bentuk yang sama dengan halaman aslinya (judul halaman +
 * judul section + baris daftar), jadi tidak ada lompatan layout saat data tiba.
 */
export default function Loading() {
  return <SkeletonListPage rows={4} />;
}
