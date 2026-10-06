import { getMemberVisibilityRules, getViewer, getVisibilityMap } from '@/lib/visibility/server';
import { Section } from '@/components/ui/Section';
import { MemberVisibilityEditor, type MemberSelectionMap } from './MemberVisibilityEditor';

/**
 * Section "Visibilitas profil" di `/settings/profile`.
 *
 * Aturan milik anggota sendiri dibaca di sini, bukan dari halaman, supaya
 * section ini bisa streamed terpisah. Viewer sudah ditunggu layout `(app)` dan
 * dibungkus `cache` per-request, jadi `await` di bawah tidak menambah satu pun
 * permintaan jaringan — hanya membuka nilai yang sudah ada.
 */
export async function MyVisibilitySection() {
  const viewer = await getViewer();

  const [map, ownRules] = await Promise.all([
    getVisibilityMap(),
    viewer.userId ? getMemberVisibilityRules(viewer.userId) : Promise.resolve({}),
  ]);

  // Nilai kosong berarti "pakai bawaan katalog", jadi Select menampilkan opsi
  // bawaan dan bukan nilai effective yang sudah dipangkas.
  const initial = Object.fromEntries(
    Object.entries(ownRules).map(([key, audience]) => [key, audience ?? '']),
  ) as MemberSelectionMap;

  return (
    <Section
      tier="secondary"
      title="Visibilitas profil"
      description="Atur siapa yang boleh melihat bagian profilmu. Aturan kelas tetap menjadi batas terluar."
    >
      <div className="max-w-form">
        <MemberVisibilityEditor initial={initial} map={map} />
      </div>
    </Section>
  );
}