/**
 * Password hashing and verification utilities
 */

import bcrypt from 'bcrypt';

/**
 * Salt rounds for bcrypt (higher = more secure but slower)
 * 10 rounds is a good balance for most applications
 */
const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Check if a hash needs to be rehashed (if salt rounds changed)
 */
export function needsRehash(hash: string): boolean {
  try {
    const rounds = bcrypt.getRounds(hash);
    return rounds < SALT_ROUNDS;
  } catch {
    return true; // Invalid hash, needs rehash
  }
}
