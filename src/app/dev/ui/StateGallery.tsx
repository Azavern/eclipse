'use client';

import { useState } from 'react';
import { Button, ButtonLink, IconButton } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { FormField } from '@/components/ui/FormField';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState, ErrorState, NoAccess } from '@/components/ui/States';
import { SkeletonList, SkeletonText } from '@/components/ui/Skeleton';
import { PageHeader, Section } from '@/components/ui/Section';
import { Dialog } from '@/components/ui/Dialog';
import { Disclosure, DisclosureItem } from '@/components/ui/Disclosure';
import { Check, Clock, Trash2, X } from 'lucide-react';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t border-border-subtle pt-3">
      <p className="text-caption text-text-muted">{label}</p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

/**
 * Isi galeri state. Terpisah dari page.tsx karena memakai state klien, sedangkan
 * halaman rutenya tetap Server Component.
 */
export function StateGallery() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-10 px-4 py-8 lg:px-6">
      <PageHeader
        title="Galeri state"
        description="Setiap primitive pada setiap state. Halaman ini hanya ada di luar produksi."
      />

      <Section title="Button">
        <Row label="varian (default)">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </Row>
        <Row label="ukuran">
          <Button size="md">md</Button>
          <Button size="lg">lg</Button>
        </Row>
        <Row label="disabled">
          <Button disabled>Primary</Button>
          <Button variant="secondary" disabled>
            Secondary
          </Button>
          <Button variant="ghost" disabled>
            Ghost
          </Button>
          <Button variant="danger" disabled>
            Danger
          </Button>
        </Row>
        <Row label="loading (label tetap terbaca, aria-busy)">
          <Button loading>Menyimpan…</Button>
          <Button variant="secondary" loading>
            Memuat…
          </Button>
        </Row>
        <Row label="link">
          <ButtonLink href="/">Button link</ButtonLink>
        </Row>
        <Row label="ikon (label aksesibel wajib diisi)">
          <IconButton label="Hapus">
            <Trash2 aria-hidden="true" className="size-5" />
          </IconButton>
          <IconButton label="Tutup" variant="secondary" disabled>
            <X aria-hidden="true" className="size-5" />
          </IconButton>
        </Row>
      </Section>

      <Section title="Badge (ikon + teks, tidak hanya warna)">
        <Row label="tone">
          <Badge icon={<Clock aria-hidden="true" className="size-3.5" />}>Segera berakhir</Badge>
          <Badge tone="info">Aktif</Badge>
          <Badge tone="success" icon={<Check aria-hidden="true" className="size-3.5" />}>
            Selesai
          </Badge>
          <Badge tone="warning" icon={<Clock aria-hidden="true" className="size-3.5" />}>
            Lewat tenggat
          </Badge>
          <Badge tone="danger" icon={<X aria-hidden="true" className="size-3.5" />}>
            Diarsipkan
          </Badge>
        </Row>
      </Section>

      <Section title="Input" description="Semua state: default, filled, error, disabled.">
        <div className="grid gap-6 md:grid-cols-2">
          <FormField id="g-default" label="Default">
            {(describedBy) => (
              <Input id="g-default" placeholder="Placeholder" describedBy={describedBy} />
            )}
          </FormField>

          <FormField id="g-filled" label="Filled">
            {(describedBy) => (
              <Input id="g-filled" defaultValue="Nilai tersimpan" describedBy={describedBy} />
            )}
          </FormField>

          <FormField
            id="g-error"
            label="Error"
            required
            error="Isian ini tidak memenuhi aturan."
            hint="Hint tetap tampil bersama pesan error."
          >
            {(describedBy) => (
              <Input id="g-error" invalid describedBy={describedBy} defaultValue="Salah" />
            )}
          </FormField>

          <FormField id="g-disabled" label="Disabled">
            {(describedBy) => (
              <Input
                id="g-disabled"
                disabled
                describedBy={describedBy}
                defaultValue="Tidak bisa diubah"
              />
            )}
          </FormField>

          <FormField
            id="g-password"
            label="Password (tombol tampil/sembunyikan)"
            hint="aria-pressed tombol berubah, nilai sandi tidak pernah masuk state React."
          >
            {(describedBy) => (
              <PasswordInput
                id="g-password"
                describedBy={describedBy}
                autoComplete="new-password"
                defaultValue="RahasiaKelas"
              />
            )}
          </FormField>

          <FormField id="g-textarea" label="Textarea">
            {(describedBy) => (
              <Textarea
                id="g-textarea"
                rows={3}
                describedBy={describedBy}
                defaultValue={'Baris pertama\nBaris kedua — white-space: pre-line'}
              />
            )}
          </FormField>

          <FormField id="g-select" label="Select native">
            {(describedBy) => (
              <Select id="g-select" describedBy={describedBy} defaultValue="member">
                <option value="ketua">Ketua</option>
                <option value="member">Member</option>
              </Select>
            )}
          </FormField>
        </div>
      </Section>

      <Section title="Avatar (gambar, fallback inisial, ukuran)">
        <Row label="ukuran dan fallback">
          <Avatar name="Ahmad Fauzi" size="sm" />
          <Avatar name="Ahmad Fauzi" size="md" />
          <Avatar name="Rina Kartika" size="lg" />
          <Avatar name="Bagas Prasetyo" size="xl" />
        </Row>
      </Section>

      <Section title="Dialog dan Disclosure">
        <Row label="aksi">
          <Button onClick={() => setDialogOpen(true)}>Buka dialog</Button>
          <Disclosure label="Menu contoh" trigger={<span className="px-2">Disclosure</span>}>
            {(close) => (
              <>
                <DisclosureItem onSelect={close}>Item pertama</DisclosureItem>
                <DisclosureItem onSelect={close}>Item kedua</DisclosureItem>
              </>
            )}
          </Disclosure>
        </Row>
        <Row label="catatan">
          <span className="text-small text-text-muted">
            Dialog native memakai showModal(): fokus terperangkap, Escape menutup, dan fokus kembali
            ke pemicu. Layar penuh di mobile, terpusat di tablet/desktop.
          </span>
        </Row>
      </Section>

      <Section title="Empty dan error state">
        <EmptyState
          title="Belum ada event mendatang."
          description="Kegiatan kelas akan muncul di sini."
          action={{ href: '/events/new', label: 'Buat event' }}
        />
        <ErrorState />
        <div className="border-t border-border-subtle pt-4">
          <NoAccess />
        </div>
      </Section>

      <Section title="Skeleton (bentuk konten sebenarnya, tanpa animasi)">
        <SkeletonText lines={2} />
        <SkeletonList rows={2} />
      </Section>

      <Section title="Transition (spesifikasi tertulis, bukan frame)">
        <ul className="flex flex-col gap-2 text-small text-text-muted">
          <li>Dialog tutup → buka: opacity + translateY(8px→0), 150 ms, ease-out</li>
          <li>Dialog buka → tutup: opacity, 100 ms, ease-in</li>
          <li>Disclosure tutup → buka: opacity, 120 ms, ease-out</li>
          <li>Button → loading: instan (0 ms), hanya isi tombol yang berubah</li>
          <li>Skeleton → konten: 0 ms, tanpa animasi</li>
          <li>
            <code className="font-mono">prefers-reduced-motion: reduce</code> → semua durasi 0 ms
          </li>
        </ul>
      </Section>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Contoh dialog"
        description="Fokus terperangkap; Escape menutup."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => setDialogOpen(false)}>Simpan</Button>
          </>
        }
      >
        <p className="text-body text-text">
          Isi dialog. Tampilan layar penuh di mobile dan terpusat mulai tablet.
        </p>
      </Dialog>
    </div>
  );
}
