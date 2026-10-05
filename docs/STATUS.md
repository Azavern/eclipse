# STATUS

Catatan progres, temuan sementara, gap, dan keputusan. Aturan rekayasa ada di
`AGENTS.md`, aturan desain di `DESIGN.md`, dan spesifikasi produk di
`blueprint.md`. File ini hanya mencatat keadaan kerja.

Terakhir diperbarui: 5 Oktober 2026.

---

## Ringkasan keadaan

Fondasi, lapisan database, sistem desain, dan kerangka aplikasi sudah terbangun
dan **terverifikasi lewat lint, typecheck, unit test, build, dan render nyata**.
Fase 3, 4, dan 5 (anggota, profil, portofolio, sosial, pengaturan, jadwal,
event, tugas) **selesai**. Yang tersisa: hardening/rilis Fase 7.

Pekerjaan ini ada di working tree lokal. Belum ada commit, belum ada push.

---

## Yang sudah selesai

### Fase 0 — Fondasi
- Restrukturisasi `app/` → `src/app/` sesuai blueprint §4.
- TypeScript `strict` + `noUncheckedIndexedAccess`, alias `@/*` → `./src/*`.
- Tailwind v4 CSS-first dengan `@theme` memetakan seluruh token statis dan
  runtime ke CSS variables (`src/styles/globals.css`).
- Skrip: `lint`, `typecheck`, `test`, `build`, `check:tokens`,
  `check:boundaries`, `db:types`, `format`.
- `src/lib/env.ts` memvalidasi env dengan Zod saat startup.
- `.env.example` tanpa nilai nyata.

### Fase 1 — Database
Delapan migration ditulis **dan sudah diterapkan** ke project Supabase lewat
`npx supabase db push`. Semuanya diberi nama berformat timestamp CLI:

| File | Isi |
|---|---|
| `20261005120000_initial_schema.sql` | tabel inti kelas, anggota, jadwal |
| `20261005120100_second_schema.sql` | tabel konten (tugas, event, sosial, portofolio) |
| `20261005120200_helpers_visibility.sql` | Helper auth + resolver `app.own_audience` / `effective_audience` / `can_view` |
| `20261005120300_triggers.sql` | Invarian, guard kolom, last-admin, batas baris, log aktivitas |
| `20261005120400_privileges_rls.sql` | Default-deny + seluruh policy RLS |
| `20261005120500_views_rpc.sql` | View bermasker + RPC |
| `20261005120600_storage.sql` | Bucket private + policy Storage |
| `20261005120700_reference_data.sql` | Katalog 27 key, kelas Eclipse, dua role |

Alur migrasi berikutnya ada di `scripts/apply-migrations.md`.

### Fase 2 — Auth, sesi, shell, token
- `src/proxy.ts`: refresh cookie sesi (`getUser()`) + nonce CSP per request.
  Tidak ada logika otorisasi di sini.
- `src/lib/visibility/server.ts`: `getViewer`, `getVisibilityMap`, `canShow`,
  `requireView`, `requirePermission`.
- `src/features/auth/`: login, konfirmasi tautan akses, set password, ganti
  sandi, keluar.
- `/auth/confirm` dan `/set-password` (halamannya; aksinya sudah ada sebelumnya).
- `scripts/bootstrap-admin.ts`: membuat Ketua pertama dan menerbitkan tautan akses
  sekali pakai.
- `src/components/ui/`: primitive lengkap dengan seluruh state (§11.2).
- `/dev/ui`: galeri state, `notFound()` di produksi.
- `AppShell`, `SidebarNav` (≥1024 px), `BottomNav` (<1024 px), `TopBar`,
  `UserMenu`.
- Injeksi theme runtime di root layout, divalidasi ulang oleh `ThemeSchema`.

### Fase 4 (selesai) — Anggota & akun
- `/settings/profile`: nama, username, nama panggilan, bio, dan unggah avatar.
  Ini menutup redirect `setPassword` yang selama ini mendarat di 404 (T-10).
  Gate-nya **keanggotaan aktif**, bukan sekadar signed-in — anggota `invited`
  atau `inactive` punya sesi tapi belum berhak menyunting profil.
- `getMyProfile` membaca **tabel dasar**, bukan `member_profile_v`. View sudah
  apply masking visibility sehingga nickname/bio bisa NULL di sana padahal
  aslinya terisi; form edit harus melihat nilai sebenarnya.
- `updateMyProfile` sengaja TIDAK memakai RPC `update_member_identity` — fungsi
  itu menuntut `members.manage` dan hanya untuk moderasi oleh Ketua. Anggota
  menulis lewat policy `member_profiles_update_own`.
- `/settings/account`: ganti kata sandi. Aksinya sudah ada sejak awal, halamannya
  yang baru. Password lama wajib (re-auth) sebelum `updateUser`.
- `/members`: grid anggota dari `member_profile_v`, tanpa pencarian (§10).
- `/settings/members` (`members.manage`): undangan, nonaktifkan/aktifkan, hapus.
  Email tidak ada di tabel maupun view, jadi `getManagedMembers` menggabungkan
  `member_profile_v` + Auth Admin API. Keduanya berada di `features/member/actions.ts`
  karena itulah satu-satunya tempat yang diizinkan memakai service role
  (`no-restricted-imports` hanya mengecualikan `features/**/actions.ts`).

Alur undangan (blueprint §10.2): `admin.createUser` (sandi acak, tak pernah
dikembalikan) → `rpc('provision_member')` lewat **JWT Ketua** → bila RPC gagal,
`admin.deleteUser` sebagai kompensasi → `generateLink` → URL ditampilkan sekali.
Menu nonaktifkan/hapus dinonaktifkan untuk baris sendiri.

### Lanjutan Fase 4 — profil publik, portofolio, sosial, visibilitas anggota
- `/members/[username]`: profil publik dari `member_profile_v` + portofolio +
tautan sosial. `null` (tidak ada ATAU tidak terlihat) sama-sama `notFound()`,
jadi keberadaan anggota lain tidak bocor lewat perbedaan status.
- `/settings/profile` kini juga memuat CRUD portofolio (media via
`member-media`, media lama dibuang **setelah** baris tersimpan) dan tautan
sosial, plus `AudienceSelect` per item (`item.portfolio`, `item.social_link`).
- Editor visibilitas anggota (`MemberVisibilityEditor`) memakai
`MEMBER_SCOPE_KEYS`; `saveMyVisibility` menulis lewat RPC `save_my_visibility`
yang hanya menyentuh baris `owner_id = auth.uid()`.
- `PortfolioList` menandatangani seluruh media sekali (`signMany`), bukan per
item, supaya daftar tidak membuka N+1 permintaan Storage.

### Perbaikan pada lanjutan Fase 4

1. **Build gagal: impor lintas batas server/client.** `PortfolioEditor`
   (Client Component) mengimpor `PORTFOLIO_LIMIT` — nilai runtime — dari
   `features/portfolio/queries.ts` yang `server-only`, sehingga `next build`
   menolak bundel klien. Konstanta pindah ke `features/portfolio/schemas.ts`
   (modul bersama); tipe `PortfolioRow` tetap di `queries.ts` dan diimpor
   type-only.
2. **Halaman utama di luar route group `(app)`.** `/class`, `/members`, dan
   `/settings/**` berdiri di luar grup sehingga tidak terbungkus `AppShell` —
   tanpa TopBar, nav, dan skip link (terbukti dari render: `/class` tidak punya
   `id="main"`). Dipindahkan ke dalam `(app)/`; URL tidak berubah.
3. **Dev server 500 karena CSS hasil scan Tailwind.** Tailwind v4 memindai
   seluruh project, termasuk transkrip sesi `freebuff-chat-*.md` yang memuat
   contoh kelas dengan isi `env()` dan `calc()` kosong → rule CSS tak valid →
   PostCSS gagal di dev (build produksi hanya warning). Pola
   `freebuff-chat-*.md` ditambahkan ke `.gitignore`; Tailwind otomatis
   mengabaikan berkas yang di-gitignore.
4. **`getManagedMembers` tanpa pemeriksaan permission.** Fungsi ini diekspor
   dari modul `'use server'`, jadi Next.js juga mendaftarkannya sebagai Server
   Action yang bisa dipanggil klien; di dalamnya ia memakai service role untuk
   membaca email. Gate di halaman hanya defense in depth — fungsi kini
   memeriksa `members.manage` lebih dulu dan mengembalikan `[]` bila tidak
   berhak.

### Verifikasi siklus anggota

Dijalankan terhadap database sungguhan:

| Uji | Hasil |
|---|---|
| `createUser` + `provision_member` | OK |
| `provision_member` dua kali untuk user sama | **DITOLAK** `23505` duplicate key |
| Username bentrok dengan anggota lain | **DITOLAK** `23505` — jalur yang dipetakan `inviteMember` jadi pesan ramah |
| `invited → inactive` | **DITOLAK** `invalid status transition` |
| `invited → active` langsung | **DITOLAK** — hanya lewat RPC `activate_my_membership` |
| `admin.deleteUser` | Baris membership hilang ikut cascade |

Dua baris pertama sekaligus **menutup celah verifikasi yang sebelumnya saya
laporkan**: penanganan username duplikat akhirnya benar-benar dieksekusi, bukan
sekadar kode.

### Fase 5 (selesai) — Jadwal, event, tugas
- Modul `schedule`, `events`, `tasks`: masing-masing punya `schemas.ts`
  (validasi + konversi waktu), `queries.ts`, `actions.ts`, dan komponen form.
- `/schedule` menggabungkan `schedules`, `events` mendatang, dan tenggat tugas
  aktif secara read-only (V-08), dikelompokkan per hari menurut timezone kelas.
  Tiap entri punya label tipe + ikon, label zona waktu, dan tautan ke halaman
  asalnya; deskripsi/tautan jadwal dibuka lewat `<details>` native karena
  jadwal tidak punya halaman detail. Tautan "Ubah" hanya untuk `schedule.manage`.
- `/schedule/new` dan `/schedule/[id]/edit` di-gate `schedule.manage`.
- `/events`: filter `?when=upcoming|past` (upcoming memakai `end_at >= now()`
  sehingga event yang sedang berlangsung tetap tampil), `/events/[id]` dengan
  `notFound()` seragam untuk baris tak terlihat, cover opsional di
  `class-media/events` dengan urutan unggah → tulis baris → buang objek lama,
  dan rollback bila penulisan baris gagal.
- `/tasks`: filter `?status=active|completed|archived`; daftar aktif memuat
  tugas lewat tenggat dengan badge "Lewat tenggat" dan "Segera berakhir"
  (ikon + teks, bukan warna saja). `/tasks/[id]` menampilkan pembuat hanya bila
  profilnya terlihat lewat `member_profile_v`. Status diubah lewat aksi
  `setTaskStatus`; aktivitas `completed` dicatat **trigger DB**, bukan ditulis
  aplikasi (supaya tidak dobel).
- `isValidLocalInput` baru di `lib/time`: uji bolak-balik konversi untuk menolak
  waktu dinding yang tidak ada (mis. `2026-02-30T08:00`, jam `25:00`) yang akan
  di-roll `TZDate` menjadi waktu lain. Dipakai schema jadwal, event, dan tugas.
- `formatTimeRange` baru untuk rentang jam tanpa nama hari di daftar yang sudah
  dikelompokkan per hari.

### Verifikasi Fase 5 (5 Oktober 2026)

Dijalankan dengan **sesi Ketua sungguhan** (dibuat lewat `generateLink` +
`verifyOtp`, tanpa menyentuh kata sandi), memakai payload yang sama persis
dengan actions:

| Uji | Hasil |
|---|---|
| `insert` schedule/event/task (payload aksi) | OK, 3 baris |
| schedule `end_at < start_at` | **DITOLAK** `23514` |
| update 1 baris | OK; update yang tidak cocok baris → 0 baris (gagal) |
| task `active → completed` | OK; trigger mencatat 1 aktivitas `completed` |
| trigger mencatat aktivitas `created` | 3 baris untuk 3 entitas |
| Anonim `insert` schedule | **DITOLAK** `42501` |
| `/schedule`, `/schedule/new`, `/events`, `/events/new`, `/tasks`, `/tasks/new` sebagai Ketua | 200 |
| `/schedule` dengan data nyata | Judul, label tipe, `08.00–09.40 WIB`, deskripsi (disclosure), dan tautan event/tugas tampil |

Semua baris uji dihapus kembali beserta baris `class_activity` yang dibuat
trigger, jadi tidak ada data karangan yang tertinggal di database.

Yang **belum** diuji untuk Fase 5: menekan tombol form (Server Action lewat
UI) belum dieksekusi end-to-end; yang terbukti adalah render halaman, validasi
Zod (unit test), dan jalur database dengan payload yang sama.

### Fase 3 (selesai) — Identitas, tautan, tema, visibilitas, gambar
- `src/features/class/schemas.ts`: validasi Zod yang menyalin CHECK constraint
  DB. `timezone` sengaja hanya 3 nilai (`Asia/Jakarta`/`Makassar`/`Jayapura`)
  karena itulah yang diizinkan CHECK — bukan daftar IANA bebas.
- `src/features/class/actions.ts`: `updateClassIdentity`, gate `class.manage`,
  dan memakai `.select('id')` supaya update yang tidak cocok baris manapun
  dilaporkan sebagai gagal, bukan sukses (§10).
- `/settings/class`: nama, kode, tagline, deskripsi, sorotan, tautan sorotan,
  zona waktu.
- `/class`: halaman publik, tiap field di-gate dengan key `field.class.*` sendiri.
- CRUD `class_links` di `/settings/class`: tambah, ubah, hapus (hapus lewat
  `ConfirmDialog`). Host URL divalidasi per platform lewat `socialUrlSchema`.
- `/settings/visibility`: satu select per key (27 key, scope class), opsi
  dibatasi `allowedAudiences(key)`, dan penjelasan “dibatasi halaman X” dihitung
  ulang di browser memakai fungsi `ceilingNote` yang sama dengan server.
- `/settings/theme`: preset tata letak + pasangan font, sepuluh pemilih warna,
  dan pratinjau kontras langsung memakai `contrastPairs` yang sama dengan
  validasi server.
- Upload logo & cover di `/settings/class`, dengan pratinjau dan empty state.
  `uploadClassImage` mengunggah dulu, baru menulis path; bila penulisan baris
  gagal objek baru di-`rollback`, dan objek lama dibuang **setelah** baris
  berhasil diperbarui (§13.4).

Tautan kelas sengaja **tidak** diisi data contoh: proyek ini melarang data
karangan, jadi empty state-nya yang memandu Ketua menambahkan tautan sendiri.

### Temuan: kontras tema divalidasi di tiga lapis, bukan di CHECK DB

`app.theme_is_valid` di database hanya memeriksa **bentuk** (layout, font_preset,
10 kunci palet berupa hex) — bukan kontras. Terbukti saat pengujian: palet putih
atas putih **diterima** database. Itu memang desainnya (komentar di migrasi
mengatakannya), dan tiga lapis sisanya menutup celah itu:

1. Tulis — `ThemeSchema` di `updateTheme` menolak palet yang kontrasnya < 4,5:1.
2. Baca injeksi — `resolveTheme` di root layout memvalidasi lalu jatuh ke
   `DEFAULT_THEME`.
3. Baca query — `getClassTheme` melakukan hal yang sama.

Jadi menulis langsung lewat service role tetap bisa memasukkan palet tak
terbaca, tetapi tidak akan pernah sampai ke layar.

### Catatan arsitektur: logika visibilitas pindah ke registry

`ceilingNote` dan `VisibilityEntry` pindah dari `lib/visibility/server.ts` ke
`lib/visibility/registry.ts` (modul tanpa `server-only`) dan tetap di-re-export
dari `server.ts`. Alasannya: editor visibilitas adalah Client Component dan
perlu menghitung penjelasan yang sama persis dengan server. Menyalin logikanya
berisiko keduanya berbeda; berbagi satu implementasi murni lebih aman.

### CSP: `unsafe-eval` hanya di development

React dan overlay Next.js memakai `eval()` saat dev, dan CSP menolaknya sehingga
console dipenuhi “eval() is not supported in this environment” di setiap
halaman. `script-src` kini menambah `'unsafe-eval'` **hanya** saat
`NODE_ENV !== production`. Diverifikasi pada dua mode:

- development: `script-src 'self' 'nonce-…' 'strict-dynamic' 'unsafe-eval'`
- production: `script-src 'self' 'nonce-…' 'strict-dynamic'` — **tanpa**
  `unsafe-eval`.

### Fase 6 (sebagian) — Home
- Section di-gate per key visibility, mengikuti preset layout.
- `HomeHero`, `UpcomingList`, `OverviewStats`, `ActivityTrend` (SVG), `MembersStrip`.
- `HOME_LAYOUTS` sebagai konstanta kode (§18).

---

## Siklus ini — audit performa/UX (5 Oktober 2026)

Audit dilakukan lebih dulu tanpa mengubah kode, lalu diperbaiki. Semua data
tetap diambil di server (tidak ada Route Handler, tidak ada fetch di Client
Component); yang diperbaiki adalah **jumlah, urutan, batas, dan cara tampilnya**.

### Temuan audit (diurutkan dampak)

| Dampak | Temuan | Bukti |
|---|---|---|
| Tinggi | **N+1 Storage**: `AvatarFromPath` menandatangani satu path per avatar, jadi satu permintaan HTTP per baris daftar | `components/storage/AvatarFromPath.tsx:22`; `/members` bisa menampilkan 100 avatar |
| Tinggi | **JWT divalidasi 2–5× per request**: proxy + `getViewer` + `getMyProfile` + `getMyPortfolio` + `getMySocialLinks` | `proxy.ts:46`, `visibility/server.ts:26`, `member/queries.ts:18`, `portfolio/queries.ts:60`, `social/queries.ts:46` |
| Tinggi | **Identitas kelas dibaca dua kali**: query sendiri di root layout + `getClassIdentity` di layout `(app)` | `app/layout.tsx:53` vs `class/queries.ts:26` |
| Tinggi | **Region Vercel tidak di-pin**: `vercel.json` tidak ada di repo | blueprint §2/§4 menetapkan `sin1` |
| Tinggi | **Tidak ada satu pun `<Suspense>`**: semua halaman menunggu semua data; satu `loading.tsx` grup untuk semua route | `grep -rn Suspense src` → 0 |
| Sedang | Waterfall: `getEditableClass` lalu `getClassLinks`; `getMyProfile` sebelum `Promise.all`; profil anggota sebelum `canShow`; tautan kelas setelah `canShow` | `settings/class/page.tsx:22`, `settings/profile/page.tsx:46`, `members/[username]/page.tsx:32`, `class/page.tsx:33` |
| Sedang | `getUpcoming` mengambil 3×20 baris lalu `slice(0, 5)` | `home/queries.ts:32` |
| Sedang | Tidak ada pola notifikasi: sukses = kotak inline statis dengan teks identik untuk semua aksi | `ui/FormStatus.tsx:20` |
| Sedang | Error state hanya di level grup: satu section gagal membuat seluruh halaman diganti | `(app)/error.tsx` |
| Sedang | Aksi tanpa feedback: `MembersManager` memakai `<Button loading={false}>`, jadi double-submit mungkin terjadi | `MembersManager.tsx:175` |
| Sedang | Batas 50/100 baris tanpa penanda pagination | `events/queries.ts:38`, `tasks/queries.ts:27`, `member/queries.ts:55` |
| Rendah | `listUsers({ perPage: 1000 })` mengambil objek user lengkap; GoTrue tidak mendukung pemilihan kolom | `member/actions.ts` — perlu perubahan skema, jadi **diterima apa adanya** |
| Rendah | `visibility_rules` difilter `owner_id` sedangkan indeks uniknya `(class_id, key, owner_id)` | tabel ini maksimal 27 baris, dampaknya nihil |

Bukti region: `curl -D - https://<project>.supabase.co/rest/v1/` mengembalikan
`CF-RAY: …-SIN`, jadi Supabase berada di Singapura. Region Vercel **belum bisa
diverifikasi dari mesin ini** (folder `.vercel` tidak ada, proyek belum
ter-link), jadi `vercel.json` baru dibuat sekarang dan efeknya baru berlaku
setelah deploy berikutnya.

Bukti latensi dari mesin ini: 237–309 ms per round trip PostgREST (5× percobaan
hangat). Angka itu yang membuat jumlah round trip, bukan ukuran payload, jadi
menjadi target utama perbaikan.

### Yang diperbaiki

**A — navigasi cepat**

- `/settings` kini **ada** dan mengalihkan ke `/settings/profile` (blueprint §10).
  Sebelumnya `UserMenu` menautkan ke `/settings` yang tidak pernah ada, jadi
  berakhir **404**. Itu penyebab 404 yang dilaporkan.
- "Pengaturan" dipindahkan ke navigasi: `SETTINGS_NAV_ITEM` masuk ke daftar yang
  dipakai **sidebar (desktop) dan bottom nav (mobile)**, lalu dihapus dari
  `UserMenu`. Item ini tidak punya visibility key; kelihatannya ditentukan oleh
  apakah viewer punya izin apa pun.
- Streaming per section: Home (`features/home/components/HomeSlots.tsx`),
  `/settings/profile` (`SocialLinksSection`, `PortfolioSection`,
  `MyVisibilitySection`), dan `/members/[username]` (`MemberPortfolioSection`,
  `MemberSocialSection`). Tiap section adalah Server Component async yang
  mengambil datanya sendiri, jadi halaman tidak menunggu section lain.
- `loading.tsx` per route dengan bentuk yang sesuai halamannya: **12 file
  baru** (`class`, `members`, `members/[username]`, `schedule`, `events`,
  `tasks`, dan enam `settings/*`), plus `loading.tsx` grup yang ditulis
  ulang supaya tidak lagi memakai skeleton khas Home untuk semua halaman.
- Waterfall diperbaiki di `settings/class`, `settings/profile`,
  `members/[username]`, dan `class`: yang independen kini satu ronde.
- **Prefetch `<Link>` sengaja tidak diaktifkan** dengan `prefetch={true}`. Semua
  route `force-dynamic`, jadi setiap hover akan memicu render server penuh
  (6–8 round trip). Di free tier itu lebih mahal daripada gunanya, dan
  streaming sudah menyelesaikan masalah "menunggu semua data".

**B — skeleton**

- `Skeleton.tsx` bertambah: `SkeletonPageHeader`, `SkeletonSectionTitle`,
  `SkeletonSectionShell`, `SkeletonCardGrid`, `SkeletonAvatarStrip`,
  `SkeletonStats`, `SkeletonActivity`, `SkeletonForm`, `SkeletonFormPage`, dan
  `SkeletonListPage`. Semuanya memakai token saja, tanpa animasi, dan mengikuti
  ukuran komponen aslinya (kontrol form setinggi `h-11`, avatar bulat, grid
  metrik 2/4 kolom).

**C — status tiap aksi**

- `ui/Toast.tsx`: **satu** pola notifikasi untuk seluruh aplikasi. Store kecil
  di modul + `useSyncExternalStore`, satu wilayah `aria-live="polite"`, tutup
  otomatis 5 detik, tombol tutup per notifikasi. Tanpa library baru.
  Notifikasi ini **hanya untuk sukses**: error tetap inline di `FormStatus`
  (`role="alert"`, menempel pada field) dan error section sebagai
  `ErrorState` dengan tombol coba lagi. Toast untuk error akan jauh dari
  tempat pengguna sedang membaca.
- `FormStatus` jadi satu-satunya titik umpan balik: **error tetap inline**
  dengan `role="alert"` supaya dekat dengan field, **sukses jadi toast** dengan
  pesan spesifik per aksi (21 form diberi pesan masing-masing).
- `ui/SectionBoundary.tsx`: error boundary per section. "Coba lagi" membuka
  subtree **dan** memanggil `router.refresh()`, jadi query yang tadi gagal
  benar-benar dijalankan ulang.
- `MembersManager` memakai `SubmitButton`, jadi tombol nonaktif + spinner +
  label "Menyimpan…" selama aksi berjalan (double-submit mustahil).
- **Optimistic update tidak diimplementasikan, dan itu keputusan sadar**: semua
  mutasi memanggil `revalidatePath('/', 'layout')`, jadi server langsung
  mengambil alih state klien. `useOptimistic` menambah kompleksitas tanpa
  manfaat yang bertahan lama.

**D — hemat resource**

- `getCurrentUserId` (di-cache) dipakai `getViewer`, `getMyProfile`,
  `getMyPortfolio`, dan `getMySocialLinks` → satu validasi JWT per request.
- Root layout memakai `getClassTheme()` yang memakai `getClassIdentity()`
  yang di-cache, bukan query sendiri.
- Avatar ditandatangani **batch sekali per halaman** (`signMany` sudah ada,
  tinggal dipakai) untuk `/members` dan strip anggota di Home.
- `getUpcoming`: limit 20 → 5 per sumber, dan kolom `id` yang tidak dipakai
  dibuang dari `schedules`.
- `getRecentMembers`: 11 kolom → 4 kolom yang benar-benar dirender.
- `proxy.ts` melewati panggilan Auth bila tidak ada cookie sesi (halaman masuk
  dan beranda anonim). Pencocokan cookie juga menangani cookie terpecah
  (`…-auth-token.0`) supaya sesi panjang tidak salah dianggap anonim.
- `vercel.json` baru: `regions: ["sin1"]`.

### Pengukuran: apa yang terbukti dan apa yang belum

**Terbukti langsung** (build produksi + `next start`, render nyata):

- Semua route sebagai Ketua 200: `/`, `/members`, `/tasks`, `/events`, `/schedule`,
  `/class`, `/settings`, `/settings/profile`, `/settings/account`,
  `/settings/class`, `/settings/theme`, `/settings/visibility`,
  `/settings/members`. Anonim: `/`, `/login`, `/class` 200; `/tidak-ada` 404.
- `/settings` mengalihkan ke `/settings/profile`
  (`<meta http-equiv="refresh" content="1;url=/settings/profile">`), bukan 404.
- **Streaming benar-benar terjadi**: HTML beranda memuat penanda chunk streamed
  (`$RC(` × 3) beserta fallback skeleton di flush pertama, lalu section aslinya
  menyusul di chunk berikutnya. `/settings/profile` memuat 4 penanda streamed.
- Wadah notifikasi (`aria-live="polite"`) ada di setiap halaman.
- Penandatangan Storage pada `/members` menghasilkan **satu** permintaan
  `storage/v1/object/sign/member-media` untuk seluruh baris, bukan satu per baris.

**Belum terbukti: perbaikan kecepatan di detik.**

Pengukuran A/B dilakukan pada build produksi lokal (median 5× per route, sesi
Ketua sama), tapi hasilnya **tidak bisa dipakai** sebagai bukti:

1. Jalur internet dari mesin ini ke Supabase berfluktuasi: satu round trip
   PostgREST terukur 237–309 ms, dan penyimpangan antar-run mencapai
   ±1 detik pada kode yang **identik**. Contoh: `/tasks` tercatat 406 ms pada
   satu run dan 1572 ms pada run berikutnya dengan build yang sama.
2. Percobaan pertama tercemar: `npm start` gagal `EADDRINUSE` karena server lama
   masih memegang port 3000, sehingga sebagian angka sebenarnya berasal dari
   build yang salah. Angka dari percobaan itu **dibuang**, bukan dipakai.
3. Upaya mengukur jumlah round trip dengan reverse proxy penghitung gagal:
   proxy buatan sendiri merusak koneksi keep-alive sehingga beberapa query gagal
   dengan `TypeError: terminated`.

Jadi yang diklaim di sini hanya yang bisa ditunjuk ke kode dan ke render:

| Yang berubah | Bukti |
|---|---|
| Satu validasi JWT per request, bukan 2–5 | `getCurrentUserId` di-cache dipakai `getViewer`, `getMyProfile`, `getMyPortfolio`, `getMySocialLinks` |
| Query identitas kelas satu kali per request | root layout memakai `getClassTheme()` yang berbagi `cache` dengan layout `(app)` |
   satu kali di `/members` dan strip Home; terlihat pada tally proxy (proxy itu sendiri masih bermasalah, jadi bukti ini lemah)
| Section tidak saling menunggu | jumlah ronde `await` berkurang di 4 halaman; streaming terverifikasi dari HTML |
| Panggilan Auth dilewati tanpa cookie sesi | `proxy.ts` |
| Batas baris lebih ketat | `getUpcoming` 20 → 5 per sumber; `getRecentMembers` 11 → 4 kolom |

Angka latency Vercel↔Supabase hanya bisa diketahui setelah deploy, karena
memang tidak ada jalur database yang melewati mesin lokal ini.

### Yang belum dikerjakan dari permintaan ini

- Pagination di UI untuk daftar 50/100 baris belum ada; baru batas server.
- `listUsers({ perPage: 1000 })` masih seperti adanya.
- Menguji form end-to-end lewat klik hanya sudah dilakukan untuk **tugas**
  (Chrome + Playwright, lihat bagian "Perbaikan tugas"); form lain belum.

---

## Struktur halaman pengaturan

Masalahnya: sidebar (dan bottom nav) punya satu item **Pengaturan** → `/settings`.
Dulu rute itu hanya mengalihkan ke `/settings/profile`, jadi lima halaman
pengaturan lain tidak punya pintu masuk dari UI sama sekali — hanya bisa
dibuka dengan mengetik URL. Sekarang `/settings` adalah **indeks**: tiga
kelompok menurut siapa yang boleh mengubahnya, dan tiap entri menyebut fungsi
konkret halamannya.

| Kelompok | Halaman | Fungsi konkret | Syarat |
|---|---|---|---|
| Umum | `/settings/profile` — "Profil saya" | Nama, username, nama panggilan, bio, foto, tautan sosial, portofolio, aturan visibilitas pribadi | sesi + keanggotaan **aktif** |
| Umum | `/settings/account` — "Akun & kata sandi" | Ganti kata sandi dan keamanan akun | sesi saja (bisa dipakai walau keanggotaan tidak aktif) |
| Kelas | `/settings/class` — "Identitas kelas" | Nama, kode, tagline, deskripsi, sorotan, zona waktu, logo, cover, tautan kontak | `class.manage` |
| Kelas | `/settings/theme` — "Tema kelas" | Warna, tipografi, tata letak + laporan kontras | `class.manage` |
| Pengelolaan | `/settings/visibility` — "Aturan visibilitas" | Siapa boleh membuka tiap halaman/bagian; batas terluar di atas aturan pribadi | `class.manage` |
| Pengelolaan | `/settings/members` — "Anggota" | Undang, terbitkan tautan akses sekali pakai, aktifkan/nonaktifkan, hapus | `members.manage` |

Aturan yang menjaga konsistensinya:

1. **Satu pintu masuk.** Item nav menunjuk `/settings` (indeks), bukan salah satu
   halaman isinya.
2. **Judul di indeks = judul halaman (`h1`).** Sudah selaras: `Akun & kata
   sandi` dan `Aturan visibilitas` (sebelumnya h1-nya `Akun` dan `Visibilitas`,
   jadi nama yang sama menunjuk dua hal berbeda).
3. **Jalur keluar dari mana pun.** Semua enam halaman punya "Semua pengaturan"
   di atas judulnya (`SettingsBackLink`), jadi tidak ada halaman yang jadi
   jalan buntu.
4. **Entri yang tidak berhak tidak dirender** — baik di indeks maupun di nav,
   memakai aturan yang sama (§7.8). Konsekuensinya: anggota biasa hanya
   melihat grup "Umum" saja.
5. **Halaman pengaturan tidak saling menaut**; navigasi antar-pengaturan lewat
   indeks, bukan lewat tombol silang, supaya jaraknya jelas.
6. **Anonim tidak melihat apa pun.** `/settings` dan keenam halamannya
   mengarahkan ke `/login?next=…`; daftar pengaturan tidak pernah ikut terkirim
   ke browser anonim.

---

## Perbaikan tugas (5 Oktober 2026)

Permintaan Knotus: tugas harus menyebut **nama mata kuliah**, **sasaran** harus
dipilih dari daftar, dan satu orang harus bisa punya **beberapa tugas
sekaligus**.

### "Tugas baru menimpa tugas lama" — akar masalahnya bukan bug tulis

Diusulkan lebih dulu lewat reproduksi berlapis, hasilnya:

| Lapis | Cara diuji | Hasil |
|---|---|---|
| Skema + RLS | Dua `INSERT` langsung ke `tasks` sebagai user Ketua | 2 baris baru, keduanya ada |
| Server Action | Dua submit form lewat HTTP nyata (jalur no-JS) | `303` ke dua id berbeda, 3 baris di DB |
| Browser sungguhan | Chrome via Playwright, klik "Simpan tugas" dua kali | Dua halaman detail berbeda, 3 baris di DB |

Jadi `createTask` memang selalu `INSERT` dan **satu orang sudah bisa punya
banyak tugas**. Bukti pada baris yang ada di database itu sendiri:
`Review buku` punya `created_at 13:36:25` tetapi `updated_at 13:37:07` — tugas
"baru" itu masuk lewat **form ubah** pada `/tasks/[id]/edit`, bukan lewat form
buat.

Penyebabnya bentuk layar: setelah menyimpan, pengguna mendarat di halaman
detail yang satu-satunya aksi adalah **"Ubah tugas"**, dan form itu identik
dengan form buat. Menambah tugas kedua selalu dimulai dari form yang sama.

Yang diperbaiki (bukan menambah batasan baru):

1. Halaman detail punya **"Buat tugas lagi"** di sebelah "Ubah tugas" — sehingga
   menambah tugas berikutnya tidak lagi melewati form ubah.
2. Judul halaman ubah menyebut tugas yang sedang diubah: *"Menyimpan di sini
   mengubah tugas \"…\", bukan membuat tugas baru."*
3. `/tasks` menyebut jumlahnya di deskripsi ("3 aktif. …") dan form buat
   menegaskan satu isian = satu tugas.

### Mata kuliah

Ditambah lewat **migration baru** `20261005120800_task_course.sql`, bukan
mengubah migration yang sudah applied: kolom `tasks.course text` dengan CHECK
1–80, plus penambahan kolom ke `grant insert`/`grant update` (grant di tabel ini
berbasis kolom, jadi tanpa itu PostgREST akan menolaknya). Kolom nullable supaya
baris lama tidak dipalsukan; kewajiban mengisi ditegakkan Zod, dan baris lama
ditampilkan sebagai "Tanpa mata kuliah".

Ditampilkan di daftar (`/tasks`) dan di halaman detail, berdampingan dengan
sasaran dan tenggat.

### Sasaran jadi dropdown

`target` tetap kolom teks (A-13: label informatif, bukan assignment), tetapi
nilainya dibatasi ke daftar tetap `TASK_TARGETS` = `Seluruh kelas`, `Ketua`,
`Anggota`, `Hanya aku`. Kolom DB tidak diubah jadi enum karena nilainya sudah
tersimpan dan dibaca beberapa halaman; daftarlah yang jadi satu sumber
kebenaran, divalidasi lagi di Server Action supaya permintaan yang dibuat-buat
tidak bisa menulis teks bebas seperti "Kelompok A".

### Verifikasi

- `lint`, `typecheck`, `test` (139 tes, +3), `check:tokens`,
  `check:boundaries`, `build` (27 rute): semua keluar 0.
- `npx supabase migration list` → hanya `20261005120800` yang pending, lalu
  `--dry-run` sebelum `db push`.
- Chrome sungguhan, 20 cek lulus: kolom matakuliah ada; sasaran benar-benar
  `SELECT` dengan 4 opsi dan default "Seluruh kelas"; matakuliah kosong dan
  sasaran tak dikenal **ditolak server** (200 + pesan, bukan 303); dua tugas
  yang dibuat berturut-turut tampil bersama di daftar; tugas lama tidak
  berubah (`updated_at` identik); "Buat tugas lagi" membuka form kosong tanpa
  field `id` tersembunyi.

### Yang tidak dilakukan

- `blueprint.md` **tidak diubah** walau §19/AC-TASKS belum menyebut `course`.
  Ikuti pola yang sama seperti perubahan IA pengaturan: dicatat di sini sebagai
  penyimpangan yang disengaja, menunggu keputusan Knotus soal naskah blueprint.
- Home (`getUpcoming`) dan `/schedule` belum menampilkan mata kuliah; yang
  diminta — tugas menyatakan mata kuliahnya — sudah terpenuhi di daftar dan
  detail.
- Katalog mata kuliah bersama (dipilih ulang, bukan diketik) belum ada; kolomnya
  sekarang teks bebas 1–80. Perlu migration + halaman pengelolaan bila
  diminta.

---

## Desain Stitch vs blueprint

Ekspor Stitch tersedia di `stitch_ui_system/` (16 layar + `DESIGN.md` sistem
desain "Warm Paper & Deep Ink Academic System"). MCP Stitch sendiri **tidak
dapat dipakai**: `.agents/mcp.json` mengirim `X-Goog-Api-Key`, sedangkan endpoint
menolak API key dan menuntut OAuth2.

Palet Stitch dan `DEFAULT_THEME` di blueprint **sepakat** (`primary #A64B00`,
`secondary #2C4A5E`, `background #F7F4ED`, `surface #FFFFFF`,
`text_primary #1C1B19`). Pair font Stitch (Fraunces + Source Sans 3) juga sama
dengan preset `editorial` di §17.4. Karena itu tidak ada konflik token yang perlu
diadaptasi.

### Yangdiimprovisasi, dan alasannya

| Dari desain Stitch | Keputusan | Alasan |
|---|---|---|
| "Program Studi S1 Teknik Informatika" | Dihilangkan | Tidak ada kolom `study_program` di skema. Menambahkannya berarti mengarang data atau menambah fitur di luar §1.3. |
| "Semester Ganjil 24/2025", "Minggu ke-8", "Sesi Akademik Aktif" | Dihilangkan | Tidak ada sumber data. DESIGN.md §8 melarang angka karangan. |
| Sakelar peran Ketua/Member di TopBar | Dihilangkan | Tidak ada fitur role switching (A-07; role definisi lewat migration, tanpa UI). |
| "21 Mahasiswa Aktif" sebagai angka tetap | Diganti metrik nyata | Angka statis di desain akan jadi kebohongan begitu kelas berisi 20 orang. Dipakai `get_home_overview`. |
| Font & ikon lewat Google Fonts CDN | Diganti `next/font` + `lucide-react` | §23 melarang skrip pihak ketiga; font di-host sendiri. |
| Material Symbols via CDN | Diganti `lucide-react` | Sama. Ikon dekoratif tidak dipakai. |
| Tiga kartu metrik identik | Diganti deretan bersekat | §17.6 secara eksplisit menolak pola "tiga kartu seragam". |
| Label ALL-CAPS ber-letter-spacing | Dihilangkan | §17.3 melarang teks ALL-CAPS sebagai eyebrow. |
| Breadcrumb panjang dengan separator `/` | Disederhanakan | Ornamen breadcrumb tidak lagi kesablon; §9 menilai pola seperti ini sebagai chrome yang clungit. |
| Tombol dengan ikon `arrow_forward` di link | Dihilangkan pada tombol | §9 melarang `→` pada setiap link secara default; hanya dipakai di "Lihat semua anggota" yang benar-benar bernavigasi. |

Elemen yang **dipertahankan** dari Stitch: karakter editorial (Fraunces untuk
heading, Source Sans 3 untuk isi), garis pemisah 1px sebagai alat hierarki
(primary), radius terkendali (4px kontrol, 8px panel), badge kotak bukan kapsul,
dan hero tipografi tanpa gradien sebagai satu elemen dominan per layar.

---

## Verifikasi

### Yang berjalan dan lulus

| Perintah | Hasil |
|---|---|
| `npm run lint` | Lulus, 0 error |
| `npm run typecheck` | Lulus, 0 error |
| `npm test` | **136 lulus / 136** (10 file) |
| `npm run build` | Lulus, 26 route |
| `npm run check:tokens` | Lulus |
| `npm run check:boundaries` | Lulus |
| `GET /` | 200 |
| `GET /login` | 200 |
| `GET /dev/ui` | 200 |
| `GET /tidak-ada` | 404 |

Setiap perintah di atas dijalankan dengan exit code yang dipertahankan
(`echo "exit=$?"` segera setelah perintah), bukan lewat filter yang menutup
kegagalan.

Diverifikasi langsung pada hasil render (bukan hanya exit code):
- `--theme-primary: #A64B00` dan `color-scheme: light` ikut terinjeksi.
- CSP memakai nonce per request dan mengizinkan host Storage proyek:
  `img-src 'self' data: blob: <project>.supabase.co`.
- `lang="id"`.
- Font Fraunces + Source Sans 3 di-host sendiri dan serving (HTTP 200).
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`.
- Shell `(app)` hadir di `/class`, `/members`, dan `/settings/**` setelah
  perbaikan route group: HTML memuat skip link dan `id="main"`.
- Anonim di `/members` diarahkan ke `/login?next=%2Fmembers` dan
  `/settings/class` ke `/login?next=%2Fsettings` (307).
- Dev server kembali 200 di semua route setelah scan Tailwind dan build error
  diperbaiki.

### Empat bug nyata yang ditemukan oleh test

1. **`allowedAudiences` terbalik** — filter mengembalikan audience yang **lebih
   luas** dari batas katalog. Akibatnya UI menawarkan `public` untuk `page.tasks`
   yang batas terluas-nya `class_member`. Diperbaiki di
   `src/lib/visibility/registry.ts`. Test `seluruh opsi yang diizinkan tidak lebih
   luas dari widest` menjaga regresi ini.
2. **`contrastRatio` fail-open** — hex tidak valid dibaca sebagai hitam, sehingga
   rasio vs putih jadi 21:1 dan palet rusak **lolos** validasi. Diperbaiki agar
   mengembalikan 0, yang selalu gagal ambang 4.5:1.
3. **`localInputToUtcIso` kehilangan waktu dinding** — kode membuat `Date` biasa
   lebih dulu, sehingga `new Date(y, m, d, …)` memakai **timezone mesin** (di
   sini Asia/Makassar) dan menggeser hasilnya. Form jadwal akan menyimpan jam
   yang salah bagi anggota di zona lain. Diperbaiki dengan memakai konstruktor
   multi-argumen `TZDate`, yang menafsirkan komponen **di dalam** zona kelas.
4. **`localInputToUtcIso` mengembalikan offset, bukan UTC** — `TZDate.toISOString()`
   menghasilkan `…+07:00`, sementara kolom `timestamptz` menyimpan UTC.
   Diperbaiki dengan memformat ulang dari `getTime()` sebagai ISO `Z`.

Bug 3 dan 4 baru ketahuan karena tes waktu berjalan pada mesin dengan timezone
Asia/Makassar — persis kondisi yang akan menimpa pengguna di zona berbeda.

### Kode mati yang dibersihkan

`expectRows`, `requireActiveMember`, dan `calendarDayIndex` hanya disebut di
komentar atau tidak dipakai sama sekali, lalu dihapus (`AGENTS.md` §6). Fungsi
`isUpcoming`, `formatRange`, `formatDateTime`, dan `MOBILE_HOME_ORDER` tetap
karena sekarang dipakai atau diuji.

### Verifikasi database & akun Ketua (5 Oktober 2026)

Schema sudah diperiksa langsung ke project Supabase (bukan lewat migration file),
sehingga yang tercatat di sini adalah keadaan nyata:

- `visibility_catalog` = **27 key**.
- `class_identity_v` mengembalikan `Eclipse` / `Asia/Jakarta`.
- Role `ketua` (5 permission) dan `member` (0 permission).
- Bucket `class-media` dan `member-media`: `public = false`,
  `file_size_limit = 2097152`, hanya JPEG/PNG/WebP.
- **Anonim ditolak** di `member_profiles` dengan `42501` (default-deny RLS
  benar-benar aktif).
- RPC `get_visibility_map` anonymously: `page.home` → `effective_audience =
  public`, `allowed = true` (kasus E1).

`scripts/bootstrap-admin.ts` sudah dijalankan dan akun Ketua pertama berhasil
dibuat. Yang terverifikasi setelahnya:

- User Auth `rneclipseleader@gmail.com` ada.
- `memberships`: status `invited`, role `ketua`, `joined_at` NULL.
- `member_profiles`: `username = rizaldi_naue`, `full_name = Rizaldi Naue`.
- `get_viewer_context` sebagai anonim tetap mengembalikan `user_id`/`status`/
  `role_name` NULL — tidak bocor.

Alur tautan akses **sudah diuji sampai habis**, bukan hanya lewat probe service
role. Diuji dengan client anon yang memakai sesi user asli:

1. `generateLink(type: 'recovery')` → tautan terbit.
2. `verifyOtp({ token_hash, type: 'recovery' })` → **OK**, sesi terbentuk.
3. `get_viewer_context` saat itu: `status = invited`, `role_name = Ketua`,
   `permissions = []` (izin memang kosong sebelum aktif).
4. `activate_my_membership()` → **OK**.
5. Setelahnya: `status = active`, `joined_at` terisi.
6. `get_viewer_context` sebagai user itu: role `Ketua` dengan 5 permission
   (`class.manage`, `members.manage`, `schedule.manage`, `events.manage`,
   `tasks.manage`) — RLS dan pemberian izin terbukti bekerja untuk user nyata.
7. `get_visibility_map` untuk Ketua: 26 dari 27 key `allowed`.

Akibatnya akun Ketua sekarang berstatus **`active`**, bukan `invited`, dan
`bootstrap-admin.ts` akan menolak dijalankan lagi untuk akun ini (meminta
pengalihan lewat UI) — itu perilaku yang memang dimaksud. Jalur `invited →
active` sudah teruji di titik 3–4.

Yang **masih** belum diuji adalah lapisan Next.js di atasnya: `confirmAccessLink`
dan `setPassword` baru dicek sampai 200, belum sampai `updateUser({ password })`
melalui Server Action.

### Verifikasi identitas kelas (Fase 3)

Diuji dengan sesi Ketua sungguhan, memakai payload yang sama persis dengan yang
dikirim `updateClassIdentity`:

- `signInWithPassword` → OK.
- Baca `classes` lewat RLS `class.manage` → OK.
- `update` 7 field → **OK, 1 baris terpengaruh** (bukan 0 yang dilaporkan sukses).
- Menulis `created_at` (di luar GRANT) → **DITOLAK**: `permission denied`.
- `timezone = 'Europe/Berlin'` → **DITOLAK** oleh `classes_timezone_check`.
- `code = NULL` → OK (kolom nullable).
- `/class` sebagai anonim merender tagline, deskripsi, sorotan, dan zona waktu;
  label "Kode kelas" **tidak** muncul karena nilainya NULL — persis aturan §7.8
  (tidak ada label kosong yang membocorkan "ada tapi disembunyikan").
- `/settings/class` tanpa sesi → 307 ke `/login` (gerbang bekerja).

### Bug kritis: fungsi melintasi batas Server → Client Component

Beranda **500 untuk setiap anggota yang sudah masuk**. Dua sumbernya, keduanya
baru terlihat ketika payload lintas batas benar-benar dirender:

1. `NAV_ITEMS` membawa `icon` berupa komponen lucide (`forwardRef` = objek
   `{$$typeof, render}`). `NAV_ITEMS` dibaca di `(app)/layout.tsx` (Server
   Component) lalu dikirim ke SidebarNav/BottomNav yang `'use client'`. React
   menolak menyerialisasi komponen → "Functions cannot be passed directly to
   Client Components". Ini juga terjadi untuk anonim, karena anon tetap melihat dua
   halaman (`page.home`, `page.class_about`) dan ikon `School` ikut terbawa.
2. Objek `viewer` membawa `can: (permission) => boolean`. `TopBar` (server)
   meneruskannya ke `UserMenu` yang `'use client'` — dan `UserMenu` justru
   tidak pernah memakai `can`.

Perbaikan:

- `NAV_ITEMS` sekarang hanya metadata (`href`, `label`, `key`); ikon dipetakan
  di `NavIcons.tsx` yang hanya diimpor komponen klien. Tipe `NavKey` membuat
  menambah item nav gagal compile sampai ikonnya ditambahkan.
- `ViewerData` = `Viewer` tanpa `can`, dibuat oleh `toViewerData`. Menandai
  tipe prop saja tidak cukup — React menyerialisasi nilai yang benar-benar
  dikirim — jadi `can` dibuang di `TopBar` tepat sebelum masuk ke `UserMenu`.

`tests/unit/nav-items.test.ts` (7 tes) mengunci kedua invarian: setiap item nav
harus serializable, dan `toViewerData` tidak boleh meninggalkan fungsi maupun
simbol. Tes pertama gagal pada versi yang lama.

Setelah perbaikan, dev server dijalankan ulang: `GET /` 7× 200, **0** error
"Functions cannot be passed", **0** status 500.

### Verifikasi Storage (upload gambar)

Diputuskan dengan PNG 1×1 asli (70 byte) dan JWT Ketua, lewat jalur yang sama
dengan `uploadClassImage`:

- Unggah ke `{class_id}/logo/{uuid}.png` → **OK**.
- Unggah ke folder yang salah (`{class_id}/wat/…`) → **DITOLAK**:
  `new row violates row-level security policy`.
- Menulis `logo_path` → OK.
- `createSignedUrl` baru berhasil **sesudah** `logo_path` tersimpan — policy
  `select` untuk `class-media` bergantung pada path yang ada di
  `class_identity_v`. Ini yang menentukan urutan: tulis path dulu, baru
  menyajikan gambar.
- Jejak uji dibersihkan (`logo_path`/`cover_path` kembali NULL, objek dihapus).

Tautan kelas juga diuji: insert OK, update 1 baris, `custom` tanpa label
**DITOLAK** CHECK, `http://` **DITOLAK** CHECK, **anon INSERT ditolak**
(`permission denied`), delete 1 baris.

Tema diuji: `layout` → `profile_focused` OK; `layout: 'gabar'` dan
`primary: 'red'` **DITOLAK** CHECK `classes_theme_is_valid` / `app.theme_is_valid`.

`save_class_visibility` juga diuji langsung dengan sesi Ketua sungguhan:
menyetel `page.schedule` ke `class_admin` → baris override terbentuk dengan
`owner_id is null`, anonim tetap `allowed = false` (tidak bocor), Ketua melihat
`own = effective = class_admin`, lalu `audience: null` menghapus baris itu lagi
sampai nol.

### Insiden: `database.types.ts` tertinggal 0 byte

File tipe database sempat **kosong** dan sempat membuat seluruh `.from()`/`.rpc()`
kehilangan tipe. Penyebabnya bukan ditulis manual, tapi perintah
`supabase gen types typescript --local > src/lib/supabase/database.types.ts`:
redirection shell memotong file sebelum perintah berjalan, dan perintah itu
pasti gagal di lingkungan ini karena tidak ada Docker. File dipulihkan dari HEAD
tanpa kehilangan isi (git status bersih setelah restore), lalu akarnya dibetulkan
menjadi `scripts/gen-db-types.mjs` (T-11). Perbaikannya diuji: menjalankan
`npm run db:types` di lingkungan tanpa Docker tetap exit 1 dan file-nya utuh.

### Smoke test HTTP

Yang sudah dipastikan lewat smoke test HTTP terhadap dev server:

| Route | Hasil |
|---|---|
| `/` | 200 (home publik) |
| `/login` | 200 |
| `/auth/confirm` | 200, form “Lanjutkan” ada, `token_hash` kosong di HTML server |
| `/set-password` tanpa cookie `pwd_setup` | 307 → `/login` (gate bekerja) |
| `/tidak-ada` | 404 |

### Yang TIDAK terverifikasi

- **Responsif di enam lebar** (360/480/768/1024/1280/1536). Belum diukur.
- **Audit keyboard dan kontras** dengan alat otomatis.
- **E2E Playwright.** Belum ditulis.
- **Server Action `updateClassIdentity` dan `confirmAccessLink`/`setPassword`**
  diuji lewat HTTP pada level 200, bukan dengan mengetuk form sungguhan. Yang
  sudah terbukti adalah lapisan database di bawahnya (lihat bagian
  verifikasi identitas kelas).
- **Keamanan produksi**: pengaturan signup di dashboard Auth, rate limit, region,
  CSP pada domain nyata.

---

## Blocker

### 1. `database.types.ts` ditulis manual

CLI `supabase gen types` memerlukan Docker atau access token. File
`src/lib/supabase/database.types.ts` ditulis tangan dari migration awal dan
**perlu di-regenerate**:

```bash
npm run db:types
```

Dua detail penting yang ditemukan saat menulisnya dan kemungkinan hilang di file
yang di-generate:

- Tipe baris harus `type` alias, bukan `interface`. `interface` tidak mendapat
  implicit index signature sehingga gagal memenuhi `Record<string, unknown>` yang
  diminta `GenericSchema` postgrest-js — akibatnya **seluruh** hasil `.from()` dan
  `.rpc()` terinferensi `never`.
- `Update` pada setiap tabel harus berupa object, tidak boleh `never`.

---

## Keputusan sementara

| ID | Keputusan | Alasan |
|---|---|---|
| T-01 | `Viewer` didefinisikan di `lib/visibility/types.ts` (tanpa `server-only`), bukan di `server.ts` | Komponen klien (`UserMenu`) butuh tipe ini; mengimpornya dari modul server-only menarik `server-only` ke bundel klien. Ditegakkan `check-boundaries`. |
| T-02 | `Avatar` menerima URL yang sudah ditandatangani, bukan Storage path | `Avatar` dipakai di komponen klien; path Storage butuh server. Ditutupi `AvatarFromPath`. |
| T-03 | Batas "klien tidak boleh impor server-only" ditegakkan `scripts/check-boundaries.mjs`, bukan ESLint | ESLint tidak bisa mencocokkan direktif `'use client'` sebagai pola file. Aturan lain tetap di ESLint. |
| T-04 | `@types/node` dinaikkan dari `^20` ke `^22` | `vitest@5` mensyaratkan `^22 || >=24`. Tanpa itu `npm i -D vitest` gagal ERESOLVE. |
| T-05 | `npm`, bukan `pnpm` | Lockfile yang ada di repo adalah `package-lock.json`, dan pnpm tidak terpasang. Mengganti manajer paket berarti mengganti lockfile — keputusan yang layak diambil terpisah. |
| T-06 | `check-tokens` mengecualikan `env(...)` | `pb-[env(safe-area-inset-bottom)]` berasal dari perangkat, bukan keputusan desain. |
| T-07 | CSP dibangun di `proxy.ts`, bukan `next.config.ts` | Butuh nonce per request dan host Storage dari env. |
| T-08 | Fragment URL di `/auth/confirm` dibersihkan saat submit, bukan langsung setelah dibaca | Blueprint §6.2 menyebut "setelah membacanya". Membersihkan saat submit membuat tautan tetap bisa dipakai bila halaman ter-refresh sebelum diklik, dan tidak perlu menyimpan token di state. `useSyncExternalStore` dipakai (bukan `useState` di dalam effect) karena aturan `react-hooks/set-state-in-effect` dan `react-hooks/refs` sama-sama melarang cara yang lebih sederhana. |
| T-09 | `npm run bootstrap` / `npm run seed` memakai `--env-file=.env --env-file-if-exists=.env.local` | `node` biasa tidak memuat `.env` seperti Next.js; tanpa ini skrip selalu gagal dengan "env belum diisi". |
| T-10 | `setPassword` mengarahkan anggota `invited` ke `/settings/profile?onboarding=1` sesuai blueprint §6.2, walau halamannya belum ada (Fase 4) | Konsekuensi: setelah aktivasi lewat tautan bootstrap, pengguna mendarat di 404 sampai Fase 4 selesai. Tautan kembali ke beranda tersedia dari halaman `not-found`. |
| T-11 | `npm run db:types` memakai `scripts/gen-db-types.mjs`, bukan `supabase gen types > file` | Redirection shell memotong file tujuan SEBELUM perintah berjalan. Tanpa Docker/access token, `supabase gen types` pasti gagal dan meninggalkan `database.types.ts` **0 byte** — persis kejadian yang menewaskan file tipe 10 KB di sesi ini. Skrip baru menulis ke memory dulu dan hanya menimpa bila perintah keluar 0 dan hasilnya tidak kosong. |

---

## Yang belum dibuat

Sesuai §26.4 dan urutan fase §20, modul berikut **belum ada** dan bukan
disembunyikan:

- Fase 3: **selesai.**
- Fase 4: **selesai.**
- Fase 5: **selesai.**
- Fase 7: audit a11y & responsif, e2e Playwright, `/api/health`, runbook rilis.
- `scripts/seed-fixtures.ts`.
- Tes pgTAP (butuh Docker) dan Playwright e2e.

---

## Verifikasi pasca-deploy (§24.4)

Belum dijalankan. Yang harus diperiksa setelah deploy dan dicatat di file ini:

- [ ] Signup Supabase Auth nonaktif.
- [ ] Anonim hanya melihat hero identitas kelas.
- [ ] Header keamanan dan CSP aktif pada domain nyata.
- [ ] Cron `/api/health` menjawab 200 dengan Bearer dan 401 tanpa.
- [ ] Upload gambar berfungsi dan path Storage privat.
- [ ] Waktu tampil pada timezone kelas, bukan timezone browser.
