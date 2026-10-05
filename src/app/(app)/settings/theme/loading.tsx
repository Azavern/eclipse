import { SkeletonFormPage } from '@/components/ui/Skeleton';

/** Fallback instan untuk /settings/theme: judul + form tema. */
export default function Loading() {
  return <SkeletonFormPage fields={6} />;
}
