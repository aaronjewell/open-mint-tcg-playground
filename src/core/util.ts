import * as ed from '@noble/ed25519';

export function base64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

export function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

export function bytesToHex(bytes: Uint8Array): string {
  return ed.etc.bytesToHex(bytes);
}

export function hexToBytes(hex: string): Uint8Array {
  return ed.etc.hexToBytes(hex);
}

export function countChar(str: string, ch: string): number {
  let c = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === ch) c++;
  }
  return c;
}

export function encodeUtf8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

export function u8(value: number): Uint8Array {
  if (value < 0 || value > 0xff) throw new Error('u8 out of range');
  return Uint8Array.of(value & 0xff);
}

export function u16be(value: number): Uint8Array {
  if (value < 0 || value > 0xffff) throw new Error('u16 out of range');
  return Uint8Array.of((value >>> 8) & 0xff, value & 0xff);
}

export function u32be(value: number): Uint8Array {
  if (value < 0 || value > 0xffffffff) throw new Error('u32 out of range');
  return Uint8Array.of((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}


