import { describe, expect, it } from 'vitest';
import { buildScheduleSchema, SCHEDULE_TYPES } from '@/features/schedule/schemas';
import { buildEventSchema } from '@/features/events/schemas';
import { buildTaskSchema, DEFAULT_TASK_TARGET, toTaskStatus } from '@/features/tasks/schemas';
import { formatTimeRange, isValidLocalInput } from '@/lib/time';

const TZ = 'Asia/Jakarta';

const validSchedule = {
  title: 'Kuliah Algoritma',
  description: 'Ruang 3.2',
  start_at: '2026-10-05T08:00',
  end_at: '2026-10-05T09:40',
  location: 'Ruang 3.2',
  type: 'class',
  url: null,
};

describe('buildScheduleSchema', () => {
  it('mengubah waktu dinding zona kelas menjadi UTC', () => {
    // 08.00 WIB = 01.00 UTC
    const parsed = buildScheduleSchema(TZ).safeParse(validSchedule);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.start_at).toBe('2026-10-05T01:00:00.000Z');
    expect(parsed.data.end_at).toBe('2026-10-05T02:40:00.000Z');
  });

  it('menolak waktu selesai sebelum waktu mulai', () => {
    const parsed = buildScheduleSchema(TZ).safeParse({
      ...validSchedule,
      start_at: '2026-10-05T10:00',
      end_at: '2026-10-05T09:00',
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues.some((i) => i.path[0] === 'end_at')).toBe(true);
  });

  it('menolak tanggal yang tidak ada di kalender, bukan cuma bentuknya', () => {
    const parsed = buildScheduleSchema(TZ).safeParse({
      ...validSchedule,
      start_at: '2026-02-30T08:00',
    });
    expect(parsed.success).toBe(false);
  });

  it('menolak jam di luar rentang', () => {
    expect(
      buildScheduleSchema(TZ).safeParse({ ...validSchedule, start_at: '2026-10-05T25:00' }).success,
    ).toBe(false);
    expect(
      buildScheduleSchema(TZ).safeParse({ ...validSchedule, start_at: '2026-10-05T08:60' }).success,
    ).toBe(false);
  });

  it('menolak tautan http dan judul kosong', () => {
    expect(
      buildScheduleSchema(TZ).safeParse({ ...validSchedule, url: 'http://contoh.id' }).success,
    ).toBe(false);
    expect(buildScheduleSchema(TZ).safeParse({ ...validSchedule, title: '   ' }).success).toBe(
      false,
    );
  });

  it('menerima seluruh tipe jadwal', () => {
    for (const type of SCHEDULE_TYPES) {
      expect(buildScheduleSchema(TZ).safeParse({ ...validSchedule, type }).success, type).toBe(true);
    }
    expect(buildScheduleSchema(TZ).safeParse({ ...validSchedule, type: 'lain' }).success).toBe(false);
  });
});

const validEvent = {
  title: 'Seminar',
  description: null,
  start_at: '2026-10-10T09:00',
  end_at: '2026-10-10T11:00',
  location: 'Aula',
  organizer: 'BEM',
  url: null,
};

describe('buildEventSchema', () => {
  it('menerima isian valid dan mengonversi waktu', () => {
    const parsed = buildEventSchema(TZ).safeParse(validEvent);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.start_at).toBe('2026-10-10T02:00:00.000Z');
    expect(parsed.data.organizer).toBe('BEM');
  });

  it('menolak deskripsi lebih dari 2000 karakter', () => {
    expect(
      buildEventSchema(TZ).safeParse({ ...validEvent, description: 'a'.repeat(2001) }).success,
    ).toBe(false);
    expect(
      buildEventSchema(TZ).safeParse({ ...validEvent, description: 'a'.repeat(2000) }).success,
    ).toBe(true);
  });

  it('menolak penyelenggara lebih dari 80 karakter', () => {
    expect(
      buildEventSchema(TZ).safeParse({ ...validEvent, organizer: 'a'.repeat(81) }).success,
    ).toBe(false);
  });
});

const validTask = {
  title: 'Kumpulkan laporan',
  description: null,
  deadline: '2026-10-07T23:59',
  target: 'Seluruh kelas',
  url: null,
};

describe('buildTaskSchema', () => {
  it('mengonversi tenggat ke UTC', () => {
    const parsed = buildTaskSchema(TZ).safeParse(validTask);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.deadline).toBe('2026-10-07T16:59:00.000Z');
  });

  it('mengosongkan sasaran berarti memakai default, bukan menolak', () => {
    const parsed = buildTaskSchema(TZ).safeParse({ ...validTask, target: '   ' });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.target).toBe(DEFAULT_TASK_TARGET);
  });

  it('menolak tenggat yang tidak valid', () => {
    expect(
      buildTaskSchema(TZ).safeParse({ ...validTask, deadline: '2026-04-31T10:00' }).success,
    ).toBe(false);
  });
});

describe('isValidLocalInput', () => {
  it('menerima waktu dinding yang nyata', () => {
    expect(isValidLocalInput('2026-10-05T08:00', TZ)).toBe(true);
    expect(isValidLocalInput('2028-02-29T00:00', TZ)).toBe(true);
  });

  it('menolak nilai yang akan di-roll TZDate', () => {
    expect(isValidLocalInput('2026-02-30T08:00', TZ)).toBe(false);
    expect(isValidLocalInput('2026-13-01T08:00', TZ)).toBe(false);
    expect(isValidLocalInput('2026-10-05T25:00', TZ)).toBe(false);
  });

  it('menolak bentuk yang tidak dikenal', () => {
    expect(isValidLocalInput('bukan waktu', TZ)).toBe(false);
    expect(isValidLocalInput('2026/10/05 08:00', TZ)).toBe(false);
  });
});

describe('formatTimeRange', () => {
  it('menampilkan rentang jam dengan label zona', () => {
    expect(formatTimeRange('2026-10-05T01:00:00.000Z', '2026-10-05T02:40:00.000Z', TZ)).toBe(
      '08.00–09.40 WIB',
    );
  });
});

describe('toTaskStatus', () => {
  it('nilai tak dikenal jatuh ke active', () => {
    expect(toTaskStatus(undefined)).toBe('active');
    expect(toTaskStatus('garbage')).toBe('active');
    expect(toTaskStatus('archived')).toBe('archived');
  });
});
