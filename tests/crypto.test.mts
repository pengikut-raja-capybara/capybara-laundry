import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import {
  computeLockoutDurationMs,
  constantTimeEqual,
  derivePbkdf2Hex,
} from '../src/lib/crypto.ts';

test('derivePbkdf2Hex matches Node crypto.pbkdf2Sync output', async () => {
  const secret = 'frasa-rahasia-uji-coba-123';
  const saltHex = '00112233445566778899aabbccddeeff';
  const iterations = 1000;

  const nobleHex = await derivePbkdf2Hex(secret, saltHex, iterations);
  const nodeHex = crypto
    .pbkdf2Sync(Buffer.from(secret, 'utf8'), Buffer.from(saltHex, 'hex'), iterations, 32, 'sha256')
    .toString('hex');

  assert.equal(nobleHex, nodeHex);
});

test('constantTimeEqual verifies identical and different strings', () => {
  assert.equal(constantTimeEqual('abc123', 'abc123'), true);
  assert.equal(constantTimeEqual('abc123', 'abc124'), false);
  assert.equal(constantTimeEqual('abc', 'abcd'), false);
});

test('computeLockoutDurationMs applies progressive backoff from 5th attempt', () => {
  assert.equal(computeLockoutDurationMs(0), 0);
  assert.equal(computeLockoutDurationMs(4), 0);
  assert.equal(computeLockoutDurationMs(5), 30_000);
  assert.equal(computeLockoutDurationMs(6), 60_000);
  assert.equal(computeLockoutDurationMs(7), 120_000);
  assert.equal(computeLockoutDurationMs(8), 240_000);
  assert.equal(computeLockoutDurationMs(9), 300_000);
  assert.equal(computeLockoutDurationMs(20), 300_000);
});
