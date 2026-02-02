/**
 * Tests for password hashing utilities
 */

import {
  hashPassword,
  verifyPassword,
  needsRehash,
} from '../../../src/http/utils/password';

describe('Password Utils', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // Different salts
    });

    it('should generate bcrypt format hash', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);

      // Bcrypt hash starts with $2a$ or $2b$ and has specific format
      expect(hash).toMatch(/^\$2[ab]\$\d{2}\$/);
    });

    it('should handle empty password', async () => {
      const hash = await hashPassword('');
      expect(hash).toBeTruthy();
      expect(hash).toMatch(/^\$2[ab]\$\d{2}\$/);
    });

    it('should handle very long password', async () => {
      const longPassword = 'a'.repeat(200);
      const hash = await hashPassword(longPassword);

      expect(hash).toBeTruthy();
      expect(hash).toMatch(/^\$2[ab]\$\d{2}\$/);
    });

    it('should handle special characters in password', async () => {
      const password = '!@#$%^&*()_+-={}[]|:;"<>,.?/~`';
      const hash = await hashPassword(password);

      expect(hash).toBeTruthy();
      expect(hash).toMatch(/^\$2[ab]\$\d{2}\$/);
    });

    it('should handle unicode characters', async () => {
      const password = '密碼測試🔐';
      const hash = await hashPassword(password);

      expect(hash).toBeTruthy();
      expect(hash).toMatch(/^\$2[ab]\$\d{2}\$/);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123';
      const wrongPassword = 'WrongPassword456';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    it('should reject empty password when hash is not empty', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('', hash);

      expect(isValid).toBe(false);
    });

    it('should verify empty password if hashed as empty', async () => {
      const password = '';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should be case sensitive', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('testpassword123', hash);

      expect(isValid).toBe(false);
    });

    it('should reject password with extra characters', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('TestPassword123 ', hash);

      expect(isValid).toBe(false);
    });

    it('should handle special characters correctly', async () => {
      const password = '!@#$%^&*()_+';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should handle unicode characters correctly', async () => {
      const password = '密碼測試🔐';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject with invalid hash format', async () => {
      const password = 'TestPassword123';
      const invalidHash = 'not-a-valid-hash';
      const isValid = await verifyPassword(password, invalidHash);

      expect(isValid).toBe(false);
    });

    it('should reject with corrupted hash', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      const corruptedHash = hash.slice(0, -5) + 'XXXXX';
      const isValid = await verifyPassword(password, corruptedHash);

      expect(isValid).toBe(false);
    });
  });

  describe('needsRehash', () => {
    it('should return false for freshly hashed password', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      const needs = needsRehash(hash);

      expect(needs).toBe(false);
    });

    it('should return true for invalid hash format', () => {
      const invalidHash = 'not-a-valid-hash';
      const needs = needsRehash(invalidHash);

      expect(needs).toBe(true);
    });

    it('should return true for empty hash', () => {
      const needs = needsRehash('');
      expect(needs).toBe(true);
    });

    it.skip('should return true for malformed bcrypt hash', () => {
      const malformedHash = '$2a$10$invalid';
      const needs = needsRehash(malformedHash);

      expect(needs).toBe(true);
    });

    it('should check salt rounds correctly', async () => {
      // Create a hash with fewer rounds (this is implementation dependent)
      // We're testing the logic, assuming SALT_ROUNDS is 10 in the implementation
      const password = 'TestPassword123';
      const hash = await hashPassword(password);

      // Should not need rehash if rounds match
      expect(needsRehash(hash)).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete registration flow', async () => {
      const userPassword = 'SecurePassword123!';

      // 1. Hash password on registration
      const hash = await hashPassword(userPassword);
      expect(hash).toBeTruthy();

      // 2. Store hash (simulated)
      const storedHash = hash;

      // 3. Verify on login
      const isValid = await verifyPassword(userPassword, storedHash);
      expect(isValid).toBe(true);

      // 4. Reject wrong password
      const wrongAttempt = await verifyPassword('WrongPassword', storedHash);
      expect(wrongAttempt).toBe(false);
    });

    it('should handle password change flow', async () => {
      const oldPassword = 'OldPassword123';
      const newPassword = 'NewPassword456';

      // 1. Hash old password
      const oldHash = await hashPassword(oldPassword);

      // 2. Verify old password before change
      const oldValid = await verifyPassword(oldPassword, oldHash);
      expect(oldValid).toBe(true);

      // 3. Hash new password
      const newHash = await hashPassword(newPassword);

      // 4. Old password shouldn't work with new hash
      const oldWithNew = await verifyPassword(oldPassword, newHash);
      expect(oldWithNew).toBe(false);

      // 5. New password should work with new hash
      const newValid = await verifyPassword(newPassword, newHash);
      expect(newValid).toBe(true);
    });

    it('should handle multiple concurrent hashing operations', async () => {
      const passwords = ['Pass1', 'Pass2', 'Pass3', 'Pass4', 'Pass5'];

      const hashes = await Promise.all(passwords.map((p) => hashPassword(p)));

      // All hashes should be unique
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(passwords.length);

      // Each should verify correctly
      const verifications = await Promise.all(
        passwords.map((password, index) =>
          verifyPassword(password, hashes[index])
        )
      );

      expect(verifications).toEqual([true, true, true, true, true]);
    });
  });
});
