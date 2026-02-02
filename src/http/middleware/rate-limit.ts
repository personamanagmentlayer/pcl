/**
 * Rate limiting middleware
 */

import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

// No-op middleware for test environment
const noopMiddleware = (_req: Request, _res: Response, next: NextFunction) => {
  next();
};

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const apiLimiter =
  process.env.NODE_ENV === 'test'
    ? noopMiddleware
    : rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        message: {
          success: false,
          error: 'Too many requests from this IP, please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        // Store is default (memory store)
      });

/**
 * Authentication rate limiter
 * 5 requests per 15 minutes per IP (stricter for login/register)
 */
export const authLimiter =
  process.env.NODE_ENV === 'test'
    ? noopMiddleware
    : rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // Limit each IP to 5 requests per windowMs
        message: {
          success: false,
          error:
            'Too many authentication attempts from this IP, please try again later.',
          code: 'AUTH_RATE_LIMIT_EXCEEDED',
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: false, // Count all requests
      });

/**
 * Search rate limiter
 * 30 requests per minute per IP
 */
export const searchLimiter =
  process.env.NODE_ENV === 'test'
    ? noopMiddleware
    : rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 30, // Limit each IP to 30 requests per minute
        message: {
          success: false,
          error: 'Too many search requests, please slow down.',
          code: 'SEARCH_RATE_LIMIT_EXCEEDED',
        },
        standardHeaders: true,
        legacyHeaders: false,
      });

/**
 * Download rate limiter
 * 50 downloads per hour per IP
 */
export const downloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 downloads per hour
  message: {
    success: false,
    error: 'Too many download requests, please try again later.',
    code: 'DOWNLOAD_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Creation rate limiter
 * 10 creates per hour per IP (for authenticated artifact/version creation)
 */
export const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 creates per hour
  message: {
    success: false,
    error: 'Too many create requests, please try again later.',
    code: 'CREATE_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
