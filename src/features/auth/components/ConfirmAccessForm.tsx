'use client';

import { useActionState, useState, useSyncExternalStore } from 'react';
import { confirmAccessLink } from '@/features/auth/actions';
import { FormStatus } from '@/components/ui/FormStatus';
import { SubmitButton } from '@/components/ui/SubmitButton';

type LinkParams = { tokenHash: string | null; type: string | null };

const EMPTY: LinkParams = { tokenHash: null, type: null };

/** Parse fragment `#token_hash=…&type=recovery`. */
function parseFragment(hash: string): LinkParams {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  return { tokenHash: params.get('token_hash'), type: params.get('type') };
}

function subscribeToHash(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

/**
 * Verifikasi tautan akses sekali pakai (§6.2).
 *
 * Tiga aturan yang tidak boleh dilanggar di sini:
 *  - Token dibaca dari FRAGMENT URL (`#token_hash=…&type=recovery`), bukan
 *    query, supaya tidak masuk log server maupun header `Referer`.
 *  - Verifikasi baru berjalan saat pengguna menekan tombol (POST). Aplikasi chat
 *    melakukan GET untuk membuat pratinjau tautan dan akan menghabiskan token
 *    sekali pakai kalau verifikasi dilakukan lebih awal.
 *  - Fragment dibersihkan begitu tautan dikirim, supaya token tidak tertinggal di
 *    address bar atau ikut terkirim lagi saat halaman dimuat ulang.
 *
 * Fragment dibaca lewat `useSyncExternalStore` (sumber datanya `window.location`),
 * bukan `useState` di dalam effect: snapshot server kosong sehingga render pertama
 * di klien tetap cocok dengan SSR, dan perubahan fragment tidak butuh remount.
 */
export function ConfirmAccessForm() {
  const [state, action] = useActionState(confirmAccessLink, null);

  const hash = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash,
    () => '',
  );

  // Disimpan hanya ketika tautan benar-benar dikirim. Setelah fragment dibersihkan
  // nilai ini tetap ada supaya aksi yang gagal (jaringan, misal) bisa diulang tanpa
  // meminta tautan baru.
  const [sent, setSent] = useState<LinkParams | null>(null);

  const fromUrl: LinkParams = hash ? parseFragment(hash) : EMPTY;
  const link = fromUrl.tokenHash ? fromUrl : (sent ?? EMPTY);

  const ready = Boolean(link.tokenHash && link.type);
  const complete = hash.length > 0;
  const rejected = Boolean(state && !state.ok);

  return (
    <form
      action={action}
      onSubmit={() => {
        if (!fromUrl.tokenHash) return;
        setSent(fromUrl);
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="token_hash" value={link.tokenHash ?? ''} />
      <input type="hidden" name="type" value={link.type ?? ''} />

      <FormStatus state={state} />

      {!complete && !ready && !rejected ? (
        <p role="status" className="text-small text-text-muted">
          Halaman ini hanya bisa dibuka lewat tautan akses dari Ketua. Kalau kamu membuka halaman
          ini tanpa tautan, minta Ketua menerbitkan tautan baru.
        </p>
      ) : null}

      {complete && !ready && !rejected ? (
        <p role="alert" className="rounded-md border border-error px-3 py-2 text-small text-error">
          Tautan ini tidak lengkap. Minta Ketua membuka tautan akses langsung dari pesan yang
          dikirimkannya.
        </p>
      ) : null}

      <SubmitButton pendingLabel="Memeriksa…" disabled={!ready}>
        Lanjutkan
      </SubmitButton>
    </form>
  );
}
