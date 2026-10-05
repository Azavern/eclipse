import { SkeletonCardGrid, SkeletonPageHeader } from '@/components/ui/Skeleton';

/** Fallback instan untuk /members: judul + grid kartu anggota. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <SkeletonPageHeader />
      <SkeletonCardGrid items={6} />
    </div>
  );
}
