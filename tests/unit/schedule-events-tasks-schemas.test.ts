import { describe, expect, it } from 'vitest';
import { buildScheduleSchema, SCHEDULE_TYPES } from '@/features/schedule/schemas';
import { buildEventSchema } from '@/features/events/schemas';
import {
  buildTaskSchema,
  DEFAULT_TASK_TARGET,
  TASK_TARGETS,
  toTaskStatus,
} from '@/features/tasks/schemas';
import { formatWallTimeRange, isValidLocalInput } from '@/lib/time';

const TZ = 'Asia/Jakarta';

const validSchedule = {
  title: 'Kuliah Algoritma',
  description: 'Ruang 3.2',
  day_of_week: '1',
  start_time: '08:00',
  end_time: '09:40',
  semester: '2026/2027 Ganjil',
  location: 'Ruang 3.2',
  type: 'class',
  url: null,
};

describe('buildScheduleSchema', () => {
  it('menerima jadwal mingguan: hari + jam + semester, tanpa tanggal', () => {
    const parsed = buildScheduleSchema().safeParse(validSchedule);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.day_of_week).toBe(1);
    expect(parsed.data.start_time).toBe('08:00');
    expect(parsed.data.semester).toBe('2026/2027 Ganjil');
  });

  it('menolak jam selesai yang mendahului atau sama dengan jam mulai', () => {
    for (const end_time of ['07:00', '08:00']) {
      const parsed = buildScheduleSchema().safeParse({ ...validSchedule, end_time });
      expect(parsed.success, end_time).toBe(false);
      if (parsed.success) continue;
      expect(parsed.error.issues.some((i) => i.path[0] === 'end_time')).toBe(true);
    }
  });

  it('menolak hari di luar 1–7 dan hari yang bukan angka', () => {
    for (const day_of_week of ['0', '8', 'senin', '', '1.5']) {
      expect(
        buildScheduleSchema().safeParse({ ...validSchedule, day_of_week }).success,
        day_of_week,
      ).toBe(false);
    }
  });

  it('menolak jam yang bukan bentuk 24 jam dua digit', () => {
    for (const start_time of ['25:00', '8:00', '08:60', 'pagi']) {
      expect(buildScheduleSchema().safeParse({ ...validSchedule, start_time }).success, start_time).toBe(
        false,
      );
    }
  });

  it('menolak semester di luar format baku', () => {
    for (const semester of ['Ganjil 2026/2027', '2026/2028 Ganjil', '2026/2027 ganjil', '']) {
      expect(buildScheduleSchema().safeParse({ ...validSchedule, semester }).success, semester).toBe(
        false,
      );
    }
  });

  it('menolak tautan http dan judul kosong', () => {
    expect(buildScheduleSchema().safeParse({ ...validSchedule, url: 'http://contoh.id' }).success).toBe(
      false,
    );
    expect(buildScheduleSchema().safeParse({ ...validSchedule, title: '   ' }).success).toBe(false);
  });

  it('menerima seluruh tipe jadwal', () => {
    for (const type of SCHEDULE_TYPES) {
      expect(buildScheduleSchema().safeParse({ ...validSchedule, type }).success, type).toBe(true);
    }
    expect(buildScheduleSchema().safeParse({ ...validSchedule, type: 'lain' }).success).toBe(false);
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
  course: 'Basis Data',
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

  it('menyimpan mata kuliah yang diisi', () => {
    const parsed = buildTaskSchema(TZ).safeParse({ ...validTask, course: '  Basis Data  ' });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.course).toBe('Basis Data');
  });

  it('menolak mata kuliah kosong karena tugas harus menyebut mata kuliahnya', () => {
    expect(buildTaskSchema(TZ).safeParse({ ...validTask, course: '' }).success).toBe(false);
    expect(buildTaskSchema(TZ).safeParse({ ...validTask, course: '   ' }).success).toBe(false);
    expect(buildTaskSchema(TZ).safeParse({ ...validTask, course: 'a'.repeat(81) }).success).toBe(
      false,
    );
  });

  it('menerima setiap sasaran dari daftar dan menolak teks bebas', () => {
    for (const target of TASK_TARGETS) {
      expect(buildTaskSchema(TZ).safeParse({ ...validTask, target }).success, target).toBe(true);
    }
    // Ditulis manual lewat request-craftedFormData tidak boleh lolos.
    expect(buildTaskSchema(TZ).safeParse({ ...validTask, target: 'Kelompok A' }).success).toBe(
      false,
    );
    expect(buildTaskSchema(TZ).safeParse({ ...validTask, target: 'seluruh kelas' }).success).toBe(
      false,
    );
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

describe('formatWallTimeRange', () => {
  it('menampilkan rentang jam dinding dengan label zona', () => {
    expect(formatWallTimeRange('17:30:00', '19:00:00', 'Asia/Makassar')).toBe('17.30–19.00 WITA');
  });
});

describe('toTaskStatus', () => {
  it('nilai tak dikenal jatuh ke active', () => {
    expect(toTaskStatus(undefined)).toBe('active');
    expect(toTaskStatus('garbage')).toBe('active');
    expect(toTaskStatus('archived')).toBe('archived');
  });
});
