/**
 * Skeleton mengikuti bentuk konten sebenarnya, bukan spinner layar penuh
 * (blueprint §15.1), sehingga transisi ke konten tidak terasa seperti lompatan
 * layout.
 *
 * Kilaunya datang dari kelas `.skeleton` (DESIGN.md §6: "skeleton shimmer") dan
 * berhenti sendiri saat pengguna meminta reduced motion (DESIGN.md §10).
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton rounded-sm ${className}`} />;
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex flex-col gap-1 border-t border-border-subtle pt-3">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

/**
 * Judul halaman: tinggi `text-h1` + satu baris deskripsi, dipisah garis seperti
 * `PageHeader`. Tinggi baris Disalin dari komponen itu supaya judul tidak
 * melompat saat skeleton diganti teks asli.
 */
export function SkeletonPageHeader() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3 border-b border-border-subtle pb-4">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  );
}

/**
 * Judul section: `text-h2` + garis pemisah, sama seperti `Section`.
 */
export function SkeletonSectionTitle({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 border-b border-border-subtle pb-2">
        <Skeleton className="h-6 w-40" />
      </div>
      <SkeletonList rows={rows} />
    </div>
  );
}

/**
 * Kerangka section: judul bergaris pemisah + isi yang diberikan. Dipakai
 * sebagai fallback streaming supaya bagian atas section (yang tidak bergeser)
 * sama persis dengan `Section`.
 */
export function SkeletonSectionShell({ children }: { children: React.ReactNode }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 border-b border-border-subtle pb-2">
        <Skeleton className="h-6 w-40" />
      </div>
      {children}
    </div>
  );
}

/**
 * Tile metrik: dua kolom di mobile, empat dari 1024px — mengikuti grid
 * `OverviewStats` supaya lebar kolom tidak bergeser saat data tiba.
 */
export function SkeletonStats({ items = 4 }: { items?: number }) {
  return (
    <div aria-hidden="true" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: items }, (_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-md border border-border-subtle bg-surface p-4"
        >
          <Skeleton className="size-10 rounded-md" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

/**
 * Grafik batang + daftar angka minggu, mengikuti `ActivityTrend` (tinggi area
 * grafik 128).
 */
export function SkeletonActivity() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <Skeleton className="h-32 w-full" />
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-4 w-24" />
        ))}
      </div>
    </div>
  );
}

/**
 * Grid kartu (mis. daftar anggota): kartu dengan avatar bulat + dua baris teks,
 * mengikuti `MembersPage`.
 */
export function SkeletonCardGrid({ items = 6 }: { items?: number }) {
  return (
    <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: items }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface p-3"
        >
          <Skeleton className="size-10 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Strip avatar untuk Home: avatar bulat + nama pendek, mengikuti `MembersStrip`.
 */
export function SkeletonAvatarStrip({ items = 8 }: { items?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-wrap gap-4">
      {Array.from({ length: items }, (_, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <Skeleton className="size-14 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * Formulir: pasangan label + kontrol setinggi kontrol native (`px-3 py-2`
 * dengan `text-body`), lalu tombol selebar label. Mengikuti `FormField` +
 * `Input` supaya tinggi baris tidak bergeser.
 */
export function SkeletonForm({ fields = 4 }: { fields?: number }) {
  return (
    <div aria-hidden="true" className="flex max-w-form flex-col gap-5">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="flex flex-col gap-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
      <Skeleton className="h-11 w-40" />
    </div>
  );
}

/**
 * Halaman yang seluruhnya formulir: judul halaman + form. Dipakai sebagai
 * fallback untuk `loading.tsx` halaman buat/ubah.
 */
export function SkeletonFormPage({ fields = 5 }: { fields?: number }) {
  return (
    <div className="flex flex-col gap-8">
      <SkeletonPageHeader />
      <SkeletonForm fields={fields} />
    </div>
  );
}

/**
 * Halaman daftar: judul halaman + judul section + baris daftar.
 */
export function SkeletonListPage({
  rows = 4,
  withSectionTitle = true,
}: {
  rows?: number;
  withSectionTitle?: boolean;
}) {
  return (
    <div className="flex flex-col gap-8">
      <SkeletonPageHeader />
      {withSectionTitle ? <SkeletonSectionTitle rows={rows} /> : <SkeletonList rows={rows} />}
    </div>
  );
}