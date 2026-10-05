import {
  Skeleton,
  SkeletonPageHeader,
  SkeletonSectionTitle,
} from '@/components/ui/Skeleton';

/** Fallback instan untuk profil publik: judul, baris identitas, lalu daftar. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <SkeletonPageHeader />
      <div aria-hidden="true" className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <SkeletonSectionTitle rows={3} />
    </div>
  );
}
