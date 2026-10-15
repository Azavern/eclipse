import { ConfirmAccessForm } from '@/features/auth/components/ConfirmAccessForm';
import { getClassIdentity } from '@/features/class/queries';
import { AuthShell } from '@/components/layout/AuthShell';

// Halaman ini bukan statis: isinya selalu tautan sekali pakai yang tidak boleh
// tersimpan di cache mana pun (blueprint §6.2).
export const dynamic = 'force-dynamic';

/**
 * Verifikasi tautan akses sekali pakai (blueprint §6.2).
 *
 * Token dibaca klien dari fragment URL. Halaman ini tidak pernah memanggil
 * `verifyOtp` saat render: verifikasi baru terjadi setelah pengguna menekan
 * tombol, lewat POST, supaya preview tautan di aplikasi chat tidak menghabiskan
 * token.
 */
export default async function AuthConfirmPage() {
  const identity = await getClassIdentity();

  return (
    <AuthShell
      identity={
        identity
          ? { name: identity.name, tagline: identity.tagline, logoPath: identity.logo_path }
          : null
      }
      title="Aktivasi akun"
      description="Tautan ini berlaku sekali. Tekan Lanjutkan untuk memverifikasinya, lalu tentukan kata sandi pada langkah berikutnya."
    >
      <ConfirmAccessForm />
    </AuthShell>
  );
}
