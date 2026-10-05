'use client';

import { useActionState, useState } from 'react';
import { createSocialLink, deleteSocialLink, updateSocialLink } from '@/features/social/actions';
import { needsLabel, SOCIAL_PLATFORM_EXAMPLE } from '@/features/social/schemas';
import type { SocialLinkRow } from '@/features/social/queries';
import { SOCIAL_PLATFORMS, SOCIAL_PLATFORM_LABEL, type SocialPlatformName } from '@/lib/social';
import { AudienceSelect } from '@/components/visibility/AudienceSelect';
import type { VisibilityEntry, VisibilityKey } from '@/lib/visibility/registry';
import { FormField } from '@/components/ui/FormField';
import { Input, Select } from '@/components/ui/Input';
import { FormStatus } from '@/components/ui/FormStatus';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import type { FormState } from '@/lib/result';

/** Nama tampilan: label kalau ada, kalau tidak nama platform. */
function displayName(link: SocialLinkRow): string {
  return (
    link.label?.trim() ||
    SOCIAL_PLATFORM_LABEL[link.platform as SocialPlatformName] ||
    link.platform
  );
}

function fieldErrors(state: FormState): Record<string, string[]> | undefined {
  return state && !state.ok ? state.error.fieldErrors : undefined;
}

/** Satu baris tautan milik anggota sendiri: ubah platform/label/url/visibilitas, atau hapus. */
function SocialLinkRowEditor({
  link,
  map,
}: {
  link: SocialLinkRow;
  map: Record<VisibilityKey, VisibilityEntry>;
}) {
  const [updateState, updateAction] = useActionState(updateSocialLink, null);
  const [removeState, removeAction] = useActionState(deleteSocialLink, null);
  const [confirming, setConfirming] = useState(false);

  const errors = fieldErrors(updateState);
  const first = (name: string) => errors?.[name]?.[0];

  return (
    <div className="flex flex-col gap-3 border-t border-border-subtle py-4 first:border-t-0">
      <FormStatus state={removeState} successMessage="Tautan dihapus." />

      <form action={updateAction} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={link.id} />

        <FormField id={`social-platform-${link.id}`} label="Platform" error={first('platform')} required>
          {(describedBy) => (
            <Select
              id={`social-platform-${link.id}`}
              name="platform"
              defaultValue={link.platform}
              describedBy={describedBy}
              invalid={Boolean(first('platform'))}
            >
              {SOCIAL_PLATFORMS.map((platform) => (
                <option key={platform} value={platform}>
                  {SOCIAL_PLATFORM_LABEL[platform]}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField
          id={`social-label-${link.id}`}
          label="Label"
          hint="Wajib bila platformnya “Lainnya”."
          error={first('label')}
        >
          {(describedBy) => (
            <Input
              id={`social-label-${link.id}`}
              name="label"
              maxLength={40}
              defaultValue={link.label ?? ''}
              invalid={Boolean(first('label'))}
              describedBy={describedBy}
            />
          )}
        </FormField>

        <FormField
          id={`social-url-${link.id}`}
          label="Tautan"
          hint="Harus diawali https://."
          error={first('url')}
          required
        >
          {(describedBy) => (
            <Input
              id={`social-url-${link.id}`}
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

        <FormField
          id={`social-visibility-${link.id}`}
          label="Siapa yang boleh melihat tautan ini"
          error={first('visibility')}
        >
          {() => (
            <AudienceSelect
              id={`social-visibility-${link.id}`}
              name="visibility"
              visibilityKey="item.social_link"
              value={link.visibility ?? ''}
              map={map}
              defaultLabel="Ikut aturan tautan sosial"
              invalid={Boolean(first('visibility'))}
            />
          )}
        </FormField>

        <FormStatus state={updateState} successMessage="Tautan tersimpan." />

        <div className="flex flex-wrap gap-2">
          <SubmitButton pendingLabel="Menyimpan…">Simpan tautan</SubmitButton>
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
          // FormData dipakai karena Server Action menerima id lewat isian form,
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

/** Form tambah tautan baru. */
function AddSocialLinkForm({ map }: { map: Record<VisibilityKey, VisibilityEntry> }) {
  const [state, action] = useActionState(createSocialLink, null);
  const [platform, setPlatform] = useState<SocialPlatformName>('instagram');

  const errors = fieldErrors(state);
  const first = (name: string) => errors?.[name]?.[0];

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormStatus state={state} successMessage="Tautan ditambahkan." />

      <FormField id="new-social-platform" label="Platform" error={first('platform')} required>
        {(describedBy) => (
          <Select
            id="new-social-platform"
            name="platform"
            value={platform}
            describedBy={describedBy}
            invalid={Boolean(first('platform'))}
            onChange={(event) => setPlatform(event.target.value as SocialPlatformName)}
          >
            {SOCIAL_PLATFORMS.map((value) => (
              <option key={value} value={value}>
                {SOCIAL_PLATFORM_LABEL[value]}
              </option>
            ))}
          </Select>
        )}
      </FormField>

      {needsLabel(platform) ? (
        <FormField id="new-social-label" label="Label" error={first('label')} required>
          {(describedBy) => (
            <Input
              id="new-social-label"
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
        id="new-social-url"
        label="Tautan"
        hint="Harus diawali https://."
        error={first('url')}
        required
      >
        {(describedBy) => (
          <Input
            id="new-social-url"
            name="url"
            type="url"
            inputMode="url"
            required
            maxLength={2048}
            placeholder={SOCIAL_PLATFORM_EXAMPLE[platform]}
            invalid={Boolean(first('url'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField
        id="new-social-visibility"
        label="Siapa yang boleh melihat tautan ini"
        error={first('visibility')}
      >
        {() => (
          <AudienceSelect
            id="new-social-visibility"
            name="visibility"
            visibilityKey="item.social_link"
            value=""
            map={map}
            defaultLabel="Ikut aturan tautan sosial"
            invalid={Boolean(first('visibility'))}
          />
        )}
      </FormField>

      <SubmitButton pendingLabel="Menyimpan…">Tambah tautan</SubmitButton>
    </form>
  );
}

/**
 * Kelola tautan sosial milik anggota sendiri.
 *
 * Baris yang tampil adalah baris yang lolos RLS untuk viewer ini, jadi anggota
 * yang baru dinonaktifkan langsung kehilangan akses edit-nya juga (§7.2).
 */
export function SocialLinksEditor({
  links,
  map,
}: {
  links: SocialLinkRow[];
  map: Record<VisibilityKey, VisibilityEntry>;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        {links.length === 0 ? (
          <p className="text-small text-text-muted">
            Belum ada tautan. Tambahkan kontak atau media sosialmu di bawah ini.
          </p>
        ) : (
          links.map((link) => <SocialLinkRowEditor key={link.id} link={link} map={map} />)
        )}
      </div>

      <div className="flex flex-col gap-4 border-t border-border-subtle pt-6">
        <h3 className="text-h3 font-semibold text-text">Tambah tautan</h3>
        <AddSocialLinkForm map={map} />
      </div>
    </div>
  );
}