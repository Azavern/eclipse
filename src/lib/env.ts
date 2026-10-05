import { z } from 'zod';

// Env divalidasi sekali saat startup agar aplikasi gagal cepat dengan pesan jelas
// alih-alih gagal dengan error Supabase yang tidak bisa ditelusuri (blueprint §24.1).
const schema = z.object({
  SUPABASE_URL: z.url({ error: 'SUPABASE_URL harus berupa URL' }),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1, 'SUPABASE_PUBLISHABLE_KEY wajib diisi'),
  // Dibaca hanya oleh lib/supabase/admin.ts (Auth Admin API + cleanup Storage).
  SUPABASE_SECRET_KEY: z.string().min(1, 'SUPABASE_SECRET_KEY wajib diisi'),
  APP_URL: z.url({ error: 'APP_URL harus berupa URL' }),
  CRON_SECRET: z.string().min(32, 'CRON_SECRET minimal 32 karakter'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

function load() {
  const parsed = schema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY:
      process.env.SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SECRET_KEY:
      process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
    APP_URL: process.env.APP_URL,
    CRON_SECRET: process.env.CRON_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      `Konfigurasi environment tidak valid:\n${detail}\n` +
        `Salin .env.example menjadi .env.local lalu isi nilainya.`,
    );
  }

  const value = parsed.data;
  return {
    ...value,
    // APP_URL tanpa slash akhir dipakai untuk membangun tautan akses sekali pakai.
    APP_URL: value.APP_URL.replace(/\/+$/, ''),
    IS_PROD: value.NODE_ENV === 'production',
  };
}

export const env = load();

export type Env = ReturnType<typeof load>;
