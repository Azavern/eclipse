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
          className={`${CARD_TIER_CLASSES.tertiary} ${CARD_INTERACTIVE} flex flex-col gap-0.5 p-4`}
        >
          <span className="text-body font-semibold text-text">{socialLinkName(link)}</span>
          <span className="text-small text-text-muted">{link.platform}</span>
        </a>
      ))}
    </div>
  );
}