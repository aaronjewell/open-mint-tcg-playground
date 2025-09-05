import * as ed from '@noble/ed25519';
import { hexToBytes } from './util.js';

export async function ed25519Sign(privateKeyHex: string, message: Uint8Array): Promise<Uint8Array> {
  return await ed.signAsync(message, hexToBytes(privateKeyHex));
}

export async function ed25519Verify(publicKeyBytes: Uint8Array, message: Uint8Array, signature: Uint8Array): Promise<boolean> {
  return await ed.verifyAsync(signature, message, publicKeyBytes);
}
