import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';

export const APP_PASSWORD_ITERATIONS = 2500;
export const KEY_LENGTH_BYTES = 32;

/**
 * Constant-time string comparison to avoid timing side-channels.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Derives a PBKDF2-SHA256 hex digest from a UTF-8 secret and hex-encoded salt.
 */
export async function derivePbkdf2Hex(
  secret: string,
  saltHex: string,
  iterations: number = APP_PASSWORD_ITERATIONS
): Promise<string> {
  // Yield one microtask/frame so loading UI renders before hashing
  await new Promise((resolve) => setTimeout(resolve, 16));
  const passwordBytes = utf8ToBytes(secret);
  const saltBytes = hexToBytes(saltHex);
  const derived = pbkdf2(sha256, passwordBytes, saltBytes, {
    c: iterations,
    dkLen: KEY_LENGTH_BYTES,
  });
  return bytesToHex(derived);
}

/**
 * Progressive lockout backoff after repeated failed authentication attempts.
 * 1-4 failures: no lockout (0 ms).
 * 5th failure: 30 seconds.
 * 6th failure: 60 seconds.
 * 7th failure: 120 seconds.
 * 8th+ failure: 300 seconds (5 minutes cap).
 */
export function computeLockoutDurationMs(failedAttempts: number): number {
  if (failedAttempts < 5) return 0;
  const exponent = Math.min(failedAttempts - 5, 4);
  const seconds = Math.min(30 * Math.pow(2, exponent), 300);
  return seconds * 1000;
}
