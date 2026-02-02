/**
 * JWT token utilities
 */

import crypto from 'crypto';
import jwt, { type Secret } from 'jsonwebtoken';

/**
 * JWT payload structure
 */
export interface JWTPayload {
  /** User ID */
  sub: string;
  /** Username */
  username: string;
  /** Email */
  email: string;
  /** User roles */
  roles: string[];
  /** JWT ID (unique identifier) */
  jti?: string;
  /** Issued at (seconds) */
  iat?: number;
  /** Expiration time (seconds) */
  exp?: number;
}

/**
 * JWT configuration
 */
export interface JWTConfig {
  /** Secret key for signing tokens */
  secret: string;
  /** Token expiration (e.g., "24h", "7d") */
  expiresIn: string;
  /** Refresh token expiration */
  refreshExpiresIn: string;
}

/**
 * Get JWT configuration from environment
 */
export function getJWTConfig(): JWTConfig {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production';

  if (
    process.env.NODE_ENV === 'production' &&
    secret === 'dev-secret-change-in-production'
  ) {
    throw new Error('JWT_SECRET must be set in production environment');
  }

  return {
    secret,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  };
}

/**
 * Generate unique JWT ID
 */
function generateJTI(): string {
  return `${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * Sign a JWT token
 */
export function signToken(
  payload: Omit<JWTPayload, 'iat' | 'exp' | 'jti'>,
  config?: Partial<JWTConfig>
): string {
  const jwtConfig = getJWTConfig();
  const secret = config?.secret || jwtConfig.secret;
  const expiresIn = config?.expiresIn || jwtConfig.expiresIn;

  // @ts-expect-error - jwt.sign overload resolution issue with Secret type
  return jwt.sign({ ...payload, jti: generateJTI() }, secret as Secret, {
    expiresIn,
  });
}

/**
 * Sign a refresh token
 */
export function signRefreshToken(
  payload: Omit<JWTPayload, 'iat' | 'exp' | 'jti'>,
  config?: Partial<JWTConfig>
): string {
  const jwtConfig = getJWTConfig();
  const secret = config?.secret || jwtConfig.secret;
  const expiresIn = config?.refreshExpiresIn || jwtConfig.refreshExpiresIn;

  // @ts-expect-error - jwt.sign overload resolution issue with Secret type
  return jwt.sign({ ...payload, jti: generateJTI() }, secret as Secret, {
    expiresIn,
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(
  token: string,
  config?: Partial<JWTConfig>
): JWTPayload {
  const jwtConfig = getJWTConfig();

  try {
    const decoded = jwt.verify(token, config?.secret || jwtConfig.secret);
    return decoded as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Decode a JWT token without verification (for debugging)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token);
    return decoded as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Get token expiration time in seconds
 */
export function getTokenExpirationSeconds(expiresIn: string): number {
  // Parse strings like "24h", "7d", "30m"
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid expiration format: ${expiresIn}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 60 * 60 * 24;
    default:
      throw new Error(`Invalid time unit: ${unit}`);
  }
}
