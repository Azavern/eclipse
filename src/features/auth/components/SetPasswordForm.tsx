'use client';

import { useActionState } from 'react';
import { setPassword } from '@/features/auth/actions';
import { PASSWORD_MIN } from '@/lib/validation';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { FormStatus } from '@/components/ui/FormStatus';
import { SubmitButton } from '@/components/ui/SubmitButton';

/**
 * Form kata sandi baru setelah tautan akses terverifikasi.
 *
 * `mode` hanya mengubah penjelasan; validasinya sama karena keduanya memakai
 * aksi `setPassword`, satu-satunya jalur sah untuk mengganti kata sandi tanpa
 * password lama (§6.2).
 */
export function SetPasswordForm({ mode }: { mode: 'activate' | 'reset' }) {
  const [state, action] = useActionState(setPassword, null);

  // Kata sandi tidak pernah ikut echoed (§9.3), jadi tidak ada nilai awal.
  const fieldErrors = state && !state.ok ? state.error.fieldErrors : undefined;
  const first = (name: string) => fieldErrors?.[name]?.[0];

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormStatus state={state} />

      <FormField
        id="password"
        label="Kata sandi baru"
        hint={`Minimal ${PASSWORD_MIN} karakter. Pilih yang sulit ditebak dan tidak dipakai di layanan lain.`}
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
        label="Ulangi kata sandi"
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

      <SubmitButton pendingLabel="Menyimpan…">
        {mode === 'activate' ? 'Aktifkan akun' : 'Simpan kata sandi'}
      </SubmitButton>

      <p className="text-small text-text-muted">
        {mode === 'activate'
          ? 'Menyimpan kata sandi sekaligus mengaktifkan keanggotaanmu di kelas ini.'
          : 'Setelah tersimpan, sesi tetap aktif dan kamu langsung masuk.'}
      </p>
    </form>
  );
}
