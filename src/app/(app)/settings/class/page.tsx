import { requirePermission } from '@/lib/visibility/server';
import { getClassLinks, getEditableClass } from '@/features/class/queries';
import { ClassIdentityForm } from '@/features/class/components/ClassIdentityForm';
import { ClassLinksEditor } from '@/features/class/components/ClassLinksEditor';
import { ClassImageUpload } from '@/features/class/components/ClassImageUpload';
import { StorageImage } from '@/components/storage/StorageImage';
import { PageHeader, Section } from '@/components/ui/Section';
import { NoAccess } from '@/components/ui/States';
import { SettingsBackLink } from '@/components/settings/SettingsBackLink';

export const dynamic = 'force-dynamic';

/**
 * Pengaturan identitas kelas — gate `class.manage` (§10).
 *
 * Row `classes` hanya terbaca oleh Ketua lewat RLS, sehingga gerbang
 * `requirePermission` dijalankan lebih dulu dan halaman ini tidak pernah
 * membaca data yang tidak berhak.
 */
export default async function SettingsClassPage() {
  const gate = await requirePermission('class.manage');
  if (!gate) {
    return <NoAccess message="Pengaturan kelas hanya untuk pengelola kelas." backHref="/" />;
  }

  // Keduanya independen: satu ronde, bukan dua.
  const [klass, links] = await Promise.all([getEditableClass(), getClassLinks()]);
  if (!klass) {
    return (
      <NoAccess
        message="Data kelas tidak terbaca. Muat ulang halaman."
        backHref="/"
        backLabel="Kembali"
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <SettingsBackLink />

      <PageHeader
        title="Identitas kelas"
        description="Nama, kode, deskripsi, dan zona waktu yang dipakai semua halaman."
      />

      <div className="max-w-form">
        <ClassIdentityForm
          defaults={{
            name: klass.name,
            code: klass.code,
            tagline: klass.tagline,
            description: klass.description,
            highlight_text: klass.highlight_text,
            highlight_url: klass.highlight_url,
            timezone: klass.timezone,
          }}
        />
      </div>

      <div className="flex max-w-content flex-col gap-10">
        <Section
          title="Gambar kelas"
          description="Logo dipakai di sidebar dan halaman masuk; cover dipakai sebagai latar beranda."
        >
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <StorageImage
                path={klass.logo_path}
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

            <div className="flex flex-col gap-3">
              <StorageImage
                path={klass.cover_path}
                alt="Cover kelas saat ini"
                width={1200}
                height={320}
                className="w-full max-w-md rounded-lg border border-border-subtle object-cover"
                fallback={
                  <div className="flex h-40 w-full max-w-md items-center justify-center rounded-lg border border-border-subtle text-caption text-text-muted">
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
      </div>

      <div className="max-w-content">
        <ClassLinksEditor
          links={links.map((l) => ({
            id: l.id,
            platform: l.platform,
            label: l.label,
            url: l.url,
          }))}
        />
      </div>
    </div>
  );
}
