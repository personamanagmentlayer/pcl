# Model Context Protocol (MCP) Integration

PCL now supports the **Model Context Protocol (MCP)**, enabling seamless integration with Claude Code, Cursor, VS Code, and other MCP-compatible AI tools.

## What is MCP?

The **Model Context Protocol** is Anthropic's open standard for connecting AI applications to external data sources and tools. It provides a universal way to:

- **Expose capabilities** as discoverable tools
- **Share data** as accessible resources
- **Enable integration** with any MCP-compatible client

With MCP, your PCL personas become first-class tools that AI assistants can discover and use automatically.

---

## Why Use MCP with PCL?

### Before MCP

```typescript
// Manual persona execution
const compiler = new Compiler();
const ast = compiler.compile(source);
const runtime = new Runtime();
const result = await runtime.execute(ast);
```

**Limitations:**

- Manual integration required for each tool
- No standardized discovery mechanism
- Custom protocols for each AI assistant
- Difficult to share personas across tools

### After MCP

```
User: "Claude Code, use the CodeReviewer persona on this file"
Claude Code: *discovers PCL MCP server*
Claude Code: *executes persona/execute tool*
Claude Code: Here's the code review...
```

**Benefits:**

- ✅ **Automatic discovery**: AI tools find your personas instantly
- ✅ **Standardized protocol**: One implementation works everywhere
- ✅ **Zero configuration**: No custom integrations needed
- ✅ **Universal compatibility**: Works with Claude Code, Cursor, VS Code, etc.

---

## Quick Start

### 1. Install Dependencies

```bash
npm install @pcl/sdk @modelcontextprotocol/sdk
```

### 2. Create MCP Server

```typescript
import { PclServer, StdioTransport } from '@pcl/sdk/mcp';
import { Runtime } from '@pcl/sdk/runtime';

const runtime = new Runtime({
  personas: [...], // Your personas
  teams: [...],    // Your teams
});

const server = new PclServer({
  name: 'My PCL Server',
  version: '1.0.0',
  runtime,
});

const transport = new StdioTransport();
await server.start(transport);
```

### 3. Configure AI Tool

**Claude Code** (`~/.config/claude/mcp.json`):

```json
{
  "mcpServers": {
    "pcl": {
      "command": "node",
      "args": ["./dist/mcp-server.js"]
    }
  }
}
```

### 4. Use Your Personas

```
Ask Claude Code:
  "List available PCL personas"
  "Execute CodeReviewer on this file"
  "Run the ResearchTeam on topic X"
```

Done! Your personas are now available to any MCP-compatible tool.

---

## Architecture

### MCP Components

```
┌─────────────────────┐
│   AI Assistant      │  (Claude Code, Cursor, VS Code)
│   (MCP Client)      │
└──────────┬──────────┘
           │ JSON-RPC 2.0 over stdio/HTTP
           ↓
┌─────────────────────┐
│   PCL MCP Server    │
│                     │
│  ┌───────────────┐  │
│  │ Tool Handlers │  │  persona/execute
│  │               │  │  persona/list
│  │               │  │  team/execute
│  └───────────────┘  │
│                     │
│  ┌───────────────┐  │
│  │  Resources    │  │  persona://definition/{name}
│  │               │  │  team://definition/{name}
│  └───────────────┘  │
│                     │
│  ┌───────────────┐  │
│  │ PCL Runtime   │  │  Execute personas & workflows
│  └───────────────┘  │
└─────────────────────┘
```

### Communication Flow

1. **Discovery**: Client sends `initialize` request
2. **Tool Listing**: Client calls `tools/list` to get available tools
3. **Execution**: Client calls `tools/call` with parameters
4. **Result**: Server returns tool execution results
5. **Resources**: Client can read `resources/read` for additional data

---

## Core Features

### 1. Persona Execution

Execute any PCL persona as an MCP tool.

**Tool:** `persona/execute`

**Parameters:**

- `persona` (string): Persona name or ID
- `input` (string): Input message/prompt
- `context` (object, optional): Context variables

**Example:**

```typescript
await client.callTool('persona/execute', {
  persona: 'CodeReviewer',
  input: 'function add(a, b) { return a + b }',
  context: { language: 'javascript' },
});
```

**Result:**

```json
{
  "content": [
    {
      "type": "text",
      "text": "Code Review:\n- Good: Simple, pure function\n- Improvement: Add JSDoc comments\n- Security: No issues"
    }
  ]
}
```

### 2. Persona Discovery

List and inspect available personas.

**Tool:** `persona/list`

**Example:**

```typescript
await client.callTool('persona/list', {});
```

**Result:**

```json
{
  "content": [
    {
      "type": "text",
      "text": "Available Personas:\n- CodeReviewer: Expert code reviewer\n- DocumentationWriter: Technical writer\n- SecurityAnalyst: Security expert"
    }
  ]
}
```

**Tool:** `persona/info`

**Parameters:**

- `persona` (string): Persona name or ID

**Example:**

```typescript
await client.callTool('persona/info', {
  persona: 'CodeReviewer',
});
```

### 3. Team Execution

Execute multi-persona teams.

**Tool:** `team/execute`

**Parameters:**

- `team` (string): Team name or ID
- `input` (string): Input for the team
- `context` (object, optional): Context variables

**Example:**

```typescript
await client.callTool('team/execute', {
  team: 'ResearchTeam',
  input: 'Analyze AI safety concerns',
  context: { depth: 'comprehensive' },
});
```

### 4. Workflow Execution

Execute complex PCL workflows.

**Tool:** `workflow/execute`

**Parameters:**

- `workflow` (string): Workflow name or ID
- `input` (object): Input data

**Example:**

```typescript
await client.callTool('workflow/execute', {
  workflow: 'CodeReviewWorkflow',
  input: {
    repository: 'github.com/user/repo',
    prNumber: 123,
  },
});
```

### 5. Resource Access

Access persona definitions and outputs as resources.

**Resources:**

- `persona://definition/{name}` - Persona source code
- `team://definition/{name}` - Team source code
- `workflow://definition/{name}` - Workflow source code

**Example:**

```typescript
const definition = await client.readResource(
  'persona://definition/CodeReviewer'
);

console.log(definition.text);
// persona CodeReviewer {
//   role: "Expert code reviewer"
//   instructions: "..."
// }
```

---

## Transport Options

PCL MCP Server supports multiple transports:

### 1. Stdio Transport (CLI Tools)

**Use for:** Claude Code, command-line tools

**Setup:**

```typescript
import { StdioTransport } from '@pcl/sdk/mcp';

const transport = new StdioTransport({ debug: false });
await server.start(transport);
```

**Communication:** JSON-RPC messages via stdin/stdout

### 2. HTTP + SSE Transport (Web Apps)

**Use for:** Web applications, remote servers

**Setup:**

```typescript
import { HttpSseTransport } from '@pcl/sdk/mcp';

const transport = new HttpSseTransport({
  baseUrl: 'https://api.example.com',
  headers: { Authorization: 'Bearer token' },
});
await server.start(transport);
```

**Communication:**

- HTTP POST for requests
- Server-Sent Events (SSE) for notifications

### 3. WebSocket Transport (Real-time)

**Use for:** Real-time applications, collaborative tools

**Coming Soon:** Full-duplex WebSocket transport

---

## Integration Guides

### Claude Code

[Complete Guide →](./claude-code-integration.md)

**Quick Start:**

```json
// ~/.config/claude/mcp.json
{
  "mcpServers": {
    "pcl": {
      "command": "node",
      "args": ["./dist/mcp-server.js"]
    }
  }
}
```

### VS Code

[Complete Guide →](./vscode-integration.md)

**Extension:** Install `pcl-vscode` extension

**Features:**

- Syntax highlighting
- IntelliSense
- MCP server management
- One-click persona execution

### Cursor

[Complete Guide →](./cursor-integration.md)

**Setup:** Same as Claude Code configuration

**Features:**

- AI-powered code generation with PCL personas
- Context-aware suggestions
- Inline persona execution

---

## Examples

### Basic Server

```typescript
import { PclServer, StdioTransport } from '@pcl/sdk/mcp';
import { Runtime, Compiler } from '@pcl/sdk';

// Compile PCL source
const compiler = new Compiler();
const ast = compiler.compile(`
  persona CodeReviewer {
    role: "Expert code reviewer"
    instructions: "Review code for best practices"
  }
`);

// Create runtime
const runtime = new Runtime({
  personas: [ast.persona],
});

// Create MCP server
const server = new PclServer({
  name: 'PCL Server',
  version: '1.0.0',
  runtime,
});

// Start with stdio transport
const transport = new StdioTransport();
await server.start(transport);
```

### HTTP Server

```typescript
import { PclServer } from '@pcl/sdk/mcp';
import { createServer } from 'http';

const server = new PclServer({ name: 'PCL HTTP', version: '1.0.0', runtime });

// Handle HTTP requests
const httpServer = createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/mcp/request') {
    const body = await readBody(req);
    const request = JSON.parse(body);
    const response = await server.handleRequest(request);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  }
});

httpServer.listen(3000);
```

### Custom Tools

```typescript
// Register custom tool
server.registerTool(
  {
    name: 'custom/analyze',
    description: 'Custom analysis tool',
    inputSchema: {
      type: 'object',
      properties: {
        data: { type: 'string' },
      },
      required: ['data'],
    },
  },
  async (params) => {
    const result = await customAnalyze(params.arguments.data);

    return {
      content: [{ type: 'text', text: result }],
    };
  }
);
```

---

## Best Practices

### 1. Error Handling

Always wrap tool handlers in try-catch:

```typescript
server.registerTool(tool, async (params) => {
  try {
    const result = await execute(params);
    return { content: [{ type: 'text', text: result }] };
  } catch (error) {
    return {
      content: [{ type: 'text', text: error.message }],
      isError: true,
    };
  }
});
```

### 2. Input Validation

Validate all inputs:

```typescript
server.registerTool(tool, async (params) => {
  if (!params.arguments.persona) {
    return {
      content: [{ type: 'text', text: 'Missing persona name' }],
      isError: true,
    };
  }

  // Continue with valid input...
});
```

### 3. Logging

Use stderr for logging (stdout is for MCP messages):

```typescript
console.error('[MCP] Server started');
console.error('[MCP] Processing request:', request.method);
```

### 4. Graceful Shutdown

Handle shutdown signals:

```typescript
process.on('SIGINT', async () => {
  console.error('[MCP] Shutting down...');
  await server.stop();
  process.exit(0);
});
```

### 5. Security

- Validate all inputs
- Sanitize outputs
- Use environment variables for sensitive data
- Implement authentication if needed

---

## Troubleshooting

### Server Not Starting

**Check build:**

```bash
npm run build
ls dist/mcp-server.js
```

**Test directly:**

```bash
node dist/mcp-server.js
```

### Client Not Connecting

**Verify configuration path is absolute:**

```json
{
  "command": "node",
  "args": ["/full/path/to/dist/mcp-server.js"]
}
```

**Check logs:**

```bash
tail -f ~/.config/claude/logs/mcp.log
```

### Tools Not Working

**Enable debug mode:**

```typescript
const transport = new StdioTransport({ debug: true });
```

**Check tool registration:**

```typescript
const tools = await server.handleRequest({
  jsonrpc: '2.0',
  method: 'tools/list',
  id: 1,
});
console.error('Available tools:', tools);
```

---

## API Reference

### PclServer

```typescript
class PclServer {
  constructor(config: PclMcpServerConfig);

  registerTool(
    tool: McpTool,
    handler: (params: McpToolCallParams) => Promise<McpToolCallResult>
  ): void;

  registerResource(
    resource: McpResource,
    provider: (uri: string) => Promise<McpResourceContent>
  ): void;

  start(transport: McpTransport): Promise<void>;
  stop(): Promise<void>;
  handleRequest(request: McpRequest): Promise<McpResponse>;
}
```

### Transports

```typescript
class StdioTransport implements McpTransport {
  constructor(config?: StdioTransportConfig);
  send(message: McpRequest | McpResponse): Promise<void>;
  onMessage(handler: (message: McpResponse) => void): void;
  close(): Promise<void>;
  isConnected(): boolean;
}

class HttpSseTransport implements McpTransport {
  constructor(config: HttpSseTransportConfig);
  send(message: McpRequest): Promise<void>;
  onMessage(handler: (message: McpResponse) => void): void;
  close(): Promise<void>;
  isConnected(): boolean;
}
```

---

## Resources

- **MCP Specification**: https://modelcontextprotocol.io/
- **Claude Code Integration**: [claude-code-integration.md](./claude-code-integration.md)
- **Examples**: [examples.md](./examples.md)
- **Troubleshooting**: [troubleshooting.md](./troubleshooting.md)
- **GitHub**: https://github.com/pcl-lang/pcl

---

**Questions or Issues?**

- [GitHub Issues](https://github.com/pcl-lang/pcl/issues)
- [Discord Community](https://discord.gg/pcl)
- [Documentation](../README.md)
