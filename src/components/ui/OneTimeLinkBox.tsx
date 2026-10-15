'use client';

import { useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';
import { Button } from './Button';

/**
 * Kotak tautan sekali pakai.
 *
 * Tautan adalah kredensial: tidak disimpan di database, tidak masuk log, dan
 * tidak bisa diambil lagi dari mana pun (blueprint §6.2). Karena itu komponen ini
 * menampilkan tautannya sebagai teks lengkap yang bisa dipilih, menyediakan
 * tombol salin, dan TIDAK pernah mengosongkan dirinya sendiri — operator harus
 * sempat menyalinnya sebelum menutup dialog.
 *
 * Panel suksesnya memakai latar ber-tint dan garis ber-hue sukses, sedangkan
 * teksnya tetap memakai token teks (DESIGN.md §10: kontras dijamin untuk palet
 * kelas mana pun). Statusnya tidak bergantung pada warna saja: ada ikon, judul,
 * dan kalimat penjelas.
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
  const CopiedIcon = copied ? Check : Copy;

  return (
    <div className="flex flex-col gap-3 rounded-md border border-success-edge bg-success-soft p-4">
      <div className="flex items-start gap-3">
        <span className="icon-tile icon-tile-success size-10" aria-hidden="true">
          <Link2 className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-body font-semibold text-text">{title}</p>
          <p className="max-w-prose text-small text-text-muted">{description}</p>
        </div>
      </div>

      <code className="block select-all break-all rounded-md border border-border-subtle bg-surface px-3 py-2 font-mono text-small">
        {url}
      </code>

      <div className="flex flex-wrap items-center gap-3">
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
          <CopiedIcon aria-hidden="true" className="size-4" />
          {copied ? 'Tersalin' : 'Salin tautan'}
        </Button>
        {/* Konfirmasi salin juga diumumkan, bukan hanya berubah warna. */}
        <span role="status" className="text-caption text-text-muted">
          {copied ? 'Tautan ada di papan klip perangkat ini.' : ''}
        </span>
      </div>
    </div>
  );
}
