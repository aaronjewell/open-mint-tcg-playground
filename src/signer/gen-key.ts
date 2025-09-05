import fs from 'node:fs';
import path from 'node:path';
import * as ed from '@noble/ed25519';
import { parseArgs } from 'node:util';

async function main() {
  const { values: args } = parseArgs({
    options: {
      out: { type: 'string', default: 'stdout' }
    },
    strict: true,
    allowPositionals: false
  });

  const { secretKey, publicKey } = await ed.keygenAsync()

  const skHex = Buffer.from(secretKey).toString('hex');
  const pkB64 = Buffer.from(publicKey).toString('base64');

  console.log(`ED25519_SK_HEX=${skHex}`);
  console.log(`PUBLIC_KEY_BASE64=${pkB64}`);

  if (args.out === 'stdout') {
    process.stdout.write(`ED25519_SK_HEX=${skHex}\n`);
    process.stdout.write(`PUBLIC_KEY_BASE64=${pkB64}\n`);
  } else {
    const dir = path.resolve(args.out);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'ed25519.sk.hex'), skHex + '\n');
    fs.writeFileSync(path.join(dir, 'ed25519.pk.b64'), pkB64 + '\n');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });


