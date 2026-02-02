# Claude Code Integration Guide

Connect PCL personas to Claude Code via the Model Context Protocol (MCP).

## Overview

PCL now supports the **Model Context Protocol (MCP)**, allowing you to expose PCL personas, teams, and workflows as tools that Claude Code can discover and use automatically.

**What you can do:**

- Execute any PCL persona directly from Claude Code
- List and inspect available personas
- Run complex multi-persona teams
- Execute workflows with Claude Code as the orchestrator
- Access persona definitions as resources

---

## Quick Start

### 1. Create an MCP Server Configuration

Create `mcp-server.json` in your PCL project:

```json
{
  "mcpServers": {
    "pcl": {
      "command": "node",
      "args": ["./dist/mcp-server.js"],
      "env": {
        "PCL_PROJECT_PATH": ".",
        "DEBUG": "false"
      }
    }
  }
}
```

### 2. Create the MCP Server Script

Create `src/mcp-server.ts`:

```typescript
import { Runtime } from '@pcl/sdk/runtime';
import { PclServer } from '@pcl/sdk/mcp';
import { StdioTransport } from '@pcl/sdk/mcp';
import { loadPclProject } from '@pcl/sdk';

async function main() {
  // Load your PCL project
  const projectPath = process.env.PCL_PROJECT_PATH || '.';
  const project = await loadPclProject(projectPath);

  // Create PCL runtime
  const runtime = new Runtime({
    personas: project.personas,
    teams: project.teams,
    workflows: project.workflows,
  });

  // Create MCP server
  const server = new PclServer({
    name: 'PCL Server',
    version: '1.0.0',
    description: 'PCL Persona Management System',
    runtime,
  });

  // Start server with stdio transport (for Claude Code)
  const transport = new StdioTransport({ debug: false });
  await server.start(transport);

  console.error('PCL MCP Server started');
}

main().catch((error) => {
  console.error('MCP Server error:', error);
  process.exit(1);
});
```

### 3. Build and Run

```bash
# Build your MCP server
npm run build

# Test it directly
node ./dist/mcp-server.js

# Or let Claude Code start it automatically
```

### 4. Configure Claude Code

Add to your Claude Code configuration file (`~/.config/claude/mcp.json` or workspace `.claude/mcp.json`):

```json
{
  "mcpServers": {
    "pcl": {
      "command": "node",
      "args": ["/absolute/path/to/your/project/dist/mcp-server.js"],
      "env": {
        "PCL_PROJECT_PATH": "/absolute/path/to/your/project"
      }
    }
  }
}
```

### 5. Use in Claude Code

Now you can ask Claude Code to:

```
List all available PCL personas
```

```
Execute the CodeReviewer persona with this code: [paste code]
```

```
Run the ResearchTeam with topic: "AI Safety"
```

Claude Code will automatically discover and use your PCL personas!

---

## Available MCP Tools

Your PCL server exposes these tools to Claude Code:

### `persona/list`

List all available personas.

**Example:**

```
Claude Code: What personas are available?
```

### `persona/info`

Get detailed information about a specific persona.

**Parameters:**

- `persona` (string): Persona name or ID

**Example:**

```
Claude Code: Tell me about the CodeReviewer persona
```

### `persona/execute`

Execute a persona with input.

**Parameters:**

- `persona` (string): Persona name or ID
- `input` (string): Input message/prompt
- `context` (object, optional): Context variables

**Example:**

```
Claude Code: Execute CodeReviewer on this file: [file content]
```

### `team/execute`

Execute a team of personas.

**Parameters:**

- `team` (string): Team name or ID
- `input` (string): Input for the team
- `context` (object, optional): Context variables

**Example:**

```
Claude Code: Run the ResearchTeam on topic "quantum computing"
```

### `workflow/execute`

Execute a PCL workflow.

**Parameters:**

- `workflow` (string): Workflow name or ID
- `input` (object): Input data

**Example:**

```
Claude Code: Execute the CodeReviewWorkflow with this PR data: [data]
```

---

## Available MCP Resources

Your PCL server also exposes these resources:

### `persona://definition/{name}`

Get the PCL source code definition of a persona.

**Example URI:** `persona://definition/CodeReviewer`

### `team://definition/{name}`

Get the PCL source code definition of a team.

**Example URI:** `team://definition/ResearchTeam`

### `workflow://definition/{name}`

Get the PCL source code definition of a workflow.

**Example URI:** `workflow://definition/CodeReviewWorkflow`

---

## Example PCL Project for Claude Code

Here's a complete example project:

### `personas/code-reviewer.pcl`

```pcl
persona CodeReviewer {
  role: "Expert code reviewer focusing on best practices, security, and maintainability"

  instructions: """
    Review the provided code for:
    - Security vulnerabilities
    - Performance issues
    - Code quality and maintainability
    - Best practices adherence
    - Documentation completeness

    Provide actionable feedback with specific line references.
  """

  capabilities: ["code-analysis", "security-review"]
}
```

### `personas/documentation-writer.pcl`

```pcl
persona DocumentationWriter {
  role: "Technical writer specializing in clear, comprehensive documentation"

  instructions: """
    Create documentation for the provided code:
    - API reference
    - Usage examples
    - Installation guide
    - Troubleshooting tips

    Write for developers of all skill levels.
  """

  capabilities: ["documentation", "technical-writing"]
}
```

### `teams/code-quality.pcl`

```pcl
team CodeQualityTeam {
  members: [CodeReviewer, DocumentationWriter]

  merge: chain

  description: "Complete code quality check: review + documentation"
}
```

### `src/mcp-server.ts`

```typescript
import { Runtime } from '@pcl/sdk/runtime';
import { PclServer, StdioTransport } from '@pcl/sdk/mcp';
import { Compiler } from '@pcl/sdk';
import { readFileSync } from 'fs';
import { join } from 'path';

async function loadPersonas(projectPath: string) {
  const compiler = new Compiler();

  const codeReviewerSource = readFileSync(
    join(projectPath, 'personas/code-reviewer.pcl'),
    'utf-8'
  );

  const docWriterSource = readFileSync(
    join(projectPath, 'personas/documentation-writer.pcl'),
    'utf-8'
  );

  const teamSource = readFileSync(
    join(projectPath, 'teams/code-quality.pcl'),
    'utf-8'
  );

  const codeReviewer = compiler.compile(codeReviewerSource);
  const docWriter = compiler.compile(docWriterSource);
  const team = compiler.compile(teamSource);

  return {
    personas: [codeReviewer.persona, docWriter.persona],
    teams: [team.team],
  };
}

async function main() {
  const projectPath = process.env.PCL_PROJECT_PATH || '.';
  const { personas, teams } = await loadPersonas(projectPath);

  const runtime = new Runtime({ personas, teams });

  const server = new PclServer({
    name: 'PCL Code Quality Server',
    version: '1.0.0',
    runtime,
  });

  const transport = new StdioTransport({ debug: false });
  await server.start(transport);

  console.error('PCL MCP Server running');
}

main().catch(console.error);
```

---

## Testing Your MCP Server

### Test with MCP Inspector

Use the official MCP Inspector tool:

```bash
npx @modelcontextprotocol/inspector node dist/mcp-server.js
```

This opens a web UI where you can:

- See all available tools
- Test tool calls
- View resources
- Inspect messages

### Test with Manual Requests

Send JSON-RPC requests via stdin:

```bash
echo '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":[],"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}' | node dist/mcp-server.js
```

---

## Troubleshooting

### Server Not Starting

**Issue:** MCP server fails to start

**Solutions:**

1. Check build succeeded:

   ```bash
   npm run build
   ls dist/mcp-server.js
   ```

2. Test directly:

   ```bash
   node dist/mcp-server.js
   ```

3. Check for errors in stderr:
   ```bash
   node dist/mcp-server.js 2> error.log
   cat error.log
   ```

### Claude Code Not Discovering Server

**Issue:** Claude Code doesn't see your personas

**Solutions:**

1. Verify MCP configuration path is absolute:

   ```json
   {
     "command": "node",
     "args": ["/Users/you/project/dist/mcp-server.js"]
   }
   ```

2. Check server is listed:

   ```bash
   claude code mcp list
   ```

3. Enable debug mode:

   ```typescript
   const transport = new StdioTransport({ debug: true });
   ```

4. Check Claude Code logs:
   ```bash
   tail -f ~/.config/claude/logs/mcp.log
   ```

### Tools Not Working

**Issue:** Tool calls fail or return errors

**Solutions:**

1. Test tool directly:

   ```typescript
   const result = await server.handleRequest({
     jsonrpc: '2.0',
     method: 'tools/call',
     params: { name: 'persona/list', arguments: {} },
     id: 1,
   });
   console.log(result);
   ```

2. Check persona definitions are loaded:

   ```typescript
   console.error(
     'Loaded personas:',
     runtime.getPersonas().map((p) => p.name)
   );
   ```

3. Validate input schema matches your calls

---

## Advanced Configuration

### Custom Context Variables

Pass context to personas:

```typescript
server.registerTool(
  {
    name: 'persona/execute-with-context',
    description: 'Execute persona with custom context',
    inputSchema: {
      type: 'object',
      properties: {
        persona: { type: 'string' },
        input: { type: 'string' },
        projectPath: { type: 'string' },
        gitBranch: { type: 'string' },
      },
      required: ['persona', 'input'],
    },
  },
  async (params) => {
    const context = {
      projectPath: params.arguments.projectPath,
      gitBranch: params.arguments.gitBranch,
    };

    const result = await runtime.executePersona(
      findPersona(params.arguments.persona),
      {
        input: params.arguments.input,
        context,
      }
    );

    return { content: [{ type: 'text', text: result.output }] };
  }
);
```

### Multi-Project Support

Support multiple PCL projects:

```typescript
const servers = new Map<string, PclServer>();

// Register multiple projects
for (const project of ['project-a', 'project-b']) {
  const runtime = await loadProject(project);
  const server = new PclServer({ name: project, version: '1.0.0', runtime });
  servers.set(project, server);
}

// Multiplex requests
transport.onMessage(async (request) => {
  const projectName = extractProject(request);
  const server = servers.get(projectName);
  const response = await server.handleRequest(request);
  await transport.send(response);
});
```

### Authentication

Add API key authentication:

```typescript
server.registerTool(
  {
    name: 'authenticate',
    description: 'Authenticate with API key',
    inputSchema: {
      type: 'object',
      properties: {
        apiKey: { type: 'string' },
      },
      required: ['apiKey'],
    },
  },
  async (params) => {
    const valid = await validateApiKey(params.arguments.apiKey);

    if (valid) {
      sessionToken = generateToken();
      return { content: [{ type: 'text', text: 'Authenticated' }] };
    }

    return {
      content: [{ type: 'text', text: 'Invalid API key' }],
      isError: true,
    };
  }
);
```

---

## Next Steps

- **Read the complete MCP guide**: [mcp/README.md](./README.md)
- **Explore MCP examples**: [mcp/examples.md](./examples.md)
- **Learn about VS Code integration**: [mcp/vscode-integration.md](./vscode-integration.md)
- **Cursor setup**: [mcp/cursor-integration.md](./cursor-integration.md)

---

**Need Help?**

- [MCP Specification](https://modelcontextprotocol.io/)
- [PCL Documentation](../README.md)
- [GitHub Issues](https://github.com/pcl-lang/pcl/issues)
