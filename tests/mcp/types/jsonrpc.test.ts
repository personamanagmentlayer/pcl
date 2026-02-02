/**
 * JSON-RPC 2.0 Types Tests
 *
 * Comprehensive test suite for JSON-RPC 2.0 message types, type guards,
 * and factory functions.
 */

import {
  JSONRPC_VERSION,
  JsonRpcErrorCode,
  type JsonRpcRequest,
  type JsonRpcNotification,
  type JsonRpcSuccessResponse,
  type JsonRpcErrorResponse,
  type JsonRpcResponse,
  type JsonRpcMessage,
  isJsonRpcRequest,
  isJsonRpcNotification,
  isJsonRpcResponse,
  isJsonRpcSuccessResponse,
  isJsonRpcErrorResponse,
  createJsonRpcRequest,
  createJsonRpcNotification,
  createJsonRpcSuccessResponse,
  createJsonRpcErrorResponse,
} from '../../../src/mcp/types/jsonrpc';

describe('JSON-RPC Constants', () => {
  it('should export correct version constant', () => {
    expect(JSONRPC_VERSION).toBe('2.0');
  });

  it('should have immutable version constant', () => {
    const version: '2.0' = JSONRPC_VERSION;
    expect(version).toBe('2.0');
  });
});

describe('JsonRpcErrorCode Enum', () => {
  it('should have standard error codes', () => {
    expect(JsonRpcErrorCode.ParseError).toBe(-32700);
    expect(JsonRpcErrorCode.InvalidRequest).toBe(-32600);
    expect(JsonRpcErrorCode.MethodNotFound).toBe(-32601);
    expect(JsonRpcErrorCode.InvalidParams).toBe(-32602);
    expect(JsonRpcErrorCode.InternalError).toBe(-32603);
    expect(JsonRpcErrorCode.ServerError).toBe(-32000);
  });

  it('should maintain correct error code ranges', () => {
    // Parse error
    expect(JsonRpcErrorCode.ParseError).toBe(-32700);

    // Standard errors
    expect(JsonRpcErrorCode.InvalidRequest).toBeGreaterThanOrEqual(-32699);
    expect(JsonRpcErrorCode.InvalidRequest).toBeLessThanOrEqual(-32600);

    // Server errors should be in reserved range
    expect(JsonRpcErrorCode.ServerError).toBeGreaterThanOrEqual(-32099);
    expect(JsonRpcErrorCode.ServerError).toBeLessThanOrEqual(-32000);
  });
});

describe('createJsonRpcRequest', () => {
  it('should create a basic request with method only', () => {
    const request = createJsonRpcRequest('testMethod');

    expect(request).toEqual({
      jsonrpc: '2.0',
      method: 'testMethod',
    });
  });

  it('should create a request with object params', () => {
    const params = { foo: 'bar', num: 42 };
    const request = createJsonRpcRequest('testMethod', params);

    expect(request).toEqual({
      jsonrpc: '2.0',
      method: 'testMethod',
      params,
    });
  });

  it('should create a request with array params', () => {
    const params = ['value1', 'value2', 42];
    const request = createJsonRpcRequest('testMethod', params);

    expect(request).toEqual({
      jsonrpc: '2.0',
      method: 'testMethod',
      params,
    });
  });

  it('should create a request with string id', () => {
    const request = createJsonRpcRequest('testMethod', undefined, 'req-123');

    expect(request).toEqual({
      jsonrpc: '2.0',
      method: 'testMethod',
      id: 'req-123',
    });
  });

  it('should create a request with numeric id', () => {
    const request = createJsonRpcRequest('testMethod', undefined, 42);

    expect(request).toEqual({
      jsonrpc: '2.0',
      method: 'testMethod',
      id: 42,
    });
  });

  it('should create a request with null id', () => {
    const request = createJsonRpcRequest('testMethod', undefined, null);

    expect(request).toEqual({
      jsonrpc: '2.0',
      method: 'testMethod',
      id: null,
    });
  });

  it('should create a request with params and id', () => {
    const params = { key: 'value' };
    const request = createJsonRpcRequest('testMethod', params, 'id-1');

    expect(request).toEqual({
      jsonrpc: '2.0',
      method: 'testMethod',
      params,
      id: 'id-1',
    });
  });

  it('should handle empty object params', () => {
    const request = createJsonRpcRequest('testMethod', {});

    expect(request).toEqual({
      jsonrpc: '2.0',
      method: 'testMethod',
      params: {},
    });
  });

  it('should handle empty array params', () => {
    const request = createJsonRpcRequest('testMethod', []);

    expect(request).toEqual({
      jsonrpc: '2.0',
      method: 'testMethod',
      params: [],
    });
  });

  it('should handle zero as id', () => {
    const request = createJsonRpcRequest('testMethod', undefined, 0);

    expect(request).toEqual({
      jsonrpc: '2.0',
      method: 'testMethod',
      id: 0,
    });
  });

  it('should handle negative id', () => {
    const request = createJsonRpcRequest('testMethod', undefined, -1);

    expect(request).toEqual({
      jsonrpc: '2.0',
      method: 'testMethod',
      id: -1,
    });
  });
});

describe('createJsonRpcNotification', () => {
  it('should create a notification with method only', () => {
    const notification = createJsonRpcNotification('notifyMethod');

    expect(notification).toEqual({
      jsonrpc: '2.0',
      method: 'notifyMethod',
    });
  });

  it('should create a notification with object params', () => {
    const params = { event: 'update', data: 'test' };
    const notification = createJsonRpcNotification('notifyMethod', params);

    expect(notification).toEqual({
      jsonrpc: '2.0',
      method: 'notifyMethod',
      params,
    });
  });

  it('should create a notification with array params', () => {
    const params = [1, 2, 3];
    const notification = createJsonRpcNotification('notifyMethod', params);

    expect(notification).toEqual({
      jsonrpc: '2.0',
      method: 'notifyMethod',
      params,
    });
  });

  it('should not include id field', () => {
    const notification = createJsonRpcNotification('notifyMethod');

    expect(notification).not.toHaveProperty('id');
  });

  it('should handle empty params', () => {
    const notification = createJsonRpcNotification('notifyMethod', {});

    expect(notification).toEqual({
      jsonrpc: '2.0',
      method: 'notifyMethod',
      params: {},
    });
  });
});

describe('createJsonRpcSuccessResponse', () => {
  it('should create a success response with result', () => {
    const result = { status: 'ok', value: 42 };
    const response = createJsonRpcSuccessResponse(result, 'req-1');

    expect(response).toEqual({
      jsonrpc: '2.0',
      result,
      id: 'req-1',
    });
  });

  it('should handle null result', () => {
    const response = createJsonRpcSuccessResponse(null, 'req-2');

    expect(response).toEqual({
      jsonrpc: '2.0',
      result: null,
      id: 'req-2',
    });
  });

  it('should handle undefined result as null', () => {
    const response = createJsonRpcSuccessResponse(undefined, 'req-3');

    expect(response).toEqual({
      jsonrpc: '2.0',
      result: undefined,
      id: 'req-3',
    });
  });

  it('should handle numeric id', () => {
    const response = createJsonRpcSuccessResponse({ ok: true }, 123);

    expect(response).toEqual({
      jsonrpc: '2.0',
      result: { ok: true },
      id: 123,
    });
  });

  it('should handle null id', () => {
    const response = createJsonRpcSuccessResponse({ ok: true }, null);

    expect(response).toEqual({
      jsonrpc: '2.0',
      result: { ok: true },
      id: null,
    });
  });

  it('should handle primitive results', () => {
    expect(createJsonRpcSuccessResponse(42, 1)).toEqual({
      jsonrpc: '2.0',
      result: 42,
      id: 1,
    });

    expect(createJsonRpcSuccessResponse('text', 2)).toEqual({
      jsonrpc: '2.0',
      result: 'text',
      id: 2,
    });

    expect(createJsonRpcSuccessResponse(true, 3)).toEqual({
      jsonrpc: '2.0',
      result: true,
      id: 3,
    });
  });
});

describe('createJsonRpcErrorResponse', () => {
  it('should create an error response', () => {
    const response = createJsonRpcErrorResponse(
      -32600,
      'Invalid Request',
      'req-1'
    );

    expect(response).toEqual({
      jsonrpc: '2.0',
      error: {
        code: -32600,
        message: 'Invalid Request',
      },
      id: 'req-1',
    });
  });

  it('should include error data when provided', () => {
    const errorData = { details: 'Missing required field' };
    const response = createJsonRpcErrorResponse(
      -32602,
      'Invalid params',
      'req-2',
      errorData
    );

    expect(response).toEqual({
      jsonrpc: '2.0',
      error: {
        code: -32602,
        message: 'Invalid params',
        data: errorData,
      },
      id: 'req-2',
    });
  });

  it('should handle standard error codes', () => {
    const response = createJsonRpcErrorResponse(
      JsonRpcErrorCode.MethodNotFound,
      'Method not found',
      1
    );

    expect(response.error.code).toBe(-32601);
  });

  it('should handle null id', () => {
    const response = createJsonRpcErrorResponse(-32700, 'Parse error', null);

    expect(response.id).toBe(null);
  });

  it('should handle custom error codes', () => {
    const response = createJsonRpcErrorResponse(1001, 'Custom error', 'req-1');

    expect(response.error.code).toBe(1001);
  });

  it('should handle error data of various types', () => {
    const stringData = createJsonRpcErrorResponse(1, 'Error', 1, 'string data');
    expect(stringData.error.data).toBe('string data');

    const numberData = createJsonRpcErrorResponse(1, 'Error', 2, 42);
    expect(numberData.error.data).toBe(42);

    const arrayData = createJsonRpcErrorResponse(1, 'Error', 3, [1, 2, 3]);
    expect(arrayData.error.data).toEqual([1, 2, 3]);
  });
});

describe('isJsonRpcRequest', () => {
  it('should identify valid request', () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'test',
      id: 1,
    };

    expect(isJsonRpcRequest(request)).toBe(true);
  });

  it('should reject notification (no id)', () => {
    const notification: JsonRpcNotification = {
      jsonrpc: '2.0',
      method: 'test',
    };

    expect(isJsonRpcRequest(notification)).toBe(false);
  });

  it('should reject response', () => {
    const response: JsonRpcSuccessResponse = {
      jsonrpc: '2.0',
      result: {},
      id: 1,
    };

    expect(isJsonRpcRequest(response)).toBe(false);
  });

  it('should accept request with null id', () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'test',
      id: null,
    };

    expect(isJsonRpcRequest(request)).toBe(true);
  });

  it('should accept request with params', () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'test',
      params: { key: 'value' },
      id: 1,
    };

    expect(isJsonRpcRequest(request)).toBe(true);
  });
});

describe('isJsonRpcNotification', () => {
  it('should identify valid notification', () => {
    const notification: JsonRpcNotification = {
      jsonrpc: '2.0',
      method: 'notify',
    };

    expect(isJsonRpcNotification(notification)).toBe(true);
  });

  it('should reject request (has id)', () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'test',
      id: 1,
    };

    expect(isJsonRpcNotification(request)).toBe(false);
  });

  it('should reject response', () => {
    const response: JsonRpcSuccessResponse = {
      jsonrpc: '2.0',
      result: {},
      id: 1,
    };

    expect(isJsonRpcNotification(response)).toBe(false);
  });

  it('should accept notification with params', () => {
    const notification: JsonRpcNotification = {
      jsonrpc: '2.0',
      method: 'notify',
      params: [1, 2, 3],
    };

    expect(isJsonRpcNotification(notification)).toBe(true);
  });
});

describe('isJsonRpcResponse', () => {
  it('should identify success response', () => {
    const response: JsonRpcSuccessResponse = {
      jsonrpc: '2.0',
      result: { ok: true },
      id: 1,
    };

    expect(isJsonRpcResponse(response)).toBe(true);
  });

  it('should identify error response', () => {
    const response: JsonRpcErrorResponse = {
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Invalid Request' },
      id: 1,
    };

    expect(isJsonRpcResponse(response)).toBe(true);
  });

  it('should reject request', () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'test',
      id: 1,
    };

    expect(isJsonRpcResponse(request)).toBe(false);
  });

  it('should reject notification', () => {
    const notification: JsonRpcNotification = {
      jsonrpc: '2.0',
      method: 'notify',
    };

    expect(isJsonRpcResponse(notification)).toBe(false);
  });
});

describe('isJsonRpcSuccessResponse', () => {
  it('should identify success response', () => {
    const response: JsonRpcSuccessResponse = {
      jsonrpc: '2.0',
      result: { data: 'test' },
      id: 1,
    };

    expect(isJsonRpcSuccessResponse(response)).toBe(true);
  });

  it('should reject error response', () => {
    const response: JsonRpcErrorResponse = {
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Invalid' },
      id: 1,
    };

    expect(isJsonRpcSuccessResponse(response)).toBe(false);
  });

  it('should accept response with null result', () => {
    const response: JsonRpcSuccessResponse = {
      jsonrpc: '2.0',
      result: null,
      id: 1,
    };

    expect(isJsonRpcSuccessResponse(response)).toBe(true);
  });
});

describe('isJsonRpcErrorResponse', () => {
  it('should identify error response', () => {
    const response: JsonRpcErrorResponse = {
      jsonrpc: '2.0',
      error: { code: -32601, message: 'Method not found' },
      id: 1,
    };

    expect(isJsonRpcErrorResponse(response)).toBe(true);
  });

  it('should reject success response', () => {
    const response: JsonRpcSuccessResponse = {
      jsonrpc: '2.0',
      result: { ok: true },
      id: 1,
    };

    expect(isJsonRpcErrorResponse(response)).toBe(false);
  });

  it('should accept error response with data', () => {
    const response: JsonRpcErrorResponse = {
      jsonrpc: '2.0',
      error: {
        code: -32602,
        message: 'Invalid params',
        data: { missing: ['field1'] },
      },
      id: 1,
    };

    expect(isJsonRpcErrorResponse(response)).toBe(true);
  });
});

describe('Type Guards Edge Cases', () => {
  it('should handle message with both method and result', () => {
    const hybrid = {
      jsonrpc: '2.0',
      method: 'test',
      result: {},
      id: 1,
    } as any;

    // Response takes precedence
    expect(isJsonRpcResponse(hybrid)).toBe(true);
    expect(isJsonRpcRequest(hybrid)).toBe(true);
  });

  it('should handle message with both method and error', () => {
    const hybrid = {
      jsonrpc: '2.0',
      method: 'test',
      error: { code: 1, message: 'error' },
      id: 1,
    } as any;

    expect(isJsonRpcResponse(hybrid)).toBe(true);
    expect(isJsonRpcRequest(hybrid)).toBe(true);
  });

  it('should handle empty object', () => {
    const empty = {} as any;

    expect(isJsonRpcRequest(empty)).toBe(false);
    expect(isJsonRpcNotification(empty)).toBe(false);
    expect(isJsonRpcResponse(empty)).toBe(false);
  });
});
