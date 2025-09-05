#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { readFile, stat, mkdtemp } from 'node:fs/promises';
import os from 'node:os';

async function run() {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const outDir = await mkdtemp(path.join(os.tmpdir(), 'omt-keys-'));

  const proc = spawn(process.execPath, [path.join(root, 'dist', 'signer', 'gen-key.js'), outDir]);
  let stdout = '';
  let stderr = '';
  proc.stdout.on('data', (d) => { stdout += d.toString(); });
  proc.stderr.on('data', (d) => { stderr += d.toString(); });
  const exitCode = await new Promise((resolve) => proc.on('close', resolve));

  assert.equal(exitCode, 0, `keygen exited with ${exitCode}, stderr=\n${stderr}`);
  assert.match(stdout, /ED25519_SK_HEX=[0-9a-f]{64}/i, 'should print secret key hex');
  assert.match(stdout, /PUBLIC_KEY_BASE64=[A-Za-z0-9+/=]+/, 'should print public key base64');

  const skPath = path.join(outDir, 'ed25519.sk.hex');
  const pkPath = path.join(outDir, 'ed25519.pk.b64');
  await stat(skPath);
  await stat(pkPath);
  const sk = (await readFile(skPath, 'utf8')).trim();
  const pk = (await readFile(pkPath, 'utf8')).trim();
  assert.match(sk, /^[0-9a-f]{64}$/i, 'sk file format');
  assert.match(pk, /^[A-Za-z0-9+/=]+$/, 'pk file format');

  console.log('OK');
}

run().catch((e) => { process.stderr.write(`${e?.message ?? e}\n`); process.exitCode = 1; });



