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
 * Error API response
 */
export interface APIError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: APIErrorDetail[];
    timestamp: string;
    requestId?: string;
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
