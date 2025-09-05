import { assertCertificate, base64ToBytes, bytesToHex, buildCanonicalDigest, buildSeed, computeZeros, ed25519Verify, loadSeasonConfig, validateCode, propertiesFromCode } from '../core/index.js';
import { readJson } from '../util/file.js';
import { parseArgs } from 'node:util';

function usage() { console.error('Usage: omt-verify --cert <certificate.json> [--config <season.json>]'); }

async function main() {
  const { values } = parseArgs({
    options: {
      cert: { type: 'string' },
      config: { type: 'string', default: 'config/season.example.json' }
    },
    strict: true,
    allowPositionals: false
  });
  const certArg = values.cert as string | undefined;
  if (!certArg) { usage(); process.exit(1); }
  const configPath = (values.config as string | undefined) || 'config/season.example.json';
  const cfg = await loadSeasonConfig(configPath);
  const cert = await readJson(certArg);
  assertCertificate(cert);

  if (cert.v !== cfg.schemaVersion) throw new Error('Unsupported cert version');
  if (cert.seasonId !== cfg.seasonId) throw new Error('Season mismatch');

  validateCode(cert.code, cfg.mining.gene);

  const viabilityZeros = await computeZeros(cert.code, cfg.mining.viability.suffix);
  if (viabilityZeros < cfg.mining.viability.threshold) throw new Error('Viability check failed');
  if (viabilityZeros !== cert.mining.viabilityZeros) throw new Error('Viability zeros mismatch');

  const seed = await buildSeed(cert.code);
  if (bytesToHex(seed) !== cert.seedHex) throw new Error('Seed mismatch');

  const properties = await propertiesFromCode(cert.code, cfg.propertiesFromCode);
  const keys = new Set([...Object.keys(properties), ...Object.keys(cert.properties)]);
  for (const k of keys) {
    if (properties[k] !== cert.properties[k]) throw new Error(`Stats mismatch for ${k}`);
  }

  const digest = await buildCanonicalDigest({
    version: cert.v,
    seasonId: cfg.seasonId,
    mode: cfg.mining.mode,
    code: cert.code,
    geneLen: cfg.mining.gene.length,
    viabilityThreshold: cfg.mining.viability.threshold,
    viabilityZeros: viabilityZeros,
    seed,
    properties
  });

  const ok = await ed25519Verify(base64ToBytes(cfg.signing.publicKeyBase64), digest, base64ToBytes(cert.signatureB64));
  if (!ok) throw new Error('Invalid signature');

  process.stdout.write('OK\n');
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
