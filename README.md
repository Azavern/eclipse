# Eclipse — Sistem Kelas Mahasiswa

Rumah digital sebuah kelas mahasiswa: identitas kelas, anggota beserta profil,
jadwal, event, dan tugas, dengan **Dynamic Visibility** yang dikendalikan
Ketua kelas.

Spesifikasi lengkap ada di [`blueprint.md`](./blueprint.md). Aturan rekayasa di
[`AGENTS.md`](./AGENTS.md), aturan desain UI/UX di [`DESIGN.md`](./DESIGN.md).
Status kerja dan hal yang belum terverifikasi ada di [`docs/STATUS.md`](./docs/STATUS.md).

## Stack

Next.js (App Router) · Supabase (Postgres, Auth, Storage, RLS) · Tailwind CSS v4 ·
Zod · date-fns · lucide-react · Vitest.

## Prasyarat

- Node.js LTS
- Proyek Supabase dengan migrasi 0001–0002 sudah diterapkan

## Menjalankan

```bash
npm install
cp .env.example .env.local    # isi nilainya
npm run dev
```

Variabel env divalidasi Zod saat startup, jadi aplikasi gagal cepat dengan pesan
jelas bila ada yang kurang. **Tidak ada variabel `NEXT_PUBLIC_*`** yang dipakai
aplikasi: tidak ada Supabase client di browser, sehingga kunci tidak pernah
sampai ke klien dan cookie sesi tetap `httpOnly`.

> `.env` proyek ini memakai nama `NEXT_PUBLIC_SUPABASE_*`. `src/lib/env.ts`
> membacanya sebagai fallback supaya tidak perlu mengubah apa pun sekarang,
> tetapi nama kanonisnya mengikuti `.env.example`.

## Migrasi database

Delapan migrasi di `supabase/migrations/` **sudah diterapkan**. Sumber kebenaran
adalah folder tersebut; schema change tidak pernah dieksekusi lewat Supabase
Dashboard SQL Editor (`AGENTS.md` §Database Rules). Untuk migrasi berikutnya:

```bash
npx supabase migration list      # sudah terpasang vs ada di repo
npx supabase db push --dry-run   # periksa dulu tanpa menulis
npx supabase db push
```

Catatan dan query verifikasi ada di
[`scripts/apply-migrations.md`](./scripts/apply-migrations.md). Tipe database
saat ini masih ditulis manual — lihat bagian Blocker di
[`docs/STATUS.md`](./docs/STATUS.md).

## Admin pertama

Ketua pertama dibuat lewat skrip, bukan lewat UI, karena signup Supabase harus
nonaktif di produksi. Skrip mencetak tautan akses sekali pakai ke stdout dan
tidak pernah mencetak atau menyimpan kata sandi:

```bash
BOOTSTRAP_ADMIN_EMAIL=ketua@contoh.id \
BOOTSTRAP_ADMIN_NAME="Nama Ketua" \
npm run bootstrap
```

Skrip idempoten: menjalankannya ulang untuk akun yang sama tidak membuat user
kedua. Sebaliknya ia menolak saat keanggotaan sudah `active` — pengalihan admin
lewat UI, bukan diam-diam.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` | Build produksi |
| `npm run check` | Token check + boundary check + lint + typecheck |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit test (Vitest) |
| `npm run check:tokens` | Menolak hex dan arbitrary value di komponen |
| `npm run check:boundaries` | Menolak impor lintas lapisan yang salah |
| `npm run db:types` | Generate tipe database dari Supabase |
| `npm run bootstrap` | Membuat Ketua pertama + tautan akses sekali pakai |

## Model hak akses

Otorisasi ditegakkan di **database**, bukan di UI:

```
User → Membership → Role → Permissions
```

Tidak ada Supabase client di browser. Semua baca/tulis lewat Server Component
dan Server Action memakai cookie sesi `httpOnly`; RLS, view bermasker, dan RPC
yang benar-benar decides. Gate di UI hanya defense in depth.

Visibility mengikuti model tiga tempat, satu resolver: katalog statis
(`visibility_catalog`), override (`visibility_rules`), dan kolom `visibility`
nullable pada item. Penentu efektifnya dihitung **satu kali oleh fungsi SQL yang
sama** — `app.can_view` — untuk RLS, view, RPC, dan Storage sekaligus. Key yang
tidak dikenal berakhir pada `class_admin` (fail closed).

## Tanpa data karangan

Tidak ada data contoh dalam kode atau seed. Nama kelas dibaca dari
`classes.name`; tagline, deskripsi, dan kode dibiarkan `NULL` sampai Ketua
mengisinya, dan UI menampilkan empty state alih-alih teks pengganti.
