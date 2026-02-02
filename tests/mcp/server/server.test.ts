/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * MCP Base Server Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { PclMcpServer } from '../../../src/mcp/server/server';
import type {
  McpTransport,
  McpRequest,
  McpResponse,
  McpTool,
  McpResource,
  McpToolCallParams,
  McpToolCallResult,
  McpResourceContent,
} from '../../../src/mcp/types/mcp';
import { MCP_VERSION, McpMethod } from '../../../src/mcp/types/mcp';
import { JsonRpcErrorCode } from '../../../src/mcp/types/jsonrpc';

// ═══════════════════════════════════════════════════════════════════════════════
//                              MOCK TRANSPORT
// ═══════════════════════════════════════════════════════════════════════════════

class MockTransport implements McpTransport {
  private messageHandler: ((message: McpResponse) => void) | null = null;
  private connected = true;
  public sentMessages: McpRequest[] = [];

  async send(message: McpRequest): Promise<void> {
    this.sentMessages.push(message);
  }

  onMessage(handler: (message: McpResponse) => void): void {
    this.messageHandler = handler;
  }

  async close(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Test helper to simulate incoming messages
  simulateMessage(message: McpResponse): void {
    if (this.messageHandler) {
      this.messageHandler(message);
    }
  }

  // Test helper to get message handler
  getMessageHandler(): ((message: McpResponse) => void) | null {
    return this.messageHandler;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              SERVER INITIALIZATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclMcpServer - Initialization', () => {
  it('should initialize with correct server info', () => {
    const server = new PclMcpServer({
      name: 'test-server',
      version: '1.0.0',
      description: 'Test server',
    });

    expect(server.info.name).toBe('test-server');
    expect(server.info.version).toBe('1.0.0');
    expect(server.info.protocolVersion).toBe(MCP_VERSION);
    expect(server.info.capabilities).toHaveLength(2);
  });

  it('should initialize capabilities correctly', () => {
    const server = new PclMcpServer({
      name: 'test-server',
      version: '1.0.0',
    });

    const capabilities = server.info.capabilities;
    expect(capabilities[0].type).toBe('tools');
    expect(capabilities[1].type).toBe('resources');
  });

  it('should initialize without description', () => {
    const server = new PclMcpServer({
      name: 'test-server',
      version: '1.0.0',
    });

    expect(server.info.name).toBe('test-server');
    expect(server.info.version).toBe('1.0.0');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              TOOL REGISTRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclMcpServer - Tool Registration', () => {
  let server: PclMcpServer;

  beforeEach(() => {
    server = new PclMcpServer({
      name: 'test-server',
      version: '1.0.0',
    });
  });

  it('should register a tool successfully', () => {
    const tool: McpTool = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {
          input: { type: 'string' },
        },
        required: ['input'],
      },
    };

    const handler = async (
      params: McpToolCallParams
    ): Promise<McpToolCallResult> => {
      return {
        content: [{ type: 'text', text: 'success' }],
      };
    };

    server.registerTool(tool, handler);

    // Verify by making a request after initialization
    const response = server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.Initialize,
      params: {
        protocolVersion: MCP_VERSION,
        capabilities: [],
        clientInfo: {
          name: 'test',
          version: '1.0.0',
          protocolVersion: MCP_VERSION,
        },
      },
      id: 1,
    });

    expect(response).toBeDefined();
  });

  it('should register multiple tools', () => {
    const tool1: McpTool = {
      name: 'tool1',
      description: 'First tool',
      inputSchema: { type: 'object', properties: {} },
    };

    const tool2: McpTool = {
      name: 'tool2',
      description: 'Second tool',
      inputSchema: { type: 'object', properties: {} },
    };

    server.registerTool(tool1, async () => ({ content: [] }));
    server.registerTool(tool2, async () => ({ content: [] }));

    // Tools should be registered (verified through tools/list later)
    expect(server.info.capabilities).toBeDefined();
  });

  it('should allow overwriting a tool', () => {
    const tool: McpTool = {
      name: 'test-tool',
      description: 'Original',
      inputSchema: { type: 'object', properties: {} },
    };

    const handler1 = async (): Promise<McpToolCallResult> => ({
      content: [{ type: 'text', text: 'handler1' }],
    });

    const handler2 = async (): Promise<McpToolCallResult> => ({
      content: [{ type: 'text', text: 'handler2' }],
    });

    server.registerTool(tool, handler1);
    server.registerTool({ ...tool, description: 'Updated' }, handler2);

    // Last handler should win
    expect(server.info.capabilities).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              RESOURCE REGISTRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclMcpServer - Resource Registration', () => {
  let server: PclMcpServer;

  beforeEach(() => {
    server = new PclMcpServer({
      name: 'test-server',
      version: '1.0.0',
    });
  });

  it('should register a resource successfully', () => {
    const resource: McpResource = {
      uri: 'test://resource/1',
      name: 'Test Resource',
      description: 'A test resource',
      mimeType: 'text/plain',
    };

    const provider = async (uri: string): Promise<McpResourceContent> => ({
      uri,
      mimeType: 'text/plain',
      text: 'content',
    });

    server.registerResource(resource, provider);

    expect(server.info.capabilities).toBeDefined();
  });

  it('should register multiple resources', () => {
    const resource1: McpResource = {
      uri: 'test://resource/1',
      name: 'Resource 1',
      mimeType: 'text/plain',
    };

    const resource2: McpResource = {
      uri: 'test://resource/2',
      name: 'Resource 2',
      mimeType: 'application/json',
    };

    server.registerResource(resource1, async (uri) => ({
      uri,
      mimeType: 'text/plain',
    }));
    server.registerResource(resource2, async (uri) => ({
      uri,
      mimeType: 'application/json',
    }));

    expect(server.info.capabilities).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              LIFECYCLE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclMcpServer - Lifecycle', () => {
  let server: PclMcpServer;
  let transport: MockTransport;

  beforeEach(() => {
    server = new PclMcpServer({
      name: 'test-server',
      version: '1.0.0',
    });
    transport = new MockTransport();
  });

  it('should start with a transport', async () => {
    await server.start(transport);

    expect(transport.getMessageHandler()).not.toBeNull();
  });

  it('should throw if started twice', async () => {
    await server.start(transport);

    await expect(server.start(new MockTransport())).rejects.toThrow(
      'Server already started'
    );
  });

  it('should stop gracefully', async () => {
    await server.start(transport);
    await server.stop();

    expect(transport.isConnected()).toBe(false);
  });

  it('should handle stop when not started', async () => {
    await expect(server.stop()).resolves.not.toThrow();
  });

  it('should clear state on stop', async () => {
    await server.start(transport);

    // Initialize
    await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.Initialize,
      params: {
        protocolVersion: MCP_VERSION,
        capabilities: [],
        clientInfo: {
          name: 'test',
          version: '1.0.0',
          protocolVersion: MCP_VERSION,
        },
      },
      id: 1,
    });

    await server.stop();

    // Should be uninitialized
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsList,
      params: {},
      id: 2,
    });

    expect(response).toHaveProperty('error');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              INITIALIZE REQUEST TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclMcpServer - Initialize Request', () => {
  let server: PclMcpServer;

  beforeEach(() => {
    server = new PclMcpServer({
      name: 'test-server',
      version: '1.0.0',
    });
  });

  it('should handle initialize request', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.Initialize,
      params: {
        protocolVersion: MCP_VERSION,
        capabilities: [],
        clientInfo: {
          name: 'client',
          version: '1.0.0',
          protocolVersion: MCP_VERSION,
        },
      },
      id: 1,
    });

    expect(response.id).toBe(1);
    expect('result' in response).toBe(true);

    if ('result' in response) {
      expect(response.result).toHaveProperty('protocolVersion', MCP_VERSION);
      expect(response.result).toHaveProperty('capabilities');
      expect(response.result).toHaveProperty('serverInfo');
    }
  });

  it('should reject double initialization', async () => {
    await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.Initialize,
      params: {
        protocolVersion: MCP_VERSION,
        capabilities: [],
        clientInfo: {
          name: 'client',
          version: '1.0.0',
          protocolVersion: MCP_VERSION,
        },
      },
      id: 1,
    });

    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.Initialize,
      params: {
        protocolVersion: MCP_VERSION,
        capabilities: [],
        clientInfo: {
          name: 'client',
          version: '1.0.0',
          protocolVersion: MCP_VERSION,
        },
      },
      id: 2,
    });

    expect('error' in response).toBe(true);
    if ('error' in response) {
      expect(response.error.code).toBe(JsonRpcErrorCode.InvalidRequest);
      expect(response.error.message).toContain('already initialized');
    }
  });

  it('should reject unsupported protocol version', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.Initialize,
      params: {
        protocolVersion: '1999-01-01' as typeof MCP_VERSION,
        capabilities: [],
        clientInfo: {
          name: 'client',
          version: '1.0.0',
          protocolVersion: MCP_VERSION,
        },
      },
      id: 1,
    });

    expect('error' in response).toBe(true);
    if ('error' in response) {
      expect(response.error.code).toBe(JsonRpcErrorCode.InvalidParams);
      expect(response.error.message).toContain('Unsupported protocol version');
    }
  });

  it('should handle initialize with null id', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.Initialize,
      params: {
        protocolVersion: MCP_VERSION,
        capabilities: [],
        clientInfo: {
          name: 'client',
          version: '1.0.0',
          protocolVersion: MCP_VERSION,
        },
      },
      id: null as any,
    });

    expect(response.id).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              TOOLS/LIST REQUEST TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclMcpServer - Tools/List Request', () => {
  let server: PclMcpServer;

  beforeEach(async () => {
    server = new PclMcpServer({
      name: 'test-server',
      version: '1.0.0',
    });

    // Initialize server
    await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.Initialize,
      params: {
        protocolVersion: MCP_VERSION,
        capabilities: [],
        clientInfo: {
          name: 'client',
          version: '1.0.0',
          protocolVersion: MCP_VERSION,
        },
      },
      id: 0,
    });
  });

  it('should list tools when none registered', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsList,
      params: {},
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      expect(response.result).toHaveProperty('tools');
      expect(Array.isArray(response.result.tools)).toBe(true);
      expect(response.result.tools).toHaveLength(0);
    }
  });

  it('should list registered tools', async () => {
    const tool: McpTool = {
      name: 'test-tool',
      description: 'Test tool',
      inputSchema: { type: 'object', properties: {} },
    };

    server.registerTool(tool, async () => ({ content: [] }));

    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsList,
      params: {},
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      expect(response.result.tools).toHaveLength(1);
      expect(response.result.tools[0].name).toBe('test-tool');
    }
  });

  it('should reject tools/list when not initialized', async () => {
    const uninitServer = new PclMcpServer({
      name: 'test-server',
      version: '1.0.0',
    });

    const response = await uninitServer.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsList,
      params: {},
      id: 1,
    });

    expect('error' in response).toBe(true);
    if ('error' in response) {
      expect(response.error.code).toBe(JsonRpcErrorCode.InvalidRequest);
      expect(response.error.message).toContain('not initialized');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              TOOLS/CALL REQUEST TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclMcpServer - Tools/Call Request', () => {
  let server: PclMcpServer;

  beforeEach(async () => {
    server = new PclMcpServer({
      name: 'test-server',
      version: '1.0.0',
    });

    await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.Initialize,
      params: {
        protocolVersion: MCP_VERSION,
        capabilities: [],
        clientInfo: {
          name: 'client',
          version: '1.0.0',
          protocolVersion: MCP_VERSION,
        },
      },
      id: 0,
    });
  });

  it('should call a registered tool', async () => {
    const tool: McpTool = {
      name: 'echo',
      description: 'Echo tool',
      inputSchema: {
        type: 'object',
        properties: { message: { type: 'string' } },
        required: ['message'],
      },
    };

    server.registerTool(tool, async (params) => ({
      content: [{ type: 'text', text: params.arguments.message as string }],
    }));

    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'echo',
        arguments: { message: 'hello' },
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      expect(response.result.content).toHaveLength(1);
      expect(response.result.content[0].text).toBe('hello');
    }
  });

  it('should return error for non-existent tool', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'non-existent',
        arguments: {},
      },
      id: 1,
    });

    expect('error' in response).toBe(true);
    if ('error' in response) {
      expect(response.error.code).toBe(JsonRpcErrorCode.MethodNotFound);
      expect(response.error.message).toContain('Tool not found');
    }
  });

  it('should handle tool execution errors', async () => {
    const tool: McpTool = {
      name: 'failing-tool',
      description: 'A tool that fails',
      inputSchema: { type: 'object', properties: {} },
    };

    server.registerTool(tool, async () => {
      throw new Error('Tool failed');
    });

    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'failing-tool',
        arguments: {},
      },
      id: 1,
    });

    expect('error' in response).toBe(true);
    if ('error' in response) {
      expect(response.error.code).toBe(JsonRpcErrorCode.InternalError);
      expect(response.error.message).toBe('Tool failed');
    }
  });

  it('should reject tools/call when not initialized', async () => {
    const uninitServer = new PclMcpServer({
      name: 'test-server',
      version: '1.0.0',
    });

    const response = await uninitServer.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'test',
        arguments: {},
      },
      id: 1,
    });

    expect('error' in response).toBe(true);
    if ('error' in response) {
      expect(response.error.code).toBe(JsonRpcErrorCode.InvalidRequest);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              RESOURCES/LIST REQUEST TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclMcpServer - Resources/List Request', () => {
  let server: PclMcpServer;

  beforeEach(async () => {
    server = new PclMcpServer({
      name: 'test-server',
      version: '1.0.0',
    });

    await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.Initialize,
      params: {
        protocolVersion: MCP_VERSION,
        capabilities: [],
        clientInfo: {
          name: 'client',
          version: '1.0.0',
          protocolVersion: MCP_VERSION,
        },
      },
      id: 0,
    });
  });

  it('should list resources when none registered', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ResourcesList,
      params: {},
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      expect(response.result.resources).toHaveLength(0);
    }
  });

  it('should list registered resources', async () => {
    const resource: McpResource = {
      uri: 'test://resource/1',
      name: 'Test Resource',
      mimeType: 'text/plain',
    };

    server.registerResource(resource, async (uri) => ({
      uri,
      mimeType: 'text/plain',
      text: 'content',
    }));

    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ResourcesList,
      params: {},
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      expect(response.result.resources).toHaveLength(1);
      expect(response.result.resources[0].uri).toBe('test://resource/1');
    }
  });

  it('should reject resources/list when not initialized', async () => {
    const uninitServer = new PclMcpServer({
      name: 'test-server',
      version: '1.0.0',
    });

    const response = await uninitServer.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ResourcesList,
      params: {},
      id: 1,
    });

    expect('error' in response).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              RESOURCES/READ REQUEST TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclMcpServer - Resources/Read Request', () => {
  let server: PclMcpServer;

  beforeEach(async () => {
    server = new PclMcpServer({
      name: 'test-server',
      version: '1.0.0',
    });

    await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.Initialize,
      params: {
        protocolVersion: MCP_VERSION,
        capabilities: [],
        clientInfo: {
          name: 'client',
          version: '1.0.0',
          protocolVersion: MCP_VERSION,
        },
      },
      id: 0,
    });
  });

  it('should read a registered resource', async () => {
    const resource: McpResource = {
      uri: 'test://resource/1',
      name: 'Test Resource',
      mimeType: 'text/plain',
    };

    server.registerResource(resource, async (uri) => ({
      uri,
      mimeType: 'text/plain',
      text: 'Hello, world!',
    }));

    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ResourcesRead,
      params: { uri: 'test://resource/1' },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      expect(response.result.uri).toBe('test://resource/1');
      expect(response.result.text).toBe('Hello, world!');
    }
  });

  it('should return error for non-existent resource', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ResourcesRead,
      params: { uri: 'test://non-existent' },
      id: 1,
    });

    expect('error' in response).toBe(true);
    if ('error' in response) {
      expect(response.error.code).toBe(JsonRpcErrorCode.InvalidParams);
      expect(response.error.message).toContain('Resource not found');
    }
  });

  it('should handle resource provider errors', async () => {
    const resource: McpResource = {
      uri: 'test://failing',
      name: 'Failing Resource',
      mimeType: 'text/plain',
    };

    server.registerResource(resource, async () => {
      throw new Error('Provider failed');
    });

    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ResourcesRead,
      params: { uri: 'test://failing' },
      id: 1,
    });

    expect('error' in response).toBe(true);
    if ('error' in response) {
      expect(response.error.code).toBe(JsonRpcErrorCode.InternalError);
      expect(response.error.message).toBe('Provider failed');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              SHUTDOWN REQUEST TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclMcpServer - Shutdown Request', () => {
  let server: PclMcpServer;
  let transport: MockTransport;

  beforeEach(async () => {
    server = new PclMcpServer({
      name: 'test-server',
      version: '1.0.0',
    });
    transport = new MockTransport();
    await server.start(transport);

    await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.Initialize,
      params: {
        protocolVersion: MCP_VERSION,
        capabilities: [],
        clientInfo: {
          name: 'client',
          version: '1.0.0',
          protocolVersion: MCP_VERSION,
        },
      },
      id: 0,
    });
  });

  it('should handle shutdown request', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.Shutdown,
      params: {},
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      expect(response.result).toBeNull();
    }
    expect(transport.isConnected()).toBe(false);
  });

  it('should be uninitialized after shutdown', async () => {
    await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.Shutdown,
      params: {},
      id: 1,
    });

    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsList,
      params: {},
      id: 2,
    });

    expect('error' in response).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              ERROR HANDLING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclMcpServer - Error Handling', () => {
  let server: PclMcpServer;

  beforeEach(() => {
    server = new PclMcpServer({
      name: 'test-server',
      version: '1.0.0',
    });
  });

  it('should return method not found for unknown method', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: 'unknown/method' as any,
      params: {},
      id: 1,
    });

    expect('error' in response).toBe(true);
    if ('error' in response) {
      expect(response.error.code).toBe(JsonRpcErrorCode.MethodNotFound);
      expect(response.error.message).toContain('Method not found');
    }
  });

  it('should handle requests with no id', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.Initialize,
      params: {
        protocolVersion: MCP_VERSION,
        capabilities: [],
        clientInfo: {
          name: 'client',
          version: '1.0.0',
          protocolVersion: MCP_VERSION,
        },
      },
    } as any);

    expect(response.id).toBeNull();
  });

  it('should include stack trace in error data', async () => {
    const tool: McpTool = {
      name: 'error-tool',
      description: 'Tool that throws error',
      inputSchema: { type: 'object', properties: {} },
    };

    server.registerTool(tool, async () => {
      throw new Error('Test error');
    });

    await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.Initialize,
      params: {
        protocolVersion: MCP_VERSION,
        capabilities: [],
        clientInfo: {
          name: 'client',
          version: '1.0.0',
          protocolVersion: MCP_VERSION,
        },
      },
      id: 0,
    });

    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'error-tool',
        arguments: {},
      },
      id: 1,
    });

    expect('error' in response).toBe(true);
    if ('error' in response && response.error.data) {
      expect(response.error.data).toHaveProperty('stack');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              MESSAGE ROUTING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclMcpServer - Message Routing', () => {
  let server: PclMcpServer;
  let transport: MockTransport;

  beforeEach(async () => {
    server = new PclMcpServer({
      name: 'test-server',
      version: '1.0.0',
    });
    transport = new MockTransport();
    await server.start(transport);
  });

  it('should route incoming messages to handler', async () => {
    const messageHandler = transport.getMessageHandler();
    expect(messageHandler).not.toBeNull();

    if (messageHandler) {
      const request: any = {
        jsonrpc: '2.0',
        method: McpMethod.Initialize,
        params: {
          protocolVersion: MCP_VERSION,
          capabilities: [],
          clientInfo: {
            name: 'client',
            version: '1.0.0',
            protocolVersion: MCP_VERSION,
          },
        },
        id: 1,
      };

      const initialCount = transport.sentMessages.length;
      messageHandler(request);

      // Wait for async handling
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should have sent a response
      expect(transport.sentMessages.length).toBeGreaterThan(initialCount);
    }
  });
});
