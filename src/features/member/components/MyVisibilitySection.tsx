import { getMemberVisibilityRules, getViewer, getVisibilityMap } from '@/lib/visibility/server';
import {
  MEMBER_SCOPE_KEYS,
  toAudienceLevel,
  type Audience,
  type VisibilityKey,
} from '@/lib/visibility/registry';
import { Eye } from 'lucide-react';
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
    viewer.userId
      ? getMemberVisibilityRules(viewer.userId)
      : Promise.resolve({} as Partial<Record<VisibilityKey, Audience>>),
  ]);

  // Setiap key diisi: aturan milik anggota bila ada, kalau tidak level yang
  // berlaku di tingkat kelas. Tidak ada lagi opsi "ikut aturan bawaan".
  const initial = Object.fromEntries(
    MEMBER_SCOPE_KEYS.map((key) => [key, toAudienceLevel(ownRules[key] ?? map[key].own)]),
  ) as MemberSelectionMap;

  return (
    <Section
      tier="secondary"
      title="Visibilitas profil"
      description="Atur siapa yang boleh melihat bagian profilmu. Aturan kelas tetap menjadi batas terluar."
      icon={<Eye className="size-5" />}
    >
      <div className="max-w-form">
        <MemberVisibilityEditor initial={initial} map={map} />
      </div>
    </Section>
  );
}