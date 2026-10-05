'use client';

import { useActionState } from 'react';
import { uploadMyAvatar } from '@/features/member/actions';
import { MAX_IMAGE_BYTES, UPLOAD_ERROR_MESSAGE } from '@/lib/storage/magic-bytes';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { FormStatus } from '@/components/ui/FormStatus';
import { SubmitButton } from '@/components/ui/SubmitButton';

const ACCEPT = 'image/jpeg,image/png,image/webp';

/**
 * Form unggah avatar. Bucket `member-media` dipakai terpisah dari
 * `class-media` supaya policy Storage bisa membedakan pemilik objeknya.
 */
export function AvatarUpload() {
  const [state, action] = useActionState(uploadMyAvatar, null);
  const fileError = state && !state.ok ? state.error.fieldErrors?.file?.[0] : undefined;

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormStatus state={state} />

      <FormField id="avatar" label="Foto profil" error={fileError} required>
        {(describedBy) => (
          <Input
            id="avatar"
            name="file"
            type="file"
            accept={ACCEPT}
            required
            invalid={Boolean(fileError)}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <p className="text-caption text-text-muted">
        {UPLOAD_ERROR_MESSAGE} Batas {Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB.
      </p>

      <SubmitButton pendingLabel="Mengunggah…">Unggah foto</SubmitButton>
    </form>
  );
}
