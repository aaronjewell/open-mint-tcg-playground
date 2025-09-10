#!/usr/bin/env node
import { loadSeasonConfig } from '../core/index.js';
import { assertCertificate, mineWithStrategy, type BlindSignRequest, type Certificate } from '../core/index.js';
import { saveFile, postJson } from '../util/index.js';
import { createStrategy } from './strategies.js';
import { parseArgs } from 'node:util';
import path from 'node:path';

async function mineAndSign(opts: { 
  configPath: string; 
  signerUrl: string; 
  quiet: boolean; 
  strategy: string;
  showProgram: boolean;
}): Promise<Certificate> {
  const cfg = await loadSeasonConfig(opts.configPath || path.resolve(process.cwd(), 'config/season.example.json'));
  const signerUrl = new URL(opts.signerUrl || 'http://localhost:8787/sign');

  return new Promise(async (resolve, reject) => {
    let miner;
    
    // Use strategy-based miner
    const strategy = createStrategy(opts.strategy, cfg);
    miner = mineWithStrategy(cfg.mining.gene.alphabet, cfg.mining.gene.length, strategy);

    miner.on('viableCode', async (code: string, attempts: number, elapsedMs: number) => {
      if (!opts.quiet) {
        const dt = elapsedMs / 1000;
        console.error(`found code attempts=${attempts} time=${dt.toFixed(2)}s code=${code} strategy=${opts.strategy}`);
        
        // Show program details if requested
        if (opts.showProgram && opts.strategy !== 'basic') {
          const strategy = createStrategy(opts.strategy, cfg);
          const program = await strategy.buildProgram(code);
          
          const details = strategy.showDetails(program);
          if (details) {
            console.error(details);
          }
        }
      }

      const cert = await postJson<BlindSignRequest, Certificate>(signerUrl, { version: 1, seasonId: cfg.seasonId, code });
      assertCertificate(cert);
      resolve(cert);
    });

    miner.on('progress', (attempts: number, elapsedMs: number, hps: string) => {
      // if (!opts.quiet) console.error(`progress attempts=${attempts} elapsed=${elapsedMs.toFixed(1)}s rate=${hps}/s strategy=${opts.strategy}`);
    });

    miner.on('error', reject);
  });
}

const { values: args } = parseArgs({
  options: {
    config: { type: 'string' },
    'signer-url': { type: 'string' },
    quiet: { type: 'boolean', default: false },
    out: { type: 'string', default: 'stdout' },
    strategy: { type: 'string', default: 'basic' },
    'show-program': { type: 'boolean', default: false }
  },
  strict: true,
  allowPositionals: false
});

if (!args.config || !args['signer-url']) {
  throw 'Usage: npm run miner -- --config <your-config.json> --signer-url <url> [--quiet] [--out <file>|stdout] [--strategy basic|vm|slots] [--show-program]';
}

const cert = await mineAndSign({ 
  configPath: args.config, 
  signerUrl: args['signer-url'], 
  quiet: args.quiet,
  strategy: args.strategy,
  showProgram: args['show-program']
});
const json = JSON.stringify(cert, null, 2);
if (args.out === 'stdout') {
  process.stdout.write(json + '\n');
} else {
  const savedPath = await saveFile(args.out, json);
  process.stdout.write(savedPath + '\n');
}
