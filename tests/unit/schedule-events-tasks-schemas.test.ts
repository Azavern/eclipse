import { describe, expect, it } from 'vitest';
import {
  buildScheduleListSchema,
  buildScheduleSchema,
  MAX_SCHEDULE_ROWS,
  readScheduleRows,
  SCHEDULE_TYPES,
} from '@/features/schedule/schemas';
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
      expect(
        buildScheduleSchema().safeParse({ ...validSchedule, start_time }).success,
        start_time,
      ).toBe(false);
    }
  });

  it('menolak semester di luar format baku', () => {
    for (const semester of ['Ganjil 2026/2027', '2026/2028 Ganjil', '2026/2027 ganjil', '']) {
      expect(
        buildScheduleSchema().safeParse({ ...validSchedule, semester }).success,
        semester,
      ).toBe(false);
    }
  });

  it('menolak tautan http dan judul kosong', () => {
    expect(
      buildScheduleSchema().safeParse({ ...validSchedule, url: 'http://contoh.id' }).success,
    ).toBe(false);
    expect(buildScheduleSchema().safeParse({ ...validSchedule, title: '   ' }).success).toBe(false);
  });

  it('menerima seluruh tipe jadwal', () => {
    for (const type of SCHEDULE_TYPES) {
      expect(buildScheduleSchema().safeParse({ ...validSchedule, type }).success, type).toBe(true);
    }
    expect(buildScheduleSchema().safeParse({ ...validSchedule, type: 'lain' }).success).toBe(false);
  });
});

describe('buildScheduleListSchema', () => {
  const shared = { semester: validSchedule.semester };

  it('menerima beberapa jadwal sekaligus dengan satu semester', () => {
    const parsed = buildScheduleListSchema().safeParse({
      ...shared,
      rows: [validSchedule, { ...validSchedule, title: 'Kuliah Basis Data' }],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.rows).toHaveLength(2);
    expect(parsed.data.rows[1]?.title).toBe('Kuliah Basis Data');
    expect(parsed.data.semester).toBe('2026/2027 Ganjil');
  });

  it('menolak daftar kosong', () => {
    const parsed = buildScheduleListSchema().safeParse({ ...shared, rows: [] });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0]?.message).toContain('minimal satu');
  });

  it('menolak lebih dari batas baris', () => {
    const rows = Array.from({ length: MAX_SCHEDULE_ROWS + 1 }, (_, i) => ({
      ...validSchedule,
      title: `Jadwal ${i}`,
    }));
    const parsed = buildScheduleListSchema().safeParse({ ...shared, rows });
    expect(parsed.success).toBe(false);
  });

  it('menunjuk baris yang salah lewat posisinya di daftar', () => {
    const parsed = buildScheduleListSchema().safeParse({
      ...shared,
      rows: [validSchedule, { ...validSchedule, end_time: '07:00' }],
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues.some((issue) => issue.path.join('.') === 'rows.1.end_time')).toBe(
      true,
    );
  });

  it('menolak semester bersama yang tidak sesuai format', () => {
    const parsed = buildScheduleListSchema().safeParse({
      semester: 'Ganjil 2026/2027',
      rows: [validSchedule],
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues.some((issue) => issue.path[0] === 'semester')).toBe(true);
  });
});

describe('readScheduleRows', () => {
  const fdWith = (entries: Record<string, string>) => {
    const fd = new FormData();
    for (const [key, value] of Object.entries(entries)) fd.set(key, value);
    return fd;
  };

  it('membaca baris berakhiran -0 dan -1 beserta nilai yang kosong', () => {
    const rows = readScheduleRows(
      fdWith({
        semester: '2026/2027 Ganjil',
        'title-0': 'Algoritma',
        'start_time-0': '08:00',
        'title-1': 'Basis Data',
        'start_time-1': '10:00',
      }),
    );
    expect(rows.map((row) => row.index)).toEqual([0, 1]);
    expect(rows[0]?.values.title).toBe('Algoritma');
    expect(rows[1]?.values.start_time).toBe('10:00');
    // Field yang tidak dikirim tetap ada sebagai teks kosong, bukan undefined.
    expect(rows[0]?.values.location).toBe('');
  });

  it('mengurutkan baris menurut nomornya, bukan urutan field', () => {
    const rows = readScheduleRows(fdWith({ 'title-1': 'B', 'title-0': 'A' }));
    expect(rows.map((row) => row.values.title)).toEqual(['A', 'B']);
  });

  it('mengabaikan field di luar pola baris', () => {
    const rows = readScheduleRows(fdWith({ semester: '2026/2027 Ganjil', title: 'tanpa nomor' }));
    expect(rows).toEqual([]);
  });

  it('membaca satu baris di atas batas supaya skema yang menolaknya', () => {
    const entries: Record<string, string> = {};
    for (let i = 0; i < MAX_SCHEDULE_ROWS + 3; i += 1) entries[`title-${i}`] = `Jadwal ${i}`;
    const rows = readScheduleRows(fdWith(entries));
    expect(rows).toHaveLength(MAX_SCHEDULE_ROWS + 1);
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
