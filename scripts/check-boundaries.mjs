#!/usr/bin/env node
/**
 * Menegakkan batas lapisan yang tidak bisa diekspresikan sebagai pola file ESLint
 * (blueprint §4).
 *
 * Aturan yang diperiksa:
 *  1. File ber-direktif 'use client' tidak boleh mengimpor modul server-only.
 *  2. `components/ui` tidak boleh mengimpor dari `features/`.
 *  3. Modul query/actions hanya boleh di server (tidak boleh punya 'use client').
 *
 * ESLint tetap memegang sisanya (admin client, dsb.) lewat eslint.config.mjs.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SRC = join(ROOT, 'src');

const EXTENSIONS = new Set(['.ts', '.tsx']);

/** Modul yang menandai dirinya `server-only`. */
const SERVER_ONLY_MODULES = [
  '@/lib/supabase/server',
  '@/lib/visibility/server',
  '@/lib/storage/upload',
  '@/lib/storage/sign',
  '@/lib/env',
];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (EXTENSIONS.has(full.slice(full.lastIndexOf('.')))) yield full;
  }
}

const violations = [];

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).split('\\').join('/');
  const source = readFileSync(file, 'utf8');

  const isClientComponent = /^\s*['"]use client['"];?/m.test(source);
  const isUiPrimitive = rel.startsWith('src/components/ui/');
  const isQueryModule = /\/queries\.tsx?$/.test(rel);

  const lines = source.split('\n');
  lines.forEach((line, i) => {
    const lineNo = i + 1;
    const push = (rule, message) =>
      violations.push({ rel, lineNo, rule, message, line: line.trim() });

    // 1. Klien tidak boleh menyentuh server-only.
    if (isClientComponent) {
      for (const mod of SERVER_ONLY_MODULES) {
        if (line.includes(mod)) {
          push('client-imports-server-only', `Komponen klien mengimpor ${mod}.`);
        }
      }
    }

    // 2. Primitive UI tidak boleh tahu-menahu domain.
    if (isUiPrimitive && /from\s+['"](@\/features\/|\.\..*features\/)/.test(line)) {
      push('ui-imports-features', 'components/ui tidak boleh mengimpor dari features/.');
    }
  });

  // 3. Lapisan data tidak boleh jadi komponen klien.
  if (isQueryModule && isClientComponent) {
    violations.push({
      rel,
      lineNo: 1,
      rule: 'query-is-client',
      message: 'queries.ts hanya boleh berjalan di server.',
      line: "'use client'",
    });
  }
}

if (violations.length === 0) {
  console.log('check-boundaries: OK — batas lapisan terpenuhi.');
  process.exit(0);
}

console.error(`check-boundaries: ${violations.length} pelanggaran\n`);
for (const v of violations) {
  console.error(`  ${v.rel}:${v.lineNo}  [${v.rule}] ${v.message}`);
  console.error(`    ${v.line.slice(0, 110)}`);
}
process.exit(1);
