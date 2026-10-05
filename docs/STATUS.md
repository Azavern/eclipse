# STATUS

Catatan progres, temuan sementara, gap, dan keputusan. Aturan rekayasa ada di
`AGENTS.md`, aturan desain di `DESIGN.md`, dan spesifikasi produk di
`blueprint.md`. File ini hanya mencatat keadaan kerja.

Terakhir diperbarui: 5 Oktober 2026.

---

## Ringkasan keadaan

Fondasi, lapisan database, sistem desain, dan kerangka aplikasi sudah terbangun
dan **terverifikasi lewat lint, typecheck, unit test, build, dan render nyata**.
Modul fitur (anggota, jadwal, event, tugas, pengaturan) **belum** diimplementasi.

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
Delapan migration ditulis:

| File | Isi |
|---|---|
| `0001_schema_enums.sql` … `0002_tables.sql` | Sudah diterapkan (oleh pemilik proyek) |
| `0003_helpers_visibility.sql` | Helper auth + resolver `app.own_audience` / `effective_audience` / `can_view` |
| `0004_triggers.sql` | Invarian, guard kolom, last-admin, batas baris, log aktivitas |
| `0005_privileges_rls.sql` | Default-deny + seluruh policy RLS |
| `0006_views_rpc.sql` | View bermasker + RPC |
| `0007_storage.sql` | Bucket private + policy Storage |
| `0008_reference_data.sql` | Katalog 27 key, kelas Eclipse, dua role |

**BELUM DITERAPKAN.** Lihat bagian "Blocker".

### Fase 2 — Auth, sesi, shell, token
- `src/proxy.ts`: refresh cookie sesi (`getUser()`) + nonce CSP per request.
  Tidak ada logika otorisasi di sini.
- `src/lib/visibility/server.ts`: `getViewer`, `getVisibilityMap`, `canShow`,
  `requireView`, `requirePermission`.
- `src/features/auth/`: login, konfirmasi tautan akses, set password, ganti
  sandi, keluar.
- `src/components/ui/`: primitive lengkap dengan seluruh state (§11.2).
- `/dev/ui`: galeri state, `notFound()` di produksi.
- `AppShell`, `SidebarNav` (≥1024 px), `BottomNav` (<1024 px), `TopBar`,
  `UserMenu`.
- Injeksi theme runtime di root layout, divalidasi ulang oleh `ThemeSchema`.

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
| `npm test` | **93 lulus / 93** (7 file) |
| `npm run build` | Lulus, 4 route |
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

### Yang TIDAK terverifikasi

- **RLS, view, RPC, trigger, dan policy Storage.** Semua SQL baru belum
  diterapkan ke database, jadi tidak ada satu pun aturan yang bisa diuji.
  `pgTAP` tidak dapat dijalankan tanpa Docker.
- **Autentikasi end-to-end.** Tidak ada akun Ketua, jadi alur tautan akses →
  set password → onboarding belum pernah dieksekusi.
- **Responsif di enam lebar** (360/480/768/1024/1280/1536). Belum diukur.
- **Audit keyboard dan kontras** dengan alat otomatis.
- **E2E Playwright.** Belum ditulis.
- **Keamanan produksi**: pengaturan signup di dashboard Auth, rate limit, region,
  CSP pada domain nyata.

---

## Blocker

### 1. Migrasi 0003–0008 belum diterapkan

Lingkungan ini tidak punya `psql`, Docker, maupun Supabase access token.
Petunjuk lengkap ada di [`scripts/apply-migrations.md`](../scripts/apply-migrations.md).

Selama belum diterapkan, halaman membaca kosong dan log dev menampilkan:
`Could not find the table 'public.class_identity_v' in the schema cache` — itu
diharapkan, bukan bug.

### 2. `database.types.ts` ditulis manual

CLI `supabase gen types` memerlukan Docker atau access token. File
`src/lib/supabase/database.types.ts` ditulis tangan dari migration 0001–0002 dan
**harus di-regenerate** setelah migrasi diterapkan:

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

---

## Yang belum dibuat

Sesuai §26.4 dan urutan fase §20, modul berikut **belum ada** dan bukan
disembunyikan:

- Fase 3: `/settings/class`, `/settings/theme`, `/settings/visibility`, `/class`,
  upload gambar.
- Fase 4: anggota, profil, portofolio, social, `/settings/profile`,
  `/settings/account`, `/settings/members`.
- Fase 5: jadwal, event, tugas beserta form dan detailnya.
- `/auth/confirm`, `/set-password` (aksinya sudah ada, halamannya belum).
- `/api/health`.
- `scripts/bootstrap-admin.ts`, `scripts/seed-fixtures.ts`.
- Tes pgTAP, Playwright e2e.

---

## Verifikasi pasca-deploy (§24.4)

Belum dijalankan. Yang harus diperiksa setelah deploy dan dicatat di file ini:

- [ ] Signup Supabase Auth nonaktif.
- [ ] Anonim hanya melihat hero identitas kelas.
- [ ] Header keamanan dan CSP aktif pada domain nyata.
- [ ] Cron `/api/health` menjawab 200 dengan Bearer dan 401 tanpa.
- [ ] Upload gambar berfungsi dan path Storage privat.
- [ ] Waktu tampil pada timezone kelas, bukan timezone browser.
