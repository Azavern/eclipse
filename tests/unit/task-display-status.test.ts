import { describe, expect, it } from 'vitest';
import { DUE_SOON_HOURS, taskDisplayStatus, slugifyUsername } from '@/lib/time/domain';

const NOW = new Date('2026-10-05T09:00:00.000Z');
const HOUR = 3_600_000;

describe('taskDisplayStatus', () => {
  it('mengembalikan status tersimpan apa adanya tanpa menafsirkan ulang', () => {
    expect(taskDisplayStatus({ status: 'completed', deadline: NOW }, NOW)).toBe('completed');
    expect(taskDisplayStatus({ status: 'archived', deadline: NOW }, NOW)).toBe('archived');
  });

  it('completed dan archived menang atas tenggat yang sudah lewat', () => {
    const past = new Date(NOW.getTime() - 10 * HOUR);
    expect(taskDisplayStatus({ status: 'completed', deadline: past }, NOW)).toBe('completed');
    expect(taskDisplayStatus({ status: 'archived', deadline: past }, NOW)).toBe('archived');
  });

  it('tugas aktif tepat 72 jam sebelum tenggat masih due_soon (batas inklusif)', () => {
    const deadline = new Date(NOW.getTime() + DUE_SOON_HOURS * HOUR);
    expect(taskDisplayStatus({ status: 'active', deadline }, NOW)).toBe('due_soon');
  });

  it('satu milidetik lewat ambang bukan lagi due_soon', () => {
    const deadline = new Date(NOW.getTime() + DUE_SOON_HOURS * HOUR + 1);
    expect(taskDisplayStatus({ status: 'active', deadline }, NOW)).toBe('active');
  });

  it('satu milidetik lewat tenggat sudah overdue', () => {
    const deadline = new Date(NOW.getTime() - 1);
    expect(taskDisplayStatus({ status: 'active', deadline }, NOW)).toBe('overdue');
  });

  it('tenggat tepat di detik yang sama masih due_soon, bukan overdue', () => {
    // `deadline < now` memakai `<` ketat, jadi tenggat yang tepat sekarang belum
    // dianggap lewat. Baris ini mengunci batas itu dengan sengaja.
    expect(taskDisplayStatus({ status: 'active', deadline: NOW }, NOW)).toBe('due_soon');
  });

  it('menerima deadline berupa string ISO, bukan hanya Date', () => {
    const deadline = new Date(NOW.getTime() + HOUR).toISOString();
    expect(taskDisplayStatus({ status: 'active', deadline }, NOW)).toBe('due_soon');
  });
});

describe('slugifyUsername', () => {
  it('mengubah nama menjadi username lowercase dengan garis bawah', () => {
    expect(slugifyUsername('Ahmad Fauzi Rahman')).toBe('ahmad_fauzi_rahman');
  });

  it('menghapus diakritik sehingga huruf beraksen kembali ke huruf dasarnya', () => {
    expect(slugifyUsername('Budi Santoso')).toBe('budi_santoso');
    // NFD memisahkan "ü" menjadi "u" + diaeresis gabungan, yang lalu dihapus,
    // sehingga hanya huruf dasarnya yang tersisa — persis yang diinginkan.
    expect(slugifyUsername('Rina Türk')).toBe('rina_turk');
  });

  it('mengubah tanda baca dan spasi berlebih menjadi underscore tunggal', () => {
    expect(slugifyUsername('  Ana   Maria (SMP)  ')).toBe('ana_maria_smp');
  });

  it('memastikan panjang minimal 3 karakter', () => {
    expect(slugifyUsername('Jo')).toHaveLength(3);
  });

  it('memotong nama sangat panjang ke 30 karakter', () => {
    const long = 'Nama超级PanjangDenganBanyakKataSekali'.padEnd(60, 'a');
    const slug = slugifyUsername(long);
    expect(slug.length).toBeLessThanOrEqual(30);
    expect(slug).toMatch(/^[a-z0-9_]{3,30}$/);
  });

  it('menambahkan sufiks angka ketika nama pertama sudah dipakai', () => {
    const taken = new Set(['budi_santoso', 'budi_santoso_2']);
    expect(slugifyUsername('Budi Santoso', taken)).toBe('budi_santoso_3');
  });

  it('tidak menghasilkan username kosong untuk nama tanpa huruf', () => {
    const slug = slugifyUsername('123');
    expect(slug).toMatch(/^[a-z0-9_]{3,30}$/);
  });
});
