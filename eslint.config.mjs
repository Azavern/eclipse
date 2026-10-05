import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/**
 * Batas impor (blueprint §4).
 *
 * `eslint-config-next` v16 mengekspor konfigurasi flat secara langsung, jadi
 * FlatCompat tidak dipakai — memakainya memicu error struktur sirkular.
 */
const adminMessage =
  'Admin client (service role) hanya boleh dipakai di features/*/actions.ts dan scripts/.';

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: ['.next/**', 'node_modules/**', 'stitch_ui_system/**', 'next-env.d.ts'],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Admin client (service role) hanya boleh di actions.ts dan skrip.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/features/**/actions.ts', 'scripts/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ group: ['**/lib/supabase/admin*'], message: adminMessage }],
        },
      ],
    },
  },

  // Primitif UI tidak boleh tahu-menahu tentang domain (§11.1).
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/**', '**/features/**'],
              message: 'components/ui tidak boleh mengimpor dari features/.',
            },
          ],
        },
      ],
    },
  },

  // Batas "komponen klien tidak boleh mengimpor modul server-only" tidak bisa
  // ditulis di sini: ESLint tidak bisa mencocokkan direktif 'use client'
  // sebagai pola file. Aturan itu ditegakkan scripts/check-boundaries.mjs.
];

export default config;
