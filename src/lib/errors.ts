import type { ErrorCode, FormState } from '@/lib/result';

// Pemetaan error DB -> pesan Indonesia (blueprint §9.7). Detail teknis ditulis ke
// log server tanpa PII/token/email; pengguna hanya melihat pesan di bawah ini.
export function mapDbError(error: { code?: string; message?: string; details?: string }, context: string): FormState {
  const code = error.code ?? '';
  const message = error.message ?? '';

  // Constraint unik yang teridentifikasi lewat nama, karena PostgREST tidak
  // selalu mengirim nama constraint di field `code`.
  if (code === '23505') {
    if (message.includes('member_profiles_class_id_username_key')) {
      return formError('conflict', 'Username sudah dipakai.');
    }
    if (message.includes('social_links_one_per_platform')) {
      return formError('conflict', 'Platform ini sudah ditambahkan.');
    }
    return formError('conflict', 'Data yang sama sudah ada.');
  }

  switch (code) {
    case '23514': // check constraint
      return formError('validation', 'Isian tidak memenuhi aturan.');
    case '42501': // RLS / permission
      return formError('forbidden', 'Kamu tidak punya izin untuk tindakan ini.');
    case 'P0002':
      return formError('not_found', 'Data tidak ditemukan.');
    case 'EC001':
      return formError('conflict', 'Kelas harus punya minimal satu pengelola aktif.');
    case 'EC010':
    case 'EC012':
    case 'EC013':
      return formError('validation', 'Pengaturan visibilitas tidak valid.');
    case 'EC011':
      return formError(
        'validation',
        'Pilihan ini lebih luas dari yang diizinkan untuk elemen tersebut.',
      );
    case 'EC020':
      return formError('conflict', 'Akun ini sudah aktif.');
    case 'EC021':
      return formError('conflict', 'Perubahan status tidak diizinkan.');
    case 'EC030':
    case 'EC031':
    case 'EC032':
      return formError('forbidden', 'Kolom ini tidak dapat kamu ubah.');
    case 'EC040':
      return formError('validation', 'Batas jumlah item tercapai.');
    default:
      // Teknis ke log, tidak pernah ke pengguna (AGENTS.md §10).
      console.error(`[db-error] context=${context} code=${code}`, {
        message: message.slice(0, 300),
      });
      return formError('unknown', 'Terjadi kesalahan. Coba lagi.');
  }
}

function formError(code: ErrorCode, message: string): FormState {
  return { ok: false, error: { code, message } };
}
