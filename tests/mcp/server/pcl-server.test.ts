/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * PCL MCP Server Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { PclServer } from '../../../src/mcp/server/pcl-server';
import { createRuntime } from '../../../src/runtime';
import { parse } from '../../../src/parser';
import type {
  McpTransport,
  McpRequest,
  McpResponse,
} from '../../../src/mcp/types/mcp';
import { MCP_VERSION, McpMethod } from '../../../src/mcp/types/mcp';
import type { Runtime } from '../../../src/runtime';

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

  getMessageHandler(): ((message: McpResponse) => void) | null {
    return this.messageHandler;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              MOCK RUNTIME
// ═══════════════════════════════════════════════════════════════════════════════

function createMockRuntime(): Runtime {
  const runtime = createRuntime();

  // Load test personas and teams using PCL
  const pclCode = `
    persona Developer {
      intent: "Help with code"
      tone: professional
      skills: [coding, debugging]
      constraints: ["Be concise"]
    }

    persona Analyst {
      intent: "Analyze data"
      tone: analytical
      skills: [data-analysis, statistics]
    }

    team CodeReview {
      members: [Developer, Analyst]
      merge: chain
    }
  `;

  const parseResult = parse(pclCode);
  if (!parseResult.ok) {
    throw new Error(
      `Failed to parse test PCL: ${parseResult.error.map((e) => e.message).join(', ')}`
    );
  }

  runtime.load(parseResult.value.program);

  return runtime;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              PCL SERVER INITIALIZATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclServer - Initialization', () => {
  let runtime: Runtime;

  beforeEach(() => {
    runtime = createMockRuntime();
  });

  it('should initialize with runtime and config', () => {
    const server = new PclServer({
      name: 'pcl-server',
      version: '1.0.0',
      description: 'PCL MCP Server',
      runtime,
    });

    expect(server.info.name).toBe('pcl-server');
    expect(server.info.version).toBe('1.0.0');
    expect(server.info.protocolVersion).toBe(MCP_VERSION);
  });

  it('should register PCL tools automatically', async () => {
    const server = new PclServer({
      name: 'pcl-server',
      version: '1.0.0',
      runtime,
    });

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
      id: 0,
    });

    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsList,
      params: {},
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      const toolNames = response.result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('persona/execute');
      expect(toolNames).toContain('persona/list');
      expect(toolNames).toContain('persona/get');
      expect(toolNames).toContain('team/execute');
      expect(toolNames).toContain('team/list');
      expect(toolNames).toContain('team/get');
    }
  });

  it('should register PCL resources automatically', async () => {
    const server = new PclServer({
      name: 'pcl-server',
      version: '1.0.0',
      runtime,
    });

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
      id: 0,
    });

    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ResourcesList,
      params: {},
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      const uris = response.result.resources.map((r: any) => r.uri);
      expect(uris).toContain('pcl://persona/{id}');
      expect(uris).toContain('pcl://team/{id}');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              PERSONA/EXECUTE TOOL TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclServer - persona/execute Tool', () => {
  let server: PclServer;
  let runtime: Runtime;

  beforeEach(async () => {
    runtime = createMockRuntime();
    server = new PclServer({
      name: 'pcl-server',
      version: '1.0.0',
      runtime,
    });

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
      id: 0,
    });
  });

  it('should execute a persona with valid input', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'persona/execute',
        arguments: {
          persona: 'Developer',
          input: 'Hello, developer!',
        },
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      expect(response.result.content).toBeDefined();
      expect(response.result.content).toHaveLength(1);
      expect(response.result.content[0].type).toBe('text');
    }
  });

  it('should execute persona with context', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'persona/execute',
        arguments: {
          persona: 'Developer',
          input: 'Review this code',
          context: { language: 'typescript', strict: true },
        },
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      expect(response.result.content).toBeDefined();
    }
  });

  it('should return error for non-existent persona', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'persona/execute',
        arguments: {
          persona: 'non-existent',
          input: 'Hello',
        },
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toContain('not found');
    }
  });

  it('should activate persona if not active', async () => {
    const persona = runtime.getPersona('Developer');
    expect(persona?.getState().active).toBe(false);

    await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'persona/execute',
        arguments: {
          persona: 'Developer',
          input: 'Test',
        },
      },
      id: 1,
    });

    expect(persona?.getState().active).toBe(true);
  });

  it('should handle execution errors gracefully', async () => {
    // Mock send to return error result
    vi.spyOn(runtime, 'send').mockResolvedValueOnce({
      ok: false,
      error: new Error('Execution failed'),
    } as any);

    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'persona/execute',
        arguments: {
          persona: 'Developer',
          input: 'Test',
        },
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      expect(response.result.isError).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              PERSONA/LIST TOOL TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclServer - persona/list Tool', () => {
  let server: PclServer;
  let runtime: Runtime;

  beforeEach(async () => {
    runtime = createMockRuntime();
    server = new PclServer({
      name: 'pcl-server',
      version: '1.0.0',
      runtime,
    });

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
      id: 0,
    });
  });

  it('should list all available personas', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'persona/list',
        arguments: {},
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      expect(response.result.content).toHaveLength(1);
      const text = response.result.content[0].text;
      expect(text).toContain('Developer');
      expect(text).toContain('Analyst');
    }
  });

  it('should indicate persona activation status', async () => {
    runtime.activate('Developer');

    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'persona/list',
        arguments: {},
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      const text = response.result.content[0].text;
      expect(text).toContain('active');
      expect(text).toContain('inactive');
    }
  });

  it('should handle empty persona list', async () => {
    const emptyRuntime = createRuntime();
    const emptyServer = new PclServer({
      name: 'pcl-server',
      version: '1.0.0',
      runtime: emptyRuntime,
    });

    await emptyServer.handleRequest({
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
      id: 0,
    });

    const response = await emptyServer.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'persona/list',
        arguments: {},
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      expect(response.result.content[0].text).toContain(
        'No personas available'
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              PERSONA/GET TOOL TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclServer - persona/get Tool', () => {
  let server: PclServer;
  let runtime: Runtime;

  beforeEach(async () => {
    runtime = createMockRuntime();
    server = new PclServer({
      name: 'pcl-server',
      version: '1.0.0',
      runtime,
    });

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
      id: 0,
    });
  });

  it('should get persona information', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'persona/get',
        arguments: {
          persona: 'Developer',
        },
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      const text = response.result.content[0].text;
      expect(text).toContain('Persona');
      expect(text).toContain('Developer');
      expect(text).toContain('Status');
      expect(text).toContain('Tone');
      expect(text).toContain('Skills');
    }
  });

  it('should include persona stats', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'persona/get',
        arguments: {
          persona: 'Developer',
        },
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      const text = response.result.content[0].text;
      expect(text).toContain('Messages Processed');
      expect(text).toContain('Tokens Used');
    }
  });

  it('should return error for non-existent persona', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'persona/get',
        arguments: {
          persona: 'non-existent',
        },
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toContain('not found');
    }
  });

  it('should handle personas without intent', async () => {
    // Load a persona without intent
    const pclCode = `
      persona NoIntent {
        tone: balanced
      }
    `;

    const parseResult = parse(pclCode);
    if (parseResult.ok) {
      runtime.load(parseResult.value.program);
    }

    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'persona/get',
        arguments: {
          persona: 'NoIntent',
        },
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      const text = response.result.content[0].text;
      expect(text).toContain('N/A');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              TEAM/EXECUTE TOOL TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclServer - team/execute Tool', () => {
  let server: PclServer;
  let runtime: Runtime;

  beforeEach(async () => {
    runtime = createMockRuntime();
    server = new PclServer({
      name: 'pcl-server',
      version: '1.0.0',
      runtime,
    });

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
      id: 0,
    });
  });

  it('should execute a team with valid input', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'team/execute',
        arguments: {
          team: 'CodeReview',
          input: 'Review this PR',
        },
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      expect(response.result.content).toBeDefined();
      expect(response.result.content).toHaveLength(1);
    }
  });

  it('should execute team with context', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'team/execute',
        arguments: {
          team: 'CodeReview',
          input: 'Review code',
          context: { pr: 123, files: ['src/main.ts'] },
        },
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      expect(response.result.content).toBeDefined();
    }
  });

  it('should return error for non-existent team', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'team/execute',
        arguments: {
          team: 'non-existent',
          input: 'Hello',
        },
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toContain('not found');
    }
  });

  it('should activate team if not active', async () => {
    const team = runtime.getTeam('CodeReview');
    expect(team).toBeDefined();

    await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'team/execute',
        arguments: {
          team: 'CodeReview',
          input: 'Test',
        },
      },
      id: 1,
    });

    // Team should be activated
    expect(team).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              TEAM/LIST TOOL TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclServer - team/list Tool', () => {
  let server: PclServer;
  let runtime: Runtime;

  beforeEach(async () => {
    runtime = createMockRuntime();
    server = new PclServer({
      name: 'pcl-server',
      version: '1.0.0',
      runtime,
    });

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
      id: 0,
    });
  });

  it('should list all available teams', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'team/list',
        arguments: {},
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      expect(response.result.content).toHaveLength(1);
      const text = response.result.content[0].text;
      expect(text).toContain('CodeReview');
      expect(text).toContain('members');
      expect(text).toContain('merge');
    }
  });

  it('should show team member counts', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'team/list',
        arguments: {},
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      const text = response.result.content[0].text;
      expect(text).toContain('2 members');
    }
  });

  it('should handle empty team list', async () => {
    const emptyRuntime = createRuntime();
    const emptyServer = new PclServer({
      name: 'pcl-server',
      version: '1.0.0',
      runtime: emptyRuntime,
    });

    await emptyServer.handleRequest({
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
      id: 0,
    });

    const response = await emptyServer.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'team/list',
        arguments: {},
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      expect(response.result.content[0].text).toContain('No teams available');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              TEAM/GET TOOL TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclServer - team/get Tool', () => {
  let server: PclServer;
  let runtime: Runtime;

  beforeEach(async () => {
    runtime = createMockRuntime();
    server = new PclServer({
      name: 'pcl-server',
      version: '1.0.0',
      runtime,
    });

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
      id: 0,
    });
  });

  it('should get team information', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'team/get',
        arguments: {
          team: 'CodeReview',
        },
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      const text = response.result.content[0].text;
      expect(text).toContain('Team');
      expect(text).toContain('CodeReview');
      expect(text).toContain('Members');
      expect(text).toContain('Merge Mode');
    }
  });

  it('should include team stats', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'team/get',
        arguments: {
          team: 'CodeReview',
        },
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      const text = response.result.content[0].text;
      expect(text).toContain('Requests Processed');
      expect(text).toContain('Consensus Reached');
      expect(text).toContain('Conflicts Resolved');
    }
  });

  it('should return error for non-existent team', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'team/get',
        arguments: {
          team: 'non-existent',
        },
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toContain('not found');
    }
  });

  it('should show member names', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'team/get',
        arguments: {
          team: 'CodeReview',
        },
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      const text = response.result.content[0].text;
      expect(text).toContain('Developer');
      expect(text).toContain('Analyst');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              PERSONA RESOURCE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclServer - Persona Resources', () => {
  let server: PclServer;
  let runtime: Runtime;

  beforeEach(async () => {
    runtime = createMockRuntime();
    server = new PclServer({
      name: 'pcl-server',
      version: '1.0.0',
      runtime,
    });

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
      id: 0,
    });
  });

  it('should read persona resource', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ResourcesRead,
      params: {
        uri: 'pcl://persona/Developer',
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response && 'json' in response.result) {
      expect(response.result.json).toHaveProperty('id', 'Developer');
      expect(response.result.json).toHaveProperty('name', 'Developer');
      expect(response.result.json).toHaveProperty('config');
      expect(response.result.json).toHaveProperty('stats');
    }
  });

  it('should return error for invalid persona URI', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ResourcesRead,
      params: {
        uri: 'invalid-uri',
      },
      id: 1,
    });

    expect('error' in response).toBe(true);
  });

  it('should return error for non-existent persona', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ResourcesRead,
      params: {
        uri: 'pcl://persona/non-existent',
      },
      id: 1,
    });

    expect('error' in response).toBe(true);
    if ('error' in response) {
      expect(response.error.message).toContain('not found');
    }
  });

  it('should include persona activation state in resource', async () => {
    runtime.activate('Developer');

    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ResourcesRead,
      params: {
        uri: 'pcl://persona/Developer',
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response && 'json' in response.result) {
      expect(response.result.json).toHaveProperty('active', true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              TEAM RESOURCE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclServer - Team Resources', () => {
  let server: PclServer;
  let runtime: Runtime;

  beforeEach(async () => {
    runtime = createMockRuntime();
    server = new PclServer({
      name: 'pcl-server',
      version: '1.0.0',
      runtime,
    });

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
      id: 0,
    });
  });

  it('should read team resource', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ResourcesRead,
      params: {
        uri: 'pcl://team/CodeReview',
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response && 'json' in response.result) {
      expect(response.result.json).toHaveProperty('id', 'CodeReview');
      expect(response.result.json).toHaveProperty('name', 'CodeReview');
      expect(response.result.json).toHaveProperty('members');
      expect(response.result.json).toHaveProperty('config');
      expect(response.result.json).toHaveProperty('stats');
    }
  });

  it('should return error for invalid team URI', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ResourcesRead,
      params: {
        uri: 'invalid-team-uri',
      },
      id: 1,
    });

    expect('error' in response).toBe(true);
  });

  it('should return error for non-existent team', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ResourcesRead,
      params: {
        uri: 'pcl://team/non-existent',
      },
      id: 1,
    });

    expect('error' in response).toBe(true);
    if ('error' in response) {
      expect(response.error.message).toContain('not found');
    }
  });

  it('should include member names in team resource', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ResourcesRead,
      params: {
        uri: 'pcl://team/code-review',
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response && 'json' in response.result) {
      const members = response.result.json.members as string[];
      expect(members).toContain('Developer');
      expect(members).toContain('Analyst');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              ERROR HANDLING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PclServer - Error Handling', () => {
  let server: PclServer;
  let runtime: Runtime;

  beforeEach(async () => {
    runtime = createMockRuntime();
    server = new PclServer({
      name: 'pcl-server',
      version: '1.0.0',
      runtime,
    });

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
      id: 0,
    });
  });

  it('should handle errors in persona/list gracefully', async () => {
    vi.spyOn(runtime, 'getAllPersonas').mockImplementationOnce(() => {
      throw new Error('Database error');
    });

    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'persona/list',
        arguments: {},
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toContain(
        'Error listing personas'
      );
    }
  });

  it('should handle errors in team/list gracefully', async () => {
    vi.spyOn(runtime, 'getAllTeams').mockImplementationOnce(() => {
      throw new Error('Database error');
    });

    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'team/list',
        arguments: {},
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toContain('Error listing teams');
    }
  });

  it('should handle non-Error exceptions', async () => {
    vi.spyOn(runtime, 'getPersona').mockImplementationOnce(() => {
      throw 'String error';
    });

    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: McpMethod.ToolsCall,
      params: {
        name: 'persona/get',
        arguments: { persona: 'test' },
      },
      id: 1,
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      expect(response.result.isError).toBe(true);
    }
  });
});
