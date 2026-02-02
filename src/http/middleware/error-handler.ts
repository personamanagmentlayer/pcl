/**
 * Global error handling middleware (RFC 7807 compliant)
 */

import type { Request, Response, NextFunction } from 'express';
import type { APIError } from '../types/response.js';
import { trace, context } from '@opentelemetry/api';

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
 * Get trace context from OpenTelemetry
 */
function getTraceContext(): { traceId?: string; spanId?: string } {
  try {
    const span = trace.getSpan(context.active());
    if (span) {
      const spanContext = span.spanContext();
      return {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
      };
    }
  } catch {
    // OpenTelemetry not initialized, ignore
  }
  return {};
}

/**
 * Global error handler middleware (RFC 7807 compliant)
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

  // Get trace context
  const { traceId, spanId } = getTraceContext();

  // Handle APIException
  if (error instanceof APIException) {
    const response: APIError = {
      success: false,
      error: {
        type: `/errors/${error.code.toLowerCase()}`,
        title: error.name,
        status: error.statusCode,
        detail: error.message,
        instance: req.path,
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
        traceId,
        spanId,
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
        type: '/errors/validation',
        title: 'Validation Error',
        status: 400,
        detail: 'Invalid request data',
        instance: req.path,
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: zodError.issues?.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
        timestamp: new Date().toISOString(),
        traceId,
        spanId,
      },
    };

    res.status(400).json(response);
    return;
  }

  // Handle JWT errors
  if (
    error.name === 'JsonWebTokenError' ||
    error.name === 'TokenExpiredError'
  ) {
    const response: APIError = {
      success: false,
      error: {
        type: '/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: error.message || 'Invalid or expired token',
        instance: req.path,
        code: 'UNAUTHORIZED',
        message: error.message || 'Invalid or expired token',
        timestamp: new Date().toISOString(),
        traceId,
        spanId,
      },
    };

    res.status(401).json(response);
    return;
  }

  // Default error response
  const response: APIError = {
    success: false,
    error: {
      type: '/errors/internal',
      title: 'Internal Server Error',
      status: 500,
      detail:
        process.env.NODE_ENV === 'production'
          ? 'An internal error occurred'
          : error.message,
      instance: req.path,
      code: 'INTERNAL_ERROR',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An internal error occurred'
          : error.message,
      timestamp: new Date().toISOString(),
      traceId,
      spanId,
    },
  };

  res.status(500).json(response);
}
