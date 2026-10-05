-- Migration 0009 — mata kuliah pada tugas
--
-- Permintaan Knotus: setiap tugas harus menyebut mata kuliahnya. Kolom ditambah
-- lewat migration BARU; migration yang sudah terlanjur applied tidak boleh
-- diubah atau dijalankan ulang (AGENTS.md §8).
--
-- Kolom sengaja nullable: baris lama tidak boleh dipalsukan dengan nilai
-- karangan. Kewajiban mengisinya ditegakkan skema Zod di sisi aplikasi, dan baris
-- lama yang masih kosong ditampilkan sebagai "Tanpa mata kuliah", bukan dengan
-- tebakan. CHECK menolak string kosong agar kolom tidak jadi ruang kosong-butah.

alter table public.tasks
  add column course text check (course is null or char_length(course) between 1 and 80);

comment on column public.tasks.course is
  'Nama mata kuliah tugas; wajib diisi dari aplikasi, null hanya untuk baris lama.';

-- Grant di tabel ini berbasis kolom (bukan grant penuh), jadi kolom baru harus
-- ditambahkan eksplisit ke grant insert/update agar PostgREST tidak menolaknya.
grant insert (class_id, title, description, deadline, target, url, status, course)
  on public.tasks to authenticated;
grant update (title, description, deadline, target, url, status, course)
  on public.tasks to authenticated;