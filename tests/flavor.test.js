#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const certPath = path.join(root, 'certs', 'cert.example.json');
const themePath = path.join(root, 'themes', 'fantasy.v1.json');

async function run() {

    {
        const proc = spawn(process.execPath, [path.join(root, 'dist', 'flavorer', 'cli.js'), '--cert', certPath, '--theme', themePath]);
        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (d) => { stdout += d.toString(); });
        proc.stderr.on('data', (d) => { stderr += d.toString(); });
        const exitCode = await new Promise((resolve) => proc.on('close', resolve));
        assert.equal(exitCode, 0, `flavorer exited with ${exitCode}, stderr=\n${stderr}`);
        var out = JSON.parse(stdout);
        assert.equal(typeof out.type, 'string');
        assert.equal(typeof out.title, 'string');
        assert.equal(typeof out.biome, 'string');
        assert.ok(Array.isArray(out.properties) && out.properties.length >= 2);
        assert.ok(out.tags.includes('fantasy.v1'));
        assert.equal(out.properties.find(p => p.key === 'h')?.label, 'HP');
        assert.equal(out.properties.find(p => p.key === 'h')?.value, 1);
        assert.equal(out.properties.find(p => p.key === 'a')?.label, 'ATK');
        assert.equal(out.properties.find(p => p.key === 'a')?.value, 2);
        assert.equal(typeof out.image.description, 'string');
    }

    {
        const proc = spawn(process.execPath, [path.join(root, 'dist', 'flavorer', 'cli.js'), '--cert', certPath, '--theme', themePath]);
        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (d) => { stdout += d.toString(); });
        proc.stderr.on('data', (d) => { stderr += d.toString(); });
        const exitCode = await new Promise((resolve) => proc.on('close', resolve));
        assert.equal(exitCode, 0, `flavorer exited with ${exitCode}, stderr=\n${stderr}`);
        var out2 = JSON.parse(stdout);
    }

    // determinism
    assert.deepEqual(out, out2);

    console.log('OK');
}

run().catch((e) => { process.stderr.write(`${e?.message ?? e}\n`); process.exitCode = 1; });


