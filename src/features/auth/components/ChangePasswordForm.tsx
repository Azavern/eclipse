'use client';

import { useActionState } from 'react';
import { changePassword } from '@/features/auth/actions';
import { PASSWORD_MIN } from '@/lib/validation';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { FormStatus } from '@/components/ui/FormStatus';
import { SubmitButton } from '@/components/ui/SubmitButton';

/**
 * Ganti kata sandi dari sesi login biasa.
 *
 * Password lama wajib diisi — aksi `changePassword` melakukan re-auth dengan
 * `signInWithPassword` sebelum `updateUser`, karena sesi yang sudah ada saja
 * tidak cukup untuk mengganti kredensial (§6.2).
 */
export function ChangePasswordForm() {
  const [state, action] = useActionState(changePassword, null);

  const fieldErrors = state && !state.ok ? state.error.fieldErrors : undefined;
  const first = (name: string) => fieldErrors?.[name]?.[0];

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormStatus state={state} />

      <FormField
        id="currentPassword"
        label="Kata sandi sekarang"
        error={first('currentPassword')}
        required
      >
        {(describedBy) => (
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            invalid={Boolean(first('currentPassword'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField
        id="password"
        label="Kata sandi baru"
        hint={`Minimal ${PASSWORD_MIN} karakter. Jangan pakai yang sama seperti sekarang.`}
        error={first('password')}
        required
      >
        {(describedBy) => (
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN}
            invalid={Boolean(first('password'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField
        id="confirmPassword"
        label="Ulangi kata sandi baru"
        error={first('confirmPassword')}
        required
      >
        {(describedBy) => (
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            invalid={Boolean(first('confirmPassword'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <SubmitButton pendingLabel="Menyimpan…">Ganti kata sandi</SubmitButton>
    </form>
  );
}
