import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Token opaco criptograficamente seguro (256 bits), codificado em base64url. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Hash SHA-256 (hex). Adequado para tokens de alta entropia; a BD guarda apenas este hash. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
