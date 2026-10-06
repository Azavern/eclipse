'use client';

import { useActionState } from 'react';
import { signIn } from '@/features/auth/actions';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { FormStatus } from '@/components/ui/FormStatus';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, null);

  // Nilai input yang gagal disimpan agar isian tidak hilang (§15.1).
  // Kata sandi tidak pernah ikut echoed (§9.3).
  const values = state && !state.ok ? state.values : undefined;
  const fieldErrors = state && !state.ok ? state.error.fieldErrors : undefined;
  const first = (name: string) => fieldErrors?.[name]?.[0];

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />

        <FormStatus state={state} successMessage="Berhasil masuk." />

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
            <PasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
              required
              invalid={Boolean(first('password'))}
              describedBy={describedBy}
            />
          )}
        </FormField>

        <SubmitButton pendingLabel="Memeriksa…">Masuk</SubmitButton>
      </form>

      {/*
        "Lupa kata sandi" tetap melalui Ketua: tidak ada email delivery (A-05),
        jadi pemulihannya lewat tautan yang dia terbitkan sendiri (§6.2). Yang
        berubah dari kalimat mati adalah anggota bisa memberi tahu lewat form,
        dan permintaannya muncul di beranda Ketua.

        Form ini sengaja di LUAR <form> login: <form> tidak boleh bersarang di
        dalam <form> — React memperingatkan "cannot be a descendant of <form>",
        hidrasi gagal, dan tombol kirim tidak pernah menjalankan Server Action-nya.
      */}
      <ForgotPasswordForm />
    </div>
  );
}
