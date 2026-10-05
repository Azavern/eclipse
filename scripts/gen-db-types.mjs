#!/usr/bin/env node
/**
 * Generate `src/lib/supabase/database.types.ts` dengan aman.
 *
 * Kenapa tidak `supabase gen types > file` di package.json: shell memotong file
 * tujuan SEBELUM perintah berjalan. Kalau `supabase gen types` gagal — yang pasti
 * terjadi tanpa Docker atau access token — file tipe yang sudah ada tertinggal
 * 0 byte dan seluruh `.from()` / `.rpc()` kehilangan tipe. Skrip ini menulis
 * ke memory dulu dan hanya menimpa file bila perintah berhasil dan hasilnya
 * tidak kosong.
 *
 * Pakai: `npm run db:types` (butuh Docker lokal) atau
 * `npm run db:types -- --project-id <id>` untuk project yang sudah di-link.
 */

import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = resolve(ROOT, 'src/lib/supabase/database.types.ts');

// `--project-id` diteruskan opsional untuk project remote.
const extraArgs = process.argv.slice(2);
const useRemote = extraArgs.includes('--project-id');

const args = ['supabase', 'gen', 'types', 'typescript'];
args.push(useRemote ? '--project-id' : '--local', ...extraArgs.filter((a) => a !== '--project-id'));

const child = spawn('npx', args, { cwd: ROOT, shell: process.platform === 'win32' });

let stdout = '';
let stderr = '';

child.stdout.on('data', (chunk) => {
  stdout += chunk;
});
child.stderr.on('data', (chunk) => {
  stderr += chunk;
});

child.on('error', (error) => {
  console.error(`db:types gagal menjalankan perintah: ${error.message}`);
  console.error(`File ${TARGET} tidak diubah.`);
  process.exit(1);
});

child.on('close', (code) => {
  if (code !== 0) {
    console.error(`db:types: perintah keluar dengan kode ${code}.`);
    if (stderr.trim()) console.error(stderr.trim());
    console.error(`File ${TARGET} tidak diubah.`);
    process.exit(1);
  }

  const types = stdout.trim();

  // Guard kedua: perintah bisa keluar 0 tanpa menghasilkan apa pun.
  if (types.length === 0) {
    console.error('db:types: perintah berhasil tetapi tidak menghasilkan tipe apa pun.');
    console.error(`File ${TARGET} tidak diubah.`);
    process.exit(1);
  }

  writeFileSync(TARGET, `${types}\n`, 'utf8');
  console.log(`db:types: ${TARGET} ditulis (${types.length} karakter).`);
  console.log('Periksa sebelum commit: tipe baris harus `type`, bukan `interface`,');
  console.log('dan `Update` tiap tabel harus object, bukan `never`.');
});
