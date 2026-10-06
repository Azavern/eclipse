import { Section } from '@/components/ui/Section';
import { getViewer } from '@/lib/visibility/server';
import { getResetRequests } from '@/features/auth/queries';
import { ResetRequestQueue } from './ResetRequestQueue';

/**
 * Slot beranda: kartu antrean ganti kata sandi untuk Ketua.
 *
 * Server Component async supaya halaman tidak menunggu antrean ini untuk
 * merender bagian lain (§12). Section juga tidak dirender sama sekali untuk
 * viewer tanpa `members.manage`, dan untuk Ketua yang antreannya kosong —
 * tidak ada gunanya menampilkan kotak kosong di beranda.
 */
export async function ResetRequestSlot({ timezone }: { timezone: string }) {
  const viewer = await getViewer();
  if (!viewer.can('members.manage')) return null;

  const requests = await getResetRequests();
  if (requests.length === 0) return null;

  return (
    <Section
      tier="primary"
      title="Permintaan ganti kata sandi"
      description="Anggota yang lupa kata sandinya lewat halaman masuk. Terbitkan tautannya di sini, lalu kirimkan lewat WhatsApp."
    >
      <ResetRequestQueue requests={requests} timezone={timezone} />
    </Section>
  );
}
