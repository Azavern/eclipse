# Migrasi database

> **Aturan (AGENTS.md §Database Rules):** `supabase/migrations/` adalah sumber
> kebenaran. Schema change **tidak pernah** dieksekusi lewat Supabase Dashboard
> SQL Editor. Selalu lewat Supabase CLI.

## Status: sudah diterapkan

Delapan migrasi sudah diterapkan ke project Supabase. Semuanya diberi nama
berformat timestamp CLI:

| File                                    | Isi                                              |
| --------------------------------------- | ------------------------------------------------ |
| `20261005120000_initial_schema.sql`     | tabel inti kelas, anggota, jadwal                |
| `20261005120100_second_schema.sql`      | tabel konten (tugas, event, sosial, portofolio)  |
| `20261005120200_helpers_visibility.sql` | helper `app.*` + katalog visibilitas (27 key)    |
| `20261005120300_triggers.sql`           | trigger guard, sinkronisasi profil, last-admin   |
| `20261005120400_privileges_rls.sql`     | grant + RLS (default-deny)                       |
| `20261005120500_views_rpc.sql`          | view bermasker + RPC                             |
| `20261005120600_storage.sql`            | bucket `class-media` & `member-media`            |
| `20261005120700_reference_data.sql`     | baris awal: kelas Eclipse, role `ketua`/`member` |

## Alur untuk migrasi berikutnya

```bash
# 1. Lihat apa yang sudah diterapkan vs apa yang ada di repo.
npx supabase migration list

# 2. Periksa dulu tanpa menulis apa pun.
npx supabase db push --dry-run

# 3. Terapkan.
npx supabase db push
```

Jangan pernah menjalankan ulang migrasi yang sudah applied. `create table` dan
`create policy` tidak idempoten, jadi mengulanginya akan gagal dan meninggalkan
skema setengah jadi.

## Query verifikasi

Query di bawah hanya **membaca** — aman dijalankan di mana saja, termasuk SQL
Editor, untuk memeriksa hasil.

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

## Tipe database

`src/lib/supabase/database.types.ts` masih ditulis manual karena `supabase gen
types` butuh Docker atau access token yang tidak tersedia di lingkungan ini.

```bash
npm run db:types   # butuh --local (Docker) atau access token
```

Setelah di-regenerate, periksa dua hal sebelum commit — keduanya pernah
menyulitkan:

1. Tipe baris harus `type X = { … }`, **bukan** `interface X`. `interface` tidak
   punya implicit index signature, sehingga gagal memenuhi `Record<string,
unknown>` dan seluruh `.from()` / `.rpc()` menjadi `never`.
2. `Update` tidak boleh `never`; harus berupa objek.
