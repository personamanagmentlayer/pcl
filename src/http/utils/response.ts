/**
 * Response helper utilities
 */

import type { Response } from 'express';
import type { APISuccess, APIError } from '../types/response.js';

/**
 * Send a success response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200
): void {
  const response: APISuccess<T> = {
    success: true,
    data,
  };
  res.status(statusCode).json(response);
}

/**
 * Send an error response
 */
export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode: number = 500,
  details?: { field?: string; message: string }[]
): void {
  const response: APIError = {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
  };
  res.status(statusCode).json(response);
}

/**
 * Send a validation error response
 */
export function sendValidationError(
  res: Response,
  errors: { field?: string; message: string }[]
): void {
  sendError(res, 'VALIDATION_ERROR', 'Invalid request data', 400, errors);
}

/**
 * Send an unauthorized error response
 */
export function sendUnauthorized(
  res: Response,
  message: string = 'Unauthorized'
): void {
  sendError(res, 'UNAUTHORIZED', message, 401);
}

/**
 * Send a forbidden error response
 */
export function sendForbidden(
  res: Response,
  message: string = 'Forbidden'
): void {
  sendError(res, 'FORBIDDEN', message, 403);
}

/**
 * Send a not found error response
 */
export function sendNotFound(
  res: Response,
  message: string = 'Resource not found'
): void {
  sendError(res, 'NOT_FOUND', message, 404);
}

/**
 * Send a conflict error response
 */
export function sendConflict(res: Response, message: string): void {
  sendError(res, 'CONFLICT', message, 409);
}
