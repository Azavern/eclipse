#!/usr/bin/env node
/**
 * Menegakkan disiplin token (blueprint §17.2).
 *
 * Komponen hanya boleh memakai kelas Tailwind yang dipetakan ke token. Nilai hex,
 * arbitrary value seperti `w-[17px]`, dan inline style untuk warna/ukuran
 * dilarang, karena membuat ada dua sumber kebenaran untuk visual.
 *
 * Pengecualian yang disengaja:
 *  - `src/lib/theme/**`  -> tema memang sumber nilai warna runtime
 *  - `src/styles/**`     -> definisi token itu sendiri
 *  - `scripts/**`        -> alat ini sendiri
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SCAN_DIR = join(ROOT, 'src');

const ALLOWED_PREFIXES = [
  'src/lib/theme/',
  'src/styles/',
  'src/lib/supabase/database.types.ts',
];

const EXTENSIONS = new Set(['.ts', '.tsx']);

/** Warna hex di dalam kelas Tailwind atau string biasa. */
const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/;

/**
 * Arbitrary value Tailwind: `w-[17px]`, `text-[#fff]`, `bg-[rgb(0,0,0)]`.
 *
 * Pengecualian: `env(...)` untuk safe-area iOS/Android. Nilai itu berasal dari
 * perangkat, bukan keputusan desain, jadi bukan token yang hilang.
 */
const ARBITRARY_VALUE = /(?:^|[\s"'`])(?:[a-z-]+)-\[(?!env\()[^\]]+\]/;

// Style inline untuk warna atau ukuran dilarang; komponen harus memakai token.
const INLINE_STYLE = /\bstyle=\{\{/;

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
    } else if (EXTENSIONS.has(full.slice(full.lastIndexOf('.')))) {
      yield full;
    }
  }
}

const violations = [];

for (const file of walk(SCAN_DIR)) {
  const rel = relative(ROOT, file).split('\\').join('/');
  if (ALLOWED_PREFIXES.some((p) => rel.startsWith(p))) continue;

  const lines = readFileSync(file, 'utf8').split('\n');

  lines.forEach((line, i) => {
    const lineNo = i + 1;
    const push = (rule, message) => violations.push({ rel, lineNo, rule, message, line: line.trim() });

    if (HEX_COLOR.test(line)) {
      push('hex', 'Nilai warna hex harus lewat token (--color-*).');
    }
    if (ARBITRARY_VALUE.test(line)) {
      push('arbitrary', 'Arbitrary value Tailwind dilarang. Gunakan token spacing/radius/warna.');
    }
    if (INLINE_STYLE.test(line)) {
      push('inline-style', 'style inline untuk nilai visual dilarang; pakai token.');
    }
  });
}

if (violations.length === 0) {
  console.log('check-tokens: OK — semua nilai visual berasal dari token.');
  process.exit(0);
}

console.error(`check-tokens: ${violations.length} pelanggaran\n`);
for (const v of violations) {
  console.error(`  ${v.rel}:${v.lineNo}  [${v.rule}] ${v.message}`);
  console.error(`    ${v.line.slice(0, 110)}`);
}
process.exit(1);
