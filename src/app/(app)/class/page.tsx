import { requireView, canShow, getViewer } from '@/lib/visibility/server';
import { getClassIdentity, getEditableClass, getClassLinks } from '@/features/class/queries';
import { ClassIdentityForm } from '@/features/class/components/ClassIdentityForm';
import { ClassLinksEditor } from '@/features/class/components/ClassLinksEditor';
import { ClassImageUpload } from '@/features/class/components/ClassImageUpload';
import { PageHeader, Section } from '@/components/ui/Section';
import { CARD_INTERACTIVE, CARD_TIER_CLASSES } from '@/components/ui/Card';
import { VisuallyHidden } from '@/components/ui/VisuallyHidden';
import { StorageImage } from '@/components/storage/StorageImage';
import { formatDateTime } from '@/lib/time';

export const dynamic = 'force-dynamic';

/**
 * Halaman kelas: **satu** tempat untuk mengatur kelas dan melihat hasilnya.
 *
 * Sebelumnya pengaturan kelas ada di `/settings/class` sementara `/class` hanya
 * menampilkan hasil bacanya — dua halaman mirip nama dengan pintu masuk yang
 * tidak jelas. Permintaan Knotus: seluruh CRUD kelas pindah ke sini dan
 * `/settings/class` dihapus.
 *
 * Dua bagian dengan syarat berbeda, dipisahkan tegas:
 *  1. Bagian di atas hanya dirender bila viewer punya `class.manage`. Di
 *     sinilah isi kelas ditulis.
 *  2. "Tampilan publik" — apa yang dilihat pengunjung tanpa login, mengikuti
 *     aturan visibilitas per field (`field.class.*`).
 *
 * Kolom yang tidak terlihat tiba di sini sebagai NULL, jadi field TIDAK boleh
 * dirender sebagai label kosong: "ada tapi disembunyikan" itu bocor (§7.8).
 * Karena itu setiap blok hanya dirender ketika `canShow` DAN nilainya ada.
 */
export default async function ClassPage() {
  await requireView('page.class_about', '/class');

  const viewer = await getViewer();
  const canManage = viewer.can('class.manage');

  // Identitas, peta visibilitas, dan tautan diambil dalam satu ronde. Tautan
  // sendiri sudah disaring RLS menurut `section.class.links`, jadi aman
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

  // Baris `classes` hanya terbaca pengelola lewat RLS, jadi baru diambil ketika
  // memang boleh mengubahnya.
  const editable = canManage ? await getEditableClass() : null;

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
    <div className="card-grid">
      <PageHeader
        // Judul untuk pengelola sama dengan nama entri di indeks pengaturan
        // ("Identitas kelas"), supaya satu fungsi tidak punya dua nama (§10.1).
        title={canManage ? 'Identitas kelas' : identity.name}
        description={
          canManage
            ? 'Semua yang muncul di beranda diatur di sini: nama, kode, deskripsi, gambar, dan tautan kelas.'
            : showTagline
              ? (identity.tagline ?? undefined)
              : undefined
        }
      />

      {editable ? (
        <>
          <Section
            tier="primary"
            title="Identitas kelas"
            description="Nama, kode, tagline, deskripsi, sorotan, dan zona waktu yang dipakai semua halaman."
          >
            <div className="max-w-form">
              <ClassIdentityForm
                defaults={{
                  name: editable.name,
                  code: editable.code,
                  tagline: editable.tagline,
                  description: editable.description,
                  highlight_text: editable.highlight_text,
                  highlight_url: editable.highlight_url,
                  timezone: editable.timezone,
                }}
              />
            </div>
          </Section>

          <Section
            tier="secondary"
            title="Gambar kelas"
            description="Logo dipakai di sidebar dan halaman masuk; cover dipakai sebagai latar beranda."
          >
            <div className="flex flex-col gap-8">
              <div className="flex max-w-md flex-col gap-3">
                <StorageImage
                  path={editable.logo_path}
                  alt="Logo kelas saat ini"
                  width={96}
                  height={96}
                  className="size-24 rounded-lg border border-border-subtle object-contain"
                  fallback={
                    <div className="flex size-24 items-center justify-center rounded-lg border border-border-subtle text-caption text-text-muted">
                      Belum ada logo
                    </div>
                  }
                />
                <ClassImageUpload
                  folder="logo"
                  label="Logo kelas"
                  hint="Diganti seluruhnya setiap kali kamu mengunggah yang baru."
                />
              </div>

              <div className="flex max-w-md flex-col gap-3">
                <StorageImage
                  path={editable.cover_path}
                  alt="Cover kelas saat ini"
                  width={1200}
                  height={320}
                  className="h-40 w-full rounded-lg border border-border-subtle object-cover"
                  fallback={
                    <div className="flex h-40 w-full items-center justify-center rounded-lg border border-border-subtle text-caption text-text-muted">
                      Belum ada cover
                    </div>
                  }
                />
                <ClassImageUpload
                  folder="cover"
                  label="Cover kelas"
                  hint="Diganti seluruhnya setiap kali kamu mengunggah yang baru."
                />
              </div>
            </div>
          </Section>

          <Section
            tier="secondary"
            title="Tautan kontak kelas"
            description="Media sosial dan kontak kelas. Tautan yang tampil ke pengunjung tetap mengikuti aturan visibilitas."
          >
            <ClassLinksEditor
              links={visibleLinks.map((l) => ({
                id: l.id,
                platform: l.platform,
                label: l.label,
                url: l.url,
              }))}
            />
          </Section>
        </>
      ) : null}

      {/*
        Pratinjau apa adanya: inilah yang dibaca pengunjung tanpa login, jadi
        seluruh isinya tetap mengikuti aturan visibilitas per field.
      */}
      <Section
        tier="tertiary"
        title="Tampilan publik"
        description="Inilah yang dilihat pengunjung yang belum masuk."
      >
        <div className="flex flex-col gap-4">
          {identity.cover_path ? (
            <StorageImage
              path={identity.cover_path}
              alt=""
              width={1200}
              height={400}
              className="w-full max-w-content rounded-lg object-cover"
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
            visibleLinks.length === 0 ? (
              <p className="text-small text-text-muted">Belum ada tautan yang ditambahkan.</p>
            ) : (
              /*
                Tiap tautan satu kartu, dan seluruh permukaannya memang bisa
                diklik, jadi `CARD_INTERACTIVE` di sini bukan sinyal palsu.
              */
              <div className="flex flex-col gap-3">
                {visibleLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${CARD_TIER_CLASSES.tertiary} ${CARD_INTERACTIVE} flex flex-col gap-0.5 p-4`}
                  >
                    <span className="text-body font-semibold text-text">{link.label}</span>
                    <span className="text-small text-text-muted">{link.platform}</span>
                  </a>
                ))}
              </div>
            )
          ) : null}

          {!identity.tagline && !identity.description && !identity.code ? (
            <p className="text-small text-text-muted">
              Baru nama kelas yang terisi. Isi tagline atau deskripsi di atas supaya pengunjung
              tanpa login punya sesuatu untuk dibaca.
            </p>
          ) : null}

          <p className="text-caption text-text-muted">
            Zona waktu kelas: {identity.timezone}
            {` · waktu di kelas ${formatDateTime(new Date().toISOString(), identity.timezone)}`}
          </p>
        </div>
      </Section>
    </div>
  );
}