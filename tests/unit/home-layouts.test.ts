import { describe, expect, it } from 'vitest';
import { HOME_LAYOUTS, MOBILE_HOME_ORDER, mobileOrderClass } from '@/features/home/layouts';

describe('urutan section Home', () => {
  it('MOBILE_HOME_ORDER mengikuti prioritas PRD §16', () => {
    // identitas, agenda (jadwal|tugas|event), anggota, baru overview+aktivitas.
    expect(MOBILE_HOME_ORDER).toEqual(['identity', 'upcoming', 'members', 'overview', 'activity']);
  });

  it('preset standard dan profile_focused keduanya valid', () => {
    expect(HOME_LAYOUTS.standard).toEqual(['identity','upcoming','overview','activity','members']);
    expect(HOME_LAYOUTS.profile_focused).toEqual(['identity','members','upcoming','overview','activity']);
  });

  it('semua section preset punya kelas order mobile', () => {
    for (const key of [...HOME_LAYOUTS.standard, ...HOME_LAYOUTS.profile_focused]) {
      expect(mobileOrderClass(key)).toMatch(/^order-(first|[0-9]+)$/);
    }
  });

  it('urutan mobile BENAR-benar berbeda dari preset standard', () => {
    // Ini inti masalahnya: tanpa order kelas, mobile akan memakai preset.
    const presetOrder = HOME_LAYOUTS.standard.filter(k => MOBILE_HOME_ORDER.includes(k));
    expect(presetOrder).not.toEqual([...MOBILE_HOME_ORDER]);
    // ...dan urutan mobile menaruh anggota sebelum overview.
    expect(MOBILE_HOME_ORDER.indexOf('members')).toBeLessThan(MOBILE_HOME_ORDER.indexOf('overview'));
  });

  it('identity selalu pertama, activity selalu terakhir', () => {
    expect(MOBILE_HOME_ORDER[0]).toBe('identity');
    expect(MOBILE_HOME_ORDER[MOBILE_HOME_ORDER.length - 1]).toBe('activity');
    expect(mobileOrderClass('identity')).toBe('order-first');
  });
});
