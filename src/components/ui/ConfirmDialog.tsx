'use client';

import { useState } from 'react';
import { Dialog } from './Dialog';
import { Button } from './Button';

/**
 * Konfirmasi untuk tindakan destruktif. Selalu menyebut konsekuensinya secara
 * eksplisit dan memakai kata yang jujur: "dihapus permanen dan tidak dapat
 * dibatalkan", bukan "hapus?" yang ambigu (§7 §15.1).
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  consequence,
  confirmLabel,
  pendingLabel,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  /** Pernyataan dampak, bukan label tombol generik. */
  consequence: string;
  confirmLabel: string;
  pendingLabel?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const run = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await onConfirm();
    } catch (cause) {
      // Pesan aman untuk pengguna; detail tidak pernah ditampilkan.
      setError(cause instanceof Error ? cause.message : 'Terjadi kesalahan. Coba lagi.');
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      busy={busy}
      error={error}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button variant="danger" onClick={run} loading={busy}>
            {busy && pendingLabel ? pendingLabel : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-body text-text">{consequence}</p>
    </Dialog>
  );
}
