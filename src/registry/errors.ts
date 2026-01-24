/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Registry Error Classes (Phase 1.2A)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Error types for registry operations.
 *
 * @packageDocumentation
 * @module @pcl/registry/errors
 * @version 2.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
//                              BASE ERROR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base registry error
 */
export class RegistryError extends Error {
  /**
   * Error code
   */
  public readonly code: string;

  /**
   * Additional context
   */
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RegistryError';
    this.code = code;
    this.context = context;

    // Maintain proper stack trace (only in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RegistryError);
    }
  }

  /**
   * Convert to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      stack: this.stack,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              SPECIFIC ERRORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validation error - invalid data
 */
export class ValidationError extends RegistryError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error - entity does not exist
 */
export class NotFoundError extends RegistryError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NOT_FOUND', context);
    this.name = 'NotFoundError';
  }
}

/**
 * Duplicate error - entity already exists
 */
export class DuplicateError extends RegistryError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'DUPLICATE', context);
    this.name = 'DuplicateError';
  }
}

/**
 * Connection error - backend connection failed
 */
export class ConnectionError extends RegistryError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONNECTION_ERROR', context);
    this.name = 'ConnectionError';
  }
}

/**
 * Transaction error - transaction operation failed
 */
export class TransactionError extends RegistryError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'TRANSACTION_ERROR', context);
    this.name = 'TransactionError';
  }
}

/**
 * Cache error - cache operation failed
 */
export class CacheError extends RegistryError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CACHE_ERROR', context);
    this.name = 'CacheError';
  }
}

/**
 * Search error - search operation failed
 */
export class SearchError extends RegistryError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'SEARCH_ERROR', context);
    this.name = 'SearchError';
  }
}

/**
 * Version error - version operation failed
 */
export class VersionError extends RegistryError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VERSION_ERROR', context);
    this.name = 'VersionError';
  }
}

/**
 * Permission error - insufficient permissions
 */
export class PermissionError extends RegistryError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'PERMISSION_ERROR', context);
    this.name = 'PermissionError';
  }
}

/**
 * Configuration error - invalid configuration
 */
export class ConfigurationError extends RegistryError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', context);
    this.name = 'ConfigurationError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              ERROR HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if error is a registry error
 */
export function isRegistryError(error: unknown): error is RegistryError {
  return error instanceof RegistryError;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Check if error is a not found error
 */
export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

/**
 * Check if error is a duplicate error
 */
export function isDuplicateError(error: unknown): error is DuplicateError {
  return error instanceof DuplicateError;
}

/**
 * Convert any error to RegistryError
 */
export function toRegistryError(error: unknown): RegistryError {
  if (isRegistryError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new RegistryError(error.message, 'UNKNOWN_ERROR', {
      originalError: error.name,
      stack: error.stack,
    });
  }

  return new RegistryError(String(error), 'UNKNOWN_ERROR');
}
