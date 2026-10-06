# STATUS

Catatan progres, temuan sementara, gap, dan keputusan. Aturan rekayasa ada di
`AGENTS.md`, aturan desain di `DESIGN.md`, dan spesifikasi produk di
`blueprint.md`. File ini hanya mencatat keadaan kerja.

Terakhir diperbarui: 7 Oktober 2026.

---

## Ringkasan keadaan

Fondasi, lapisan database, sistem desain, dan kerangka aplikasi sudah terbangun
dan **terverifikasi lewat lint, typecheck, unit test, build, dan render nyata**.
Fase 3, 4, dan 5 (anggota, profil, portofolio, sosial, pengaturan, jadwal,
event, tugas) **selesai**. Yang tersisa: hardening/rilis Fase 7.

Perubahan A-06 (antrean permintaan ganti kata sandi) sudah masuk commit
`e731177` di `main`, dan `git branch -vv` tidak menunjukkan selisih dengan
`origin/main`. Perbaikan bug `<form>` bersarang sesudahnya (lihat bagian antrean
ganti kata sandi) masih **lokal di working tree**, belum di-commit.

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
  (6 Oktober 2026: undangan, aktivasi akun, dan editor visibilitas kini juga
  sudah diuji lewat klik — lihat dua bagian di bawah.)

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
| Kelas | `/class` — "Identitas kelas" | Nama, kode, tagline, deskripsi, sorotan, zona waktu, logo, cover, tautan kontak, plus pratinjau apa yang dilihat pengunjung tanpa login | `class.manage` |
| Kelas | `/settings/theme` — "Tema kelas" | Warna, tipografi, tata letak + laporan kontras | `class.manage` |
| Pengelolaan | `/settings/visibility` — "Aturan visibilitas" | Siapa boleh membuka tiap halaman/bagian; batas terluar di atas aturan pribadi | `class.manage` |
| Pengelolaan | `/settings/members` — "Anggota" | Undang, terbitkan tautan akses sekali pakai, aktifkan/nonaktifkan, hapus | `members.manage` |

`/class` sengaja **di luar** `/settings`: halaman itu adalah kelas itu sendiri —
pengunjung tanpa login boleh membukanya (hanya bagian pengelolaan yang
dirender untuk `class.manage`), jadi ia bukan halaman pengaturan. Seluruh
penyebutan `/settings/class` di bagian yang lebih lama merujuk lokasi sebelum
6 Oktober 2026.

Aturan yang menjaga konsistensinya:

1. **Satu pintu masuk.** Item nav menunjuk `/settings` (indeks), bukan salah satu
   halaman isinya.
2. **Judul di indeks = judul halaman (`h1`).** Sudah selaras: `Akun & kata
   sandi` dan `Aturan visibilitas` (sebelumnya h1-nya `Akun` dan `Visibilitas`,
   jadi nama yang sama menunjuk dua hal berbeda).
3. **Jalur keluar dari mana pun.** Kelima halaman di dalam `/settings` punya
   "Semua pengaturan" di atas judulnya (`SettingsBackLink`), jadi tidak ada
   halaman pengaturan yang jadi jalan buntu. `/class` tidak memakainya karena
   halaman itu juga dibuka pengunjung biasa.
4. **Entri yang tidak berhak tidak dirender** — baik di indeks maupun di nav,
   memakai aturan yang sama (§7.8). Konsekuensinya: anggota biasa hanya
   melihat grup "Umum" saja.
5. **Halaman pengaturan tidak saling menaut**; navigasi antar-pengaturan lewat
   indeks, bukan lewat tombol silang, supaya jaraknya jelas.
6. **Anonim tidak melihat apa pun dari pengaturan.** `/settings` dan kelima
   halaman isinya mengarahkan ke `/login?next=…`; daftar pengaturan tidak
   pernah ikut terkirim ke browser anonim. `/class` tetap boleh dibuka
   pengunjung — itu halaman publik kelas — dan hanya bagian pengelolaannya yang
   butuh `class.manage`.

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

## Perbaikan aktivasi pengguna (6 Oktober 2026)

**Gejalanya:** setelah Ketua mengundang anggota lewat `/settings/members`,
tombol **"Lanjutkan"** di halaman tautan akses (`/auth/confirm`) tidak melakukan
apa pun. URL tidak berubah, formulir kembali kosong, dan baris `memberships`
tetap `invited` — anggota tidak pernah bisa masuk.

### Akar masalah: `history.replaceState(null, …)` menghapus state router Next

`ConfirmAccessForm` membersihkan token sekali pakai dari address bar di dalam
`onSubmit`:

```js
window.history.replaceState(null, '', window.location.pathname + window.location.search);
```

Next.js menyimpan state router-nya di `history.state`
(`__PRIVATE_NEXTJS_INTERNALS_TREE`). Menggantinya dengan `null` tepat saat Server
Action masih berjalan membuat **redirect dari Server Action diabaikan**.

Respons servernya sendiri benar — `200`, header `x-action-redirect:
/set-password;push`, payload RSC `/set-password` ada di body, cookie sesi +
`pwd_setup=1` ter-set — tetapi browser tidak pernah pindah dan form remount
kosong. Bukti pembanding: menghapus panggilan itu membuat redirect bekerja;
memanggilnya kembali dengan `window.history.state` (state lama, bukan `null`)
tetap bekerja. Jadi fragment tetap dibersihkan tanpa menghapus state internal
router.

| Lapis | Hasil setelah perbaikan |
|---|---|
| `/auth/confirm` | "Lanjutkan" → browser pindah ke `/set-password` |
| `/set-password` | mode "Tentukan kata sandi", bukan reset |
| Setelah simpan | redirect ke `/settings/profile?onboarding=1` + banner "Keanggotaanmu sudah aktif" |
| Database | `status = active`, `joined_at` terisi |
| Halaman Ketua | baris berubah dari **Menunggu aktivasi** menjadi **Aktif** |

### Sekalian: status anggota dibaca dari sumber yang salah

Tabel `/settings/members` menentukan status dari `!member.banned` (status ban di
Auth Admin API). Akibatnya anggota yang **belum pernah memakai tautan akses**
tampil sebagai **"Aktif"**, lengkap dengan tombol **"Nonaktifkan"** yang
transisinya pasti ditolak trigger `memberships_guard` (EC021) — ajakan ke jalan
buntu, dan langsung terlihat saat mengaktifkan anggota. Sekarang:

- `MemberSummary`/`getMembers` ikut membaca `status` dari `member_profile_v`,
  dan tabel menampilkan **Menunggu aktivasi / Aktif / Tidak aktif**.
- Baris `invited` tidak menawarkan aksi status; diganti keterangan "Menunggu
  anggota memakai tautan akses." Satu-satunya jalur ke `active` memang tautan
  milik anggota sendiri (§6.4).
- Field `banned` di `ManagedMember` dibuang karena hanya dipakai untuk label
  yang salah itu.

Sekalian juga: judul `/class` untuk pengelola disamakan dengan nama entrinya di
indeks pengaturan, "Identitas kelas" (§10.1).

### Verifikasi

13 cek Chrome (Playwright sementara, dihapus setelah dipakai), semuanya lulus,
tanpa page error: undangan terbit dengan tautan akses → tabel menampilkan
"Menunggu aktivasi" tanpa tombol status yang mustahil → tautan dibuka →
"Lanjutkan" → `/set-password` dan token hilang dari address bar → kata sandi
→ `/settings/profile?onboarding=1` → tabel menjadi "Aktif" dengan tombol
"Nonaktifkan" → `status` dan `joined_at` benar di database.

### Yang belum

- Anggota `invited` yang tautannya hilang belum bisa diterbitkan ulang dari
  daftar anggota. Pesan kegagalan `inviteMember` sudah menyebut jalur itu, tapi
  aksinya belum ada — ini fitur baru, bukan perbaikan bug.
- Tidak ada tes otomatis untuk alur ini. Vitest berjalan di lingkungan `node`
  (tanpa jsdom/testing-library) dan suite Playwright (`test:e2e`) belum punya
  konfigurasi, jadi verifikasinya browser-nyata lewat skrip sementara.

---

## IA baru: pemisahan tegas publik vs pengaturan (6 Oktober 2026)

Permintaan Knotus: "hanya tombol-tombol di settings yang benar-benar berguna…
buat pemisahan tegas antara navigasi publik (read-only) dan settings (CRUD)".
Tiga keputusan yang dipakai:

1. **Anggota** — `/members` tetap daftar (read-only) + tombol **"Kelola
   anggota"** → `/settings/members`.
2. **Kelas** — seluruh CRUD pindah ke **`/class`**, `/settings/class` dihapus,
   dan "Kelas" keluar dari sidebar karena isinya sudah tampil di beranda.
3. **Bug publik** — "sudah menambahkan jadwal, event dan tugas… tapi beranda
   non-user masih kosong".

| Bagian | Sebelum | Sekarang |
|---|---|---|
| Sidebar | 6 item konten (termasuk "Kelas") | 5 item konten + "Pengaturan" |
| `/class` | hanya tampilan baca | CRUD kelas (identitas, gambar, tautan) + "Tampilan publik" |
| `/settings/class` | halaman CRUD | **dihapus** → 404; entri indeks menunjuk `/class` |
| `/members` | daftar saja | daftar + "Kelola anggota" (hanya `members.manage`) |
| Beranda anonim | hanya identitas kelas | penjelasan "Halaman publik kelas" + tombol masuk |
| Beranda pengelola | — | blok "Kelola kelas" → `/class`, `/settings/members`, `/settings/visibility` |
| Editor visibilitas | select + catatan plafon | ringkasan "Tampilan pengunjung tanpa login" + catatan per key, dihitung **sebelum disimpan** |

`page.class_about` tetap jadi kunci visibilitas `/class`; yang hilang hanya item
navigasinya. Pratinjau di editor memakai fungsi murni baru
`publicVisibility(map, choices)` di `src/lib/visibility/registry.ts` — cermin
`app.effective_audience` (plafon `widest_audience`, plafon page induk, dan
syarat `dataSource` untuk section Home). Tes barunya:
`tests/unit/public-visibility.test.ts` (4 tes: bawaan katalog, section tetap
tertutup selama page sumbernya tertutup, plafon `widest_audience` berlaku, dan
aturan bisa ditutup lagi).

### Kenapa beranda pengunjung kosong — dan kenapa itu bukan bug render

Ternyata tabel **`visibility_rules` kosong**: pilihan yang diubah di
`/settings/visibility` belum pernah tersimpan (select diubah, tombol "Simpan
aturan" tidak ditekan). RPC `save_class_visibility` sendiri terbukti sehat —
dipanggil dengan JWT Ketua, baris uji masuk, lalu dihapus lagi.

Dengan hanya aturan bawaan katalog, yang publik adalah `page.home`,
`page.class_about`, `section.home.identity`, dan `field.class.*` — jadi
pengunjung memang hanya melihat identitas kelas. Satu hal yang mudah
terlewat: `section.home.schedule`, `section.home.events`, dan
`section.home.tasks` **butuh dua syarat** — key section-nya publik **dan** page
sumbernya (`page.schedule` / `page.events` / `page.tasks`) publik. Itu persis
yang sekarang ditunjukkan ringkasan sebelum menyimpan.

### Verifikasi

29 cek Chrome, semuanya lulus:

- Sidebar Ketua = Beranda | Jadwal | Event | Tugas | Anggota | Pengaturan;
  beranda punya 3 pintu masuk kelola.
- `/class`: form identitas, unggah logo & cover, editor tautan, bagian
  "Tampilan publik"; anonim dapat 200 dengan **0 form** dan tetap melihat
  pratinjau publiknya.
- `/members` → satu tombol "Kelola anggota" yang benar-benar membuka
  `/settings/members` (isinya "Undang anggota baru").
- Indeks `/settings` menaut `/class` (bukan `/settings/class`);
  `/settings/class` → **404**.
- Editor visibilitas: ringkasan naik 10 → 12 bagian saat `page.schedule` +
  `section.home.schedule` diubah ke publik, menyebut "Jadwal", baris "Tampak"
  ikut bertambah — dan **`visibility_rules` tetap 0 baris** (belum disimpan).
- Anonim: beranda menampilkan penjelasan + tombol masuk tanpa blok kelola;
  `/settings/visibility` mendarat di `/login?next=%2Fsettings`.

---

## Jadwal mingguan + semester (6 Oktober 2026)

Permintaan Knotus: "jadwal itu merujuk ke jadwal kelas, itu dipisahkan dari
events/kegiatan… cukup input jam-menit dan hari, tidak usah d/m/y, karena jadwal
kuliah sifatnya repetitif mingguan… Tambahkan juga opsi semester, saya ingin
jadwal semester sebelumnya tetap disimpan, dan di halaman penampil jadwal nantinya
ada dropdown untuk pilih semester, dan pilih hari, atau tampilkan seluruh jadwal
semester ini."

### Model data

Migration `20261006120000_schedule_semester.sql` (diterapkan lewat CLI:
`migration list` → `db push --dry-run` → `db push`):

| Sebelum | Sesudah |
|---|---|
| `start_at` / `end_at` timestamptz (satu pertemuan bertanggal) | `day_of_week` smallint 1–7 (isodow) + `start_time`/`end_time` `time` |
| — | `semester` text, format `YYYY/YYYY (Ganjil\|Genap)` |
| index `(class_id, start_at)` | index `(class_id, semester, day_of_week, start_time)` |

Baris lama **tidak dibuang**: hari dan jam diturunkan dari `start_at`/`end_at`
memakai zona waktu kelas, dan semesternya diisi semester yang berjalan saat
migrasi — jadwal asli pengguna berakhir sebagai Selasa 17.30–19.00 WITA,
"2026/2027 Ganjil". Setelah backfill, kolom bertanggal dihapus supaya tidak ada
dua sumber kebenaran. CHECK baru: hari 1–7, `end_time > start_time`, dan format
semester + tahun berurutan. Grant insert/update diperbarui karena grant tabel ini
berbasis kolom (pola yang sama seperti `tasks.course`).

### Yang berubah di aplikasi

- `/schedule` sekarang hanya menampilkan **jadwal kuliah**; event dan tenggat
  tugas tidak lagi digabung di sini karena keduanya sudah punya halaman sendiri.
- Dua penyaring di atas daftar: **semester** dan **hari** ("Semua hari" =
  seluruh jadwal semester itu). Pilihannya hidup di URL
  (`?semester=…&day=…`), jadi bisa di-bookmark dan dibagikan (§8).
- Default semester: nilai di URL → semester berjalan bila sudah punya jadwal →
  semester terbaru yang punya jadwal. Kelas yang belum mengisi jadwal semester
  ini tetap melihat jadwal terakhirnya, bukan halaman kosong.
- Form: Judul · Jenis · Semester · Hari · Jam mulai · Jam selesai · Lokasi ·
  Tautan · Deskripsi. Tidak ada lagi input tanggal; jamnya jam dinding zona
  kelas, jadi tidak ada konversi UTC — zona hanya dipakai untuk label
  WIB/WITA/WIT saat menampilkan.
- Daftar semester di form dan halaman = semester yang ada di database digabung
  semester berjalan + 3 sebelumnya, jadi semester lama selalu bisa dipilih kembali.
  Setelah menyimpan, pengguna diarahkan ke semester yang baru dibuat.
- Home: "Jadwal" menghitung **kemunculan berikutnya** dari hari + jam
  (`nextOccurrence`, helper baru di `lib/time`); kuliah yang sedang berjalan
  tetap dihitung sebagai berikutnya. Hanya semester berjalan yang ikut.
- Helper baru `src/lib/semester.ts` (`semesterFor`, `recentSemesters`,
  `isSemester`, `sortSemestersDesc`). `dayKey` dan `formatTimeRange` dihapus
  karena tidak ada lagi pemakainya, dan tesnya diganti tes untuk helper baru
  (`nextOccurrence`, `formatWallTimeRange`, `semesterFor`).

### Verifikasi

- `lint`, `typecheck`, `test` (12 file, **156 tes**, +13), `check:tokens`,
  `check:boundaries`, `build`: semua keluar 0.
- 20 cek Chrome, semua lulus: baris hasil migrasi tampil sebagai Selasa
  17.30–19.00 WITA; jadwal baru (Kamis 10.00–11.40) tersimpan lalu tampil di
  kelompok Kamis; `end_time` sebelum `start_time` ditolak server (tetap di form,
  tidak ada baris baru); jadwal semester lama (2025/2026 Genap) tersimpan dan
  bisa dibuka; semester lama tidak bocor ke tampilan semester ini; filter hari
  menyaring dua arah; Home menampilkan "Sel, 6 Okt · 17.30 WITA"; anonim
  diarahkan ke `/login?next=%2Fschedule`.
- Baris uji dihapus setelah verifikasi; yang tersisa hanya jadwal asli pengguna.

### Yang tidak dilakukan / menunggu keputusan

- `blueprint.md` **tidak diubah** walau §19 masih mendeskripsikan jadwal
  bertanggal; pola yang sama seperti perubahan sebelumnya — dicatat di sini
  sebagai penyimpangan yang disengaja sampai Knotus memutuskan naskah blueprint.
- Kolom `type` (`class`/`activity`) dipertahankan apa adanya. Pemisahan yang
  diminta adalah pemisahan halaman (jadwal vs event), bukan penghapusan jenis.
- Halaman detail jadwal tidak dibuat; "Ubah" tetap langsung dari baris daftar.

## Tombol tampil/sembunyikan kata sandi (6 Oktober 2026)

Permintaan Knotus: "tambahkan hidden/show toggle di setiap input field (kayak
password) supaya password yang diketik masih bisa dilihat". Yang dimaksud
"kayak password" adalah field bertipe sandi — tombol tampil/sembunyikan tidak
bermakna pada field teks biasa — jadi keenam field sandi di aplikasi memakai satu
primitive yang sama.

### Yang dibuat

`src/components/ui/PasswordInput.tsx`. Tanpa dependensi baru: ikon `Eye` /
`EyeOff` dari `lucide-react` yang sudah dipakai, dan tombolnya `IconButton` yang
tipe-nya memaksa nama aksesibel diisi. Primitive ini membungkus `Input`, jadi
`invalid` dan `aria-describedby` dari `FormField` diteruskan apa adanya.

Yang diubah **hanya atribut `type`** antara `password` dan `text`. Nilai yang
diketik tidak pernah masuk state React, jadi tidak ada salinan kata sandi di
memori peramban; karena field tetap uncontrolled, isian pun tidak hilang saat
tipe ditukar.

| Lokasi | Field | Nama tombol |
|---|---|---|
| `/login` | `password` | Tampilkan kata sandi |
| `/set-password` (aktivasi & reset) | `password` | Tampilkan kata sandi |
| `/set-password` (aktivasi & reset) | `confirmPassword` | Tampilkan konfirmasi kata sandi |
| `/settings/account` | `currentPassword` | Tampilkan kata sandi sekarang |
| `/settings/account` | `password` | Tampilkan kata sandi baru |
| `/settings/account` | `confirmPassword` | Tampilkan konfirmasi kata sandi baru |

`toggleLabel` dipakai di halaman yang punya beberapa field sekaligus, karena
tiga tombol bernama sama di satu layar tidak bisa dibedakan saat pengguna
menavigasi lewat daftar tombol pembaca layar. Pembedaan seperti ini juga sudah
ada di desain Stitch: mock aktivasi memakai dua nama berbeda, mock login satu.

Empat keputusan yang mengikat:

1. **Pola toggle button ARIA**: nama aksesibelnya tetap, keadaan diumumkan lewat
   `aria-pressed`. Mengganti nama tombol setiap klik membuat pembaca layar
   membacakan *aksi*, bukan *keadaan* tombolnya.
2. **`type="button"`** — tanpa itu tombol ikut men-submit form dan membatalkan
   pengisian sandi yang belum selesai.
3. **Ikon `aria-hidden`**, nama aksesibel datang dari `label`; target sentuh
   setinggi field, jadi tetap memenuhi batas sentuh §16.
4. **Area kanan input diberi `pe-12`** supaya isian panjang tidak tertutup ikon;
   titik sentuh tombol berada di dalam kotak field, bukan menimpanya.

Tombolnya juga masuk galeri state `/dev/ui`, seperti primitive lain.

### Verifikasi

- `lint`, `typecheck`, `test` (12 file, 156 tes), `check:tokens`,
  `check:boundaries`: semua keluar 0. Tidak ada tes baru: vitest berjalan di
  lingkungan `node` tanpa jsdom, jadi event klik dan `aria-pressed` tidak bisa
  diuji di sana.
- **149 cek Chrome** (Playwright sementara, dihapus setelah dipakai), semua
  lulus, pada `/login`, ketiga field `/settings/account`, kedua field
  `/set-password`, dan contoh galeri: tipe awal `password`; klik → `text` dan
  `aria-pressed=true`; klik lagi → kembali `password`; nilai tetap utuh di kedua
  arah; klik tidak men-submit form; `Tab` dari input langsung ke tombol dan
  `Enter`/`Space` menyalakannya; fokus tidak lepas dari tombol; padding kanan
  minimal 40 px; tombol berada di dalam kotak field; tengah tombol bukan area
  input; satu field yang menyala tidak mengubah dua field lain; pada lebar 375 px
  tombol tetap di dalam field. `/set-password` diuji lewat **alur undangan
  sungguhan** (Ketua mengundang → tautan sekali pakai → "Lanjutkan" →
  `/set-password`), bukan dengan membuka URL-nya langsung.
- `axe-core` pada form `/login`, `/settings/account`, dan `/set-password`:
  **0 pelanggaran**.
- Visual diperiksa dari tangkapan layar pada 1280 px dan 375 px, dalam keadaan
  tersembunyi dan tampil.
- Akun uji dihapus lewat UI aplikasi ("Hapus anggota" lalu konfirmasi);
  database kembali ke 2 akun, 2 membership, dan 2 profil.

### Catatan

- Saat konfirmasi hapus anggota, React masih mencetak peringatan "An async
  function with useActionState was called outside of a transition". Itu pola lama
  `await deleteAction(fd)` di dalam `ConfirmDialog`, ada di **7 file**
  (`MembersManager`, `EventForm`, `TaskForm`, `ScheduleForm`, `PortfolioEditor`,
  `ClassLinksEditor`, `SocialLinksEditor`), dan **bukan** berasal dari perubahan
  ini — `MembersManager.tsx` tidak tersentuh. Membungkusnya dalam
  `startTransition` adalah pekerjaan terpisah yang belum dilakukan.
- Tidak ada perilaku menyembunyikan ulang secara otomatis setelah submit atau
  setelah beberapa detik. Isian sudah hilang bersama halaman setelah submit
  berhasil, dan menyembunyikan di tengah pengisian justru menyulitkan pengguna.

---

## Antrean permintaan ganti kata sandi (6–7 Oktober 2026)

Permintaan Knotus: "fitur lupa password". Di kelas ini "lupa kata sandi" tidak
bisa berarti tautan reset mandiri: tidak ada email delivery di free tier
(A-05), jadi tautannya tetap harus dikirim Ketua lewat WhatsApp — pola yang sama
dengan undangan anggota. Yang belum ada adalah tempat bagi anggota untuk
memberi tahu, dan bagi Ketua untuk melihat siapa yang meminta.

### Kenapa antrean, bukan form reset

Form reset mandiri butuh email keluar. Karena itu tidak ada, yang dipakai adalah
antrean persetujuan:

1. Anggota menekan "Lupa kata sandi?" di `/login`, mengisi email, lalu mengirim
   permintaan. Tidak ada email yang dikirim ke siapa pun di langkah ini.
2. Permintaan muncul di beranda Ketua sebagai section "Permintaan ganti kata
   sandi".
3. Ketua menekan "Buat tautan". Tautan sekali pakai terbit saat itu juga dan
   ditampilkan **sekali**; Ketua menyalinnya dan mengirimkannya lewat WhatsApp.
4. Anggota membuka tautan itu: `/auth/confirm` memverifikasi token dari fragment
   URL, lalu `/set-password` menentukan kata sandi baru. Jalurnya sama persis
   dengan aktivasi akun, hanya `type`-nya `recovery`.

Token tidak pernah menyentuh tabel antrean. Barisnya hanya mencatat *siapa* yang
meminta, bukan kredensialnya.

### Model data

`supabase/migrations/20261006130000_password_reset_requests.sql` (migration
0011, **sudah diterapkan** ke project Supabase — `npx supabase migration list`
menampilkan `20261006130000` di kolom Local maupun Remote).

Tabel `public.password_reset_requests`: `id`, `class_id` (FK cascade), `email`,
`status` (`pending` / `issued`, default `pending`), `created_at`, `issued_at`.

Tiga penjaga di level database:

- `check (email = lower(email) and length(email) between 3 and 254)` — bentuk yang
  tersimpan selalu bisa dibandingkan dengan email di Auth.
- `check ((status = 'issued') = (issued_at is not null))` — `issued_at` terisi
  tepat saat tautan terbit, tidak sebelum dan tidak sesudah.
- Unique index parsial `(class_id, email) where status = 'pending'` — satu
  permintaan terbuka per email per kelas, jadi spam tidak menumpuk dan Ketua
  tidak melihat email yang sama berulang kali.

Trigger `app.password_reset_requests_guard` menolak perubahan `class_id` /
`email` / `created_at` (`EC030`), menolak membuka lagi baris yang sudah `issued`
(`EC021`), dan mengisi `issued_at` dengan `now()` database — bukan jam mesin
klien (§9: satu sumber waktu).

GRANT sengaja sempit: `select` dan `update (status)` untuk `authenticated`,
**tanpa INSERT untuk `anon`** dan **tanpa policy DELETE**. Permintaan masuk lewat
Server Action yang memakai service role (`class_id` selalu berasal dari server,
bukan dari isian form), dan antrean sekaligus menjadi jejak audit yang tidak
bisa dihapus dari UI (§7.9). RLS membatasi baca dan tulis ke
`app.has_permission(class_id, 'members.manage')`.

### Yang berubah di aplikasi

| File | Isi |
|---|---|
| `supabase/migrations/20261006130000_password_reset_requests.sql` | tabel, index, RLS, trigger |
| `src/features/auth/actions.ts` | `requestPasswordReset`, `issuePasswordResetLink` |
| `src/features/auth/queries.ts` | `getResetRequests` (React `cache`, server-only) |
| `src/features/auth/schemas.ts` | `resetRequestSchema` |
| `src/features/auth/components/ForgotPasswordForm.tsx` | panel "Lupa kata sandi?" di `/login` |
| `src/features/auth/components/ResetRequestQueue.tsx` | baris antrean + tombol "Buat tautan" |
| `src/features/auth/components/ResetRequestSlot.tsx` | slot beranda, gate `members.manage` |
| `src/features/auth/components/LoginForm.tsx` | panel dipasang sebagai saudara form login (lihat bug di bawah) |
| `src/app/(app)/page.tsx` | memasang slot di beranda di dalam `Suspense` |
| `src/lib/supabase/database.types.ts` | tipe `PasswordResetRequest` |
| `tests/unit/auth-schemas.test.ts` | 5 tes `resetRequestSchema` |

Antrean hanya dirender untuk viewer dengan `members.manage`, dan section-nya
tidak muncul sama sekali kalau antreannya kosong. `getResetRequests` mengambil
baris `pending` dan baris `issued` yang terbit kurang dari satu jam terakhir saja
(batas 20 baris). Baris `issued` sengaja tetap terlihat selama itu supaya Ketua
masih sempat menyalin tautan yang baru terbit; sesudahnya jejaknya tetap ada di
tabel tapi tidak lagi mengganggu beranda. Permintaan `pending` yang menggantung
lebih dari 30 hari juga tidak lagi ditampilkan.

### Bug yang ditemukan dan diperbaiki: `<form>` bersarang

`ForgotPasswordForm` awalnya dipasang **di dalam** `<form>` login. Dua `<form>`
yang bersarang bukan HTML yang sah, dan akibatnya nyata — bukan kosmetik:

- React mencatat `In HTML, <form> cannot be a descendant of <form>. This will
  cause a hydration error.`
- Tombol "Kirim permintaan" tidak pernah menjalankan Server Action-nya. Form
  dalamnya tetap membawa `action="javascript:throw new Error('A React form was
  unexpectedly submitted…')"` dan browser mencoba mengirim data ke URL itu, jadi
  tidak ada permintaan yang tercatat. Artinya seluruh alur A-06 tidak berfungsi
  dari sisi pengguna, walau lint, typecheck, tes, dan build semuanya hijau.

Perbaikannya: `LoginForm` sekarang mengembalikan `<div className="flex flex-col
gap-4">` yang berisi `<form>` login dan `<ForgotPasswordForm />` sebagai
**saudara**, bukan anak — pola yang sudah dipakai `EditTaskForm`,
`EditEventForm`, `EditScheduleForm`, dan `MembersManager`. Jarak visualnya tidak
berubah.

### Verifikasi

- `lint`, `typecheck`, `test` (**13 file, 161 tes**), `check:tokens`,
  `check:boundaries`, dan `build` (26 route): semua keluar 0 pada tree setelah
  perbaikan.
- `npx supabase migration list`: `20261006130000` ada di kolom Local dan Remote.
- **30 cek Chrome** (Playwright sementara di atas Chrome yang terpasang, dihapus
  setelah dipakai) terhadap dev server di `http://localhost:3000`, semuanya
  lulus:
  - Panel tertutup saat awal (`aria-expanded="false"`, `#reset-email` tidak ada
    di DOM), terbuka setelah diklik, `aria-controls` menunjuk elemen yang benar,
    dan tertutup lagi saat diklik ulang.
  - Tidak ada `<form>` di dalam `<form>` setelah perbaikan
    (`formsNestedInForms: 0`), dan peringatan hidrasi React tidak muncul lagi:
    3 kemunculan di log server sebelum perbaikan, tetap 3 sesudah — tidak ada
    tambahan.
  - Server Action benar-benar berjalan. Email `a@b` ditolak validasi server dan
    field-nya bertanda `aria-invalid`, tanpa form login ikut terkirim; email
    bukan anggota ditolak dengan pesan "belum terdaftar sebagai anggota kelas
    ini". Log server mencatat `requestPasswordReset` dieksekusi (579 ms) dan
    emailnya **tidak** ikut tercatat.
  - Toggle bisa dicapai dengan `Tab` dari field email dan fokusnya terlihat
    (`outline` 3 px).
  - `axe-core` pada halaman yang panelnya terbuka: **0 pelanggaran**.
  - Lebar 375 px: tanpa overflow horizontal (`overflow=0px`), field muat di
    dalam viewport (259 px), tombol kirim setinggi 44 px.
  - `/auth/confirm#token_hash=…&type=recovery`: tombol "Lanjutkan" aktif dengan
    fragment lengkap, token tidak ada di HTML yang dirender server, token palsu
    ditolak dengan pesan "Tautan ini tidak berlaku lagi" tanpa redirect dan tanpa
    crash, fragment dibersihkan setelah submit, dan tipe `recovery` diterima
    (bukan pesan "jenis tautan tidak dikenali").

### Yang TIDAK terverifikasi

- **Sisi Ketua.** Antrean di beranda, tombol "Buat tautan", dan kotak tautan
  sekali pakai tidak diuji di peramban: butuh sesi Ketua, dan menerbitkan tautan
  sungguhan akan membuat kredensial nyata di database produksi. Yang terbukti
  hanyalah sisi database (migration sudah diterapkan) dan sisi anggota (di atas).
- **Jalur sukses permintaan.** Tidak dijalankan supaya tidak menulis baris nyata
  ke database produksi. Yang diuji hanya jalur tolak (email bukan anggota) dan
  jalur validasi.
- **Konsumsi tautan hasil `generateLink`.** Token asli tidak pernah dipakai
  sampai `/set-password`, jadi rantai penuh "terbitkan tautan → buka → verifikasi
  → tentukan kata sandi" belum pernah dijalankan ujung ke ujung.
- Bug `<form>` bersarang **tidak bisa ditangkap tes unit**: vitest berjalan di
  lingkungan `node` tanpa jsdom, dan panelnya tertutup pada render awal sehingga
  markup statis pun tidak akan memperlihatkan form dalam itu. Penjaga yang tepat
  adalah e2e Playwright (Fase 7), yang memang belum ada.

### Keputusan: pesan "belum terdaftar" yang eksplisit

`requestPasswordReset` menjawab dengan pesan eksplisit bahwa email itu belum
terdaftar sebagai anggota kelas ini, bukan pesan generik "kalau emailmu terdaftar,
permintaanmu dicatat". Knotus memintanya supaya anggota yang salah mengetik atau
memang belum diundang tahu apa yang harus dilakukan. Konsekuensinya form ini bisa
dipakai untuk memeriksa apakah sebuah alamat email punya akun di kelas ini —
sebuah *membership oracle*.

Yang membatasi: Server Action ini **tidak punya rate limit**, jadi enumerasi
secara teknis bisa dilakukan selama pemanggilnya menebak alamat yang benar; yang
mahal hanyalah jalur penolakan karena ia memanggil `auth.admin.listUsers`. Pesan
pada form login sendiri tetap generik (§23), jadi oracle ini hanya ada di jalur
lupa kata sandi. Kalau risikonya dianggap terlalu besar, gantinya adalah satu
pesan generik di `actions.ts`; belum diambil supaya perilaku yang diminta Knotus
tetap utuh.

### Catatan

- Permintaan berulang ditangani lebih dulu: kalau sudah ada baris `pending` untuk
  email itu, aksi menjawab sukses tanpa memanggil Auth lagi — sekaligus membatasi
  biaya endpoint anonim yang bisa diulang. Bentrok `23505` dari dua tab yang
  mengirim bersamaan juga diperlakukan sebagai sukses.
- `issuePasswordResetLink` memakai `update … .eq('status', 'pending')` sebagai
  syarat kedua, jadi dua tab yang menekan "Buat tautan" bersamaan hanya
  menghasilkan satu tautan yang benar-benar tercatat.

---

## Kartu "Halaman publik kelas" dihapus dari beranda (7 Oktober 2026)

Permintaan Knotus: hapus kartu penjelasan di beranda publik yang berisi judul
"Halaman publik kelas", kalimat "Jadwal, tugas, event, dan daftar anggota hanya
bisa dibaca anggota kelas…", dan tombol "Masuk ke akunmu".

Blok itu di `src/app/(app)/page.tsx` hanya dirender untuk `!viewer.isSignedIn`,
jadi yang berubah hanya tampilan pengunjung anonim: beranda sekarang langsung
dibuka identitas kelas tanpa penjelasan di atasnya. Blok "Kelola kelas" untuk
pengelola tidak disentuh.

- Tombol masuk tidak ikut hilang — `TopBar` sudah punya tombol "Masuk" sendiri
  untuk pengunjung tanpa sesi, dan itu pintu masuk yang tersisa di beranda.
- Konsekuensinya, alasan kenapa isi beranda sedikit (jadwal, tugas, dan event
  hanya untuk anggota) tidak lagi dijelaskan di halaman. Itu konsekuensi yang
  disadari, bukan kehilangan yang tak terduga — bagian "Kenapa beranda
  pengunjung kosong" di atas tetap menjelaskan latar belakangnya.

Verifikasi: `lint`, `typecheck`, `test` (13 file, 161 tes), `check:tokens`,
`check:boundaries`, dan `build` semuanya keluar 0; `GET /` sebagai anonim
(HTTP 200) tidak lagi memuat ketiga teks kartu itu, sementara tautan
`href="/login"` milik TopBar dan hero identitas kelas tetap dirender, tanpa
penanda error.

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
| T-12 | `requestPasswordReset` menjawab eksplisit "email belum terdaftar", bukan pesan generik (diminta Knotus) | Form lupa kata sandi jadi *membership oracle*: siapa pun bisa memeriksa apakah satu alamat email punya akun di kelas ini, dan aksi ini belum punya rate limit. Pesan form login tetap generik (§23). Risiko dan alternatifnya dicatat di bagian antrean ganti kata sandi. |

---

## Yang belum dibuat

Sesuai §26.4 dan urutan fase §20, modul berikut **belum ada** dan bukan
disembunyikan:

- Fase 3: **selesai.**
- Fase 4: **selesai.**
- Fase 5: **selesai.**
- Fase 7: audit a11y & responsif, e2e Playwright, `/api/health`, runbook rilis.
  Bug `<form>` bersarang (7 Oktober 2026) adalah alasan konkret kenapa e2e
  Playwright dibutuhkan: kelas bug itu tidak terlihat oleh lint, typecheck, tes
  unit, maupun build.
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
- [ ] Antrean ganti kata sandi: permintaan dari `/login` muncul di beranda
      Ketua, tombol "Buat tautan" menerbitkan tautan, dan tautan itu sampai ke
      `/set-password`.
