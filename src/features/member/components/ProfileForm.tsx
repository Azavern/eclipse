'use client';

import { useActionState } from 'react';
import { updateMyProfile } from '@/features/member/actions';
import type { ProfileDefaults } from '@/features/member/schemas';
import { FormField } from '@/components/ui/FormField';
import { Input, Textarea } from '@/components/ui/Input';
import { FormStatus } from '@/components/ui/FormStatus';
import { SubmitButton } from '@/components/ui/SubmitButton';

/**
 * Form profil milik sendiri.
 *
 * Nilai awal dari server; setelah aksi gagal nilai yang di-echo Server Action
 * yang dipakai supaya isian tidak hilang (§15.1).
 */
export function ProfileForm({ defaults }: { defaults: ProfileDefaults }) {
  const [state, action] = useActionState(updateMyProfile, null);

  const values = state && !state.ok ? state.values : undefined;
  const fieldErrors = state && !state.ok ? state.error.fieldErrors : undefined;
  const first = (name: string) => fieldErrors?.[name]?.[0];

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormStatus state={state} />

      <FormField id="full_name" label="Nama lengkap" error={first('full_name')} required>
        {(describedBy) => (
          <Input
            id="full_name"
            name="full_name"
            required
            maxLength={80}
            defaultValue={values?.full_name ?? defaults.full_name}
            invalid={Boolean(first('full_name'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField
        id="username"
        label="Username"
        hint="3–30 karakter: huruf kecil, angka, dan garis bawah. Dipakai di tautan profilmu."
        error={first('username')}
        required
      >
        {(describedBy) => (
          <Input
            id="username"
            name="username"
            required
            maxLength={30}
            spellCheck={false}
            autoCapitalize="none"
            defaultValue={values?.username ?? defaults.username}
            invalid={Boolean(first('username'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField id="nickname" label="Nama panggilan" error={first('nickname')}>
        {(describedBy) => (
          <Input
            id="nickname"
            name="nickname"
            maxLength={40}
            defaultValue={values?.nickname ?? defaults.nickname ?? ''}
            invalid={Boolean(first('nickname'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField id="bio" label="Bio" error={first('bio')}>
        {(describedBy) => (
          <Textarea
            id="bio"
            name="bio"
            rows={5}
            maxLength={500}
            defaultValue={values?.bio ?? defaults.bio ?? ''}
            invalid={Boolean(first('bio'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <SubmitButton pendingLabel="Menyimpan…">Simpan profil</SubmitButton>
    </form>
  );
}
