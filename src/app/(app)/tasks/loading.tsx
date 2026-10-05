import { SkeletonListPage } from '@/components/ui/Skeleton';

/** Fallback instan untuk /tasks: judul + tab + daftar baris. */
export default function Loading() {
  return <SkeletonListPage rows={4} />;
}
