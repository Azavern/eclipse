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
    <ul className="flex flex-col">
      {links.map((link) => (
        <li key={link.id} className="border-t border-border-subtle py-3 first:border-t-0">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-body text-primary underline"
          >
            {socialLinkName(link)}
            <span className="ms-2 text-small text-text-muted">{link.platform}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}