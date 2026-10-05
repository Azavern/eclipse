import type { MembershipStatus } from '@/lib/supabase/database.types';

/**
 * Permission adalah satu-satunya satuan otorisasi. Otorisasi TIDAK PERNAH
 * mengecek nama role, hanya permission (§6.3).
 */
export type Permission =
  'class.manage' | 'members.manage' | 'schedule.manage' | 'events.manage' | 'tasks.manage';

/**
 * Bentuk viewer yang dibutuhkan komponen, termasuk komponen klien.
 *
 * File ini sengaja TIDAK mengimpor modul server-only, sehingga tipe yang sama
 * bisa dipakai di kedua sisi tanpa menarik `server-only` ke bundel klien.
 * Implementasi `getViewer` yang memenuhi bentuk ini ada di ./server.ts.
 */
export type Viewer = {
  classId: string | null;
  userId: string | null;
  status: MembershipStatus | null;
  roleName: string | null;
  permissions: Permission[];
  isSignedIn: boolean;
  /** Anggota nonaktif tetap punya sesi, tetapi kehilangan akses non-publik (§7.2). */
  isActiveMember: boolean;
  can: (permission: Permission) => boolean;
};

/**
 * `Viewer` tanpa `can`.
 *
 * `Viewer` berisi fungsi, sedangkan Client Component hanya boleh menerima data
 * yang bisa diserialisasi React. Jadi objek `Viewer` mentah tidak boleh dikirim
 * ke komponen klien: React melempar "Functions cannot be passed directly to
 * Client Components" dan halaman 500. Bentuk ini yang boleh melintasi batas.
 */
export type ViewerData = Omit<Viewer, 'can'>;

/**
 * Buang `can` sebelum objek viewer dikirim ke Client Component.
 *
 * Hanya tipe `ViewerData` yang aman diproses React. Menandai prop dengan
 * `ViewerData` saja tidak cukup, karena React menyerialisasi nilai yang
 * benar-benar dikirim, bukan tipe yang dianotasi.
 */
export function toViewerData(viewer: Viewer): ViewerData {
  const { can: _can, ...data } = viewer;
  return data;
}
