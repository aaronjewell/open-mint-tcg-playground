import http from 'node:http';
import {
  buildCanonicalDigest,
  buildCertificate,
  buildSeed,
  computeZeros,
  ed25519Sign,
  loadSeasonConfig,
  propertiesFromCode,
  validateCode,
  type BlindSignRequest,
} from '../core/index.js';
import { readFile } from '../util/file.js';
import { parseArgs as parseNodeArgs } from 'node:util';

async function loadPrivateKeyFromPath(keyPath: string): Promise<string> {
  const hex = (await readFile(keyPath)).trim();
  assertPrivateKeyHex(hex);
  return hex;
}

function assertPrivateKeyHex(key: any): asserts key is string {
  if (typeof key !== 'string') {
    throw new Error('Invalid private key, expected string');
  }
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error('Invalid private key, expected 32 bytes hex');
  }
}

function assertBlindSignRequest(req: any): asserts req is BlindSignRequest {
  if (req.version !== 1 || req.seasonId !== 1 || typeof req.code !== 'string') {
    throw new Error('Invalid blind sign request');
  }
}

const { values } = parseNodeArgs({
  options: {
    config: { type: 'string', default: 'config/season.example.json' },
    key: { type: 'string', default: 'keys/ed25519.sk.hex' },
    port: { type: 'string' }
  },
  strict: true,
  allowPositionals: false
});
const configPath = (values.config as string) || 'config/season.example.json';
const keyPath = (values.key as string) || 'keys/ed25519.sk.hex';
const port = Number((values.port as string | undefined) || 8787);

const cfg = await loadSeasonConfig(configPath);
const privateKey = await loadPrivateKeyFromPath(keyPath);

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/sign') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          assertBlindSignRequest(data);
          if (data.version !== 1) {
            res.writeHead(400); res.end('Unsupported version'); return;
          }
          if (data.seasonId !== cfg.seasonId) { res.writeHead(410); res.end('Season not active'); return; }
          try {
            validateCode(data.code, cfg.mining.gene);
          } catch (e: any) { res.writeHead(400); res.end(e.message); return; }

          const viabilityZeros = await computeZeros(data.code, cfg.mining.viability.suffix);
          if (viabilityZeros < cfg.mining.viability.threshold) { res.writeHead(400); res.end('Code not viable'); return; }

          const seed = await buildSeed(data.code);
          const properties = await propertiesFromCode(data.code, cfg.propertiesFromCode);

          const digest = await buildCanonicalDigest({
            version: data.version,
            seasonId: cfg.seasonId,
            mode: cfg.mining.mode,
            code: data.code,
            geneLen: cfg.mining.gene.length,
            viabilityThreshold: cfg.mining.viability.threshold,
            viabilityZeros,
            seed,
            properties
          });

          const signature = await ed25519Sign(privateKey, digest);

          const cert = await buildCertificate({ version: data.version, seasonId: cfg.seasonId, code: data.code, seed, cfg, viabilityZeros, properties, signature });

          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(cert));
        } catch (err: any) {
          res.writeHead(400);
          res.end(err?.message || 'Bad request');
        }
      });
      return;
    }
    res.writeHead(404); res.end('Not found');
  } catch (err) {
    res.writeHead(500); res.end('Internal error');
  }
});

server.listen(port, () => { console.error(`Signer listening on http://localhost:${port}`) });