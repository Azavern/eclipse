'use client';

import { useActionState } from 'react';
import { uploadClassImage } from '@/features/class/actions';
import { MAX_IMAGE_BYTES, UPLOAD_ERROR_MESSAGE } from '@/lib/storage/magic-bytes';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { FormStatus } from '@/components/ui/FormStatus';
import { SubmitButton } from '@/components/ui/SubmitButton';

const ACCEPT = 'image/jpeg,image/png,image/webp';

/**
 * Form unggah satu gambar kelas.
 *
 * Validasi klien untuk UX saja; `uploadImage` di server mendeteksi magic bytes
 * lagi dan mengembalikan pesan yang sama bila tidak cocok (§14.1). Nama file dari
 * pengguna tidak pernah dipakai: path disusun di server dari UUID.
 */
export function ClassImageUpload({
  folder,
  label,
  hint,
}: {
  folder: 'logo' | 'cover';
  label: string;
  hint: string;
}) {
  const [state, action] = useActionState(uploadClassImage, null);
  const fieldErrors = state && !state.ok ? state.error.fieldErrors : undefined;
  const fileError = fieldErrors?.file?.[0];

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="folder" value={folder} />

      <FormStatus state={state} successMessage="Gambar kelas tersimpan." />

      <FormField id={`file-${folder}`} label={label} hint={hint} error={fileError} required>
        {(describedBy) => (
          <Input
            id={`file-${folder}`}
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
        {UPLOAD_ERROR_MESSAGE} Batas {Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB. Gambar disimpan
        di bucket privat dan disajikan lewat signed URL.
      </p>

      <SubmitButton pendingLabel="Mengunggah…">
        Unggah {folder === 'logo' ? 'logo' : 'cover'}
      </SubmitButton>
    </form>
  );
}
