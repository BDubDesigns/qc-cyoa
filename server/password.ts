/**
 * Temporary password hashing (scrypt via node:crypto).
 *
 * This is a *temporary* implementation that satisfies "don't store plaintext"
 * while we test the auth flow. It will be replaced wholesale when we adopt
 * better-auth; nothing outside this file depends on the scheme. The stored
 * format is self-describing so the swap only replaces these two functions:
 *
 *   scrypt$<salt_hex>$<hash_hex>
 */
import * as crypto from "node:crypto";

const SCRYPT_KEYLEN = 64;
/** A deliberately OWASP-recommended scrypt cost for interactive logins. */
const SCRYPT_N = 16384; // 2^14
const SCRYPT_R = 8;
const SCRYPT_P = 1;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = scrypt(password, salt);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [tag, saltHex, hashHex] = stored.split("$");
  if (tag !== "scrypt" || !saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scrypt(password, salt);
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

function scrypt(password: string, salt: Buffer): Buffer {
  return crypto.scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    // 128 * N * r = 16 MiB minimum; give a bit of headroom so OpenSSL's
    // accounting doesn't trip over its own overhead.
    maxmem: 64 * 1024 * 1024,
  });
}

/** Server-side password policy. Returns an error string, or null when OK. */
export function validatePassword(password: string): string | null {
  if (typeof password !== "string" || password.length < 8) {
    return "password must be at least 8 characters";
  }
  return null;
}

/** Normalize a username for uniqueness checks (trim + lowercase). */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}