#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(__dirname, '../src/config/master-code.generated.ts');
const ITERATIONS = 5000;
const KEY_LEN = 32;

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    // Mute output after printing the prompt so typed characters are not echoed
    const origWrite = rl._writeToOutput;
    let promptDone = false;
    rl._writeToOutput = function (str) {
      if (!promptDone) {
        origWrite.call(rl, str);
        return;
      }
      if (str === '\r\n' || str === '\n' || str === '\r') {
        origWrite.call(rl, str);
      }
    };

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
    promptDone = true;
  });
}

async function main() {
  console.log('=== CaNdry: Setup Kode Master Reset Password ===');
  console.log('Input disembunyikan (tidak tampil di layar). Gunakan frasa minimal 12 karakter.\n');

  const first = (await promptHidden('Masukkan frasa kode master baru: ')).trim();
  console.log('');
  if (first.length < 12) {
    console.error('Gagal: Kode master minimal 12 karakter agar aman.');
    process.exit(1);
  }

  const second = (await promptHidden('Ulangi frasa kode master baru: ')).trim();
  console.log('');
  if (first !== second) {
    console.error('Gagal: Kedua input tidak cocok.');
    process.exit(1);
  }

  const saltHex = crypto.randomBytes(16).toString('hex');
  const hashHex = crypto
    .pbkdf2Sync(Buffer.from(first, 'utf8'), Buffer.from(saltHex, 'hex'), ITERATIONS, KEY_LEN, 'sha256')
    .toString('hex');

  const content = `// File ini di-generate oleh \`node scripts/set-master-code.mjs\`.
// Jangan isi frasa asli di sini; hanya salt acak dan hash PBKDF2-SHA256 yang disimpan.

export const MASTER_CODE_CONFIG = {
  isConfigured: true,
  algorithm: 'pbkdf2-sha256',
  iterations: ${ITERATIONS},
  saltHex: '${saltHex}',
  hashHex: '${hashHex}',
} as const;
`;

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, content, 'utf8');

  console.log(`Berhasil! Hash PBKDF2-SHA256 (${ITERATIONS} iterasi) disimpan ke:`);
  console.log(`  ${OUTPUT_PATH}`);
  console.log('Frasa asli tidak disimpan di mana pun. Catat frasa Anda di tempat aman.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
