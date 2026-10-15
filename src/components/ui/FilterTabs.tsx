import Link from 'next/link';

/**
 * Penyaring berbentuk deretan chip — satu bentuk untuk semua daftar yang
 * filternya dipilih dari sekumpulan nilai tetap (DESIGN.md §9: kontrol
 * multi-nilai punya satu state eksplisit per nilai).
 *
 * Nilainya tetap hidup di URL (blueprint §12: filter harus bisa di-bookmark dan
 * dibagikan), jadi komponen ini hanya menyusun tautan, bukan menyimpan state.
 * Yang aktif ditandai tiga hal — latar ber-tint, garis aksen, dan
 * `aria-current="page"` — sementara labelnya tetap memakai token teks supaya
 * kontrasnya tidak bergantung pada palet kelas (DESIGN.md §10).
 */
export function FilterTabs({
  label,
  items,
}: {
  /** Nama grup filter untuk pembaca layar, mis. "Filter tugas". */
  label: string;
  items: readonly { href: string; label: string; active: boolean }[];
}) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          aria-current={item.active ? 'page' : undefined}
          className={`press inline-flex min-h-11 items-center rounded-full border px-4 text-label ${
            item.active
              ? 'border-primary bg-primary-soft font-semibold text-text'
              : 'border-border-strong bg-surface text-text-muted hover:bg-surface-dim hover:text-text'
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
