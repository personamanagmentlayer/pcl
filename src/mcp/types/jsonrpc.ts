/**
 * JSON-RPC 2.0 Message Types
 *
 * Based on the JSON-RPC 2.0 specification:
 * https://www.jsonrpc.org/specification
 */

/**
 * JSON-RPC 2.0 version constant
 */
export const JSONRPC_VERSION = '2.0' as const;

/**
 * JSON-RPC 2.0 Request ID
 * Can be a string, number, or null
 */
export type JsonRpcId = string | number | null;

/**
 * JSON-RPC 2.0 Request Message
 */
export interface JsonRpcRequest {
  readonly jsonrpc: typeof JSONRPC_VERSION;
  readonly method: string;
  readonly params?: Record<string, unknown> | unknown[];
  readonly id?: JsonRpcId;
}

/**
 * JSON-RPC 2.0 Notification Message (no response expected)
 */
export interface JsonRpcNotification {
  readonly jsonrpc: typeof JSONRPC_VERSION;
  readonly method: string;
  readonly params?: Record<string, unknown> | unknown[];
}

/**
 * JSON-RPC 2.0 Success Response
 */
export interface JsonRpcSuccessResponse {
  readonly jsonrpc: typeof JSONRPC_VERSION;
  readonly result: unknown;
  readonly id: JsonRpcId;
}

/**
 * JSON-RPC 2.0 Error Object
 */
export interface JsonRpcError {
  readonly code: number;
  readonly message: string;
  readonly data?: unknown;
}

/**
 * JSON-RPC 2.0 Error Response
 */
export interface JsonRpcErrorResponse {
  readonly jsonrpc: typeof JSONRPC_VERSION;
  readonly error: JsonRpcError;
  readonly id: JsonRpcId;
}

/**
 * JSON-RPC 2.0 Response (success or error)
 */
export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

/**
 * JSON-RPC 2.0 Message (request, notification, or response)
 */
export type JsonRpcMessage = JsonRpcRequest | JsonRpcNotification | JsonRpcResponse;

/**
 * Standard JSON-RPC 2.0 Error Codes
 */
export enum JsonRpcErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,

  // Server errors (reserved: -32000 to -32099)
  ServerError = -32000,
}

/**
 * Type guard to check if a message is a request
 */
export function isJsonRpcRequest(message: JsonRpcMessage): message is JsonRpcRequest {
  return 'method' in message && 'id' in message;
}

/**
 * Type guard to check if a message is a notification
 */
export function isJsonRpcNotification(message: JsonRpcMessage): message is JsonRpcNotification {
  return 'method' in message && !('id' in message);
}

/**
 * Type guard to check if a message is a response
 */
export function isJsonRpcResponse(message: JsonRpcMessage): message is JsonRpcResponse {
  return 'result' in message || 'error' in message;
}

/**
 * Type guard to check if a response is a success
 */
export function isJsonRpcSuccessResponse(
  response: JsonRpcResponse
): response is JsonRpcSuccessResponse {
  return 'result' in response;
}

/**
 * Type guard to check if a response is an error
 */
export function isJsonRpcErrorResponse(
  response: JsonRpcResponse
): response is JsonRpcErrorResponse {
  return 'error' in response;
}

/**
 * Create a JSON-RPC 2.0 request message
 */
export function createJsonRpcRequest(
  method: string,
  params?: Record<string, unknown> | unknown[],
  id?: JsonRpcId
): JsonRpcRequest {
  return {
    jsonrpc: JSONRPC_VERSION,
    method,
    ...(params !== undefined && { params }),
    ...(id !== undefined && { id }),
  };
}

/**
 * Create a JSON-RPC 2.0 notification message
 */
export function createJsonRpcNotification(
  method: string,
  params?: Record<string, unknown> | unknown[]
): JsonRpcNotification {
  return {
    jsonrpc: JSONRPC_VERSION,
    method,
    ...(params !== undefined && { params }),
  };
}

/**
 * Create a JSON-RPC 2.0 success response
 */
export function createJsonRpcSuccessResponse(
  result: unknown,
  id: JsonRpcId
): JsonRpcSuccessResponse {
  return {
    jsonrpc: JSONRPC_VERSION,
    result,
    id,
  };
}

/**
 * Create a JSON-RPC 2.0 error response
 */
export function createJsonRpcErrorResponse(
  code: number,
  message: string,
  id: JsonRpcId,
  data?: unknown
): JsonRpcErrorResponse {
  return {
    jsonrpc: JSONRPC_VERSION,
    error: {
      code,
      message,
      ...(data !== undefined && { data }),
    },
    id,
  };
}
