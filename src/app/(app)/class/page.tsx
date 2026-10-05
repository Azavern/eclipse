import { requireView, canShow } from '@/lib/visibility/server';
import { getClassIdentity, getClassLinks } from '@/features/class/queries';
import { PageHeader, Section, List, ListItem } from '@/components/ui/Section';
import { VisuallyHidden } from '@/components/ui/VisuallyHidden';
import { StorageImage } from '@/components/storage/StorageImage';
import { formatDateTime } from '@/lib/time';

export const dynamic = 'force-dynamic';

/**
 * Halaman "Tentang Kelas" — publik pada konfigurasi default.
 *
 * Setiap field punya key visibility sendiri (`field.class.*`). Kolom yang tidak
 * terlihat tiba di sini sebagai NULL, jadi field TIDAK boleh dirender sebagai
 * label kosong: "ada tapi disembunyikan" itu bocor (§7.8). Karena itu setiap
 * blok hanya dirender ketika `canShow` DAN nilainya benar-benar ada.
 */
export default async function ClassPage() {
  await requireView('page.class_about', '/class');

  // Identitas, peta visibilitas, dan tautan diambil dalam satu ronde. Tautan
  // sendiri sudah disaring RLS menurut `section.class.links`, jadi Aman
  // dipanggil tanpa menunggu keputusan `canShow` — viewer yang tidak berhak
  // menerima 0 baris, bukan tautan yang bocor.
  const [identity, showCode, showTagline, showDescription, showHighlight, showLinks, links] =
    await Promise.all([
      getClassIdentity(),
      canShow('field.class.code'),
      canShow('field.class.tagline'),
      canShow('field.class.description'),
      canShow('field.class.highlight'),
      canShow('section.class.links'),
      getClassLinks(),
    ]);

  if (!identity) {
    return (
      <p className="text-body text-text-muted">
        Identitas kelas belum tersedia. Coba lagi beberapa saat lagi.
      </p>
    );
  }

  // Section yang tidak terlihat tidak boleh dirender, walaupun RLS mengizinkan.
  const visibleLinks = showLinks ? links : [];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={identity.name}
        // Tagline tetap di-gate di sini, tidak hanya mengandalkan NULL dari view:
        // kalau aturan visibility berubah, halaman ini tidak ikut membocorkan (§7.8).
        description={showTagline ? (identity.tagline ?? undefined) : undefined}
      />

      {identity.cover_path ? (
        <StorageImage
          path={identity.cover_path}
          alt=""
          width={1200}
          height={400}
          priority
          className="w-full rounded-lg object-cover"
        />
      ) : null}

      {showHighlight && identity.highlight_text ? (
        <p className="border-l-2 border-primary pl-4 font-display text-h3 text-text">
          {identity.highlight_text}
          {identity.highlight_url ? (
            <a
              href={identity.highlight_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              <VisuallyHidden>Buka tautan sorotan</VisuallyHidden>
              <span aria-hidden="true">↗</span>
            </a>
          ) : null}
        </p>
      ) : null}

      {showDescription && identity.description ? (
        <p className="whitespace-pre-line text-body text-text">{identity.description}</p>
      ) : null}

      {showCode && identity.code ? (
        <p className="text-small text-text-muted">
          <span className="font-semibold text-text">Kode kelas:</span> {identity.code}
        </p>
      ) : null}

      {showLinks ? (
        <Section title="Tautan kelas" description="Kontak dan media sosial kelas.">
          {visibleLinks.length === 0 ? (
            <p className="py-4 text-small text-text-muted">Belum ada tautan yang ditambahkan.</p>
          ) : (
            <List>
              {visibleLinks.map((link) => (
                <ListItem key={link.id}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-body text-primary underline"
                  >
                    {link.label}
                    <span className="ms-2 text-small text-text-muted">{link.platform}</span>
                  </a>
                </ListItem>
              ))}
            </List>
          )}
        </Section>
      ) : null}

      <p className="text-caption text-text-muted">
        Zona waktu kelas: {identity.timezone}
        {` · waktu di kelas ${formatDateTime(new Date().toISOString(), identity.timezone)}`}
      </p>
    </div>
  );
}
