import { Skeleton, SkeletonPageHeader } from '@/components/ui/Skeleton';

/** Fallback instan untuk /class: judul, cover, paragraf, lalu daftar tautan. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <SkeletonPageHeader />
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
    </div>
  );
}
