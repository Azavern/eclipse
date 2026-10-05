import { SkeletonFormPage } from '@/components/ui/Skeleton';

/** Fallback instan untuk /settings/account: judul + satu form. */
export default function Loading() {
  return <SkeletonFormPage fields={3} />;
}
