#!/usr/bin/env node
import { loadSeasonConfig } from '../core/index.js';
import { assertCertificate, mineViableCode, type BlindSignRequest, type Certificate } from '../core/index.js';
import { saveFile, postJson } from '../util/index.js';
import { parseArgs } from 'node:util';
import path from 'node:path';

async function mineAndSign(opts: { configPath: string; signerUrl: string; quiet: boolean }): Promise<Certificate> {
  const cfg = await loadSeasonConfig(opts.configPath || path.resolve(process.cwd(), 'config/season.example.json'));
  const signerUrl = new URL(opts.signerUrl || 'http://localhost:8787/sign');

  return new Promise(async (resolve, reject) => {
    const miner = mineViableCode(cfg.mining.gene.alphabet, cfg.mining.gene.length, cfg.mining.viability.suffix, cfg.mining.viability.threshold);

    miner.on('viableCode', async (code, attempts, elapsedMs) => {
      if (!opts.quiet) {
        const dt = elapsedMs / 1000;
        console.error(`found code attempts=${attempts} time=${dt.toFixed(2)}s code=${code}`);
      }

      const cert = await postJson<BlindSignRequest, Certificate>(signerUrl, { version: 1, seasonId: cfg.seasonId, code });
      assertCertificate(cert);
      resolve(cert);
    });

    miner.on('progress', (attempts, elapsedMs, hps) => {
      if (!opts.quiet) console.error(`progress attempts=${attempts} elapsed=${elapsedMs.toFixed(1)}s rate=${hps}/s`);
    });

    miner.on('error', reject);
  });
}

const { values: args } = parseArgs({
  options: {
    config: { type: 'string' },
    'signer-url': { type: 'string' },
    quiet: { type: 'boolean', default: false },
    out: { type: 'string', default: 'stdout' }
  },
  strict: true,
  allowPositionals: false
});

if (!args.config || !args['signer-url']) {
  throw 'Usage: npm run miner -- --config <your-config.json> --signer-url <url> [--quiet] [--out <file>|stdout]';
}

const cert = await mineAndSign({ configPath: args.config, signerUrl: args['signer-url'], quiet: args.quiet });
const json = JSON.stringify(cert, null, 2);
if (args.out === 'stdout') {
  process.stdout.write(json + '\n');
} else {
  const savedPath = await saveFile(args.out, json);
  process.stdout.write(savedPath + '\n');
}
