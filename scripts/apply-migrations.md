# Menjalankan migrasi 0003-0008

Migrasi 0001-0002 sudah diterapkan. Sisanya perlu dijalankan lewat SQL Editor di
Supabase Dashboard, karena lingkungan ini tidak punya `psql`, Docker, maupun
Supabase access token.

## Urutan

Jalankan file berikut **berurutan** di SQL Editor (New query → Run):

1. `supabase/migrations/0003_helpers_visibility.sql`
2. `supabase/migrations/0004_triggers.sql`
3. `supabase/migrations/0005_privileges_rls.sql`
4. `supabase/migrations/0006_views_rpc.sql`
5. `supabase/migrations/0007_storage.sql`
6. `supabase/migrations/0008_reference_data.sql`

## Verifikasi

Jalankan query berikut setelah semua file selesai. Nilai yang diharapkan
tertulis di komentar.

```sql
-- Katalog visibility: 27 key
select count(*) as katalog from public.visibility_catalog;

-- Kelas Eclipse dengan timezone Asia/Jakarta dan 2 role
select c.name, c.timezone, count(r.id) as jumlah_role
from public.classes c
left join public.roles r on r.class_id = c.id
group by c.name, c.timezone;

-- Helper di schema app terpasang
select proname
from pg_proc
join pg_namespace n on n.oid = pronamespace
where n.nspname = 'app'
order by proname;

-- View bermasker bisa dibaca
select id, name, tagline from public.class_identity_v;

-- Bucket Storage private dengan batas 2 MiB
select id, public, file_size_limit from storage.buckets
where id in ('class-media', 'member-media');
```

Hasil yang diharapkan:

- `katalog` = 27
- satu baris: `Eclipse | Asia/Jakarta | 2`
- `class_identity_v` mengembalikan baris `Eclipse` dengan `tagline` NULL
  ( purposefully NULL sampai Ketua mengisinya — bukan data karangan)
- kedua bucket `public = false`, `file_size_limit = 2097152`

## Setelah itu

Buat ulang tipe database dari skema yang sudah terpasang:

```bash
npm run db:types
```

Lalu jalankan tes unit dan build:

```bash
npm test
npm run build
```

## Catatan urutan

Migrasi 0005 mengaktifkan RLS dan mencabut hak akses, sedangkan view dan RPC
baru ada di 0006. Ada jeda singkat di antara keduanya di mana tabel sudah
terkunci tetapi view belum tersedia — halaman akan membaca kosong, bukan error.
Jalankan 0005 dan 0006 dalam satu operasi bila SQL Editor mengizinkan.

Jangan jalankan ulang migrasi yang sudah diterapkan; `CREATE OR REPLACE` dan
`revoke` bersifat idempoten, tetapi `create table`/`create policy` tidak.
