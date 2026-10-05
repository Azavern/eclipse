import type { MembershipStatus } from '@/lib/supabase/database.types';

/**
 * Permission adalah satu-satunya satuan otorisasi. Otorisasi TIDAK PERNAH
 * mengecek nama role, hanya permission (§6.3).
 */
export type Permission =
  | 'class.manage'
  | 'members.manage'
  | 'schedule.manage'
  | 'events.manage'
  | 'tasks.manage';

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
