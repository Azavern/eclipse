'use client';

import { useActionState, useState } from 'react';
import { createClassLink, deleteClassLink, updateClassLink } from '@/features/class/actions';
import {
  CLASS_LINK_PLATFORMS,
  CLASS_LINK_PLATFORM_LABEL,
  type ClassLinkPlatform,
} from '@/features/class/schemas';
import { FormField } from '@/components/ui/FormField';
import { Input, Select } from '@/components/ui/Input';
import { FormStatus } from '@/components/ui/FormStatus';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import type { FormState } from '@/lib/result';

export type ClassLinkRow = {
  id: string;
  platform: string;
  label: string | null;
  url: string;
};

/** Nama yang ditampilkan: label kalau ada, kalau tidak nama platform. */
function displayName(link: ClassLinkRow): string {
  return (
    link.label?.trim() ||
    CLASS_LINK_PLATFORM_LABEL[link.platform as ClassLinkPlatform] ||
    link.platform
  );
}

function platformFields(state: FormState) {
  return state && !state.ok ? state.error.fieldErrors : undefined;
}

/** Form tambah tautan baru. */
function AddLinkForm() {
  const [state, action] = useActionState(createClassLink, null);
  const [platform, setPlatform] = useState<ClassLinkPlatform>('instagram');
  const errors = platformFields(state);
  const first = (name: string) => errors?.[name]?.[0];

  // Label hanya bermakna untuk platform "Lainnya"; platform lain memakai nama
  // platformnya sendiri supaya baris tidak perlu label dummy.
  const needsLabel = platform === 'custom';

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormStatus state={state} successMessage="Tautan kelas ditambahkan." />

      <FormField id="new-link-platform" label="Platform" error={first('platform')} required>
        {(describedBy) => (
          <Select
            id="new-link-platform"
            name="platform"
            value={platform}
            describedBy={describedBy}
            invalid={Boolean(first('platform'))}
            onChange={(event) => setPlatform(event.target.value as ClassLinkPlatform)}
          >
            {CLASS_LINK_PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {CLASS_LINK_PLATFORM_LABEL[p]}
              </option>
            ))}
          </Select>
        )}
      </FormField>

      {needsLabel ? (
        <FormField id="new-link-label" label="Label" error={first('label')} required>
          {(describedBy) => (
            <Input
              id="new-link-label"
              name="label"
              required
              maxLength={40}
              invalid={Boolean(first('label'))}
              describedBy={describedBy}
            />
          )}
        </FormField>
      ) : null}

      <FormField
        id="new-link-url"
        label="Tautan"
        hint="Harus diawali https://."
        error={first('url')}
        required
      >
        {(describedBy) => (
          <Input
            id="new-link-url"
            name="url"
            type="url"
            inputMode="url"
            required
            maxLength={2048}
            placeholder={platform === 'instagram' ? 'https://instagram.com/namakelas' : undefined}
            invalid={Boolean(first('url'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <SubmitButton pendingLabel="Menyimpan…">Tambah tautan</SubmitButton>
    </form>
  );
}

/** Satu baris tautan: ubah platform/label/url, atau hapus. */
function ClassLinkRowEditor({ link }: { link: ClassLinkRow }) {
  const [updateState, updateAction] = useActionState(updateClassLink, null);
  const [removeState, removeAction] = useActionState(deleteClassLink, null);
  const [confirming, setConfirming] = useState(false);

  const errors = platformFields(updateState);
  const first = (name: string) => errors?.[name]?.[0];

  return (
    <div className="flex flex-col gap-3 border-t border-border-subtle py-4 first:border-t-0">
      <FormStatus state={removeState} successMessage="Tautan kelas dihapus." />

      <form action={updateAction} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={link.id} />

        <FormField
          id={`link-platform-${link.id}`}
          label="Platform"
          error={first('platform')}
          required
        >
          {(describedBy) => (
            <Select
              id={`link-platform-${link.id}`}
              name="platform"
              defaultValue={link.platform}
              describedBy={describedBy}
              invalid={Boolean(first('platform'))}
            >
              {CLASS_LINK_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {CLASS_LINK_PLATFORM_LABEL[p]}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField
          id={`link-label-${link.id}`}
          label="Label"
          hint="Wajib bila platformnya “Lainnya”."
          error={first('label')}
        >
          {(describedBy) => (
            <Input
              id={`link-label-${link.id}`}
              name="label"
              maxLength={40}
              defaultValue={link.label ?? ''}
              invalid={Boolean(first('label'))}
              describedBy={describedBy}
            />
          )}
        </FormField>

        <FormField id={`link-url-${link.id}`} label="Tautan" error={first('url')} required>
          {(describedBy) => (
            <Input
              id={`link-url-${link.id}`}
              name="url"
              type="url"
              inputMode="url"
              required
              maxLength={2048}
              defaultValue={link.url}
              invalid={Boolean(first('url'))}
              describedBy={describedBy}
            />
          )}
        </FormField>

        <FormStatus state={updateState} successMessage="Tautan kelas tersimpan." />

        <div className="flex flex-wrap gap-2">
          <SubmitButton pendingLabel="Menyimpan…" size="md">
            Simpan tautan
          </SubmitButton>
          <Button type="button" variant="danger" onClick={() => setConfirming(true)}>
            Hapus
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={async () => {
          setConfirming(false);
          // FormData dipakai agar Server Action menerima id lewat isian form,
          // bukan lewat closure yang tidak bisa dikirim ke server.
          const fd = new FormData();
          fd.set('id', link.id);
          await removeAction(fd);
        }}
        title={`Hapus tautan ${displayName(link)}?`}
        consequence="Tautan ini akan dihapus permanen dan tidak dapat dibatalkan."
        confirmLabel="Hapus tautan"
        pendingLabel="Menghapus…"
      />
    </div>
  );
}

/**
 * Kelola tautan kelas.
 *
 * Tautan dibaca RLS lewat `section.class.links`, jadi baris yang tidak terlihat
 * tidak pernah sampai di sini bahkan untuk Ketua.
 */
export function ClassLinksEditor({ links }: { links: ClassLinkRow[] }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h2 className="text-h2 font-semibold text-text">Tautan kelas</h2>

        {links.length === 0 ? (
          <p className="text-small text-text-muted">
            Belum ada tautan. Tambah kontak atau media sosial kelas di bawah ini.
          </p>
        ) : (
          links.map((link) => <ClassLinkRowEditor key={link.id} link={link} />)
        )}
      </div>

      <div className="flex flex-col gap-4 border-t border-border-subtle pt-6">
        <h3 className="text-h3 font-semibold text-text">Tambah tautan</h3>
        <AddLinkForm />
      </div>
    </div>
  );
}
