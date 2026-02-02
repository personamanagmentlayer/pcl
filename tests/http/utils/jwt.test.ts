/**
 * Tests for JWT token utilities
 */

import {
  signToken,
  signRefreshToken,
  verifyToken,
  decodeToken,
  getTokenExpirationSeconds,
  getJWTConfig,
  type JWTPayload,
  type JWTConfig,
} from '../../../src/http/utils/jwt';

describe('JWT Utils', () => {
  // Sample payload for testing
  const samplePayload: Omit<JWTPayload, 'iat' | 'exp' | 'jti'> = {
    sub: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    roles: ['user', 'admin'],
  };

  const testConfig: JWTConfig = {
    secret: 'test-secret-key-for-jwt',
    expiresIn: '1h',
    refreshExpiresIn: '7d',
  };

  beforeEach(() => {
    // Reset environment variables
    delete process.env.JWT_SECRET;
    delete process.env.JWT_EXPIRES_IN;
    delete process.env.JWT_REFRESH_EXPIRES_IN;
    delete process.env.NODE_ENV;
  });

  describe('getJWTConfig', () => {
    it('should return default config in development mode', () => {
      const config = getJWTConfig();
      expect(config.secret).toBe('dev-secret-change-in-production');
      expect(config.expiresIn).toBe('24h');
      expect(config.refreshExpiresIn).toBe('30d');
    });

    it('should use environment variables when provided', () => {
      process.env.JWT_SECRET = 'custom-secret';
      process.env.JWT_EXPIRES_IN = '2h';
      process.env.JWT_REFRESH_EXPIRES_IN = '14d';

      const config = getJWTConfig();
      expect(config.secret).toBe('custom-secret');
      expect(config.expiresIn).toBe('2h');
      expect(config.refreshExpiresIn).toBe('14d');
    });

    it('should throw error in production without JWT_SECRET', () => {
      process.env.NODE_ENV = 'production';

      expect(() => getJWTConfig()).toThrow(
        'JWT_SECRET must be set in production environment'
      );
    });

    it('should allow custom secret in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'production-secret';

      const config = getJWTConfig();
      expect(config.secret).toBe('production-secret');
    });
  });

  describe('signToken', () => {
    it('should generate a valid JWT token', () => {
      const token = signToken(samplePayload, testConfig);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include all payload fields in token', () => {
      const token = signToken(samplePayload, testConfig);
      const decoded = decodeToken(token);

      expect(decoded).toBeTruthy();
      expect(decoded?.sub).toBe(samplePayload.sub);
      expect(decoded?.username).toBe(samplePayload.username);
      expect(decoded?.email).toBe(samplePayload.email);
      expect(decoded?.roles).toEqual(samplePayload.roles);
    });

    it('should add jti (JWT ID) to payload', () => {
      const token = signToken(samplePayload, testConfig);
      const decoded = decodeToken(token);

      expect(decoded?.jti).toBeTruthy();
      expect(typeof decoded?.jti).toBe('string');
    });

    it('should add iat (issued at) timestamp', () => {
      const token = signToken(samplePayload, testConfig);
      const decoded = decodeToken(token);

      expect(decoded?.iat).toBeTruthy();
      expect(typeof decoded?.iat).toBe('number');
      expect(decoded?.iat).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
    });

    it('should add exp (expiration) timestamp', () => {
      const token = signToken(samplePayload, testConfig);
      const decoded = decodeToken(token);

      expect(decoded?.exp).toBeTruthy();
      expect(typeof decoded?.exp).toBe('number');
      expect(decoded?.exp).toBeGreaterThan(decoded?.iat!);
    });

    it('should generate unique JTI for different tokens', () => {
      const token1 = signToken(samplePayload, testConfig);
      const token2 = signToken(samplePayload, testConfig);

      const decoded1 = decodeToken(token1);
      const decoded2 = decodeToken(token2);

      expect(decoded1?.jti).not.toBe(decoded2?.jti);
    });

    it('should use default config if not provided', () => {
      process.env.JWT_SECRET = 'env-secret';
      const token = signToken(samplePayload);

      expect(token).toBeTruthy();
      const decoded = decodeToken(token);
      expect(decoded?.sub).toBe(samplePayload.sub);
    });
  });

  describe('signRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = signRefreshToken(samplePayload, testConfig);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should use refreshExpiresIn from config', () => {
      const shortConfig = { ...testConfig, refreshExpiresIn: '1m' };
      const token = signRefreshToken(samplePayload, shortConfig);
      const decoded = decodeToken(token);

      expect(decoded?.exp).toBeTruthy();
      // Refresh token should expire soon (within 2 minutes)
      const now = Math.floor(Date.now() / 1000);
      expect(decoded?.exp).toBeLessThan(now + 120);
    });

    it('should include same payload as access token', () => {
      const accessToken = signToken(samplePayload, testConfig);
      const refreshToken = signRefreshToken(samplePayload, testConfig);

      const decodedAccess = decodeToken(accessToken);
      const decodedRefresh = decodeToken(refreshToken);

      expect(decodedRefresh?.sub).toBe(decodedAccess?.sub);
      expect(decodedRefresh?.username).toBe(decodedAccess?.username);
      expect(decodedRefresh?.email).toBe(decodedAccess?.email);
      expect(decodedRefresh?.roles).toEqual(decodedAccess?.roles);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const token = signToken(samplePayload, testConfig);
      const verified = verifyToken(token, testConfig);

      expect(verified).toBeTruthy();
      expect(verified.sub).toBe(samplePayload.sub);
      expect(verified.username).toBe(samplePayload.username);
      expect(verified.email).toBe(samplePayload.email);
      expect(verified.roles).toEqual(samplePayload.roles);
    });

    it('should include jti in verified payload', () => {
      const token = signToken(samplePayload, testConfig);
      const verified = verifyToken(token, testConfig);

      expect(verified.jti).toBeTruthy();
    });

    it('should throw error for expired token', () => {
      const expiredConfig = { ...testConfig, expiresIn: '0s' };
      const token = signToken(samplePayload, expiredConfig);

      // Wait a tiny bit to ensure expiration
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(() => verifyToken(token, testConfig)).toThrow('Token expired');
          resolve();
        }, 10);
      });
    });

    it('should throw error for invalid signature', () => {
      const token = signToken(samplePayload, testConfig);
      const wrongConfig = { ...testConfig, secret: 'wrong-secret' };

      expect(() => verifyToken(token, wrongConfig)).toThrow('Invalid token');
    });

    it('should throw error for malformed token', () => {
      expect(() => verifyToken('not.a.valid.token', testConfig)).toThrow(
        'Invalid token'
      );
    });

    it('should throw error for tampered token', () => {
      const token = signToken(samplePayload, testConfig);
      const parts = token.split('.');
      parts[1] = parts[1].slice(0, -5) + 'XXXXX'; // Tamper with payload
      const tamperedToken = parts.join('.');

      // Tampering can cause either JSON parsing errors or invalid token errors
      expect(() => verifyToken(tamperedToken, testConfig)).toThrow();
    });

    it('should throw error for empty token', () => {
      expect(() => verifyToken('', testConfig)).toThrow('Invalid token');
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = signToken(samplePayload, testConfig);
      const decoded = decodeToken(token);

      expect(decoded).toBeTruthy();
      expect(decoded?.sub).toBe(samplePayload.sub);
      expect(decoded?.username).toBe(samplePayload.username);
    });

    it('should decode expired token', () => {
      const expiredConfig = { ...testConfig, expiresIn: '0s' };
      const token = signToken(samplePayload, expiredConfig);

      // Decode should work even if expired
      const decoded = decodeToken(token);
      expect(decoded).toBeTruthy();
      expect(decoded?.sub).toBe(samplePayload.sub);
    });

    it('should decode tampered token (no signature check)', () => {
      const token = signToken(samplePayload, testConfig);
      const parts = token.split('.');
      // Tamper with signature only
      parts[2] = parts[2].slice(0, -5) + 'XXXXX';
      const tamperedToken = parts.join('.');

      const decoded = decodeToken(tamperedToken);
      expect(decoded).toBeTruthy();
      expect(decoded?.sub).toBe(samplePayload.sub);
    });

    it('should return null for malformed token', () => {
      const decoded = decodeToken('not-a-valid-token');
      expect(decoded).toBeNull();
    });

    it('should return null for empty token', () => {
      const decoded = decodeToken('');
      expect(decoded).toBeNull();
    });
  });

  describe('getTokenExpirationSeconds', () => {
    it('should parse seconds format', () => {
      expect(getTokenExpirationSeconds('30s')).toBe(30);
      expect(getTokenExpirationSeconds('60s')).toBe(60);
      expect(getTokenExpirationSeconds('1s')).toBe(1);
    });

    it('should parse minutes format', () => {
      expect(getTokenExpirationSeconds('1m')).toBe(60);
      expect(getTokenExpirationSeconds('5m')).toBe(300);
      expect(getTokenExpirationSeconds('30m')).toBe(1800);
    });

    it('should parse hours format', () => {
      expect(getTokenExpirationSeconds('1h')).toBe(3600);
      expect(getTokenExpirationSeconds('24h')).toBe(86400);
      expect(getTokenExpirationSeconds('2h')).toBe(7200);
    });

    it('should parse days format', () => {
      expect(getTokenExpirationSeconds('1d')).toBe(86400);
      expect(getTokenExpirationSeconds('7d')).toBe(604800);
      expect(getTokenExpirationSeconds('30d')).toBe(2592000);
    });

    it('should throw error for invalid format', () => {
      expect(() => getTokenExpirationSeconds('invalid')).toThrow(
        'Invalid expiration format: invalid'
      );
    });

    it('should throw error for missing unit', () => {
      expect(() => getTokenExpirationSeconds('60')).toThrow(
        'Invalid expiration format: 60'
      );
    });

    it('should throw error for invalid unit', () => {
      expect(() => getTokenExpirationSeconds('60x')).toThrow(
        'Invalid expiration format: 60x'
      );
    });

    it('should throw error for empty string', () => {
      expect(() => getTokenExpirationSeconds('')).toThrow(
        'Invalid expiration format: '
      );
    });
  });
});
