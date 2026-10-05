import { SkeletonListPage } from '@/components/ui/Skeleton';

/** Fallback instan untuk /settings/members: judul + baris tabel anggota. */
export default function Loading() {
  return <SkeletonListPage rows={6} />;
}
