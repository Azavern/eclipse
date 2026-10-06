/**
 * Semester akademik: nama, format, dan daftar yang ditawarkan.
 *
 * Jadwal kuliah berulang mingguan sepanjang semester, jadi satu baris jadwal
 * selalu milik satu semester. Namanya disimpan sebagai teks dengan satu format
 * tetap — "2026/2027 Ganjil" — supaya penyaring, pengurutan, dan CHECK database
 * tidak perlu menebak-nebak.
 *
 * Kalender akademik Indonesia: semester **ganjil** mulai Juli, semester
 * **genap** mulai Januari. Bulan dibaca dari UTC dengan sengaja: pergeseran
 * beberapa jam di batas semester tidak pernah mengubah nama semester, dan
 * fungsi ini karena itu aman dipakai di klien maupun server (tanpa date-fns).
 */

export const SEMESTER_PATTERN = /^([0-9]{4})\/([0-9]{4}) (Ganjil|Genap)$/;

/** Benar bila `value` berbentuk "2026/2027 Ganjil" dan tahunnya berurutan. */
export function isSemester(value: string): boolean {
  const match = SEMESTER_PATTERN.exec(value);
  if (!match) return false;
  return Number(match[2]) === Number(match[1]) + 1;
}

/** Semester yang memuat `date`, mis. "2026/2027 Ganjil". */
export function semesterFor(date: Date): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  return month >= 7 ? `${year}/${year + 1} Ganjil` : `${year - 1}/${year} Genap`;
}

/**
 * Semester berjalan dan beberapa semester sebelumnya (terbaru dulu).
 *
 * Hanya ke belakang: jadwal semester depan dibuat saat semester itu tiba, dan
 * semester lama yang tidak ada di daftar ini tetap bisa dipilih karena daftar
 * di halaman digabung dengan semester yang sudah ada di database.
 */
export function recentSemesters(count = 4, now = new Date()): string[] {
  const out: string[] = [];
  let cursor = now;
  for (let i = 0; i < count; i += 1) {
    const label = semesterFor(cursor);
    if (!out.includes(label)) out.push(label);
    // Mundur satu semester (± 6 bulan) lalu bulatkan: itulah semester sebelumnya.
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - 6, 1));
  }
  return out;
}

/**
 * Urutkan nama semester dari yang terbaru. Formatnya sengaja dipilih supaya
 * urutan teks = urutan waktu: "2026/2027 Genap" > "2026/2027 Ganjil" >
 * "2025/2026 Genap" — persis urutan semester sebenarnya.
 */
export function sortSemestersDesc(labels: string[]): string[] {
  return [...new Set(labels)].sort().reverse();
}
