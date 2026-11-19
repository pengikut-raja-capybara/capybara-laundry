import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { MASTER_CODE_CONFIG } from '../config/master-code.generated';
import {
  APP_PASSWORD_ITERATIONS,
  computeLockoutDurationMs,
  constantTimeEqual,
  derivePbkdf2Hex,
} from './crypto';

const KEY_PASSWORD_HASH = 'candry_pw_hash_v2';
const KEY_PASSWORD_SALT = 'candry_pw_salt_v2';
const KEY_ONBOARDED = 'candry_onboarded_v1';
const KEY_BIOMETRIC_ENABLED = 'candry_biometric_v1';
const KEY_FAILED_ATTEMPTS = 'candry_auth_attempts_v1';
const KEY_LOCK_UNTIL = 'candry_auth_lock_until_v1';
const KEY_SESSION_UNTIL = 'candry_session_until_v1';

// 1-hour unlocked session window so user doesn't have to re-type password constantly
export const SESSION_DURATION_MS = 60 * 60 * 1000;

// Suppress auto-lock temporarily when opening external OS pickers/share sheets
let suppressAutoLockCount = 0;

export function isAutoLockSuppressed(): boolean {
  return suppressAutoLockCount > 0;
}

export async function withAutoLockSuppressed<T>(fn: () => Promise<T>): Promise<T> {
  suppressAutoLockCount++;
  try {
    return await fn();
  } finally {
    // Keep brief delay after returning from OS modal so AppState 'active' settles
    setTimeout(() => {
      suppressAutoLockCount = Math.max(0, suppressAutoLockCount - 1);
    }, 800);
  }
}

async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return await SecureStore.getItemAsync(key);
}

async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

function generateSaltHex(byteLength = 16): string {
  const bytes = Crypto.getRandomBytes(byteLength);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export interface LockoutStatus {
  isLocked: boolean;
  remainingMs: number;
  failedAttempts: number;
}

export async function getLockoutStatus(): Promise<LockoutStatus> {
  const [attemptsRaw, lockUntilRaw] = await Promise.all([
    getSecureItem(KEY_FAILED_ATTEMPTS),
    getSecureItem(KEY_LOCK_UNTIL),
  ]);
  const failedAttempts = parseInt(attemptsRaw || '0', 10) || 0;
  const lockUntil = parseInt(lockUntilRaw || '0', 10) || 0;
  const now = Date.now();
  const remainingMs = Math.max(0, lockUntil - now);
  return {
    isLocked: remainingMs > 0,
    remainingMs,
    failedAttempts,
  };
}

export async function recordFailedAttempt(): Promise<LockoutStatus> {
  const current = await getLockoutStatus();
  const nextAttempts = current.failedAttempts + 1;
  const durationMs = computeLockoutDurationMs(nextAttempts);
  const lockUntil = durationMs > 0 ? Date.now() + durationMs : 0;

  await Promise.all([
    setSecureItem(KEY_FAILED_ATTEMPTS, String(nextAttempts)),
    setSecureItem(KEY_LOCK_UNTIL, String(lockUntil)),
  ]);

  return {
    isLocked: durationMs > 0,
    remainingMs: durationMs,
    failedAttempts: nextAttempts,
  };
}

export async function resetAuthAttempts(): Promise<void> {
  await Promise.all([
    deleteSecureItem(KEY_FAILED_ATTEMPTS),
    deleteSecureItem(KEY_LOCK_UNTIL),
  ]);
}

export async function extendAuthSession(durationMs = SESSION_DURATION_MS): Promise<void> {
  const until = Date.now() + durationMs;
  await setSecureItem(KEY_SESSION_UNTIL, String(until));
}

export async function clearAuthSession(): Promise<void> {
  await deleteSecureItem(KEY_SESSION_UNTIL);
}

export async function isAuthSessionValid(): Promise<boolean> {
  const raw = await getSecureItem(KEY_SESSION_UNTIL);
  if (!raw) return false;
  const until = parseInt(raw, 10) || 0;
  return Date.now() < until;
}

/**
 * Clears all stored credentials and onboarding flags in SecureStore
 * so the app returns to the initial Welcome / Onboarding screen.
 */
export async function clearAllSecurityData(): Promise<void> {
  await deleteSecureItem(KEY_PASSWORD_HASH);
  await deleteSecureItem(KEY_PASSWORD_SALT);
  await deleteSecureItem(KEY_ONBOARDED);
  await deleteSecureItem(KEY_BIOMETRIC_ENABLED);
  await deleteSecureItem(KEY_SESSION_UNTIL);
  await resetAuthAttempts();
}

export async function isAppOnboarded(): Promise<boolean> {
  const [onboarded, hashV2] = await Promise.all([
    getSecureItem(KEY_ONBOARDED),
    getSecureItem(KEY_PASSWORD_HASH),
  ]);
  return onboarded === 'true' && Boolean(hashV2);
}

export async function setupAppPassword(password: string): Promise<void> {
  const clean = password.trim();
  const saltHex = generateSaltHex(16);
  const hashHex = await derivePbkdf2Hex(clean, saltHex, APP_PASSWORD_ITERATIONS);
  // Sequential SecureStore writes avoid Android Keystore lock contention
  await setSecureItem(KEY_PASSWORD_SALT, saltHex);
  await setSecureItem(KEY_PASSWORD_HASH, hashHex);
  await setSecureItem(KEY_ONBOARDED, 'true');
  await resetAuthAttempts();
  await extendAuthSession();
}

export async function verifyAppPassword(password: string): Promise<{
  ok: boolean;
  lockout: LockoutStatus;
}> {
  const status = await getLockoutStatus();
  if (status.isLocked) {
    return { ok: false, lockout: status };
  }

  const saltHex = await getSecureItem(KEY_PASSWORD_SALT);
  const storedHashHex = await getSecureItem(KEY_PASSWORD_HASH);
  if (!saltHex || !storedHashHex) {
    return { ok: false, lockout: status };
  }

  const candidateHex = await derivePbkdf2Hex(
    password.trim(),
    saltHex,
    APP_PASSWORD_ITERATIONS
  );

  if (constantTimeEqual(candidateHex, storedHashHex)) {
    await resetAuthAttempts();
    await extendAuthSession();
    return {
      ok: true,
      lockout: { isLocked: false, remainingMs: 0, failedAttempts: 0 },
    };
  }

  const nextLockout = await recordFailedAttempt();
  return { ok: false, lockout: nextLockout };
}

export function isMasterCodeConfigured(): boolean {
  return (
    MASTER_CODE_CONFIG.isConfigured &&
    Boolean(MASTER_CODE_CONFIG.saltHex) &&
    Boolean(MASTER_CODE_CONFIG.hashHex)
  );
}

/**
 * Verifies the owner's static master recovery phrase against the PBKDF2-SHA256
 * hash generated by `scripts/set-master-code.mjs`. Subject to the same rate limiting.
 */
export async function verifyMasterResetCode(code: string): Promise<{
  ok: boolean;
  lockout: LockoutStatus;
  notConfigured?: boolean;
}> {
  const status = await getLockoutStatus();
  if (status.isLocked) {
    return { ok: false, lockout: status };
  }

  if (!isMasterCodeConfigured()) {
    return { ok: false, lockout: status, notConfigured: true };
  }

  const trimmed = code.trim();
  if (!trimmed) {
    const nextLockout = await recordFailedAttempt();
    return { ok: false, lockout: nextLockout };
  }

  const candidateHex = await derivePbkdf2Hex(
    trimmed,
    MASTER_CODE_CONFIG.saltHex,
    MASTER_CODE_CONFIG.iterations
  );

  if (constantTimeEqual(candidateHex, MASTER_CODE_CONFIG.hashHex)) {
    await resetAuthAttempts();
    return {
      ok: true,
      lockout: { isLocked: false, remainingMs: 0, failedAttempts: 0 },
    };
  }

  const nextLockout = await recordFailedAttempt();
  return { ok: false, lockout: nextLockout };
}

export async function resetPasswordWithMasterCode(
  masterCode: string,
  newPassword: string
): Promise<{ ok: boolean; lockout: LockoutStatus; notConfigured?: boolean }> {
  const check = await verifyMasterResetCode(masterCode);
  if (!check.ok) {
    return check;
  }
  await setupAppPassword(newPassword);
  return {
    ok: true,
    lockout: { isLocked: false, remainingMs: 0, failedAttempts: 0 },
  };
}

export async function isBiometricEnabled(): Promise<boolean> {
  const val = await getSecureItem(KEY_BIOMETRIC_ENABLED);
  return val === 'true';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await setSecureItem(KEY_BIOMETRIC_ENABLED, enabled ? 'true' : 'false');
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  return await withAutoLockSuppressed(async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) return false;
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Buka kunci CaNdry',
        cancelLabel: 'Gunakan Kata Sandi',
        fallbackLabel: 'Gunakan Kata Sandi',
      });
      if (res.success) {
        await extendAuthSession();
      }
      return res.success;
    } catch {
      return false;
    }
  });
}
