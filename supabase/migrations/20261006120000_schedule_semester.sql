-- Migration 0010 — jadwal kuliah mingguan + semester (6 Oktober 2026)
--
-- Permintaan Knotus: jadwal itu jadwal KULIAH, terpisah dari event/kegiatan. Isinya
-- cukup hari + jam, karena kuliah berulang mingguan sepanjang semester — tidak perlu
-- tanggal, dan tidak perlu diketik ulang tiap minggu. Jadwal dikelompokkan per
-- semester supaya semester lama tetap tersimpan dan bisa dipilih kembali.
--
-- Data lama TIDAK dibuang: hari dan jam diturunkan dari start_at/end_at memakai zona
-- waktu kelas, dan baris lama ditempatkan pada semester yang berjalan saat migrasi
-- ini dijalankan. Setelah backfill, kolom bertanggal dihapus supaya tidak ada dua
-- sumber kebenaran (menghapus kolom otomatis menghapus index schedules_class_start_idx
-- dan CHECK (end_at >= start_at) yang bergantung padanya).

alter table public.schedules
  add column day_of_week smallint,
  add column start_time  time,
  add column end_time    time,
  add column semester    text;

-- Backfill satu kali untuk baris yang sudah ada.
update public.schedules s
   set day_of_week = extract(isodow from (s.start_at at time zone c.timezone))::smallint,
       start_time  = (s.start_at at time zone c.timezone)::time,
       end_time    = (s.end_at   at time zone c.timezone)::time,
       semester    = case
         when extract(month from (now() at time zone c.timezone)) >= 7
           then to_char(now() at time zone c.timezone, 'YYYY') || '/' ||
                (extract(year from (now() at time zone c.timezone))::int + 1)::text || ' Ganjil'
         else (extract(year from (now() at time zone c.timezone))::int - 1)::text || '/' ||
              to_char(now() at time zone c.timezone, 'YYYY') || ' Genap'
       end
  from public.classes c
 where c.id = s.class_id;

alter table public.schedules
  alter column day_of_week set not null,
  alter column start_time  set not null,
  alter column end_time    set not null,
  alter column semester    set not null;

alter table public.schedules
  add constraint schedules_day_of_week_check check (day_of_week between 1 and 7),
  add constraint schedules_time_order_check  check (end_time > start_time),
  -- Format semester satu-satunya yang boleh ditulis klien; tahun keduanya harus
  -- tahun pertama + 1 supaya "2026/2028 Ganjil" tidak pernah masuk.
  add constraint schedules_semester_check check (
    semester ~ '^[0-9]{4}/[0-9]{4} (Ganjil|Genap)$'
    and split_part(split_part(semester, ' ', 1), '/', 2)::int
        = split_part(split_part(semester, ' ', 1), '/', 1)::int + 1
  );

alter table public.schedules drop column start_at, drop column end_at;

-- Pola kueri baru: daftar kelas + semester, urut hari lalu jam.
create index schedules_class_semester_idx
  on public.schedules (class_id, semester, day_of_week, start_time);

-- Grant berbasis kolom: kolom baru harus disebut ulang, kalau tidak PostgREST
-- menolak tulisan (pola yang sama dipakai saat menambah tasks.course).
grant insert (class_id, title, description, day_of_week, start_time, end_time, semester, location, type, url)
  on public.schedules to authenticated;
grant update (title, description, day_of_week, start_time, end_time, semester, location, type, url)
  on public.schedules to authenticated;
