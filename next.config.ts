import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Gambar sudah di-resize di klien dan disajikan lewat signed URL;
  // optimizer Next tidak dipakai (§13.5).
  images: { unoptimized: true },
  experimental: {
    serverActions: {
      // 3 MB: cukup untuk satu gambar 2 MiB hasil resize + field form (§13.4).
      bodySizeLimit: '3mb',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // CSP-baseline + nonce dibangun per request di src/proxy.ts
          // (butuh nonce dan host Storage proyek), jadi tidak dideklarasikan di sini.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
