import { Skeleton, SkeletonList, SkeletonText } from '@/components/ui/Skeleton';

/**
 * Loading memakai Skeleton yang bentuknya sama dengan konten sebenarnya, bukan
 * spinner layar penuh (§15.1). Tanpa animasi: skeleton -> konten 0 ms (§11.4).
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat beranda…</span>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-2/3" />
        <SkeletonText lines={2} />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-40" />
        <SkeletonList rows={3} />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-40" />
        <SkeletonList rows={3} />
      </div>
    </div>
  );
}
