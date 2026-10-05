import { SkeletonFormPage, SkeletonListPage } from '@/components/ui/Skeleton';

/**
 * Fallback instan untuk /settings/profile.
 *
 * Bentuknya mengikuti halaman: judul, dua blok form (identitas), lalu daftar
 * section yang sedang dimuat.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-10">
      <SkeletonFormPage fields={4} />
      <SkeletonListPage rows={2} />
    </div>
  );
}
