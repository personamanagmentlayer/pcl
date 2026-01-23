/**
 * Authentication middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type JWTPayload } from '../utils/jwt.js';
import { sendUnauthorized, sendForbidden } from '../utils/response.js';

/**
 * Extend Express Request to include user payload
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Middleware to authenticate requests using JWT
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    sendUnauthorized(res, 'No authentication token provided');
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Token expired') {
        sendUnauthorized(res, 'Authentication token expired');
        return;
      }
      if (error.message === 'Invalid token') {
        sendUnauthorized(res, 'Invalid authentication token');
        return;
      }
    }
    sendUnauthorized(res, 'Authentication failed');
  }
}

/**
 * Middleware to check if user has required role(s)
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res, 'Authentication required');
      return;
    }

    const hasRole = roles.some((role) => req.user!.roles.includes(role));
    if (!hasRole) {
      sendForbidden(res, 'Insufficient permissions');
      return;
    }

    next();
  };
}

/**
 * Middleware to check if user has ALL required roles
 */
export function requireAllRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res, 'Authentication required');
      return;
    }

    const hasAllRoles = roles.every((role) => req.user!.roles.includes(role));
    if (!hasAllRoles) {
      sendForbidden(res, 'Insufficient permissions');
      return;
    }

    next();
  };
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 * Useful for endpoints that work differently for authenticated users
 */
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    // No token provided, continue without user
    next();
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    // Invalid token, continue without user
    next();
  }
}
