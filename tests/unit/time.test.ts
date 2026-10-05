import { describe, expect, it } from 'vitest';
import {
  CLASS_TIMEZONES,
  dayKey,
  formatDateOnly,
  formatDateTime,
  formatRange,
  formatTime,
  isClassTimezone,
  localInputToUtcIso,
  toClassTimezone,
  utcIsoToLocalInput,
  zoneLabel,
} from '@/lib/time';
import { isUpcoming } from '@/lib/time/domain';

describe('konversi datetime-local <-> UTC', () => {
  it('mengubah waktu dinding WIB menjadi UTC (WIB = UTC+7)', () => {
    // 08.00 WIB = 01.00 UTC
    expect(localInputToUtcIso('2026-10-05T08:00', 'Asia/Jakarta')).toBe('2026-10-05T01:00:00.000Z');
  });

  it('menghormati selisih WITA (UTC+8) dan WIT (UTC+9)', () => {
    expect(localInputToUtcIso('2026-10-05T08:00', 'Asia/Makassar')).toBe(
      '2026-10-05T00:00:00.000Z',
    );
    expect(localInputToUtcIso('2026-10-05T08:00', 'Asia/Jayapura')).toBe(
      '2026-10-04T23:00:00.000Z',
    );
  });

  it('tidak menggeser hari untuk zonaahead-of-UTC', () => {
    // 01.00 WIT masih hari sebelumnya di UTC.
    expect(localInputToUtcIso('2026-10-05T01:00', 'Asia/Jayapura')).toBe(
      '2026-10-04T16:00:00.000Z',
    );
  });

  it('kembalikan UTC ke input datetime-local pada timezone yang sama', () => {
    const iso = '2026-10-05T01:00:00.000Z';
    expect(utcIsoToLocalInput(iso, 'Asia/Jakarta')).toBe('2026-10-05T08:00');
    expect(utcIsoToLocalInput(iso, 'Asia/Makassar')).toBe('2026-10-05T09:00');
  });

  it('bolak-balik tanpa kehilangan waktu untuk ketiga zona', () => {
    for (const zone of CLASS_TIMEZONES) {
      const local = '2026-10-05T14:30';
      const iso = localInputToUtcIso(local, zone);
      expect(iso).not.toBeNull();
      expect(utcIsoToLocalInput(iso!, zone)).toBe(local);
    }
  });

  it('mengembalikan null untuk input yang tidak valid', () => {
    expect(localInputToUtcIso('bukan tanggal', 'Asia/Jakarta')).toBeNull();
    expect(localInputToUtcIso('', 'Asia/Jakarta')).toBeNull();
  });
});

describe('format waktu pada timezone kelas', () => {
  // 01.00 UTC = 08.00 WIB, 09.00 WITA, 10.00 WIT
  const iso = '2026-10-05T01:00:00.000Z';

  it('menampilkan jam dengan label zona yang benar', () => {
    expect(formatTime(iso, 'Asia/Jakarta')).toBe('08.00 WIB');
    expect(formatTime(iso, 'Asia/Makassar')).toBe('09.00 WITA');
    expect(formatTime(iso, 'Asia/Jayapura')).toBe('10.00 WIT');
  });

  it('memakai timezone kelas, bukan timezone mesin', () => {
    // Nilai yang sama harus tampil berbeda per zona kelas.
    expect(formatTime(iso, 'Asia/Jakarta')).not.toBe(formatTime(iso, 'Asia/Jayapura'));
  });

  it('formatRange menggabungkan tanggal, jam, dan label zona', () => {
    const end = '2026-10-05T02:40:00.000Z';
    expect(formatRange(iso, end, 'Asia/Jakarta')).toBe('Sen, 5 Okt · 08.00–09.40 WIB');
  });

  it('formatDateTime menyertakan tahun', () => {
    expect(formatDateTime(iso, 'Asia/Jakarta')).toBe('5 Okt 2026, 08.00 WIB');
  });

  it('dayKey memakai tanggal menurut timezone kelas', () => {
    // 23.00 UTC masih 5 Okt di WIB, tapi sudah 6 Okt di WIT.
    const late = '2026-10-05T23:00:00.000Z';
    expect(dayKey(late, 'Asia/Jakarta')).toBe('2026-10-06');
    expect(dayKey(late, 'Asia/Jayapura')).toBe('2026-10-06');
  });

  it('timezone tak dikenal jatuh ke default, bukan melempar error', () => {
    expect(toClassTimezone('Europe/Amsterdam')).toBe('Asia/Jakarta');
    expect(zoneLabel('Europe/Amsterdam')).toBe('Europe/Amsterdam');
    expect(isClassTimezone('Asia/Jakarta')).toBe(true);
    expect(isClassTimezone('Europe/Amsterdam')).toBe(false);
  });
});

describe('formatDateOnly', () => {
  it('merender kolom date tanpa menggeser hari karena zona mesin', () => {
    // Nilai "2026-01-01" tidak punya zona. Kalau dikonversi lewat new Date(),
    // mesin di offset negatif akan menampilkannya sebagai 31 Des 2025.
    expect(formatDateOnly('2026-01-01')).toBe('1 Jan 2026');
    expect(formatDateOnly('2026-10-05')).toBe('5 Okt 2026');
  });

  it('bentuk tak dikenal dikembalikan apa adanya, bukan error', () => {
    expect(formatDateOnly('bukan tanggal')).toBe('bukan tanggal');
  });
});

describe('isUpcoming', () => {
  const now = new Date('2026-10-05T09:00:00.000Z');

  it('kegiatan yang masih berlangsung tetap upcoming', () => {
    expect(isUpcoming('2026-10-05T09:30:00.000Z', now)).toBe(true);
  });

  it('kegiatan yang tepat berakhir masih upcoming (>= now)', () => {
    expect(isUpcoming('2026-10-05T09:00:00.000Z', now)).toBe(true);
  });

  it('kegiatan yang sudah lewat tidak upcoming', () => {
    expect(isUpcoming('2026-10-05T08:59:59.000Z', now)).toBe(false);
  });
});
