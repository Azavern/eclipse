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
