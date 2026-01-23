/**
 * Global error handling middleware
 */

import type { Request, Response, NextFunction } from 'express';
import type { APIError } from '../types/response.js';

/**
 * Custom API error class
 */
export class APIException extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: { field?: string; message: string }[]
  ) {
    super(message);
    this.name = 'APIException';
  }
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error
  console.error(`[ERROR] ${error.name}:`, error.message);
  if (error.stack) {
    console.error(error.stack);
  }

  // Handle APIException
  if (error instanceof APIException) {
    const response: APIError = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
      },
    };

    res.status(error.statusCode).json(response);
    return;
  }

  // Handle validation errors (Zod)
  if (error.name === 'ZodError') {
    const zodError = error as any;
    const response: APIError = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: zodError.issues?.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
        timestamp: new Date().toISOString(),
      },
    };

    res.status(400).json(response);
    return;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    const response: APIError = {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: error.message || 'Invalid or expired token',
        timestamp: new Date().toISOString(),
      },
    };

    res.status(401).json(response);
    return;
  }

  // Default error response
  const response: APIError = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An internal error occurred'
        : error.message,
      timestamp: new Date().toISOString(),
    },
  };

  res.status(500).json(response);
}
