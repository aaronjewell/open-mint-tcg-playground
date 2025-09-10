import { sha256Bytes, sha256Hex } from './crypto.js';
import { bytesToHex, bytesToBase64, countChar, concatBytes, encodeUtf8, u8, u16be, u32be } from './util.js';
import { Certificate, Code, SeasonConfig, PropertiesFromCodeSpec, MiningEvents } from './types.js';
import EventEmitter from 'node:events';
import { readJson } from '../util/file.js';

function* randomCharStream(alphabet: string, length: number): Generator<string, never, never> {
  const chars = alphabet.split('');
  while (true) {
    let s = '';
    for (let i = 0; i < length; i++) s += chars[Math.floor(Math.random() * chars.length)];
    yield s;
  }
}

interface SimpleStrategy {
  checkViability(code: string): Promise<boolean>;
}

function createSimpleViabilityStrategy(viabilitySuffix: string, threshold: number): SimpleStrategy {
  return {
    async checkViability(code: string): Promise<boolean> {
      const v = await sha256Hex(code + viabilitySuffix);
      const z = countChar(v, '0');
      return z >= threshold;
    }
  };
}

export function mineViableCode(alphabet: string, length: number, viabilitySuffix: string, threshold: number, opts?: { signal?: AbortSignal }): EventEmitter<MiningEvents> {
  const strategy = createSimpleViabilityStrategy(viabilitySuffix, threshold);
  return mineWithStrategy(alphabet, length, strategy, opts);
}

export function mineWithStrategy(alphabet: string, length: number, strategy: any, opts?: { signal?: AbortSignal }): EventEmitter<MiningEvents> {
  const emitter = new EventEmitter<MiningEvents>();
  const start = Date.now();
  const iter = randomCharStream(alphabet, length);
  const BATCH_SIZE = 10000;

  let attempts = 0;
  let aborted = opts?.signal?.aborted || false;

  const onAbort = () => {
    aborted = true;
    const dt = (Date.now() - start) / 1000;
    const hps = (attempts / dt).toFixed(1);
    emitter.emit('progress', attempts, dt, hps);
  }
  opts?.signal?.addEventListener('abort', onAbort, { once: true });

  const step = async () => {
    try {
      for (let i = 0; i < BATCH_SIZE && !aborted; i++) {
        const code = iter.next().value;
        attempts++;
        
        if (await strategy.checkViability(code)) {
          emitter.emit('viableCode', code, attempts, Date.now() - start);
          return;
        }
      }

      if (!aborted) {
        const dt = (Date.now() - start) / 1000;
        const hps = (attempts / dt).toFixed(1);
        emitter.emit('progress', attempts, dt, hps);
        setImmediate(step);
      }
    } catch (e: any) {
      emitter.emit('error', e?.message || String(e));
    }
  };

  setImmediate(step);

  return emitter;
}

export function validateCode(code: string, gene: { alphabet: string; length: number }): asserts code is Code {
  if (code.length !== gene.length) throw new Error('Invalid code length');
  const allowed = new Set(gene.alphabet.split(''));
  for (const ch of code) if (!allowed.has(ch)) throw new Error('Invalid code characters');
}

export async function computeZeros(code: Code, suffix: string): Promise<number>{
  const hex = await sha256Hex(code + suffix);
  return countChar(hex, '0');
}

export async function buildSeed(code: string): Promise<Uint8Array> {
  return sha256Bytes(code);
}

export async function propertiesFromCode(code: string, spec: PropertiesFromCodeSpec): Promise<Certificate['properties']> {
  const out: Certificate['properties'] = {};
  // Only method supported in v0: zeros-in-hex-div2-cap10
  const promises = spec.rules.map(async (r) => {
    const zeros = await computeZeros(code, r.suffix);
    const val = Math.max(Math.min(Math.floor(zeros / 2), 10), 0);
    out[r.key] = val;
  });
  return Promise.all(promises).then(() => out);
}

export interface DigestParts {
  version: number; // certificate version
  seasonId: number;
  mode: 'BLIND';
  code: string;
  geneLen: number;
  viabilityThreshold: number;
  viabilityZeros: number;
  seed: Uint8Array; // 32 bytes
  properties: Certificate['properties'];
}

export async function buildCanonicalDigest(parts: DigestParts): Promise<Uint8Array> {
  // propertyBytes = count(u8) || repeated ( keyLen(u8) || key(UTF-8) || value(u16, BE) )
  const propertyEntries = Object.entries(parts.properties);
  propertyEntries.sort((a, b) => b[0].localeCompare(a[0]));
  const propertyBytes: Uint8Array[] = [u8(propertyEntries.length)];
  for (const [key, value] of propertyEntries) {
    const keyBytes = encodeUtf8(key);
    propertyBytes.push(u8(keyBytes.length));
    propertyBytes.push(keyBytes);
    propertyBytes.push(u16be(value));
  }
  const preimage = concatBytes(
    encodeUtf8('OMT-CERT\0'),
    u8(parts.version),
    u32be(parts.seasonId),
    encodeUtf8(parts.mode),
    u8(parts.geneLen),
    encodeUtf8(parts.code),
    u8(parts.viabilityThreshold),
    u8(parts.viabilityZeros),
    parts.seed,
    concatBytes(...propertyBytes)
  );
  return sha256Bytes(preimage);
}

export async function buildCertificate(data: {
  version: Certificate['v'],
  seasonId: Certificate['seasonId'],
  code: Certificate['code'],
  seed: Uint8Array,
  viabilityZeros: Certificate['mining']['viabilityZeros'],
  cfg: SeasonConfig,
  properties: Certificate['properties'],
  signature: Uint8Array,
}): Promise<Certificate> {
  return {
    v: data.version,
    seasonId: data.seasonId,
    mining: { mode: data.cfg.mining.mode, viabilityZeros: data.viabilityZeros, threshold: data.cfg.mining.viability.threshold },
    code: data.code,
    seedHex: bytesToHex(data.seed),
    properties: data.properties,
    signatureB64: bytesToBase64(data.signature)
  };
}

export function assertCertificate(cert: any): asserts cert is Certificate {
  if (cert.v !== 1 || cert.seasonId !== 1) {
    throw new Error('Invalid certificate');
  }
}

function assertSeasonConfig(cfg: any): asserts cfg is SeasonConfig {
  if (cfg.schemaVersion !== 1 || cfg.seasonId !== 1 || cfg.propertiesFromCode === undefined) {
    throw new Error('Invalid season config');
  }
}

export async function loadSeasonConfig(absOrRelPath: string): Promise<SeasonConfig> {
  const cfg = await readJson(absOrRelPath);
  assertSeasonConfig(cfg);
  return cfg;
}
