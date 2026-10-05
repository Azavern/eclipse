import { SkeletonFormPage } from '@/components/ui/Skeleton';

/** Fallback instan untuk /settings/visibility: judul + daftar pilihan. */
export default function Loading() {
  return <SkeletonFormPage fields={8} />;
}
