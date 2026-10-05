import { describe, expect, it } from 'vitest';
import {
  detectImageKind,
  EXTENSION_BY_KIND,
  MAX_IMAGE_BYTES,
  validateImageFile,
} from '@/lib/storage/magic-bytes';

const bytes = (...values: number[]) => new Uint8Array(values);

describe('detectImageKind', () => {
  it('mengenali JPEG dari magic bytes FF D8 FF', () => {
    expect(detectImageKind(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
  });

  it('mengenali PNG dari 8 byte signature', () => {
    expect(detectImageKind(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00))).toBe(
      'image/png',
    );
  });

  it('mengenali WebP dari RIFF....WEBP', () => {
    expect(
      detectImageKind(
        bytes(0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50),
      ),
    ).toBe('image/webp');
  });

  it('menolak SVG walau ekstensi dan MIME-nya benar', () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    expect(detectImageKind(svg)).toBeNull();
  });

  it('menolak file kosong atau terlalu pendek', () => {
    expect(detectImageKind(new Uint8Array([]))).toBeNull();
    expect(detectImageKind(bytes(0xff, 0xd8))).toBeNull();
  });

  it('menolak arsip yang disamarkan sebagai gambar', () => {
    expect(detectImageKind(bytes(0x50, 0x4b, 0x03, 0x04))).toBeNull();
  });

  it('menolak file teks yang diberi ekstensi .png', () => {
    // Kasus umum: nama file menyesatkan. Hanya byte yang dipercaya.
    const text = new TextEncoder().encode('<?php echo "hello"; ?>');
    expect(detectImageKind(text)).toBeNull();
  });
});

describe('EXTENSION_BY_KIND', () => {
  it('memberikan ekstensi yang cocok untuk tiap tipe', () => {
    expect(EXTENSION_BY_KIND['image/jpeg']).toBe('jpg');
    expect(EXTENSION_BY_KIND['image/png']).toBe('png');
    expect(EXTENSION_BY_KIND['image/webp']).toBe('webp');
  });

  it('tidak pernah memakai nama file pengguna', () => {
    // Nama file dibangun dari uuid server, bukan dari nama unggahan.
    for (const ext of Object.values(EXTENSION_BY_KIND)) {
      expect(ext).toMatch(/^(jpg|png|webp)$/);
    }
  });
});

describe('validateImageFile', () => {
  const pngBytes = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00);

  it('menerima PNG yang valid dan mengabaikan tipe yang diklaim klien', () => {
    const file = new File([pngBytes], 'foto.png', { type: 'image/svg+xml' });
    return expect(validateImageFile(file)).resolves.toEqual({ ok: true, kind: 'image/png' });
  });

  it('menolak file kosong', async () => {
    const file = new File([], 'kosong.png', { type: 'image/png' });
    const result = await validateImageFile(file);
    expect(result.ok).toBe(false);
  });

  it('menolak file yang melebihi 2 MiB', async () => {
    const big = new Uint8Array(MAX_IMAGE_BYTES + 1);
    big.set(pngBytes, 0);
    const file = new File([big], 'besar.png', { type: 'image/png' });
    const result = await validateImageFile(file);
    expect(result.ok).toBe(false);
  });

  it('pesan penolakan konsisten dan spesifik produk', async () => {
    const file = new File(['bukan gambar'], 'x.png', { type: 'image/png' });
    const result = await validateImageFile(file);
    expect(result).toEqual({
      ok: false,
      message: 'Gambar harus JPEG, PNG, atau WebP dan maksimal 2 MB.',
    });
  });
});
