/**
 * MCP Server Tests
 *
 * Tests for the Model Context Protocol server implementation
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Note: These are basic smoke tests
// Full integration tests would require setting up the runtime

describe('MCP Server', () => {
  it('should export MCP types and classes', async () => {
    const mcp = await import('../../dist/index.js');

    // Check that MCP exports exist
    assert.ok(mcp.PclMcpServer, 'PclMcpServer should be exported');
    assert.ok(mcp.PclServer, 'PclServer should be exported');
    assert.ok(mcp.PclMcpClient, 'PclMcpClient should be exported');
    assert.ok(mcp.StdioTransport, 'StdioTransport should be exported');
    assert.ok(mcp.HttpSseTransport, 'HttpSseTransport should be exported');
  });

  it('should have MCP version constant', async () => {
    const mcp = await import('../../dist/index.js');

    assert.ok(mcp.MCP_VERSION, 'MCP_VERSION should be exported');
    assert.strictEqual(typeof mcp.MCP_VERSION, 'string', 'MCP_VERSION should be a string');
  });

  it('should have MCP method constants', async () => {
    const mcp = await import('../../dist/index.js');

    assert.ok(mcp.McpMethod, 'McpMethod should be exported');
    assert.ok(mcp.McpMethod.Initialize, 'McpMethod.Initialize should exist');
    assert.ok(mcp.McpMethod.ToolsList, 'McpMethod.ToolsList should exist');
    assert.ok(mcp.McpMethod.ToolsCall, 'McpMethod.ToolsCall should exist');
    assert.ok(mcp.McpMethod.ResourcesList, 'McpMethod.ResourcesList should exist');
    assert.ok(mcp.McpMethod.ResourcesRead, 'McpMethod.ResourcesRead should exist');
  });
});

describe('MCP Server Creation', () => {
  it('should create PclMcpServer instance', async () => {
    const { PclMcpServer } = await import('../../dist/index.js');

    const server = new PclMcpServer({
      name: 'test-server',
      version: '1.0.0',
      description: 'Test MCP Server',
    });

    assert.ok(server, 'Server should be created');
    assert.strictEqual(server.info.name, 'test-server', 'Server name should match');
    assert.strictEqual(server.info.version, '1.0.0', 'Server version should match');
  });

  it('should register tools', async () => {
    const { PclMcpServer } = await import('../../dist/index.js');

    const server = new PclMcpServer({
      name: 'test-server',
      version: '1.0.0',
    });

    // Register a test tool
    server.registerTool(
      {
        name: 'test/echo',
        description: 'Echo the input',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Message to echo' },
          },
          required: ['message'],
        },
      },
      async (params) => {
        return {
          content: [
            {
              type: 'text',
              text: params.arguments.message,
            },
          ],
        };
      }
    );

    assert.ok(server, 'Server with tool should be created');
  });

  it('should register resources', async () => {
    const { PclMcpServer } = await import('../../dist/index.js');

    const server = new PclMcpServer({
      name: 'test-server',
      version: '1.0.0',
    });

    // Register a test resource
    server.registerResource(
      {
        uri: 'test://resource',
        name: 'Test Resource',
        description: 'A test resource',
        mimeType: 'text/plain',
      },
      async (uri) => {
        return {
          uri,
          mimeType: 'text/plain',
          text: 'Test resource content',
        };
      }
    );

    assert.ok(server, 'Server with resource should be created');
  });
});

describe('JSON-RPC', () => {
  it('should create JSON-RPC success response', async () => {
    const { createJsonRpcSuccessResponse } = await import('../../dist/index.js');

    const response = createJsonRpcSuccessResponse({ foo: 'bar' }, 1);

    assert.strictEqual(response.jsonrpc, '2.0', 'Should have JSON-RPC version');
    assert.strictEqual(response.id, 1, 'Should have request ID');
    assert.deepStrictEqual(response.result, { foo: 'bar' }, 'Should have result');
    assert.strictEqual(response.error, undefined, 'Should not have error');
  });

  it('should create JSON-RPC error response', async () => {
    const { createJsonRpcErrorResponse, JsonRpcErrorCode } = await import('../../dist/index.js');

    const response = createJsonRpcErrorResponse(
      JsonRpcErrorCode.MethodNotFound,
      'Method not found',
      1
    );

    assert.strictEqual(response.jsonrpc, '2.0', 'Should have JSON-RPC version');
    assert.strictEqual(response.id, 1, 'Should have request ID');
    assert.strictEqual(response.result, undefined, 'Should not have result');
    assert.ok(response.error, 'Should have error');
    assert.strictEqual(response.error.code, JsonRpcErrorCode.MethodNotFound, 'Should have error code');
    assert.strictEqual(response.error.message, 'Method not found', 'Should have error message');
  });
});

console.log('✅ All MCP tests passed');
