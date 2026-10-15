import { ArrowUpRight, Link2 } from 'lucide-react';
import { CARD_INTERACTIVE, CARD_TIER_CLASSES } from '@/components/ui/Card';
import { SOCIAL_PLATFORM_LABEL, type SocialPlatformName } from '@/lib/social';
import type { SocialLinkRow } from '../queries';

/**
 * Nama yang ditampilkan: label kalau ada, kalau tidak nama platform.
 * Baris `website` dan `custom` boleh lebih dari satu, jadi label tetap dipakai
 * pada keduanya.
 */
export function socialLinkName(link: SocialLinkRow): string {
  return link.label?.trim() || SOCIAL_PLATFORM_LABEL[link.platform as SocialPlatformName] || link.platform;
}

/**
 * Daftar tautan sosial yang terlihat oleh viewer ini.
 *
 * Baris yang tidak terlihat tidak pernah sampai ke sini: RLS `social_select`
 * sudah menyaringnya. Untuk tautan milik viewer sendiri di halaman pengaturan,
 * komponen ini juga dipakai ulang agar daftar tampilannya sama.
 *
 * Tautan keluar selalu `noopener noreferrer` supaya halaman tujuan tidak
 * mengambil alih jendela ini atau membaca `window.opener` (§9).
 *
 * Tiap tautan adalah satu unit informasi, dan seluruh permukaan kartunya memang
 * bisa diklik — jadi inilah salah satu tempat yang memasang `CARD_INTERACTIVE`:
 * hover di sini menjanjikan sesuatu yang benar-benar terjadi.
 */
export function SocialLinks({ links }: { links: SocialLinkRow[] }) {
  if (links.length === 0) {
    return (
      <p className="py-4 text-small text-text-muted">
        Belum ada tautan sosial yang ditambahkan.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {links.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${CARD_TIER_CLASSES.tertiary} ${CARD_INTERACTIVE} flex items-center gap-3 p-4`}
        >
          <span className="icon-tile size-10" aria-hidden="true">
            <Link2 className="size-5" />
          </span>

          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-body font-semibold text-text">
              {socialLinkName(link)}
            </span>
            <span className="truncate text-small text-text-muted">{link.platform}</span>
          </span>

          {/* Panah menandai bahwa tautan ini membuka halaman lain. */}
          <ArrowUpRight aria-hidden="true" className="size-5 shrink-0 text-text-muted" />
        </a>
      ))}
    </div>
  );
}