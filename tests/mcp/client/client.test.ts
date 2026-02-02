/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * MCP Client Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { PclMcpClient } from '../../../src/mcp/client/client';
import type {
  McpTransport,
  McpRequest,
  McpResponse,
  McpTool,
  McpResource,
} from '../../../src/mcp/types/mcp';
import { MCP_VERSION, McpMethod } from '../../../src/mcp/types/mcp';
import {
  createJsonRpcSuccessResponse,
  createJsonRpcErrorResponse,
  JsonRpcErrorCode,
} from '../../../src/mcp/types/jsonrpc';

// ═══════════════════════════════════════════════════════════════════════════════
//                              MOCK TRANSPORT
// ═══════════════════════════════════════════════════════════════════════════════

class MockTransport implements McpTransport {
  private messageHandler: ((message: McpResponse) => void) | null = null;
  private connected = true;
  public sentMessages: McpRequest[] = [];
  public autoRespond = true;

  async send(message: McpRequest): Promise<void> {
    this.sentMessages.push(message);

    // Auto-respond to requests if enabled
    if (
      this.autoRespond &&
      this.messageHandler &&
      'id' in message &&
      message.id !== undefined
    ) {
      // Simulate async response
      setTimeout(() => {
        const response = this.generateResponse(message);
        if (response && this.messageHandler) {
          this.messageHandler(response);
        }
      }, 0);
    }
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

  // Test helper to manually send response
  simulateResponse(response: McpResponse): void {
    if (this.messageHandler) {
      this.messageHandler(response);
    }
  }

  // Generate appropriate response based on request
  private generateResponse(request: McpRequest): McpResponse | null {
    if (!('id' in request) || request.id === undefined) {
      return null;
    }

    switch (request.method) {
      case McpMethod.Initialize:
        return createJsonRpcSuccessResponse(
          {
            protocolVersion: MCP_VERSION,
            capabilities: [
              { type: 'tools', description: 'Tool support' },
              { type: 'resources', description: 'Resource support' },
            ],
            serverInfo: {
              name: 'mock-server',
              version: '1.0.0',
              protocolVersion: MCP_VERSION,
              capabilities: [],
            },
          },
          request.id
        );

      case McpMethod.ToolsList:
        return createJsonRpcSuccessResponse(
          {
            tools: [
              {
                name: 'test-tool',
                description: 'A test tool',
                inputSchema: { type: 'object', properties: {} },
              },
            ],
          },
          request.id
        );

      case McpMethod.ToolsCall:
        return createJsonRpcSuccessResponse(
          {
            content: [{ type: 'text', text: 'Tool result' }],
          },
          request.id
        );

      case McpMethod.ResourcesList:
        return createJsonRpcSuccessResponse(
          {
            resources: [
              {
                uri: 'test://resource/1',
                name: 'Test Resource',
                mimeType: 'text/plain',
              },
            ],
          },
          request.id
        );

      case McpMethod.ResourcesRead:
        return createJsonRpcSuccessResponse(
          {
            uri: 'test://resource/1',
            mimeType: 'text/plain',
            text: 'Resource content',
          },
          request.id
        );

      case McpMethod.PromptsList:
        return createJsonRpcSuccessResponse(
          {
            prompts: [
              {
                name: 'test-prompt',
                description: 'A test prompt',
              },
            ],
          },
          request.id
        );

      case McpMethod.PromptsGet:
        return createJsonRpcSuccessResponse(
          {
            messages: [
              {
                role: 'user',
                content: { type: 'text', text: 'Test prompt' },
              },
            ],
          },
          request.id
        );

      case McpMethod.Shutdown:
        return createJsonRpcSuccessResponse(null, request.id);

      default:
        return createJsonRpcErrorResponse(
          JsonRpcErrorCode.MethodNotFound,
          `Unknown method: ${request.method}`,
          request.id
        );
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              CLIENT INITIALIZATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclMcpClient - Initialization', () => {
  it('should initialize with client info', () => {
    const client = new PclMcpClient({
      name: 'test-client',
      version: '1.0.0',
    });

    expect(client.info.name).toBe('test-client');
    expect(client.info.version).toBe('1.0.0');
    expect(client.info.protocolVersion).toBe(MCP_VERSION);
  });

  it('should not be connected initially', () => {
    const client = new PclMcpClient({
      name: 'test-client',
      version: '1.0.0',
    });

    expect(client.isConnected()).toBe(false);
    expect(client.getServerInfo()).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              CONNECTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclMcpClient - Connection', () => {
  let client: PclMcpClient;
  let transport: MockTransport;

  beforeEach(() => {
    client = new PclMcpClient({
      name: 'test-client',
      version: '1.0.0',
    });
    transport = new MockTransport();
  });

  it('should connect to server successfully', async () => {
    const result = await client.connect(transport);

    expect(result).toHaveProperty('protocolVersion', MCP_VERSION);
    expect(result).toHaveProperty('capabilities');
    expect(result).toHaveProperty('serverInfo');
    expect(client.isConnected()).toBe(true);
  });

  it('should throw if already connected', async () => {
    await client.connect(transport);

    await expect(client.connect(new MockTransport())).rejects.toThrow(
      'Client already connected'
    );
  });

  it('should send initialize request on connect', async () => {
    await client.connect(transport);

    const initRequest = transport.sentMessages.find(
      (msg) => msg.method === McpMethod.Initialize
    );

    expect(initRequest).toBeDefined();
    expect(initRequest?.params).toHaveProperty('protocolVersion', MCP_VERSION);
    expect(initRequest?.params).toHaveProperty('clientInfo');
  });

  it('should send initialized notification after connect', async () => {
    await client.connect(transport);

    const initializedNotification = transport.sentMessages.find(
      (msg) => msg.method === McpMethod.Initialized
    );

    expect(initializedNotification).toBeDefined();
    expect(
      'id' in initializedNotification! && initializedNotification!.id
    ).toBeUndefined();
  });

  it('should store server info after connect', async () => {
    await client.connect(transport);

    const serverInfo = client.getServerInfo();
    expect(serverInfo).not.toBeNull();
    expect(serverInfo?.serverInfo.name).toBe('mock-server');
  });

  it('should set up message handler on connect', async () => {
    await client.connect(transport);

    expect(transport['messageHandler']).not.toBeNull();
  });

  it('should handle connection errors', async () => {
    transport.autoRespond = false;

    const connectPromise = client.connect(transport);

    // Send error response
    transport.simulateResponse(
      createJsonRpcErrorResponse(
        JsonRpcErrorCode.InternalError,
        'Connection failed',
        1
      )
    );

    await expect(connectPromise).rejects.toThrow('Connection failed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              DISCONNECTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclMcpClient - Disconnection', () => {
  let client: PclMcpClient;
  let transport: MockTransport;

  beforeEach(async () => {
    client = new PclMcpClient({
      name: 'test-client',
      version: '1.0.0',
    });
    transport = new MockTransport();
    await client.connect(transport);
  });

  it('should disconnect successfully', async () => {
    await client.disconnect();

    expect(client.isConnected()).toBe(false);
    expect(transport.isConnected()).toBe(false);
    expect(client.getServerInfo()).toBeNull();
  });

  it('should send shutdown request on disconnect', async () => {
    const messageCount = transport.sentMessages.length;
    await client.disconnect();

    const shutdownRequest = transport.sentMessages
      .slice(messageCount)
      .find((msg) => msg.method === McpMethod.Shutdown);

    expect(shutdownRequest).toBeDefined();
  });

  it('should close transport on disconnect', async () => {
    await client.disconnect();

    expect(transport.isConnected()).toBe(false);
  });

  it('should clear pending requests on disconnect', async () => {
    // Start a request but don't respond
    transport.autoRespond = false;
    const toolCallPromise = client.callTool('test', {});

    await client.disconnect();

    // The promise should still be pending but client is disconnected
    expect(client.isConnected()).toBe(false);
  });

  it('should handle disconnect when not connected', async () => {
    const disconnectedClient = new PclMcpClient({
      name: 'test',
      version: '1.0.0',
    });

    await expect(disconnectedClient.disconnect()).resolves.not.toThrow();
  });

  it('should handle disconnect errors gracefully', async () => {
    // Make shutdown throw an error
    transport.autoRespond = false;

    const disconnectPromise = client.disconnect();

    transport.simulateResponse(
      createJsonRpcErrorResponse(
        JsonRpcErrorCode.InternalError,
        'Shutdown failed',
        transport.sentMessages.length
      )
    );

    // Should still close transport despite error
    await expect(disconnectPromise).rejects.toThrow();
    expect(transport.isConnected()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              TOOL INVOCATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclMcpClient - Tool Invocation', () => {
  let client: PclMcpClient;
  let transport: MockTransport;

  beforeEach(async () => {
    client = new PclMcpClient({
      name: 'test-client',
      version: '1.0.0',
    });
    transport = new MockTransport();
    await client.connect(transport);
  });

  it('should list tools successfully', async () => {
    const tools = await client.listTools();

    expect(Array.isArray(tools)).toBe(true);
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('test-tool');
  });

  it('should call a tool successfully', async () => {
    const result = await client.callTool('test-tool', { arg: 'value' });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toBe('Tool result');
  });

  it('should pass arguments to tool call', async () => {
    const args = { input: 'test', count: 42 };
    await client.callTool('echo', args);

    const callRequest = transport.sentMessages
      .filter((msg) => msg.method === McpMethod.ToolsCall)
      .pop();

    expect(callRequest?.params).toHaveProperty('name', 'echo');
    expect(callRequest?.params).toHaveProperty('arguments', args);
  });

  it('should throw when calling tool while not connected', async () => {
    const disconnectedClient = new PclMcpClient({
      name: 'test',
      version: '1.0.0',
    });

    await expect(disconnectedClient.listTools()).rejects.toThrow(
      'Not connected'
    );
  });

  it('should handle tool call errors', async () => {
    transport.autoRespond = false;

    const toolCallPromise = client.callTool('failing-tool', {});

    const request = transport.sentMessages
      .filter((msg) => msg.method === McpMethod.ToolsCall)
      .pop();

    transport.simulateResponse(
      createJsonRpcErrorResponse(
        JsonRpcErrorCode.InternalError,
        'Tool execution failed',
        request?.id as number
      )
    );

    await expect(toolCallPromise).rejects.toThrow('Tool execution failed');
  });

  it('should increment request IDs for each tool call', async () => {
    await client.callTool('tool1', {});
    await client.callTool('tool2', {});
    await client.callTool('tool3', {});

    const callRequests = transport.sentMessages.filter(
      (msg) => msg.method === McpMethod.ToolsCall
    );

    const ids = callRequests.map((req) => req.id);
    expect(new Set(ids).size).toBe(callRequests.length); // All unique
  });

  it('should handle concurrent tool calls', async () => {
    transport.autoRespond = false;

    const call1 = client.callTool('tool1', {});
    const call2 = client.callTool('tool2', {});
    const call3 = client.callTool('tool3', {});

    // Respond to all
    const requests = transport.sentMessages.filter(
      (msg) => msg.method === McpMethod.ToolsCall
    );

    requests.forEach((req) => {
      transport.simulateResponse(
        createJsonRpcSuccessResponse(
          { content: [{ type: 'text', text: `Result for ${req.id}` }] },
          req.id!
        )
      );
    });

    const results = await Promise.all([call1, call2, call3]);
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.content.length > 0)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              RESOURCE RETRIEVAL TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclMcpClient - Resource Retrieval', () => {
  let client: PclMcpClient;
  let transport: MockTransport;

  beforeEach(async () => {
    client = new PclMcpClient({
      name: 'test-client',
      version: '1.0.0',
    });
    transport = new MockTransport();
    await client.connect(transport);
  });

  it('should list resources successfully', async () => {
    const resources = await client.listResources();

    expect(Array.isArray(resources)).toBe(true);
    expect(resources).toHaveLength(1);
    expect(resources[0].uri).toBe('test://resource/1');
  });

  it('should read a resource successfully', async () => {
    const content = await client.readResource('test://resource/1');

    expect(content.uri).toBe('test://resource/1');
    expect(content.mimeType).toBe('text/plain');
    expect(content.text).toBe('Resource content');
  });

  it('should pass URI to resource read', async () => {
    const uri = 'test://custom/resource';
    transport.autoRespond = false;

    const readPromise = client.readResource(uri);

    const request = transport.sentMessages
      .filter((msg) => msg.method === McpMethod.ResourcesRead)
      .pop();

    expect(request?.params).toHaveProperty('uri', uri);

    transport.simulateResponse(
      createJsonRpcSuccessResponse(
        { uri, mimeType: 'text/plain', text: 'content' },
        request?.id as number
      )
    );

    await readPromise;
  });

  it('should throw when listing resources while not connected', async () => {
    const disconnectedClient = new PclMcpClient({
      name: 'test',
      version: '1.0.0',
    });

    await expect(disconnectedClient.listResources()).rejects.toThrow(
      'Not connected'
    );
  });

  it('should handle resource read errors', async () => {
    transport.autoRespond = false;

    const readPromise = client.readResource('test://non-existent');

    const request = transport.sentMessages
      .filter((msg) => msg.method === McpMethod.ResourcesRead)
      .pop();

    transport.simulateResponse(
      createJsonRpcErrorResponse(
        JsonRpcErrorCode.InvalidParams,
        'Resource not found',
        request?.id as number
      )
    );

    await expect(readPromise).rejects.toThrow('Resource not found');
  });

  it('should handle concurrent resource reads', async () => {
    transport.autoRespond = false;

    const read1 = client.readResource('test://resource/1');
    const read2 = client.readResource('test://resource/2');
    const read3 = client.readResource('test://resource/3');

    const requests = transport.sentMessages.filter(
      (msg) => msg.method === McpMethod.ResourcesRead
    );

    requests.forEach((req, i) => {
      transport.simulateResponse(
        createJsonRpcSuccessResponse(
          {
            uri: `test://resource/${i + 1}`,
            mimeType: 'text/plain',
            text: `Content ${i + 1}`,
          },
          req.id!
        )
      );
    });

    const results = await Promise.all([read1, read2, read3]);
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.text?.includes('Content'))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              PROMPT EXECUTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclMcpClient - Prompt Execution', () => {
  let client: PclMcpClient;
  let transport: MockTransport;

  beforeEach(async () => {
    client = new PclMcpClient({
      name: 'test-client',
      version: '1.0.0',
    });
    transport = new MockTransport();
    await client.connect(transport);
  });

  it('should list prompts successfully', async () => {
    const prompts = await client.listPrompts();

    expect(Array.isArray(prompts)).toBe(true);
    expect(prompts).toHaveLength(1);
    expect(prompts[0].name).toBe('test-prompt');
  });

  it('should get a prompt successfully', async () => {
    const result = await client.getPrompt('test-prompt');

    expect(result.messages).toBeDefined();
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
  });

  it('should get a prompt with arguments', async () => {
    const args = { name: 'Alice', topic: 'testing' };
    transport.autoRespond = false;

    const promptPromise = client.getPrompt('greeting', args);

    const request = transport.sentMessages
      .filter((msg) => msg.method === McpMethod.PromptsGet)
      .pop();

    expect(request?.params).toHaveProperty('name', 'greeting');
    expect(request?.params).toHaveProperty('arguments', args);

    transport.simulateResponse(
      createJsonRpcSuccessResponse(
        {
          messages: [
            { role: 'user', content: { type: 'text', text: 'Hello Alice' } },
          ],
        },
        request?.id as number
      )
    );

    await promptPromise;
  });

  it('should get a prompt without arguments', async () => {
    const result = await client.getPrompt('simple-prompt');

    expect(result.messages).toBeDefined();
  });

  it('should throw when listing prompts while not connected', async () => {
    const disconnectedClient = new PclMcpClient({
      name: 'test',
      version: '1.0.0',
    });

    await expect(disconnectedClient.listPrompts()).rejects.toThrow(
      'Not connected'
    );
  });

  it('should handle prompt execution errors', async () => {
    transport.autoRespond = false;

    const promptPromise = client.getPrompt('failing-prompt');

    const request = transport.sentMessages
      .filter((msg) => msg.method === McpMethod.PromptsGet)
      .pop();

    transport.simulateResponse(
      createJsonRpcErrorResponse(
        JsonRpcErrorCode.InternalError,
        'Prompt execution failed',
        request?.id as number
      )
    );

    await expect(promptPromise).rejects.toThrow('Prompt execution failed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              REQUEST/RESPONSE HANDLING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclMcpClient - Request/Response Handling', () => {
  let client: PclMcpClient;
  let transport: MockTransport;

  beforeEach(async () => {
    client = new PclMcpClient({
      name: 'test-client',
      version: '1.0.0',
    });
    transport = new MockTransport();
    transport.autoRespond = false;
    await client.connect(transport);
  });

  it('should match responses to requests by ID', async () => {
    const call1Promise = client.callTool('tool1', {});
    const call2Promise = client.callTool('tool2', {});

    const requests = transport.sentMessages.filter(
      (msg) => msg.method === McpMethod.ToolsCall
    );

    // Respond in reverse order
    transport.simulateResponse(
      createJsonRpcSuccessResponse(
        { content: [{ type: 'text', text: 'Result 2' }] },
        requests[1].id!
      )
    );

    transport.simulateResponse(
      createJsonRpcSuccessResponse(
        { content: [{ type: 'text', text: 'Result 1' }] },
        requests[0].id!
      )
    );

    const [result1, result2] = await Promise.all([call1Promise, call2Promise]);

    expect(result1.content[0].text).toBe('Result 1');
    expect(result2.content[0].text).toBe('Result 2');
  });

  it('should ignore responses with null ID', async () => {
    // Send a notification-style response (no id)
    transport.simulateResponse({
      jsonrpc: '2.0',
      result: { notification: true },
      id: null,
    } as any);

    // Should not throw or cause issues
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  it('should ignore responses for unknown request IDs', async () => {
    transport.simulateResponse(
      createJsonRpcSuccessResponse({ content: [] }, 99999)
    );

    // Should not throw
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  it('should handle responses without id property', async () => {
    const response = { jsonrpc: '2.0', result: { data: 'test' } } as any;
    transport.simulateResponse(response);

    // Should not throw
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  it('should clean up pending request after response', async () => {
    const toolCallPromise = client.callTool('test', {});

    const request = transport.sentMessages
      .filter((msg) => msg.method === McpMethod.ToolsCall)
      .pop();

    transport.simulateResponse(
      createJsonRpcSuccessResponse(
        { content: [{ type: 'text', text: 'result' }] },
        request?.id!
      )
    );

    await toolCallPromise;

    // Sending the same response again should do nothing
    transport.simulateResponse(
      createJsonRpcSuccessResponse(
        { content: [{ type: 'text', text: 'duplicate' }] },
        request?.id!
      )
    );

    // No error should be thrown
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              CAPABILITY NEGOTIATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclMcpClient - Capability Negotiation', () => {
  let client: PclMcpClient;
  let transport: MockTransport;

  beforeEach(() => {
    client = new PclMcpClient({
      name: 'test-client',
      version: '1.0.0',
    });
    transport = new MockTransport();
  });

  it('should negotiate capabilities during initialization', async () => {
    await client.connect(transport);

    const initRequest = transport.sentMessages.find(
      (msg) => msg.method === McpMethod.Initialize
    );

    expect(initRequest?.params).toHaveProperty('capabilities');
  });

  it('should store server capabilities after connect', async () => {
    await client.connect(transport);

    const serverInfo = client.getServerInfo();
    expect(serverInfo?.capabilities).toBeDefined();
    expect(Array.isArray(serverInfo?.capabilities)).toBe(true);
  });

  it('should receive server info in initialize response', async () => {
    await client.connect(transport);

    const serverInfo = client.getServerInfo();
    expect(serverInfo?.serverInfo).toBeDefined();
    expect(serverInfo?.serverInfo.name).toBe('mock-server');
    expect(serverInfo?.serverInfo.version).toBe('1.0.0');
  });

  it('should handle servers with empty capabilities', async () => {
    transport.autoRespond = false;

    const connectPromise = client.connect(transport);

    const initRequest = transport.sentMessages.find(
      (msg) => msg.method === McpMethod.Initialize
    );

    transport.simulateResponse(
      createJsonRpcSuccessResponse(
        {
          protocolVersion: MCP_VERSION,
          capabilities: [],
          serverInfo: {
            name: 'minimal-server',
            version: '1.0.0',
            protocolVersion: MCP_VERSION,
            capabilities: [],
          },
        },
        initRequest?.id!
      )
    );

    await connectPromise;

    const serverInfo = client.getServerInfo();
    expect(serverInfo?.capabilities).toEqual([]);
  });

  it('should handle servers with custom capabilities', async () => {
    transport.autoRespond = false;

    const connectPromise = client.connect(transport);

    const initRequest = transport.sentMessages.find(
      (msg) => msg.method === McpMethod.Initialize
    );

    transport.simulateResponse(
      createJsonRpcSuccessResponse(
        {
          protocolVersion: MCP_VERSION,
          capabilities: [
            { type: 'custom', description: 'Custom capability' },
            { type: 'experimental', description: 'Experimental feature' },
          ],
          serverInfo: {
            name: 'custom-server',
            version: '1.0.0',
            protocolVersion: MCP_VERSION,
            capabilities: [],
          },
        },
        initRequest?.id!
      )
    );

    await connectPromise;

    const serverInfo = client.getServerInfo();
    expect(serverInfo?.capabilities).toHaveLength(2);
    expect(serverInfo?.capabilities[0].type).toBe('custom');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              STATE MANAGEMENT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclMcpClient - State Management', () => {
  let client: PclMcpClient;
  let transport: MockTransport;

  beforeEach(async () => {
    client = new PclMcpClient({
      name: 'test-client',
      version: '1.0.0',
    });
    transport = new MockTransport();
  });

  it('should track connection state correctly', async () => {
    expect(client.isConnected()).toBe(false);

    await client.connect(transport);
    expect(client.isConnected()).toBe(true);

    await client.disconnect();
    expect(client.isConnected()).toBe(false);
  });

  it('should clear server info on disconnect', async () => {
    await client.connect(transport);
    expect(client.getServerInfo()).not.toBeNull();

    await client.disconnect();
    expect(client.getServerInfo()).toBeNull();
  });

  it('should maintain client info throughout lifecycle', async () => {
    const originalInfo = client.info;

    await client.connect(transport);
    expect(client.info).toBe(originalInfo);

    await client.disconnect();
    expect(client.info).toBe(originalInfo);
  });

  it('should handle multiple connect/disconnect cycles', async () => {
    // First cycle
    await client.connect(transport);
    expect(client.isConnected()).toBe(true);
    await client.disconnect();
    expect(client.isConnected()).toBe(false);

    // Second cycle with new transport
    const transport2 = new MockTransport();
    await client.connect(transport2);
    expect(client.isConnected()).toBe(true);
    await client.disconnect();
    expect(client.isConnected()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              ERROR SCENARIO TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclMcpClient - Error Scenarios', () => {
  let client: PclMcpClient;
  let transport: MockTransport;

  beforeEach(async () => {
    client = new PclMcpClient({
      name: 'test-client',
      version: '1.0.0',
    });
    transport = new MockTransport();
    transport.autoRespond = false;
    await client.connect(transport);
  });

  it('should throw on operations when not connected', async () => {
    await client.disconnect();

    await expect(client.listTools()).rejects.toThrow('Not connected');
    await expect(client.callTool('test', {})).rejects.toThrow('Not connected');
    await expect(client.listResources()).rejects.toThrow('Not connected');
    await expect(client.readResource('test://uri')).rejects.toThrow(
      'Not connected'
    );
    await expect(client.listPrompts()).rejects.toThrow('Not connected');
    await expect(client.getPrompt('test')).rejects.toThrow('Not connected');
  });

  it('should handle JSON-RPC error responses', async () => {
    const toolCallPromise = client.callTool('error-tool', {});

    const request = transport.sentMessages
      .filter((msg) => msg.method === McpMethod.ToolsCall)
      .pop();

    transport.simulateResponse(
      createJsonRpcErrorResponse(
        JsonRpcErrorCode.InvalidParams,
        'Invalid parameters',
        request?.id!,
        { details: 'Missing required field' }
      )
    );

    await expect(toolCallPromise).rejects.toThrow('Invalid parameters');
  });

  it('should handle transport send failures', async () => {
    const failingTransport = new MockTransport();
    failingTransport.send = async () => {
      throw new Error('Network error');
    };

    const failingClient = new PclMcpClient({
      name: 'test',
      version: '1.0.0',
    });

    await expect(failingClient.connect(failingTransport)).rejects.toThrow(
      'Network error'
    );
  });

  it('should handle malformed responses gracefully', async () => {
    const toolCallPromise = client.callTool('test', {});

    const request = transport.sentMessages
      .filter((msg) => msg.method === McpMethod.ToolsCall)
      .pop();

    // Send response without proper structure
    transport.simulateResponse({
      jsonrpc: '2.0',
      id: request?.id!,
      // Missing both result and error
    } as any);

    // Should treat as error
    await expect(toolCallPromise).rejects.toThrow();
  });

  it('should handle responses arriving after timeout', async () => {
    const toolCallPromise = client.callTool('slow-tool', {});

    const request = transport.sentMessages
      .filter((msg) => msg.method === McpMethod.ToolsCall)
      .pop();

    // Disconnect before response
    await client.disconnect();

    // Late response should be ignored
    transport.simulateResponse(
      createJsonRpcSuccessResponse(
        { content: [{ type: 'text', text: 'late' }] },
        request?.id!
      )
    );

    // Promise should still be pending/rejected due to disconnect
    expect(client.isConnected()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              EDGE CASES TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclMcpClient - Edge Cases', () => {
  it('should handle empty tool arguments', async () => {
    const client = new PclMcpClient({ name: 'test', version: '1.0.0' });
    const transport = new MockTransport();
    await client.connect(transport);

    const result = await client.callTool('no-args-tool', {});
    expect(result).toBeDefined();
  });

  it('should handle large response payloads', async () => {
    const client = new PclMcpClient({ name: 'test', version: '1.0.0' });
    const transport = new MockTransport();
    transport.autoRespond = false;
    await client.connect(transport);

    const toolCallPromise = client.callTool('large-response', {});

    const request = transport.sentMessages
      .filter((msg) => msg.method === McpMethod.ToolsCall)
      .pop();

    const largeText = 'x'.repeat(1000000); // 1MB of text
    transport.simulateResponse(
      createJsonRpcSuccessResponse(
        { content: [{ type: 'text', text: largeText }] },
        request?.id!
      )
    );

    const result = await toolCallPromise;
    expect(result.content[0].text?.length).toBe(1000000);
  });

  it('should handle rapid connect/disconnect', async () => {
    const client = new PclMcpClient({ name: 'test', version: '1.0.0' });

    for (let i = 0; i < 10; i++) {
      const transport = new MockTransport();
      await client.connect(transport);
      await client.disconnect();
    }

    expect(client.isConnected()).toBe(false);
  });

  it('should handle special characters in arguments', async () => {
    const client = new PclMcpClient({ name: 'test', version: '1.0.0' });
    const transport = new MockTransport();
    await client.connect(transport);

    const specialArgs = {
      unicode: '你好世界 🌍',
      escaped: 'line1\nline2\ttab',
      quotes: '"quoted" and \'single\'',
    };

    await client.callTool('special-chars', specialArgs);

    const request = transport.sentMessages
      .filter((msg) => msg.method === McpMethod.ToolsCall)
      .pop();

    expect(request?.params).toHaveProperty('arguments', specialArgs);
  });

  it('should handle numeric and boolean request IDs', async () => {
    const client = new PclMcpClient({ name: 'test', version: '1.0.0' });
    const transport = new MockTransport();
    transport.autoRespond = false;
    await client.connect(transport);

    await client.callTool('test', {});

    const request = transport.sentMessages
      .filter((msg) => msg.method === McpMethod.ToolsCall)
      .pop();

    expect(typeof request?.id).toBe('number');
  });
});
