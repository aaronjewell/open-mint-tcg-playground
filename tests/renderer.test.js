#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp } from 'node:fs/promises';
import os from 'node:os';

async function run() {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const flavorPath = path.join(root, 'flavors', 'flavor.example.json');

  // render to stdout
  {
    const proc = spawn(process.execPath, [path.join(root, 'dist', 'renderer', 'cli.js'), '--in', flavorPath]);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    const exitCode = await new Promise((resolve) => proc.on('close', resolve));
    assert.equal(exitCode, 0, `renderer exited with ${exitCode}, stderr=\n${stderr}`);
    assert.ok(stdout.startsWith('<?xml'), 'expected SVG XML header');
    assert.ok(stdout.includes('<svg'), 'expected <svg> tag');
  }

  // render to file path
  {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'omt-render-'));
    const outPath = path.join(tmpDir, 'card.svg');
    const proc = spawn(process.execPath, [path.join(root, 'dist', 'renderer', 'cli.js'), '--in', flavorPath, '--out', outPath]);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    const exitCode = await new Promise((resolve) => proc.on('close', resolve));
    assert.equal(exitCode, 0, `renderer (file) exited with ${exitCode}, stderr=\n${stderr}`);
    const saved = stdout.trim();
    assert.equal(saved, outPath, 'renderer should print saved file path');
    const svg = await readFile(outPath, 'utf8');
    assert.ok(svg.startsWith('<?xml'));
    assert.ok(svg.includes('<svg'));
  }

  console.log('OK');
}

run().catch((e) => { process.stderr.write(`${e?.message ?? e}\n`); process.exitCode = 1; });


