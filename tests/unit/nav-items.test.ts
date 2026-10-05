import { describe, expect, it } from 'vitest';
import { NAV_ITEMS } from '@/components/layout/NavItems';
import { NAV_ICONS } from '@/components/layout/NavIcons';
import { toViewerData } from '@/lib/visibility/types';
import type { Viewer } from '@/lib/visibility/types';

function makeViewer(): Viewer {
  return {
    classId: 'c1',
    userId: 'u1',
    status: 'active',
    roleName: 'Ketua',
    permissions: ['class.manage', 'members.manage'],
    isSignedIn: true,
    isActiveMember: true,
    can: (permission) => permission === 'class.manage',
  };
}

/**
 * `NAV_ITEMS` dikirim dari Server Component ke SidebarNav/BottomNav yang
 * `'use client'`. React hanya bisa menyerialikan data JSON; komponen fungsi
 * membuat render gagal dengan "Functions cannot be passed directly to Client
 * Components" dan beranda 500 untuk setiap anggota yang sudah masuk.
 *
 * Tes ini gagal pada versi lama yang menaruh `icon` di dalam `NAV_ITEMS`.
 */
describe('NAV_ITEMS', () => {
  it('tidak memuat nilai fungsi atau simbol di setiap item', () => {
    for (const item of NAV_ITEMS) {
      for (const [field, value] of Object.entries(item)) {
        expect(typeof value, `${item.href}.${field} harus serializable`).toBe('string');
      }
    }
  });

  it('lolos JSON.stringify tanpa kehilangan data', () => {
    const roundTripped = JSON.parse(JSON.stringify(NAV_ITEMS));

    expect(roundTripped).toHaveLength(NAV_ITEMS.length);
    expect(roundTripped.map((i: { href: string }) => i.href)).toEqual(NAV_ITEMS.map((i) => i.href));
  });

  it('punya href yang unik dan berawalan slash absolut', () => {
    const hrefs = NAV_ITEMS.map((item) => item.href);

    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const href of hrefs) {
      expect(href.startsWith('/')).toBe(true);
    }
  });

  it('punya ikon untuk setiap key navigasi', () => {
    for (const item of NAV_ITEMS) {
      const icon = NAV_ICONS[item.key];
      // Ikon lucide-react adalah forwardRef, jadi bentuknya OBJEK dengan
      // `$$typeof`, bukan fungsi. Yang penting di sini: setiap key punya ikon.
      expect(icon, `ikon untuk ${item.key}`).toBeDefined();
      expect(
        typeof icon === 'function' || (typeof icon === 'object' && icon !== null),
        `ikon untuk ${item.key} harus komponen React yang valid`,
      ).toBe(true);
    }
  });
});

/**
 * `viewer` juga dikirim dari Server Component ke Client Component (`UserMenu`).
 * Bentuk `Viewer` berisi fungsi `can`, yang tidak bisa diserialisasi React —
 * tanpa `toViewerData`, beranda 500 untuk setiap anggota yang sudah masuk.
 */
describe('toViewerData', () => {
  it('membuang `can` dan tidak meninggalkan nilai fungsi', () => {
    const data = toViewerData(makeViewer());

    expect('can' in data).toBe(false);

    for (const value of Object.values(data)) {
      expect(typeof value === 'function' || typeof value === 'symbol').toBe(false);
    }
  });

  it('mempertahankan seluruh data lain apa adanya', () => {
    const viewer = makeViewer();
    const data = toViewerData(viewer);

    expect(data).toEqual({
      classId: viewer.classId,
      userId: viewer.userId,
      status: viewer.status,
      roleName: viewer.roleName,
      permissions: viewer.permissions,
      isSignedIn: viewer.isSignedIn,
      isActiveMember: viewer.isActiveMember,
    });
  });

  it('lolos JSON.stringify — syarat serialisasi lintas batas React', () => {
    expect(() => JSON.stringify(toViewerData(makeViewer()))).not.toThrow();
    expect(JSON.parse(JSON.stringify(toViewerData(makeViewer()))).userId).toBe('u1');
  });
});
