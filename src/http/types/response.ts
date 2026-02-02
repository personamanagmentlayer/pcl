/**
 * Standard API response types
 */

/**
 * Successful API response
 */
export interface APISuccess<T = unknown> {
  success: true;
  data: T;
}

/**
 * Error detail
 */
export interface APIErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

/**
 * Error API response (RFC 7807 compliant)
 * @see https://datatracker.ietf.org/doc/html/rfc7807
 */
export interface APIError {
  success: false;
  error: {
    // RFC 7807 standard fields
    /** URI reference identifying the error type */
    type?: string;
    /** Short, human-readable summary of the error type */
    title?: string;
    /** HTTP status code */
    status?: number;
    /** Human-readable explanation specific to this occurrence */
    detail?: string;
    /** URI reference identifying the specific occurrence */
    instance?: string;

    // PCL extensions
    /** Machine-readable error code (e.g., "E_PARSE_001") */
    code: string;
    /** Error message (alias for detail for backward compatibility) */
    message: string;
    /** Structured validation errors or additional details */
    details?: APIErrorDetail[];
    /** ISO 8601 timestamp when the error occurred */
    timestamp: string;
    /** Unique request identifier for tracking */
    requestId?: string;
    /** Distributed trace ID from OpenTelemetry */
    traceId?: string;
    /** Span ID from OpenTelemetry */
    spanId?: string;
  };
}

/**
 * Combined API response type
 */
export type APIResponse<T = unknown> = APISuccess<T> | APIError;

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}
