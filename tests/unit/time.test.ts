import { describe, expect, it } from 'vitest';
import {
  CLASS_TIMEZONES,
  formatDateOnly,
  formatDateTime,
  formatRange,
  formatTime,
  formatWallTime,
  formatWallTimeRange,
  isClassTimezone,
  localInputToUtcIso,
  nextOccurrence,
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

  it('formatWallTime menampilkan jam dinding, bukan instan UTC', () => {
    expect(formatWallTime('08:00', 'Asia/Jakarta')).toBe('08.00 WIB');
    // Bentuk kolom `time` dari database ikut diterima.
    expect(formatWallTime('08:00:00', 'Asia/Jakarta')).toBe('08.00 WIB');
    expect(formatWallTimeRange('17:30:00', '19:00:00', 'Asia/Makassar')).toBe('17.30–19.00 WITA');
  });

  it('timezone tak dikenal jatuh ke default, bukan melempar error', () => {
    expect(toClassTimezone('Europe/Amsterdam')).toBe('Asia/Jakarta');
    expect(zoneLabel('Europe/Amsterdam')).toBe('Europe/Amsterdam');
    expect(isClassTimezone('Asia/Jakarta')).toBe(true);
    expect(isClassTimezone('Europe/Amsterdam')).toBe(false);
  });
});

describe('nextOccurrence', () => {
  it('memakai hari yang sama bila jamnya belum lewat', () => {
    // Selasa 6 Okt 2026, 06.00 WITA — kuliah Selasa 08.00–09.40 WITA belum mulai.
    const from = new Date('2026-10-05T22:00:00.000Z');
    const next = nextOccurrence(2, '08:00', '09:40', 'Asia/Makassar', from);
    expect(next?.at).toBe('2026-10-06T00:00:00.000Z');
    expect(next?.until).toBe('2026-10-06T01:40:00.000Z');
  });

  it('melompat ke minggu berikutnya bila jamnya sudah lewat', () => {
    // Selasa 11.00 WITA — kuliah pagi sudah selesai.
    const from = new Date('2026-10-06T03:00:00.000Z');
    const next = nextOccurrence(2, '08:00', '09:40', 'Asia/Makassar', from);
    expect(next?.at).toBe('2026-10-13T00:00:00.000Z');
  });

  it('kuliah yang sedang berjalan tetap dihitung sebagai berikutnya', () => {
    // Selasa 08.30 WITA, kuliah 08.00–09.40 masih berlangsung.
    const from = new Date('2026-10-06T00:30:00.000Z');
    const next = nextOccurrence(2, '08:00', '09:40', 'Asia/Makassar', from);
    expect(next?.at).toBe('2026-10-06T00:00:00.000Z');
  });

  it('menghitung hari menurut zona kelas, bukan zona mesin', () => {
    // 2026-10-05 18.00 UTC = Selasa 02.00 WITA; kuliah Selasa 01.00–02.00
    // berakhir tepat pada saat itu, jadi berikutnya Selasa pekan depan.
    const from = new Date('2026-10-05T18:00:00.000Z');
    const next = nextOccurrence(2, '01:00', '02:00', 'Asia/Makassar', from);
    // Selasa 13 Okt 01.00 WITA = Senin 12 Okt 17.00 UTC.
    expect(next?.at).toBe('2026-10-12T17:00:00.000Z');
  });

  it('menolak masukan yang tidak masuk akal, bukan menebaknya', () => {
    expect(nextOccurrence(0, '08:00', '09:00', 'Asia/Jakarta')).toBeNull();
    expect(nextOccurrence(8, '08:00', '09:00', 'Asia/Jakarta')).toBeNull();
    expect(nextOccurrence(2, '25:00', '09:00', 'Asia/Jakarta')).toBeNull();
    expect(nextOccurrence(2, '08:00', 'bukan jam', 'Asia/Jakarta')).toBeNull();
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
