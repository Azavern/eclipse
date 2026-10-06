import { ConfirmAccessForm } from '@/features/auth/components/ConfirmAccessForm';
import { getClassIdentity } from '@/features/class/queries';
import { Card } from '@/components/ui/Card';

// Halaman ini bukan statis: isinya selalu tautan sekali pakai yang tidak boleh
// tersimpan di cache mana pun (§6.2).
export const dynamic = 'force-dynamic';

/**
 * Verifikasi tautan akses sekali pakai (§6.2).
 *
 * Token dibaca klien dari fragment URL. Halaman ini tidak pernah memanggil
 * `verifyOtp` saat render: verifikasi baru terjadi setelah pengguna menekan
 * tombol, lewat POST, supaya preview tautan di aplikasi chat tidak menghabiskan
 * token.
 */
export default async function AuthConfirmPage() {
  const identity = await getClassIdentity();

  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-12"
    >
      <div className="flex w-full max-w-form flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-display text-h1 font-semibold text-text">Aktivasi akun</h1>
          <p className="text-body text-text-muted">{identity?.name ?? 'Kelas'}</p>
        </div>

        <Card tier="primary" className="p-6">
          <div className="flex flex-col gap-6">
            <p className="text-small text-text-muted">
              Tautan ini berlaku sekali. Tekan Lanjutkan untuk memverifikasinya, lalu tentukan kata
              sandi pada langkah berikutnya.
            </p>

            <ConfirmAccessForm />
          </div>
        </Card>
      </div>
    </main>
  );
}
