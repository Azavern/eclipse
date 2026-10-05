/**
 * Deteksi tipe gambar dari magic bytes, bukan dari `file.type` atau nama file
 * yang dikirim klien (§13.4). File dengan tipe yang dipalsui akan ditolak.
 */
export type ImageKind = 'image/jpeg' | 'image/png' | 'image/webp';

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MiB

export function detectImageKind(bytes: Uint8Array): ImageKind | null {
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: "RIFF" ....  "WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  // SVG sengaja tidak diterima: bisa memuat skrip dan lolos sebagai gambar.
  return null;
}

export const EXTENSION_BY_KIND: Record<ImageKind, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const UPLOAD_ERROR_MESSAGE = 'Gambar harus JPEG, PNG, atau WebP dan maksimal 2 MB.';

export type UploadCheck = { ok: true; kind: ImageKind } | { ok: false; message: string };

/**
 * Validasi lengkap sebuah file gambar yang dikirim lewat Server Action:
 * ukuran, magic bytes, dan subtype aslinya. Nilai `File` dan nama file dari klien
 * diabaikan sepenuhnya.
 */
export async function validateImageFile(file: File): Promise<UploadCheck> {
  if (file.size === 0) return { ok: false, message: UPLOAD_ERROR_MESSAGE };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, message: UPLOAD_ERROR_MESSAGE };

  // Cukup 12 byte untuk mendeteksi ketiga format.
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const kind = detectImageKind(head);
  if (!kind) return { ok: false, message: UPLOAD_ERROR_MESSAGE };

  return { ok: true, kind };
}
