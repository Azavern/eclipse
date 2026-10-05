import { SkeletonFormPage, SkeletonListPage } from '@/components/ui/Skeleton';

/** Fallback instan untuk /settings/class: judul + form identitas + daftar tautan. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-10">
      <SkeletonFormPage fields={4} />
      <SkeletonListPage rows={2} />
    </div>
  );
}
