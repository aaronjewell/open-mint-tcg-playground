import crypto from 'node:crypto';
import { bytesToHex } from './util.js';

export async function sha256Bytes(input: Uint8Array | string): Promise<Uint8Array> {
  if (typeof input === 'string') {
    return sha256(new TextEncoder().encode(input));
  }
  return sha256(input);
}

export async function sha256Hex(input: Uint8Array | string): Promise<string> {
  const bytes = await sha256Bytes(input);
  return bytesToHex(bytes);
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hash = crypto.createHash('sha256');
  hash.update(data);
  const digest = hash.digest();
  return new Uint8Array(digest.buffer, digest.byteOffset, digest.length);
}

