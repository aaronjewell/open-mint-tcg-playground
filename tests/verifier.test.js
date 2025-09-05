#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

async function run() {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const certPath = path.join(root, 'certs', 'cert.example.json');
  const configPath = path.join(root, 'config', 'season.example.json');

  const proc = spawn(process.execPath, [path.join(root, 'dist', 'verifier', 'cli.js'), '--cert', certPath, '--config', configPath]);

  let stdout = '';
  let stderr = '';
  proc.stdout.on('data', (d) => { stdout += d.toString(); });
  proc.stderr.on('data', (d) => { stderr += d.toString(); });

  const exitCode = await new Promise((resolve) => proc.on('close', resolve));

  assert.equal(exitCode, 0, `verifier exited with ${exitCode}, stderr=\n${stderr}`);
  assert.ok(stdout.trim().endsWith('OK'), `expected OK in stdout, got: ${stdout}`);

  console.log('OK');
}

run().catch((e) => { process.stderr.write(`${e?.message ?? e}\n`); process.exitCode = 1; });


