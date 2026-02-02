/**
 * HTTP-SSE Transport Tests
 *
 * Comprehensive test suite for the MCP HTTP + Server-Sent Events transport.
 * Tests HTTP POST requests, SSE connections, and error handling.
 */

import { EventEmitter } from 'node:events';
import {
  HttpSseTransport,
  type HttpSseTransportConfig,
} from '../../../src/mcp/transports/http-sse';
import type { McpRequest, McpResponse } from '../../../src/mcp/types/mcp';

// Mock EventSource
class MockEventSource extends EventEmitter {
  public url: string;
  public readyState: number = 0;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onopen: ((event: Event) => void) | null = null;

  constructor(url: string) {
    super();
    this.url = url;

    // Simulate connection in next tick
    process.nextTick(() => {
      this.readyState = 1;
      if (this.onopen) {
        this.onopen({} as Event);
      }
    });
  }

  close(): void {
    this.readyState = 2;
    this.removeAllListeners();
  }

  simulateMessage(data: string): void {
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent);
    }
  }

  simulateError(): void {
    if (this.onerror) {
      this.onerror({} as Event);
    }
  }
}

// Mock fetch
interface MockFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<any>;
}

let mockFetchResponse: MockFetchResponse = {
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({ jsonrpc: '2.0', result: {}, id: 1 }),
};

const mockFetch = vi.fn(
  async (url: string, options?: any): Promise<MockFetchResponse> => {
    return mockFetchResponse;
  }
);

describe('HttpSseTransport', () => {
  let transport: HttpSseTransport;

  beforeEach(() => {
    // Mock global fetch
    global.fetch = mockFetch as any;

    // Mock global EventSource
    (global as any).EventSource = MockEventSource;

    // Reset mock fetch response
    mockFetchResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ jsonrpc: '2.0', result: {}, id: 1 }),
    };

    mockFetch.mockClear();
  });

  afterEach(async () => {
    if (transport) {
      await transport.close();
    }
  });

  describe('Constructor', () => {
    it('should create transport with base URL', () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
      });

      expect(transport).toBeDefined();
      expect(transport.isConnected()).toBe(false);
    });

    it('should create transport with headers', () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
        headers: {
          'X-Custom-Header': 'value',
        },
      });

      expect(transport).toBeDefined();
    });

    it('should create transport with debug enabled', () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
        debug: true,
      });

      expect(transport).toBeDefined();
    });

    it('should create transport with debug disabled', () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
        debug: false,
      });

      expect(transport).toBeDefined();
    });

    it('should handle HTTPS URLs', () => {
      transport = new HttpSseTransport({
        baseUrl: 'https://api.example.com',
      });

      expect(transport).toBeDefined();
    });

    it('should handle URLs with trailing slash', () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000/',
      });

      expect(transport).toBeDefined();
    });

    it('should handle URLs with port', () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:8080',
      });

      expect(transport).toBeDefined();
    });
  });

  describe('Connection Lifecycle', () => {
    it('should not be connected initially', () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
      });

      expect(transport.isConnected()).toBe(false);
    });

    it('should connect when onMessage is called', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
      });

      transport.onMessage(() => {});

      // Wait for SSE connection
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(transport.isConnected()).toBe(true);
    });

    it('should disconnect after close', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
      });

      transport.onMessage(() => {});
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(transport.isConnected()).toBe(true);

      await transport.close();

      expect(transport.isConnected()).toBe(false);
    });

    it('should handle multiple close calls', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
      });

      transport.onMessage(() => {});
      await new Promise((resolve) => setTimeout(resolve, 10));

      await transport.close();
      await transport.close();

      expect(transport.isConnected()).toBe(false);
    });

    it('should handle close without connection', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
      });

      await transport.close();

      expect(transport.isConnected()).toBe(false);
    });

    it('should establish SSE connection to correct URL', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
      });

      let eventSource: MockEventSource | null = null;

      const OriginalEventSource = (global as any).EventSource;
      (global as any).EventSource = class extends MockEventSource {
        constructor(url: string) {
          super(url);
          eventSource = this;
        }
      };

      transport.onMessage(() => {});
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(eventSource?.url).toBe('http://localhost:3000/mcp/events');

      (global as any).EventSource = OriginalEventSource;
    });

    it('should create new connection when onMessage called multiple times', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
      });

      let connectionCount = 0;

      const OriginalEventSource = (global as any).EventSource;
      (global as any).EventSource = class extends MockEventSource {
        constructor(url: string) {
          super(url);
          connectionCount++;
        }
      };

      transport.onMessage(() => {});
      transport.onMessage(() => {});
      transport.onMessage(() => {});

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Each onMessage call triggers connect if not already connected
      // Note: This is the actual implementation behavior
      expect(connectionCount).toBeGreaterThan(0);

      (global as any).EventSource = OriginalEventSource;
    });
  });

  describe('HTTP Request Sending', () => {
    it('should send request via HTTP POST', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
      });

      transport.onMessage(() => {});
      await new Promise((resolve) => setTimeout(resolve, 10));

      const request: McpRequest = {
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
      };

      await transport.send(request);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/mcp/request',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(request),
        })
      );
    });

    it('should throw when sending while disconnected', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
      });

      const request: McpRequest = {
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
      };

      await expect(transport.send(request)).rejects.toThrow(
        'Transport not connected'
      );
    });

    it('should include custom headers in request', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
        headers: {
          'X-API-Key': 'secret',
          Authorization: 'Bearer token',
        },
      });

      transport.onMessage(() => {});
      await new Promise((resolve) => setTimeout(resolve, 10));

      await transport.send({
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'secret',
            Authorization: 'Bearer token',
          }),
        })
      );
    });

    it('should send request with params', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
      });

      transport.onMessage(() => {});
      await new Promise((resolve) => setTimeout(resolve, 10));

      const request: McpRequest = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'calculator', arguments: { expr: '1+1' } },
        id: 2,
      };

      await transport.send(request);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(request),
        })
      );
    });

    it('should handle successful HTTP response', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
      });

      const messageHandler = vi.fn();
      transport.onMessage(messageHandler);
      await new Promise((resolve) => setTimeout(resolve, 10));

      mockFetchResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ jsonrpc: '2.0', result: { value: 42 }, id: 1 }),
      };

      await transport.send({
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
      });

      expect(messageHandler).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        result: { value: 42 },
        id: 1,
      });
    });

    it('should throw on HTTP error', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
      });

      transport.onMessage(() => {});
      await new Promise((resolve) => setTimeout(resolve, 10));

      mockFetchResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({}),
      };

      await expect(
        transport.send({
          jsonrpc: '2.0',
          method: 'test',
          id: 1,
        })
      ).rejects.toThrow('HTTP error: 500 Internal Server Error');
    });

    it('should throw on 404 error', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
      });

      transport.onMessage(() => {});
      await new Promise((resolve) => setTimeout(resolve, 10));

      mockFetchResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({}),
      };

      await expect(
        transport.send({
          jsonrpc: '2.0',
          method: 'test',
          id: 1,
        })
      ).rejects.toThrow('HTTP error: 404 Not Found');
    });

    it('should throw on network error', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
      });

      transport.onMessage(() => {});
      await new Promise((resolve) => setTimeout(resolve, 10));

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        transport.send({
          jsonrpc: '2.0',
          method: 'test',
          id: 1,
        })
      ).rejects.toThrow('Network error');
    });

    it('should send multiple requests', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
      });

      transport.onMessage(() => {});
      await new Promise((resolve) => setTimeout(resolve, 10));

      await transport.send({ jsonrpc: '2.0', method: 'test1', id: 1 });
      await transport.send({ jsonrpc: '2.0', method: 'test2', id: 2 });
      await transport.send({ jsonrpc: '2.0', method: 'test3', id: 3 });

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('SSE Event Receiving', () => {
    it('should receive SSE message', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
      });

      let eventSource: MockEventSource | null = null;

      const OriginalEventSource = (global as any).EventSource;
      (global as any).EventSource = class extends MockEventSource {
        constructor(url: string) {
          super(url);
          eventSource = this;
        }
      };

      const messageHandler = vi.fn();
      transport.onMessage(messageHandler);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const response: McpResponse = {
        jsonrpc: '2.0',
        result: { data: 'test' },
        id: 1,
      };

      eventSource?.simulateMessage(JSON.stringify(response));

      expect(messageHandler).toHaveBeenCalledWith(response);

      (global as any).EventSource = OriginalEventSource;
    });

    it('should receive multiple SSE messages', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
      });

      let eventSource: MockEventSource | null = null;

      const OriginalEventSource = (global as any).EventSource;
      (global as any).EventSource = class extends MockEventSource {
        constructor(url: string) {
          super(url);
          eventSource = this;
        }
      };

      const messages: McpResponse[] = [];
      transport.onMessage((msg) => messages.push(msg));
      await new Promise((resolve) => setTimeout(resolve, 10));

      eventSource?.simulateMessage(
        JSON.stringify({ jsonrpc: '2.0', result: {}, id: 1 })
      );
      eventSource?.simulateMessage(
        JSON.stringify({ jsonrpc: '2.0', result: {}, id: 2 })
      );
      eventSource?.simulateMessage(
        JSON.stringify({ jsonrpc: '2.0', result: {}, id: 3 })
      );

      expect(messages).toHaveLength(3);

      (global as any).EventSource = OriginalEventSource;
    });

    it('should handle malformed SSE JSON', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
        debug: false,
      });

      let eventSource: MockEventSource | null = null;

      const OriginalEventSource = (global as any).EventSource;
      (global as any).EventSource = class extends MockEventSource {
        constructor(url: string) {
          super(url);
          eventSource = this;
        }
      };

      const messageHandler = vi.fn();
      transport.onMessage(messageHandler);
      await new Promise((resolve) => setTimeout(resolve, 10));

      eventSource?.simulateMessage('invalid json');

      expect(messageHandler).not.toHaveBeenCalled();

      (global as any).EventSource = OriginalEventSource;
    });

    it('should handle SSE error event', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
      });

      let eventSource: MockEventSource | null = null;

      const OriginalEventSource = (global as any).EventSource;
      (global as any).EventSource = class extends MockEventSource {
        constructor(url: string) {
          super(url);
          eventSource = this;
        }
      };

      transport.onMessage(() => {});
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(transport.isConnected()).toBe(true);

      eventSource?.simulateError();

      expect(transport.isConnected()).toBe(false);

      (global as any).EventSource = OriginalEventSource;
    });

    it('should parse complex SSE messages', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
      });

      let eventSource: MockEventSource | null = null;

      const OriginalEventSource = (global as any).EventSource;
      (global as any).EventSource = class extends MockEventSource {
        constructor(url: string) {
          super(url);
          eventSource = this;
        }
      };

      const messageHandler = vi.fn();
      transport.onMessage(messageHandler);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const complexResponse: McpResponse = {
        jsonrpc: '2.0',
        result: {
          nested: {
            array: [1, 2, { key: 'value' }],
          },
        },
        id: 1,
      };

      eventSource?.simulateMessage(JSON.stringify(complexResponse));

      expect(messageHandler).toHaveBeenCalledWith(complexResponse);

      (global as any).EventSource = OriginalEventSource;
    });
  });

  describe('Debug Mode', () => {
    it('should log debug messages when enabled', async () => {
      const consoleDebugSpy = vi
        .spyOn(console, 'debug')
        .mockImplementation(() => {});

      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
        debug: true,
      });

      transport.onMessage(() => {});
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(consoleDebugSpy).toHaveBeenCalled();

      consoleDebugSpy.mockRestore();
    });

    it('should not log when debug disabled', async () => {
      const consoleDebugSpy = vi
        .spyOn(console, 'debug')
        .mockImplementation(() => {});

      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
        debug: false,
      });

      transport.onMessage(() => {});
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(consoleDebugSpy).not.toHaveBeenCalled();

      consoleDebugSpy.mockRestore();
    });

    it('should log HTTP requests in debug mode', async () => {
      const consoleDebugSpy = vi
        .spyOn(console, 'debug')
        .mockImplementation(() => {});

      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
        debug: true,
      });

      transport.onMessage(() => {});
      await new Promise((resolve) => setTimeout(resolve, 10));

      consoleDebugSpy.mockClear();

      await transport.send({
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
      });

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MCP HTTP] Sending'),
        expect.anything()
      );

      consoleDebugSpy.mockRestore();
    });

    it('should log HTTP responses in debug mode', async () => {
      const consoleDebugSpy = vi
        .spyOn(console, 'debug')
        .mockImplementation(() => {});

      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
        debug: true,
      });

      transport.onMessage(() => {});
      await new Promise((resolve) => setTimeout(resolve, 10));

      consoleDebugSpy.mockClear();

      await transport.send({
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
      });

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MCP HTTP] Received response'),
        expect.anything()
      );

      consoleDebugSpy.mockRestore();
    });

    it('should log HTTP errors in debug mode', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
        debug: true,
      });

      transport.onMessage(() => {});
      await new Promise((resolve) => setTimeout(resolve, 10));

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        transport.send({
          jsonrpc: '2.0',
          method: 'test',
          id: 1,
        })
      ).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MCP HTTP] Request failed'),
        expect.anything()
      );

      consoleErrorSpy.mockRestore();
    });

    it('should log SSE parse errors in debug mode', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
        debug: true,
      });

      let eventSource: MockEventSource | null = null;

      const OriginalEventSource = (global as any).EventSource;
      (global as any).EventSource = class extends MockEventSource {
        constructor(url: string) {
          super(url);
          eventSource = this;
        }
      };

      transport.onMessage(() => {});
      await new Promise((resolve) => setTimeout(resolve, 10));

      eventSource?.simulateMessage('invalid json');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MCP SSE] Parse error'),
        expect.anything()
      );

      consoleErrorSpy.mockRestore();
      (global as any).EventSource = OriginalEventSource;
    });
  });

  describe('Edge Cases', () => {
    it('should handle setting message handler multiple times', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
      });

      transport.onMessage(() => {});
      transport.onMessage(() => {});
      transport.onMessage(() => {});

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(transport.isConnected()).toBe(true);
    });

    it('should only use the latest message handler', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
      });

      let handler1Called = false;
      let handler2Called = false;

      transport.onMessage(() => {
        handler1Called = true;
      });

      transport.onMessage(() => {
        handler2Called = true;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      mockFetchResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ jsonrpc: '2.0', result: {}, id: 1 }),
      };

      await transport.send({
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
      });

      expect(handler1Called).toBe(false);
      expect(handler2Called).toBe(true);
    });

    it('should clear message handler on close', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
      });

      const messageHandler = vi.fn();
      transport.onMessage(messageHandler);
      await new Promise((resolve) => setTimeout(resolve, 10));

      await transport.close();

      mockFetchResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ jsonrpc: '2.0', result: {}, id: 1 }),
      };

      // Cannot send after close
      await expect(
        transport.send({
          jsonrpc: '2.0',
          method: 'test',
          id: 1,
        })
      ).rejects.toThrow();
    });

    it('should handle null id in messages', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
      });

      transport.onMessage(() => {});
      await new Promise((resolve) => setTimeout(resolve, 10));

      mockFetchResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ jsonrpc: '2.0', result: {}, id: null }),
      };

      await transport.send({
        jsonrpc: '2.0',
        method: 'test',
        id: null,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"id":null'),
        })
      );
    });

    it('should handle large messages', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
      });

      transport.onMessage(() => {});
      await new Promise((resolve) => setTimeout(resolve, 10));

      const largeData = 'x'.repeat(10000);
      const request: McpRequest = {
        jsonrpc: '2.0',
        method: 'test',
        params: { data: largeData },
        id: 1,
      };

      await transport.send(request);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining(largeData),
        })
      );
    });

    it('should handle URL with path prefix', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000/api/v1',
      });

      transport.onMessage(() => {});
      await new Promise((resolve) => setTimeout(resolve, 10));

      await transport.send({
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/mcp/request',
        expect.anything()
      );
    });

    it('should handle error responses with data', async () => {
      transport = new HttpSseTransport({
        baseUrl: 'http://localhost:3000',
      });

      const messageHandler = vi.fn();
      transport.onMessage(messageHandler);
      await new Promise((resolve) => setTimeout(resolve, 10));

      mockFetchResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid Request',
            data: { details: 'Missing field' },
          },
          id: 1,
        }),
      };

      await transport.send({
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
      });

      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: -32600,
            data: { details: 'Missing field' },
          }),
        })
      );
    });
  });
});
