'use client';

import { useActionState } from 'react';
import { issuePasswordResetLink } from '@/features/auth/actions';
import { FormStatus } from '@/components/ui/FormStatus';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { OneTimeLinkBox } from '@/components/ui/OneTimeLinkBox';
import { formatDateTime } from '@/lib/time';
import type { PasswordResetRequest } from '@/lib/supabase/database.types';

/** Satu baris antrean beserta tombol terbitkan tautannya. */
function ResetRequestRow({
  request,
  timezone,
}: {
  request: PasswordResetRequest;
  timezone: string;
}) {
  const [state, action] = useActionState(issuePasswordResetLink, null);

  const link = state?.ok ? (state.data as { url?: string; email?: string }) : undefined;
  const issued = request.status === 'issued';

  return (
    <li className="flex flex-col gap-3 border-t border-border-subtle pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-body font-semibold text-text">{request.email}</span>
          <span className="text-small text-text-muted">
            {issued ? 'Tautan sudah terbit' : 'Menunggu tautan'} ·{' '}
            <time dateTime={request.created_at}>
              {formatDateTime(request.created_at, timezone)}
            </time>
          </span>
        </div>

        {/*
          Tombol hanya untuk yang masih `pending`. Setelah tautan terbit, baris
          tetap terlihat supaya Ketua sempat menyalinnya, tapi tidak bisa
          menerbitkan tautan kedua untuk permintaan yang sama.
        */}
        {!issued ? (
          <form action={action}>
            <input type="hidden" name="id" value={request.id} />
            <SubmitButton variant="secondary" pendingLabel="Menerbitkan…">
              Buat tautan
            </SubmitButton>
          </form>
        ) : null}
      </div>

      <FormStatus
        state={state}
        successMessage="Tautan terbit. Salin dan kirimkan ke anggota itu sekarang."
      />

      {link?.url && link.email ? (
        <OneTimeLinkBox
          url={link.url}
          title={`Tautan ganti kata sandi untuk ${link.email} sudah terbit.`}
          description="Tautan ini berlaku sekali dan tidak disimpan. Salin sekarang dan kirimkan lewat WhatsApp — setelah halaman dimuat ulang, tautan ini tidak bisa diambil lagi dari sistem."
        />
      ) : null}
    </li>
  );
}

/**
 * Antrean permintaan ganti kata sandi di beranda Ketua (A-06).
 *
 * Baris yang tautannya baru terbit sengaja tetap direnderkan: tautan hanya
 * ditampilkan sekali, jadi kalau barisnya langsung hilang begitu tautan terbit,
 * Ketua akan kehilangan tautan yang baru saja dia buat.
 */
export function ResetRequestQueue({
  requests,
  timezone,
}: {
  requests: PasswordResetRequest[];
  timezone: string;
}) {
  const pending = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-small text-text-muted">
        {pending === 0
          ? 'Tidak ada anggota yang menunggu tautan.'
          : `${pending} anggota menunggu tautan ganti kata sandi. Tidak ada email yang dikirim otomatis — salin tautannya dan kirimkan lewat WhatsApp.`}
      </p>

      <ul className="flex flex-col gap-4">
        {requests.map((request) => (
          <ResetRequestRow key={request.id} request={request} timezone={timezone} />
        ))}
      </ul>
    </div>
  );
}
