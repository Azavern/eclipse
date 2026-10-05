'use client';

import { useActionState } from 'react';
import { signIn } from '@/features/auth/actions';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { FormStatus } from '@/components/ui/FormStatus';
import { SubmitButton } from '@/components/ui/SubmitButton';

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, null);

  // Nilai input yang gagal disimpan agar isian tidak hilang (§15.1).
  // Kata sandi tidak pernah ikut echoed (§9.3).
  const values = state && !state.ok ? state.values : undefined;
  const fieldErrors = state && !state.ok ? state.error.fieldErrors : undefined;
  const first = (name: string) => fieldErrors?.[name]?.[0];

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      <FormStatus state={state} />

      <FormField id="email" label="Email" error={first('email')} required>
        {(describedBy) => (
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            invalid={Boolean(first('email'))}
            defaultValue={values?.email}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField id="password" label="Kata sandi" error={first('password')} required>
        {(describedBy) => (
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            invalid={Boolean(first('password'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <SubmitButton pendingLabel="Memeriksa…">Masuk</SubmitButton>

      {/*
        "Lupa kata sandi" bukan tautan ke form reset: tidak ada email delivery
        (A-05), jadi pemulihannya lewat Ketua (§6.2). Menaruh teks di sini
        kalimat, bukan tautan mati.
      */}
      <p className="text-small text-text-muted">
        Lupa kata sandi? Minta Ketua membuat tautan akses baru.
      </p>
    </form>
  );
}
