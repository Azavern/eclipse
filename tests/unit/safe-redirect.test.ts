import { describe, expect, it } from 'vitest';
import { safeRedirect } from '@/lib/safe-redirect';

describe('safeRedirect', () => {
  it('meneruskan path relatif biasa', () => {
    expect(safeRedirect('/schedule')).toBe('/schedule');
    expect(safeRedirect('/members/andi')).toBe('/members/andi');
    expect(safeRedirect('/events?when=past')).toBe('/events?when=past');
  });

  it('menolak URL absolut ke origin lain', () => {
    expect(safeRedirect('https://evil.example/x')).toBe('/');
    expect(safeRedirect('http://evil.example')).toBe('/');
    expect(safeRedirect('javascript:alert(1)')).toBe('/');
  });

  it('menolak protocol-relative // yang ditafsirkan browser sebagai origin lain', () => {
    expect(safeRedirect('//evil.example')).toBe('/');
  });

  it('menolak backslash yang dinormalisasi browser menjadi slash', () => {
    expect(safeRedirect('/\\evil.example')).toBe('/');
  });

  it('menolak path yang tidak diawali slash', () => {
    expect(safeRedirect('schedule')).toBe('/');
    expect(safeRedirect('?next=/x')).toBe('/');
  });

  it('menolak karakter kontrol dan newline', () => {
    expect(safeRedirect('/ok\nSet-Cookie: a=b')).toBe('/');
    expect(safeRedirect('/ok\u0000bad')).toBe('/');
  });

  it('memakai fallback ketika input kosong', () => {
    expect(safeRedirect(null)).toBe('/');
    expect(safeRedirect(undefined)).toBe('/');
    expect(safeRedirect('')).toBe('/');
    expect(safeRedirect(null, '/login')).toBe('/login');
  });

  it('tidak mengubah fallback yang sudah aman', () => {
    expect(safeRedirect('https://evil.example', '/login')).toBe('/login');
  });
});
