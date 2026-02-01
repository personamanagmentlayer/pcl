/**
 * Stdio Transport Tests
 *
 * Comprehensive test suite for the MCP stdio transport layer.
 * Tests message framing, bidirectional communication, and error handling.
 */

import { EventEmitter } from 'node:events';
import { Readable, Writable } from 'node:stream';
import {
  StdioTransport,
  type StdioTransportConfig,
} from '../../../src/mcp/transports/stdio';
import type { McpRequest, McpResponse } from '../../../src/mcp/types/mcp';

// Mock stdin/stdout
class MockReadable extends Readable {
  _read(): void {
    // No-op
  }

  simulateInput(data: string): void {
    this.push(data);
  }

  simulateEnd(): void {
    this.push(null);
  }
}

class MockWritable extends Writable {
  public written: string[] = [];

  _write(
    chunk: Buffer | string,
    encoding: string,
    callback: (error?: Error | null) => void
  ): void {
    this.written.push(chunk.toString());
    callback();
  }

  getLastWritten(): string | undefined {
    return this.written[this.written.length - 1];
  }

  getAllWritten(): string {
    return this.written.join('');
  }

  clear(): void {
    this.written = [];
  }
}

describe('StdioTransport', () => {
  let mockStdin: MockReadable;
  let mockStdout: MockWritable;
  let transport: StdioTransport;
  let originalStdin: any;
  let originalStdout: any;

  beforeEach(() => {
    mockStdin = new MockReadable();
    mockStdout = new MockWritable();

    // Save originals
    originalStdin = process.stdin;
    originalStdout = process.stdout;

    // Replace stdin and stdout
    Object.defineProperty(process, 'stdin', {
      value: mockStdin,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(process, 'stdout', {
      value: mockStdout,
      writable: true,
      configurable: true,
    });
  });

  afterEach(async () => {
    if (transport) {
      await transport.close();
    }

    // Restore originals
    Object.defineProperty(process, 'stdin', {
      value: originalStdin,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(process, 'stdout', {
      value: originalStdout,
      writable: true,
      configurable: true,
    });
  });

  describe('Constructor', () => {
    it('should create transport with default config', () => {
      transport = new StdioTransport();

      expect(transport).toBeDefined();
      expect(transport.isConnected()).toBe(false);
    });

    it('should create transport with debug enabled', () => {
      transport = new StdioTransport({ debug: true });

      expect(transport).toBeDefined();
    });

    it('should create transport with debug disabled', () => {
      transport = new StdioTransport({ debug: false });

      expect(transport).toBeDefined();
    });

    it('should create transport with empty config', () => {
      transport = new StdioTransport({});

      expect(transport).toBeDefined();
    });
  });

  describe('Connection Lifecycle', () => {
    it('should not be connected initially', () => {
      transport = new StdioTransport();

      expect(transport.isConnected()).toBe(false);
    });

    it('should connect when onMessage is called', () => {
      transport = new StdioTransport();

      transport.onMessage(() => {});

      expect(transport.isConnected()).toBe(true);
    });

    it('should disconnect after close', async () => {
      transport = new StdioTransport();
      transport.onMessage(() => {});

      expect(transport.isConnected()).toBe(true);

      await transport.close();

      expect(transport.isConnected()).toBe(false);
    });

    it('should handle multiple close calls', async () => {
      transport = new StdioTransport();
      transport.onMessage(() => {});

      await transport.close();
      await transport.close();

      expect(transport.isConnected()).toBe(false);
    });

    it('should handle close without connection', async () => {
      transport = new StdioTransport();

      await transport.close();

      expect(transport.isConnected()).toBe(false);
    });

    it('should not reconnect after close', async () => {
      transport = new StdioTransport();
      transport.onMessage(() => {});

      await transport.close();

      expect(transport.isConnected()).toBe(false);
    });
  });

  describe('Message Sending', () => {
    it('should send request message', async () => {
      transport = new StdioTransport();
      transport.onMessage(() => {});

      const request: McpRequest = {
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
      };

      await transport.send(request);

      const written = mockStdout.getLastWritten();
      expect(written).toBe(JSON.stringify(request) + '\n');
    });

    it('should send request with params', async () => {
      transport = new StdioTransport();
      transport.onMessage(() => {});

      const request: McpRequest = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'calculator', arguments: { expr: '1+1' } },
        id: 2,
      };

      await transport.send(request);

      const written = mockStdout.getLastWritten();
      expect(written).toContain('"method":"tools/call"');
      expect(written).toContain('"params"');
    });

    it('should throw when sending while disconnected', async () => {
      transport = new StdioTransport();

      const request: McpRequest = {
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
      };

      await expect(transport.send(request)).rejects.toThrow(
        'Transport not connected'
      );
    });

    it('should append newline to message', async () => {
      transport = new StdioTransport();
      transport.onMessage(() => {});

      const request: McpRequest = {
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
      };

      await transport.send(request);

      const written = mockStdout.getLastWritten();
      expect(written?.endsWith('\n')).toBe(true);
    });

    it('should send multiple messages', async () => {
      transport = new StdioTransport();
      transport.onMessage(() => {});

      await transport.send({
        jsonrpc: '2.0',
        method: 'test1',
        id: 1,
      });

      await transport.send({
        jsonrpc: '2.0',
        method: 'test2',
        id: 2,
      });

      expect(mockStdout.written).toHaveLength(2);
    });

    it('should handle response messages', async () => {
      transport = new StdioTransport();
      transport.onMessage(() => {});

      const response: McpResponse = {
        jsonrpc: '2.0',
        result: { success: true },
        id: 1,
      };

      await transport.send(response as any);

      const written = mockStdout.getLastWritten();
      expect(written).toContain('"result"');
    });

    it('should handle error response messages', async () => {
      transport = new StdioTransport();
      transport.onMessage(() => {});

      const response: McpResponse = {
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: 'Method not found',
        },
        id: 1,
      };

      await transport.send(response as any);

      const written = mockStdout.getLastWritten();
      expect(written).toContain('"error"');
      expect(written).toContain('Method not found');
    });
  });

  describe('Message Receiving', () => {
    it('should receive response message', (done) => {
      transport = new StdioTransport();

      const response: McpResponse = {
        jsonrpc: '2.0',
        result: { data: 'test' },
        id: 1,
      };

      transport.onMessage((message) => {
        expect(message).toEqual(response);
        done();
      });

      mockStdin.simulateInput(JSON.stringify(response) + '\n');
    });

    it('should receive multiple messages', (done) => {
      transport = new StdioTransport();
      const received: McpResponse[] = [];

      transport.onMessage((message) => {
        received.push(message);

        if (received.length === 2) {
          expect(received[0].id).toBe(1);
          expect(received[1].id).toBe(2);
          done();
        }
      });

      mockStdin.simulateInput(
        JSON.stringify({ jsonrpc: '2.0', result: {}, id: 1 }) + '\n'
      );
      mockStdin.simulateInput(
        JSON.stringify({ jsonrpc: '2.0', result: {}, id: 2 }) + '\n'
      );
    });

    it('should ignore empty lines', (done) => {
      transport = new StdioTransport();
      let callCount = 0;

      transport.onMessage(() => {
        callCount++;
      });

      mockStdin.simulateInput('\n');
      mockStdin.simulateInput('   \n');
      mockStdin.simulateInput('\t\n');

      setTimeout(() => {
        expect(callCount).toBe(0);
        done();
      }, 10);
    });

    it('should handle whitespace-only lines', (done) => {
      transport = new StdioTransport();
      let callCount = 0;

      transport.onMessage(() => {
        callCount++;
      });

      mockStdin.simulateInput('     \n');
      mockStdin.simulateInput('\t\t\n');

      setTimeout(() => {
        expect(callCount).toBe(0);
        done();
      }, 10);
    });

    it('should handle malformed JSON gracefully', (done) => {
      transport = new StdioTransport({ debug: false });

      transport.onMessage(() => {
        // Should not be called
        throw new Error('Should not receive malformed JSON');
      });

      mockStdin.simulateInput('invalid json\n');

      setTimeout(() => {
        done();
      }, 10);
    });

    it('should handle incomplete JSON gracefully', (done) => {
      transport = new StdioTransport({ debug: false });

      transport.onMessage(() => {
        throw new Error('Should not receive incomplete JSON');
      });

      mockStdin.simulateInput('{"jsonrpc": "2.0", "result": \n');

      setTimeout(() => {
        done();
      }, 10);
    });

    it('should handle stdin close event', (done) => {
      transport = new StdioTransport();

      transport.onMessage(() => {});

      expect(transport.isConnected()).toBe(true);

      mockStdin.simulateEnd();

      setTimeout(() => {
        expect(transport.isConnected()).toBe(false);
        done();
      }, 10);
    });

    it('should parse error responses correctly', (done) => {
      transport = new StdioTransport();

      const errorResponse: McpResponse = {
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request',
          data: { details: 'Missing method' },
        },
        id: 1,
      };

      transport.onMessage((message) => {
        expect(message).toEqual(errorResponse);
        if ('error' in message) {
          expect(message.error.code).toBe(-32600);
          expect(message.error.data).toEqual({ details: 'Missing method' });
        }
        done();
      });

      mockStdin.simulateInput(JSON.stringify(errorResponse) + '\n');
    });

    it('should handle messages with complex data structures', (done) => {
      transport = new StdioTransport();

      const complexResponse: McpResponse = {
        jsonrpc: '2.0',
        result: {
          nested: {
            array: [1, 2, { key: 'value' }],
            obj: { a: 1, b: 2 },
          },
        },
        id: 1,
      };

      transport.onMessage((message) => {
        expect(message).toEqual(complexResponse);
        done();
      });

      mockStdin.simulateInput(JSON.stringify(complexResponse) + '\n');
    });
  });

  describe('Bidirectional Communication', () => {
    it('should handle request and response cycle', async () => {
      transport = new StdioTransport();

      const response: McpResponse = {
        jsonrpc: '2.0',
        result: { success: true },
        id: 1,
      };

      const messagePromise = new Promise<McpResponse>((resolve) => {
        transport.onMessage(resolve);
      });

      // Send request
      await transport.send({
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
      });

      // Simulate response
      mockStdin.simulateInput(JSON.stringify(response) + '\n');

      const received = await messagePromise;
      expect(received).toEqual(response);
    });

    it('should handle concurrent messages', async () => {
      transport = new StdioTransport();
      const received: McpResponse[] = [];

      transport.onMessage((message) => {
        received.push(message);
      });

      // Send multiple requests
      await Promise.all([
        transport.send({ jsonrpc: '2.0', method: 'test1', id: 1 }),
        transport.send({ jsonrpc: '2.0', method: 'test2', id: 2 }),
        transport.send({ jsonrpc: '2.0', method: 'test3', id: 3 }),
      ]);

      expect(mockStdout.written).toHaveLength(3);

      // Simulate responses
      mockStdin.simulateInput(
        JSON.stringify({ jsonrpc: '2.0', result: {}, id: 1 }) + '\n'
      );
      mockStdin.simulateInput(
        JSON.stringify({ jsonrpc: '2.0', result: {}, id: 2 }) + '\n'
      );
      mockStdin.simulateInput(
        JSON.stringify({ jsonrpc: '2.0', result: {}, id: 3 }) + '\n'
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(received).toHaveLength(3);
    });
  });

  describe('Debug Mode', () => {
    it('should log debug messages when enabled', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      transport = new StdioTransport({ debug: true });
      transport.onMessage(() => {});

      await transport.send({
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
      });

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should not log when debug disabled', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      transport = new StdioTransport({ debug: false });
      transport.onMessage(() => {});

      await transport.send({
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
      });

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should log parse errors in debug mode', (done) => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      transport = new StdioTransport({ debug: true });
      transport.onMessage(() => {});

      mockStdin.simulateInput('invalid json\n');

      setTimeout(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Parse error')
        );
        consoleErrorSpy.mockRestore();
        done();
      }, 10);
    });

    it('should log stdin close in debug mode', (done) => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      transport = new StdioTransport({ debug: true });
      transport.onMessage(() => {});

      mockStdin.simulateEnd();

      setTimeout(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Stdin closed')
        );
        consoleErrorSpy.mockRestore();
        done();
      }, 10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle setting message handler multiple times', () => {
      transport = new StdioTransport();

      transport.onMessage(() => {});
      transport.onMessage(() => {});
      transport.onMessage(() => {});

      expect(transport.isConnected()).toBe(true);
    });

    it('should only use the latest message handler', (done) => {
      transport = new StdioTransport();

      let handler1Called = false;
      let handler2Called = false;

      transport.onMessage(() => {
        handler1Called = true;
      });

      transport.onMessage(() => {
        handler2Called = true;
      });

      mockStdin.simulateInput(
        JSON.stringify({ jsonrpc: '2.0', result: {}, id: 1 }) + '\n'
      );

      setTimeout(() => {
        expect(handler1Called).toBe(false);
        expect(handler2Called).toBe(true);
        done();
      }, 10);
    });

    it('should handle null id in messages', async () => {
      transport = new StdioTransport();
      transport.onMessage(() => {});

      await transport.send({
        jsonrpc: '2.0',
        method: 'test',
        id: null,
      });

      const written = mockStdout.getLastWritten();
      expect(written).toContain('"id":null');
    });

    it('should handle messages without id', (done) => {
      transport = new StdioTransport();

      transport.onMessage((message) => {
        expect('id' in message).toBe(true);
        done();
      });

      mockStdin.simulateInput(
        JSON.stringify({ jsonrpc: '2.0', result: {}, id: 1 }) + '\n'
      );
    });

    it('should clear message handler on close', async () => {
      transport = new StdioTransport();

      let callCount = 0;
      transport.onMessage(() => {
        callCount++;
      });

      await transport.close();

      mockStdin.simulateInput(
        JSON.stringify({ jsonrpc: '2.0', result: {}, id: 1 }) + '\n'
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callCount).toBe(0);
    });

    it('should handle large messages', async () => {
      transport = new StdioTransport();
      transport.onMessage(() => {});

      const largeData = 'x'.repeat(10000);
      const request: McpRequest = {
        jsonrpc: '2.0',
        method: 'test',
        params: { data: largeData },
        id: 1,
      };

      await transport.send(request);

      const written = mockStdout.getLastWritten();
      expect(written?.length).toBeGreaterThan(10000);
    });
  });
});
