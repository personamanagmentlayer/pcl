# PCL MCP Integration Guide

## Overview

PCL integrates with the **Model Context Protocol (MCP)** to expose personas, teams, and workflows as tools and resources for IDE clients like Claude Code, Cursor, and VS Code.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Server Setup](#server-setup)
3. [IDE Integration](#ide-integration)
4. [Available Tools](#available-tools)
5. [Available Resources](#available-resources)
6. [Examples](#examples)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Install PCL SDK

```bash
npm install @pcl/sdk
```

### Create MCP Server

```typescript
import { PclMcpServer, StdioTransport, createRuntime } from '@pcl/sdk';

// Create PCL runtime
const runtime = createRuntime();

// Create MCP server
const server = new PclMcpServer({
  name: 'pcl-server',
  version: '1.0.0',
  description: 'PCL MCP Server',
  runtime,
});

// Connect with stdio transport (for CLI)
const transport = new StdioTransport();
server.connect(transport);

console.log('PCL MCP Server running...');
```

### Run the Server

```bash
node mcp-server.js
```

---

## Server Setup

### 1. Base MCP Server

Use the generic `PclMcpServer` for full control:

```typescript
import { PclMcpServer } from '@pcl/sdk';

const server = new PclMcpServer({
  name: 'my-pcl-server',
  version: '1.0.0',
  description: 'Custom PCL MCP Server',
});

// Register custom tools
server.registerTool(
  {
    name: 'custom/greet',
    description: 'Greet a user',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'User name' },
      },
      required: ['name'],
    },
  },
  async (params) => {
    return {
      content: [
        {
          type: 'text',
          text: `Hello, ${params.arguments.name}!`,
        },
      ],
    };
  }
);
```

### 2. PCL-Specific Server

Use `PclServer` for built-in persona/team/workflow tools:

```typescript
import { PclServer, createRuntime } from '@pcl/sdk';

const runtime = createRuntime();

// Load PCL personas
runtime.load(myPclProgram);

const server = new PclServer({
  name: 'pcl-server',
  version: '1.0.0',
  runtime,
});
```

### 3. Transport Options

#### stdio (for CLI tools)

```typescript
import { StdioTransport } from '@pcl/sdk';

const transport = new StdioTransport();
server.connect(transport);
```

#### HTTP/SSE (for web integration)

```typescript
import { HttpSseTransport } from '@pcl/sdk';

const transport = new HttpSseTransport({
  port: 3000,
  path: '/mcp',
});

server.connect(transport);

console.log('MCP server available at http://localhost:3000/mcp');
```

---

## IDE Integration

### Claude Code

#### 1. Create MCP server file

Create `pcl-mcp-server.js`:

```javascript
import { PclServer, StdioTransport, createRuntime, compile } from '@pcl/sdk';
import { readFileSync } from 'fs';

// Load PCL program
const source = readFileSync('./my-personas.pcl', 'utf-8');
const compiled = compile(source);

if (!compiled.ok) {
  console.error('PCL compilation failed:', compiled.value);
  process.exit(1);
}

// Create runtime
const runtime = createRuntime();
runtime.load(compiled.value.program);

// Create server
const server = new PclServer({
  name: 'pcl-server',
  version: '1.0.0',
  runtime,
});

// Connect stdio
const transport = new StdioTransport();
server.connect(transport);
```

#### 2. Configure Claude Code

Add to `.claude/mcp.json`:

```json
{
  "mcpServers": {
    "pcl": {
      "command": "node",
      "args": ["./pcl-mcp-server.js"],
      "description": "PCL Persona Control Language"
    }
  }
}
```

#### 3. Use in Claude Code

```
You: Can you list available PCL personas?

Claude Code will call the persona/list tool automatically.
```

### Cursor

#### 1. Configure Cursor

Add to `cursor-mcp.json`:

```json
{
  "servers": {
    "pcl": {
      "command": "node",
      "args": ["./pcl-mcp-server.js"]
    }
  }
}
```

### VS Code Extension

#### 1. Install MCP extension

```bash
code --install-extension anthropic.mcp
```

#### 2. Configure workspace settings

Add to `.vscode/settings.json`:

```json
{
  "mcp.servers": {
    "pcl": {
      "command": "node",
      "args": ["./pcl-mcp-server.js"]
    }
  }
}
```

---

## Available Tools

### Persona Tools

#### `persona/execute`

Execute a persona with input.

**Input Schema:**
```json
{
  "persona": "string (persona ID)",
  "input": "string (input message)"
}
```

**Example:**
```typescript
{
  "persona": "Analyst",
  "input": "Analyze the Q4 sales data"
}
```

#### `persona/list`

List all available personas.

**Input Schema:** None

**Returns:**
```json
{
  "personas": [
    {
      "id": "Analyst",
      "name": "Analyst",
      "description": "Data analysis expert"
    }
  ]
}
```

#### `persona/get`

Get persona definition.

**Input Schema:**
```json
{
  "persona": "string (persona ID)"
}
```

### Team Tools

#### `team/execute`

Execute a team workflow.

**Input Schema:**
```json
{
  "team": "string (team ID)",
  "input": "string (input message)"
}
```

#### `team/list`

List all teams.

#### `team/get`

Get team definition.

### Workflow Tools

#### `workflow/execute`

Execute a workflow.

**Input Schema:**
```json
{
  "workflow": "string (workflow ID)",
  "input": "any (workflow input)"
}
```

#### `workflow/list`

List all workflows.

#### `workflow/get`

Get workflow definition.

---

## Available Resources

### Persona Definitions

**URI Format:** `pcl://persona/{id}`

**Example:**
```
pcl://persona/Analyst
```

**Returns:**
```json
{
  "uri": "pcl://persona/Analyst",
  "mimeType": "application/json",
  "json": {
    "id": "Analyst",
    "name": "Analyst",
    "intent": "Perform data analysis...",
    "skills": ["data-analysis", "statistics"],
    "tags": ["analysis", "data"]
  }
}
```

### Team Definitions

**URI Format:** `pcl://team/{id}`

### Workflow Definitions

**URI Format:** `pcl://workflow/{id}`

### Execution Outputs

**URI Format:** `pcl://output/{execution_id}`

**Returns:** The output of a specific execution.

---

## Examples

### Example 1: Simple Persona Execution

```pcl
// my-personas.pcl
persona Analyst {
  intent: "Analyze data and provide insights"

  skills: [
    "Statistical analysis",
    "Data interpretation",
    "Trend identification"
  ]

  constraints: [
    "Provide data-driven conclusions",
    "Show your work"
  ]

  tags: [analysis, data, statistics]
}
```

**MCP Server:**
```typescript
import { PclServer, StdioTransport, createRuntime, compile } from '@pcl/sdk';
import { readFileSync } from 'fs';

const source = readFileSync('./my-personas.pcl', 'utf-8');
const compiled = compile(source);
const runtime = createRuntime();
runtime.load(compiled.value.program);

const server = new PclServer({
  name: 'pcl-server',
  version: '1.0.0',
  runtime,
});

const transport = new StdioTransport();
server.connect(transport);
```

**Usage in Claude Code:**
```
You: Execute the Analyst persona to analyze this data: [1, 2, 3, 4, 5]

Claude Code calls:
- Tool: persona/execute
- Arguments: { persona: "Analyst", input: "Analyze this data: [1, 2, 3, 4, 5]" }
```

### Example 2: Team Workflow

```pcl
persona Researcher {
  intent: "Research and gather information"
  skills: ["research", "information-gathering"]
}

persona Critic {
  intent: "Critique and find flaws"
  skills: ["critical-thinking", "analysis"]
}

team Analysis {
  members: [Researcher, Critic]
  merge: debate
}
```

**Usage:**
```
You: Run the Analysis team on "Is AI beneficial?"

Claude Code calls:
- Tool: team/execute
- Arguments: { team: "Analysis", input: "Is AI beneficial?" }
```

### Example 3: Custom Tool Registration

```typescript
import { PclMcpServer, StdioTransport } from '@pcl/sdk';

const server = new PclMcpServer({
  name: 'custom-server',
  version: '1.0.0',
});

// Register custom PCL tool
server.registerTool(
  {
    name: 'pcl/analyze',
    description: 'Analyze PCL source code',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'PCL source code' },
      },
      required: ['source'],
    },
  },
  async (params) => {
    const { compile } = await import('@pcl/sdk');
    const result = compile(params.arguments.source);

    if (!result.ok) {
      return {
        content: [
          {
            type: 'text',
            text: `Compilation failed: ${result.value.map(e => e.message).join(', ')}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `✓ Valid PCL program with ${result.value.program.statements.length} statements`,
        },
      ],
    };
  }
);

const transport = new StdioTransport();
server.connect(transport);
```

---

## Troubleshooting

### Server Won't Start

**Problem:** MCP server fails to start

**Solution:**
1. Check Node.js version (16+ required)
2. Verify PCL installation: `npm list @pcl/sdk`
3. Check for compilation errors in your PCL files
4. Review server logs for error messages

### Tool Not Found

**Problem:** IDE can't find PCL tools

**Solution:**
1. Verify server is running: check process list
2. Check MCP configuration file (`.claude/mcp.json`, etc.)
3. Restart IDE after configuration changes
4. Check server transport (stdio vs HTTP)

### Persona Execution Fails

**Problem:** `persona/execute` tool returns errors

**Solution:**
1. Verify persona exists: use `persona/list` tool
2. Check persona is loaded in runtime
3. Verify AI provider is configured
4. Check runtime logs for errors

### Connection Issues

**Problem:** IDE can't connect to MCP server

**Solution:**
1. **stdio transport:** Check command path and arguments
2. **HTTP transport:** Verify port is not blocked
3. Check firewall settings
4. Review IDE MCP extension logs

### Performance Issues

**Problem:** MCP operations are slow

**Solution:**
1. Use stdio transport for local tools (faster than HTTP)
2. Limit persona complexity
3. Enable caching in runtime
4. Profile server performance

---

## Advanced Configuration

### Provider Configuration

```typescript
import { PclServer, createRuntime, AnthropicProvider } from '@pcl/sdk';

const runtime = createRuntime();

// Configure AI provider
const provider = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-sonnet-4-20250514',
});

runtime.setDefaultProvider(provider);

const server = new PclServer({
  name: 'pcl-server',
  version: '1.0.0',
  runtime,
});
```

### Multiple Transports

```typescript
import { PclServer, StdioTransport, HttpSseTransport } from '@pcl/sdk';

const server = new PclServer({ /* config */ });

// Stdio for CLI
const stdioTransport = new StdioTransport();
server.connect(stdioTransport);

// HTTP for web
const httpTransport = new HttpSseTransport({ port: 3000 });
server.connect(httpTransport);
```

### Event Monitoring

```typescript
runtime.on((event) => {
  console.log('Runtime event:', event.type);

  if (event.type === 'persona:response') {
    console.log(`Persona ${event.persona.name} responded:`, event.response.content);
  }
});
```

---

## Next Steps

- **[PCL Language Guide](./LANGUAGE_GUIDE.md)** - Learn PCL syntax
- **[Persona Building Guide](./PERSONA_BUILDING_GUIDE.md)** - Create custom personas
- **[Skills Integration](./SKILLS_INTEGRATION_GUIDE.md)** - Add skills to personas
- **[API Reference](./api/)** - Complete API documentation

---

**Need Help?**

- GitHub Issues: https://github.com/personalayer/pcl/issues
- Documentation: https://pcl-lang.org/docs
- Examples: https://github.com/personalayer/pcl/tree/main/examples
