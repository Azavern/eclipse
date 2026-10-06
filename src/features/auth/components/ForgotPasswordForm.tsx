'use client';

import { useActionState, useId, useState } from 'react';
import { requestPasswordReset } from '@/features/auth/actions';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { FormStatus } from '@/components/ui/FormStatus';
import { SubmitButton } from '@/components/ui/SubmitButton';

/**
 * Permintaan ganti kata sandi mandiri (A-06).
 *
 * Tidak ada email delivery di free tier ini (A-05), jadi form ini tidak
 * mengirim tautan ke siapa pun: ia menuliskan email ke antrean yang dilihat
 * Ketua di berandanya. Ketua lalu menerbitkan tautannya dan mengirimkannya lewat
 * WhatsApp — persis alur undangan anggota, hanya untuk orang yang sudah
 * terdaftar.
 *
 * Karena tidak ada email yang keluar, panel ini menjelaskan prosesnya: pengguna
 * tahu bahwa dia harus menghubungi Ketua, bukan menunggu pesan masuk.
 */
export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, null);
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const fieldErrors = state && !state.ok ? state.error.fieldErrors : undefined;
  const first = (name: string) => fieldErrors?.[name]?.[0];

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 w-fit items-center text-small font-semibold text-primary underline transition-func hover:opacity-80"
      >
        {open ? 'Batal minta tautan' : 'Lupa kata sandi?'}
      </button>

      {open ? (
        <div id={panelId} className="flex flex-col gap-4 rounded-md border border-border-subtle p-4">
          <p className="text-small text-text-muted">
            Tidak ada email yang dikirim otomatis di kelas ini. Isi emailmu, lalu minta Ketua
            menerbitkan tautan ganti kata sandi dan kirimkan lewat WhatsApp.
          </p>

          <form action={action} className="flex flex-col gap-4">
            <FormStatus
              state={state}
              successMessage="Permintaan tercatat. Hubungi Ketua untuk menerima tautannya."
            />

            <FormField id="reset-email" label="Email akunmu" error={first('email')} required>
              {(describedBy) => (
                <Input
                  id="reset-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  defaultValue={state?.values?.email}
                  invalid={Boolean(first('email'))}
                  describedBy={describedBy}
                />
              )}
            </FormField>

            <SubmitButton pendingLabel="Mengirim…">Kirim permintaan</SubmitButton>
          </form>
        </div>
      ) : null}
    </div>
  );
}
