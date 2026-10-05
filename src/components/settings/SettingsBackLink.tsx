import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

/**
 * Jalur kembali ke daftar pengaturan.
 *
 * Dirender di atas setiap halaman `/settings/**` supaya jalur aksesnya jelas
 * dari mana pun: halaman detail → "Semua pengaturan" → halaman lain. Tanpa
 * ini, `/settings/class`, `/settings/theme`, `/settings/visibility`, dan
 * `/settings/members` hanya bisa dijangkau dengan mengetik URL.
 */
export function SettingsBackLink() {
  return (
    <Link
      href="/settings"
      className="inline-flex min-h-11 items-center gap-1 text-label font-semibold text-primary underline underline-offset-4"
    >
      <ChevronLeft aria-hidden="true" className="size-4" />
      Semua pengaturan
    </Link>
  );
}