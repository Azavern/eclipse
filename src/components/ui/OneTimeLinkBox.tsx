'use client';

import { useState } from 'react';
import { Button } from './Button';

/**
 * Kotak tautan sekali pakai.
 *
 * Tautan adalah kredensial: tidak disimpan di database, tidak masuk log, dan
 * tidak bisa diambil lagi dari mana pun (§6.2). Karena itu komponen ini
 * menampilkan tautannya sebagai teks lengkap yang bisa dipilih, menyediakan
 * tombol salin, dan TIDAK pernah mengosongkan dirinya sendiri — operator harus
 * sempat menyalinnya sebelum menutup dialog.
 *
 * Dipakai di dua tempat: undangan anggota dan tautan ganti kata sandi.
 */
export function OneTimeLinkBox({
  url,
  title,
  description,
}: {
  url: string;
  /** Judul singkat, mis. "Tautan akses untuk … sudah terbit." */
  title: string;
  /** Penjelasan singkat kenapa tautannya tidak bisa diambil ulang. */
  description: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-md border border-success px-3 py-3">
      <p className="text-small font-semibold text-success">{title}</p>
      <p className="text-small text-text-muted">{description}</p>
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
