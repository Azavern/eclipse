import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';

/**
 * Proxy (nama lama middleware) — hanya dua tanggung jawab (§3.4):
 *  1. me-refresh cookie sesi lewat getUser();
 *  2. membuat nonce CSP per request.
 *
 * TIDAK ADA logika otorisasi di sini. Gate halaman tetap di Server Component
 * dan, yang menentukan, RLS di Postgres.
 */
export async function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const csp = buildCsp(nonce);

  // Header ini hanya dibaca layout untuk menyetel tag <style nonce>.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  // Tanpa cookie sesi tidak ada JWT yang perlu divalidasi, jadi panggilan ke
  // Auth server dilewati: halaman masuk dan beranda anonim hemat satu network
  // round trip per request. Jalur dengan cookie sesi tidak berubah.
  if (!hasSessionCookie(request)) {
    response.headers.set('content-security-policy', csp);
    return response;
  }

  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request: { headers: requestHeaders } });
        for (const { name, value, options } of list) {
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            sameSite: 'lax',
            secure: env.IS_PROD,
            path: '/',
          });
        }
      },
    },
  });

  // getUser() memvalidasi ke server Auth, bukan mempercayai isi cookie.
  await supabase.auth.getUser();

  response.headers.set('content-security-policy', csp);
  return response;
}

/**
 * Apakah request ini membawa cookie sesi Supabase.
 *
 * `@supabase/ssr` memecah cookie sesi yang panjang menjadi beberapa bagian, dan
 * setiap bagian diberi sufiks `.0`, `.1`, dst. Jadi pencocokan harus menerima
 * nama utuh (`sb-<ref>-auth-token`) maupun nama pecahan
 * (`sb-<ref>-auth-token.0`) — kalau hanya yang utuh, sesi panjang malah
 * diperlakukan sebagai anonim dan tidak pernah di-refresh.
 *
 * Nama cookie tidak ditulis persis di sini supaya tetap sinkron dengan konfigurasi
 * storage default `@supabase/ssr`.
 */
function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => {
    if (!cookie.name.startsWith('sb-')) return false;
    if (cookie.name.endsWith('-auth-token')) return true;
    // Pecahan cookie: `...-auth-token.0`, `...-auth-token.1`, dan seterusnya.
    const dot = cookie.name.lastIndexOf('.');
    return dot !== -1 && cookie.name.slice(0, dot).endsWith('-auth-token');
  });
}

function buildCsp(nonce: string): string {
  // Host Storage hanya untuk proyek ini; tidak ada client Supabase di browser,
  // jadi connect-src cukup 'self'.
  const storageHost = safeHost(env.SUPABASE_URL);

  return [
    "default-src 'self'",
    // 'unsafe-eval' HANYA di development: React dan overlay Next.js memakai
    // eval() saat dev untuk menyusun call stack. Tanpa itu browser memblokirnya
    // dan console menampilkan "eval() is not supported in this environment" di
    // setiap halaman. Produksi TIDAK PERNAH mendapat directive ini (§23).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${env.IS_PROD ? '' : " 'unsafe-eval'"}`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' data: blob: ${storageHost}`,
    "font-src 'self'",
    // Tidak ada Supabase client di browser, jadi tidak ada koneksi ke origin lain.
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(env.IS_PROD ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

/** Host dari SUPABASE_URL, atau 'self' bila tidak bisa diurai. */
function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'self';
  }
}

export const config = {
  matcher: [
    // Semua request dinamis; pengecualian hanya aset statis agar hemat kerja.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
