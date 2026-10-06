'use client';

import { useActionState, useState } from 'react';
import { deleteMember, inviteMember, setMemberActive } from '@/features/member/actions';
import type { ManagedMember } from '@/features/member/actions';
import { FormField } from '@/components/ui/FormField';
import { Input, Select } from '@/components/ui/Input';
import { FormStatus } from '@/components/ui/FormStatus';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { VisuallyHidden } from '@/components/ui/VisuallyHidden';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';

/**
 * Tautan akses hanya dicetak sekali.
 *
 * Tautan ini adalah kredensial: tidak disimpan di DB, tidak masuk log, dan
 * tidak pernah bisa diambil lagi dari mana pun (§6.2). Karena itu isi form
 * sengaja tidak dikosongkan otomatis supaya operator sempat menyalinnya, dan
 * komponen ini adalah satu-satunya tempat yang menampilkannya.
 */
function AccessLinkBox({ url, email }: { url: string; email: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-md border border-success px-3 py-3">
      <p className="text-small font-semibold text-success">
        Tautan akses untuk {email} sudah terbit.
      </p>
      <p className="text-small text-text-muted">
        Tautan ini hanya berlaku sekali dan tidak disimpan. Salin sekarang dan kirimkan ke anggota
        tersebut — setelah dialog ditutup, tautan ini tidak bisa diambil lagi dari sistem.
      </p>
      <code className="block select-all break-all rounded-md border border-border-subtle bg-surface-dim px-3 py-2 text-small">
        {url}
      </code>
      <div>
        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
            } catch {
              // Clipboard ditolak browser atau konteks tidak aman; tautan tetap
              // bisa disalin manual dari kotak di atas.
              setCopied(false);
            }
          }}
        >
          {copied ? 'Tersalin' : 'Salin tautan'}
        </Button>
      </div>
    </div>
  );
}

function InviteForm() {
  const [state, action] = useActionState(inviteMember, null);
  const fieldErrors = state && !state.ok ? state.error.fieldErrors : undefined;
  const first = (name: string) => fieldErrors?.[name]?.[0];

  const values = state && !state.ok ? state.values : undefined;
  const accessUrl = state?.ok ? (state.data as { accessUrl?: string })?.accessUrl : undefined;
  const accessEmail = state?.ok ? (state.data as { email?: string })?.email : undefined;

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormStatus state={state} successMessage="Anggota diundang. Salin tautan aksesnya sekarang." />

      {accessUrl && accessEmail ? <AccessLinkBox url={accessUrl} email={accessEmail} /> : null}

      <FormField id="invite-email" label="Email" error={first('email')} required>
        {(describedBy) => (
          <Input
            id="invite-email"
            name="email"
            type="email"
            autoComplete="off"
            required
            defaultValue={values?.email}
            invalid={Boolean(first('email'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField id="invite-name" label="Nama lengkap" error={first('full_name')} required>
        {(describedBy) => (
          <Input
            id="invite-name"
            name="full_name"
            required
            maxLength={80}
            defaultValue={values?.full_name}
            invalid={Boolean(first('full_name'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField
        id="invite-username"
        label="Username"
        hint="3–30 karakter: huruf kecil, angka, dan garis bawah."
        error={first('username')}
        required
      >
        {(describedBy) => (
          <Input
            id="invite-username"
            name="username"
            required
            maxLength={30}
            spellCheck={false}
            autoCapitalize="none"
            defaultValue={values?.username}
            invalid={Boolean(first('username'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField id="invite-role" label="Peran" error={first('role')} required>
        {(describedBy) => (
          <Select
            id="invite-role"
            name="role"
            defaultValue={values?.role ?? 'member'}
            describedBy={describedBy}
            invalid={Boolean(first('role'))}
          >
            <option value="member">Anggota</option>
            <option value="ketua">Ketua</option>
          </Select>
        )}
      </FormField>

      <SubmitButton pendingLabel="Menerbitkan…">Undang anggota</SubmitButton>
    </form>
  );
}

function MemberRow({ member, isSelf }: { member: ManagedMember; isSelf: boolean }) {
  const [statusState, statusAction] = useActionState(setMemberActive, null);
  const [deleteState, deleteAction] = useActionState(deleteMember, null);
  const [confirming, setConfirming] = useState(false);

  // Status keanggotaan, bukan status ban di Auth: anggota yang sudah diundang
  // tetapi belum memakai tautan akses belum aktif — dan memang belum dibanned.
  const isActive = member.status === 'active';
  const statusLabel =
    member.status === 'active'
      ? 'Aktif'
      : member.status === 'invited'
        ? 'Menunggu aktivasi'
        : 'Tidak aktif';

  return (
    <tr className="border-t border-border-subtle">
      <td className="py-3 pe-3 align-middle">
        <div className="flex items-center gap-3">
          <Avatar src={member.avatarUrl} name={member.full_name} size="sm" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-body font-semibold text-text">
              {member.full_name}
              {isSelf ? <span className="ms-2 text-caption text-text-muted">(kamu)</span> : null}
            </span>
            <span className="truncate text-small text-text-muted">@{member.username}</span>
          </div>
        </div>
      </td>
      <td className="py-3 pe-3 align-middle text-small text-text-muted">{member.email ?? '—'}</td>
      <td className="py-3 pe-3 align-middle text-small text-text-muted">{member.role_name}</td>
      <td className="py-3 align-middle text-small">{statusLabel}</td>
      <td className="py-3 text-end align-middle">
        <div className="flex flex-wrap justify-end gap-2">
          {/* `invited` tidak punya transisi dari sini: satu-satunya jalur ke
              `active` adalah tautan akses yang dipakai anggota itu sendiri (§6.4). */}
          {member.status === 'invited' ? (
            <p className="text-small text-text-muted">Menunggu anggota memakai tautan akses.</p>
          ) : (
            <form action={statusAction}>
              <input type="hidden" name="user_id" value={member.user_id} />
              <input type="hidden" name="next" value={isActive ? 'inactive' : 'active'} />
              {/* `SubmitButton` mengikuti status form: nonaktif + spinner selama
                  aksi berjalan, jadi klik ganda tidak mungkin terjadi. */}
              <SubmitButton
                variant="secondary"
                pendingLabel="Menyimpan…"
                disabled={isSelf && isActive}
              >
                {isActive ? 'Nonaktifkan' : 'Aktifkan'}
              </SubmitButton>
            </form>
          )}

          <Button
            type="button"
            variant="danger"
            disabled={isSelf}
            onClick={() => setConfirming(true)}
          >
            Hapus
          </Button>
        </div>

        <div className="mt-2">
          <FormStatus
            state={statusState}
            successMessage={
              isActive
                ? `${member.full_name} sekarang tidak aktif.`
                : `${member.full_name} sekarang aktif.`
            }
          />
          <FormStatus state={deleteState} successMessage={`${member.full_name} dihapus.`} />
        </div>

        <ConfirmDialog
          open={confirming}
          onClose={() => setConfirming(false)}
          onConfirm={async () => {
            setConfirming(false);
            const fd = new FormData();
            fd.set('user_id', member.user_id);
            await deleteAction(fd);
          }}
          title={`Hapus ${member.full_name}?`}
          consequence="Akun, profil, dan seluruh isinya akan dihapus permanen dan tidak dapat dibatalkan."
          confirmLabel="Hapus anggota"
          pendingLabel="Menghapus…"
        />
      </td>
    </tr>
  );
}

/**
 * Tabel manajemen anggota (§10.2): tabel penuh di desktop, daftar bertumpuk
 * di layar sempit.
 */
export function MembersManager({
  members,
  viewerId,
}: {
  members: ManagedMember[];
  viewerId: string | null;
}) {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h2 className="text-h2 font-semibold text-text">Daftar anggota</h2>

        {members.length === 0 ? (
          <p className="text-small text-text-muted">Belum ada anggota yang terlihat.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border-subtle text-start text-label text-text-muted">
                <th scope="col" className="py-2 pe-3 text-start font-semibold">
                  Anggota
                </th>
                <th scope="col" className="py-2 pe-3 text-start font-semibold">
                  Email
                </th>
                <th scope="col" className="py-2 pe-3 text-start font-semibold">
                  Peran
                </th>
                <th scope="col" className="py-2 text-start font-semibold">
                  Status
                </th>
                <th scope="col" className="py-2">
                  <VisuallyHidden>Aksi</VisuallyHidden>
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <MemberRow
                  key={member.user_id}
                  member={member}
                  isSelf={member.user_id === viewerId}
                />
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="flex max-w-form flex-col gap-4 border-t border-border-subtle pt-6">
        <h2 className="text-h2 font-semibold text-text">Undang anggota</h2>
        <p className="text-small text-text-muted">
          Akun dibuat langsung dan tautan akses diterbitkan sekali. Anggota menentukan kata sandinya
          sendiri lewat tautan itu.
        </p>
        <InviteForm />
      </section>
    </div>
  );
}
