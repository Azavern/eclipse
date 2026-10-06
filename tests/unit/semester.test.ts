import { describe, expect, it } from 'vitest';
import { isSemester, recentSemesters, semesterFor, sortSemestersDesc } from '@/lib/semester';

describe('semesterFor', () => {
  it('menaruh Juli–Desember pada semester ganjil', () => {
    expect(semesterFor(new Date('2026-07-01T00:00:00.000Z'))).toBe('2026/2027 Ganjil');
    expect(semesterFor(new Date('2026-12-31T00:00:00.000Z'))).toBe('2026/2027 Ganjil');
  });

  it('menaruh Januari–Juni pada semester genap tahun akademik yang sama', () => {
    expect(semesterFor(new Date('2027-01-01T00:00:00.000Z'))).toBe('2026/2027 Genap');
    expect(semesterFor(new Date('2027-06-30T00:00:00.000Z'))).toBe('2026/2027 Genap');
  });
});

describe('recentSemesters', () => {
  it('mengembalikan semester berjalan lalu sebelumnya, terbaru dulu', () => {
    const options = recentSemesters(3, new Date('2026-10-06T00:00:00.000Z'));
    expect(options).toEqual(['2026/2027 Ganjil', '2025/2026 Genap', '2025/2026 Ganjil']);
  });

  it('tidak mengulang semester yang sama', () => {
    const options = recentSemesters(4, new Date('2026-03-01T00:00:00.000Z'));
    expect(new Set(options).size).toBe(options.length);
  });
});

describe('isSemester', () => {
  it('menerima format baku', () => {
    expect(isSemester('2026/2027 Ganjil')).toBe(true);
    expect(isSemester('2025/2026 Genap')).toBe(true);
  });

  it('menolak bentuk lain, tahun tak berurutan, dan huruf kecil', () => {
    expect(isSemester('Ganjil 2026/2027')).toBe(false);
    expect(isSemester('2026/2028 Ganjil')).toBe(false);
    expect(isSemester('2026/2027 ganjil')).toBe(false);
    expect(isSemester('')).toBe(false);
  });
});

describe('sortSemestersDesc', () => {
  it('mengurutkan dari terbaru dan membuang duplikat', () => {
    expect(
      sortSemestersDesc([
        '2025/2026 Ganjil',
        '2026/2027 Ganjil',
        '2026/2027 Ganjil',
        '2026/2027 Genap',
      ]),
    ).toEqual(['2026/2027 Genap', '2026/2027 Ganjil', '2025/2026 Ganjil']);
  });
});
