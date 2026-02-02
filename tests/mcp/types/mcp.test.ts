/**
 * MCP Types Tests
 *
 * Comprehensive test suite for Model Context Protocol types,
 * method enums, and type definitions.
 */

import {
  MCP_VERSION,
  McpMethod,
  type McpCapability,
  type McpServerInfo,
  type McpClientInfo,
  type McpTool,
  type McpToolCallParams,
  type McpToolCallResult,
  type McpResource,
  type McpResourceContent,
  type McpPrompt,
  type McpPromptResult,
  type McpInitializeParams,
  type McpInitializeResult,
  type McpRequest,
  type McpResponse,
} from '../../../src/mcp/types/mcp';

describe('MCP Constants', () => {
  it('should export correct version constant', () => {
    expect(MCP_VERSION).toBe('2024-11-05');
  });

  it('should have immutable version constant', () => {
    const version: '2024-11-05' = MCP_VERSION;
    expect(version).toBe('2024-11-05');
  });
});

describe('McpMethod Enum', () => {
  describe('Lifecycle Methods', () => {
    it('should have initialize method', () => {
      expect(McpMethod.Initialize).toBe('initialize');
    });

    it('should have initialized method', () => {
      expect(McpMethod.Initialized).toBe('initialized');
    });

    it('should have shutdown method', () => {
      expect(McpMethod.Shutdown).toBe('shutdown');
    });
  });

  describe('Tool Methods', () => {
    it('should have tools list method', () => {
      expect(McpMethod.ToolsList).toBe('tools/list');
    });

    it('should have tools call method', () => {
      expect(McpMethod.ToolsCall).toBe('tools/call');
    });
  });

  describe('Resource Methods', () => {
    it('should have resources list method', () => {
      expect(McpMethod.ResourcesList).toBe('resources/list');
    });

    it('should have resources read method', () => {
      expect(McpMethod.ResourcesRead).toBe('resources/read');
    });

    it('should have resources subscribe method', () => {
      expect(McpMethod.ResourcesSubscribe).toBe('resources/subscribe');
    });

    it('should have resources unsubscribe method', () => {
      expect(McpMethod.ResourcesUnsubscribe).toBe('resources/unsubscribe');
    });
  });

  describe('Prompt Methods', () => {
    it('should have prompts list method', () => {
      expect(McpMethod.PromptsList).toBe('prompts/list');
    });

    it('should have prompts get method', () => {
      expect(McpMethod.PromptsGet).toBe('prompts/get');
    });
  });

  describe('Logging Methods', () => {
    it('should have logging set level method', () => {
      expect(McpMethod.LoggingSetLevel).toBe('logging/setLevel');
    });
  });

  describe('Notification Methods', () => {
    it('should have notification cancelled method', () => {
      expect(McpMethod.NotificationCancelled).toBe('notifications/cancelled');
    });

    it('should have notification progress method', () => {
      expect(McpMethod.NotificationProgress).toBe('notifications/progress');
    });

    it('should have notification message method', () => {
      expect(McpMethod.NotificationMessage).toBe('notifications/message');
    });

    it('should have notification resources list changed method', () => {
      expect(McpMethod.NotificationResourcesListChanged).toBe(
        'notifications/resources/list_changed'
      );
    });

    it('should have notification resources updated method', () => {
      expect(McpMethod.NotificationResourcesUpdated).toBe(
        'notifications/resources/updated'
      );
    });
  });
});

describe('McpCapability Type', () => {
  it('should support basic capability', () => {
    const capability: McpCapability = {
      type: 'tools',
    };

    expect(capability.type).toBe('tools');
    expect(capability.description).toBeUndefined();
    expect(capability.properties).toBeUndefined();
  });

  it('should support capability with description', () => {
    const capability: McpCapability = {
      type: 'resources',
      description: 'Read-only file access',
    };

    expect(capability.type).toBe('resources');
    expect(capability.description).toBe('Read-only file access');
  });

  it('should support capability with properties', () => {
    const capability: McpCapability = {
      type: 'prompts',
      properties: {
        maxTokens: 1000,
        streaming: true,
      },
    };

    expect(capability.properties).toEqual({
      maxTokens: 1000,
      streaming: true,
    });
  });

  it('should support capability with all fields', () => {
    const capability: McpCapability = {
      type: 'custom',
      description: 'Custom capability',
      properties: {
        enabled: true,
        config: { key: 'value' },
      },
    };

    expect(capability.type).toBe('custom');
    expect(capability.description).toBe('Custom capability');
    expect(capability.properties?.enabled).toBe(true);
  });
});

describe('McpServerInfo Type', () => {
  it('should support complete server info', () => {
    const serverInfo: McpServerInfo = {
      name: 'TestServer',
      version: '1.0.0',
      protocolVersion: MCP_VERSION,
      capabilities: [{ type: 'tools' }, { type: 'resources' }],
    };

    expect(serverInfo.name).toBe('TestServer');
    expect(serverInfo.version).toBe('1.0.0');
    expect(serverInfo.protocolVersion).toBe('2024-11-05');
    expect(serverInfo.capabilities).toHaveLength(2);
  });

  it('should support server with no capabilities', () => {
    const serverInfo: McpServerInfo = {
      name: 'MinimalServer',
      version: '0.1.0',
      protocolVersion: MCP_VERSION,
      capabilities: [],
    };

    expect(serverInfo.capabilities).toEqual([]);
  });

  it('should enforce readonly protocol version', () => {
    const serverInfo: McpServerInfo = {
      name: 'Server',
      version: '1.0.0',
      protocolVersion: MCP_VERSION,
      capabilities: [],
    };

    // TypeScript enforces readonly at compile time
    expect(serverInfo.protocolVersion).toBe('2024-11-05');
  });
});

describe('McpClientInfo Type', () => {
  it('should support complete client info', () => {
    const clientInfo: McpClientInfo = {
      name: 'TestClient',
      version: '2.0.0',
      protocolVersion: MCP_VERSION,
    };

    expect(clientInfo.name).toBe('TestClient');
    expect(clientInfo.version).toBe('2.0.0');
    expect(clientInfo.protocolVersion).toBe('2024-11-05');
  });
});

describe('McpTool Type', () => {
  it('should support basic tool definition', () => {
    const tool: McpTool = {
      name: 'calculator',
      description: 'Perform calculations',
      inputSchema: {
        type: 'object',
        properties: {
          expression: { type: 'string' },
        },
      },
    };

    expect(tool.name).toBe('calculator');
    expect(tool.inputSchema.type).toBe('object');
  });

  it('should support tool with required fields', () => {
    const tool: McpTool = {
      name: 'search',
      description: 'Search for information',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          limit: { type: 'number' },
        },
        required: ['query'],
      },
    };

    expect(tool.inputSchema.required).toEqual(['query']);
  });

  it('should support tool with complex schema', () => {
    const tool: McpTool = {
      name: 'dataProcessor',
      description: 'Process data',
      inputSchema: {
        type: 'object',
        properties: {
          input: {
            type: 'array',
            items: { type: 'string' },
          },
          options: {
            type: 'object',
            properties: {
              format: { type: 'string', enum: ['json', 'xml'] },
            },
          },
        },
        required: ['input'],
      },
    };

    expect(tool.inputSchema.properties.input).toBeDefined();
    expect(tool.inputSchema.properties.options).toBeDefined();
  });
});

describe('McpToolCallParams Type', () => {
  it('should support tool call with arguments', () => {
    const params: McpToolCallParams = {
      name: 'calculator',
      arguments: {
        expression: '2 + 2',
      },
    };

    expect(params.name).toBe('calculator');
    expect(params.arguments.expression).toBe('2 + 2');
  });

  it('should support empty arguments', () => {
    const params: McpToolCallParams = {
      name: 'randomNumber',
      arguments: {},
    };

    expect(params.arguments).toEqual({});
  });

  it('should support complex arguments', () => {
    const params: McpToolCallParams = {
      name: 'process',
      arguments: {
        items: [1, 2, 3],
        options: { sort: true, filter: 'active' },
        callback: 'handleResult',
      },
    };

    expect(params.arguments.items).toEqual([1, 2, 3]);
    expect(params.arguments.options).toBeDefined();
  });
});

describe('McpToolCallResult Type', () => {
  it('should support text content result', () => {
    const result: McpToolCallResult = {
      content: [
        {
          type: 'text',
          text: 'Result: 42',
        },
      ],
    };

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toBe('Result: 42');
  });

  it('should support image content result', () => {
    const result: McpToolCallResult = {
      content: [
        {
          type: 'image',
          data: 'base64encodeddata',
          mimeType: 'image/png',
        },
      ],
    };

    expect(result.content[0].type).toBe('image');
    expect(result.content[0].mimeType).toBe('image/png');
  });

  it('should support resource content result', () => {
    const result: McpToolCallResult = {
      content: [
        {
          type: 'resource',
          data: 'file://path/to/resource',
          mimeType: 'application/json',
        },
      ],
    };

    expect(result.content[0].type).toBe('resource');
  });

  it('should support multiple content items', () => {
    const result: McpToolCallResult = {
      content: [
        { type: 'text', text: 'Header' },
        { type: 'image', data: 'imagedata', mimeType: 'image/jpeg' },
        { type: 'text', text: 'Footer' },
      ],
    };

    expect(result.content).toHaveLength(3);
  });

  it('should support error result', () => {
    const result: McpToolCallResult = {
      content: [
        {
          type: 'text',
          text: 'Error: Invalid input',
        },
      ],
      isError: true,
    };

    expect(result.isError).toBe(true);
  });

  it('should support empty content array', () => {
    const result: McpToolCallResult = {
      content: [],
    };

    expect(result.content).toEqual([]);
  });
});

describe('McpResource Type', () => {
  it('should support basic resource', () => {
    const resource: McpResource = {
      uri: 'file:///data/file.txt',
      name: 'file.txt',
    };

    expect(resource.uri).toBe('file:///data/file.txt');
    expect(resource.name).toBe('file.txt');
  });

  it('should support resource with description', () => {
    const resource: McpResource = {
      uri: 'http://example.com/api/data',
      name: 'API Data',
      description: 'Remote API data source',
    };

    expect(resource.description).toBe('Remote API data source');
  });

  it('should support resource with mime type', () => {
    const resource: McpResource = {
      uri: 'file:///config.json',
      name: 'config.json',
      mimeType: 'application/json',
    };

    expect(resource.mimeType).toBe('application/json');
  });

  it('should support resource with all fields', () => {
    const resource: McpResource = {
      uri: 'https://cdn.example.com/image.png',
      name: 'image.png',
      description: 'Profile image',
      mimeType: 'image/png',
    };

    expect(resource.uri).toBeTruthy();
    expect(resource.name).toBeTruthy();
    expect(resource.description).toBeTruthy();
    expect(resource.mimeType).toBeTruthy();
  });
});

describe('McpResourceContent Type', () => {
  it('should support text content', () => {
    const content: McpResourceContent = {
      uri: 'file:///data.txt',
      mimeType: 'text/plain',
      text: 'File contents here',
    };

    expect(content.text).toBe('File contents here');
    expect(content.blob).toBeUndefined();
  });

  it('should support blob content', () => {
    const content: McpResourceContent = {
      uri: 'file:///image.png',
      mimeType: 'image/png',
      blob: 'base64encodedimagedata',
    };

    expect(content.blob).toBe('base64encodedimagedata');
    expect(content.text).toBeUndefined();
  });

  it('should support both text and blob', () => {
    const content: McpResourceContent = {
      uri: 'file:///data',
      mimeType: 'application/octet-stream',
      text: 'metadata',
      blob: 'binarydata',
    };

    expect(content.text).toBe('metadata');
    expect(content.blob).toBe('binarydata');
  });
});

describe('McpPrompt Type', () => {
  it('should support basic prompt', () => {
    const prompt: McpPrompt = {
      name: 'greeting',
    };

    expect(prompt.name).toBe('greeting');
    expect(prompt.description).toBeUndefined();
    expect(prompt.arguments).toBeUndefined();
  });

  it('should support prompt with description', () => {
    const prompt: McpPrompt = {
      name: 'summarize',
      description: 'Summarize a document',
    };

    expect(prompt.description).toBe('Summarize a document');
  });

  it('should support prompt with arguments', () => {
    const prompt: McpPrompt = {
      name: 'translate',
      arguments: [
        { name: 'text', required: true },
        { name: 'targetLang', required: true },
        { name: 'sourceLang', required: false },
      ],
    };

    expect(prompt.arguments).toHaveLength(3);
    expect(prompt.arguments![0].required).toBe(true);
    expect(prompt.arguments![2].required).toBe(false);
  });

  it('should support prompt argument with description', () => {
    const prompt: McpPrompt = {
      name: 'analyze',
      arguments: [
        {
          name: 'data',
          description: 'Data to analyze',
          required: true,
        },
      ],
    };

    expect(prompt.arguments![0].description).toBe('Data to analyze');
  });
});

describe('McpPromptResult Type', () => {
  it('should support basic prompt result', () => {
    const result: McpPromptResult = {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'Hello!',
          },
        },
      ],
    };

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
  });

  it('should support result with description', () => {
    const result: McpPromptResult = {
      description: 'Generated greeting',
      messages: [
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: 'Hi there!',
          },
        },
      ],
    };

    expect(result.description).toBe('Generated greeting');
  });

  it('should support multiple messages', () => {
    const result: McpPromptResult = {
      messages: [
        {
          role: 'user',
          content: { type: 'text', text: 'Question' },
        },
        {
          role: 'assistant',
          content: { type: 'text', text: 'Answer' },
        },
      ],
    };

    expect(result.messages).toHaveLength(2);
  });

  it('should support image content in messages', () => {
    const result: McpPromptResult = {
      messages: [
        {
          role: 'user',
          content: {
            type: 'image',
            data: 'base64image',
            mimeType: 'image/jpeg',
          },
        },
      ],
    };

    expect(result.messages[0].content.type).toBe('image');
  });

  it('should support resource content in messages', () => {
    const result: McpPromptResult = {
      messages: [
        {
          role: 'assistant',
          content: {
            type: 'resource',
            data: 'file:///path',
            mimeType: 'application/json',
          },
        },
      ],
    };

    expect(result.messages[0].content.type).toBe('resource');
  });
});

describe('McpInitializeParams Type', () => {
  it('should support complete initialize params', () => {
    const params: McpInitializeParams = {
      protocolVersion: MCP_VERSION,
      capabilities: [{ type: 'tools' }],
      clientInfo: {
        name: 'TestClient',
        version: '1.0.0',
        protocolVersion: MCP_VERSION,
      },
    };

    expect(params.protocolVersion).toBe('2024-11-05');
    expect(params.capabilities).toHaveLength(1);
    expect(params.clientInfo.name).toBe('TestClient');
  });

  it('should support empty capabilities', () => {
    const params: McpInitializeParams = {
      protocolVersion: MCP_VERSION,
      capabilities: [],
      clientInfo: {
        name: 'MinimalClient',
        version: '0.1.0',
        protocolVersion: MCP_VERSION,
      },
    };

    expect(params.capabilities).toEqual([]);
  });
});

describe('McpInitializeResult Type', () => {
  it('should support complete initialize result', () => {
    const result: McpInitializeResult = {
      protocolVersion: MCP_VERSION,
      capabilities: [{ type: 'tools' }, { type: 'resources' }],
      serverInfo: {
        name: 'TestServer',
        version: '1.0.0',
        protocolVersion: MCP_VERSION,
        capabilities: [{ type: 'tools' }, { type: 'resources' }],
      },
    };

    expect(result.protocolVersion).toBe('2024-11-05');
    expect(result.capabilities).toHaveLength(2);
    expect(result.serverInfo.name).toBe('TestServer');
  });
});

describe('McpRequest Type', () => {
  it('should support MCP method in request', () => {
    const request: McpRequest = {
      jsonrpc: '2.0',
      method: McpMethod.ToolsList,
      id: 1,
    };

    expect(request.method).toBe('tools/list');
  });

  it('should support custom method string', () => {
    const request: McpRequest = {
      jsonrpc: '2.0',
      method: 'custom/method',
      id: 2,
    };

    expect(request.method).toBe('custom/method');
  });

  it('should support request with params', () => {
    const request: McpRequest = {
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'calculator',
        arguments: { expr: '1+1' },
      },
      id: 3,
    };

    expect(request.params).toBeDefined();
  });
});

describe('Type Integration', () => {
  it('should create valid tool call flow', () => {
    const tool: McpTool = {
      name: 'add',
      description: 'Add numbers',
      inputSchema: {
        type: 'object',
        properties: {
          a: { type: 'number' },
          b: { type: 'number' },
        },
        required: ['a', 'b'],
      },
    };

    const callParams: McpToolCallParams = {
      name: tool.name,
      arguments: { a: 5, b: 3 },
    };

    const result: McpToolCallResult = {
      content: [{ type: 'text', text: '8' }],
    };

    expect(callParams.name).toBe(tool.name);
    expect(result.content[0].text).toBe('8');
  });

  it('should create valid initialization flow', () => {
    const clientInfo: McpClientInfo = {
      name: 'Client',
      version: '1.0.0',
      protocolVersion: MCP_VERSION,
    };

    const initParams: McpInitializeParams = {
      protocolVersion: MCP_VERSION,
      capabilities: [{ type: 'tools' }],
      clientInfo,
    };

    const serverInfo: McpServerInfo = {
      name: 'Server',
      version: '1.0.0',
      protocolVersion: MCP_VERSION,
      capabilities: [{ type: 'tools' }],
    };

    const initResult: McpInitializeResult = {
      protocolVersion: MCP_VERSION,
      capabilities: [{ type: 'tools' }],
      serverInfo,
    };

    expect(initParams.clientInfo.name).toBe('Client');
    expect(initResult.serverInfo.name).toBe('Server');
  });
});
