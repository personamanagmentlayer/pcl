# PCL Integration with AI Platforms

## Overview

This guide shows how to integrate PCL with various AI platforms and assistants.

---

## ✅ MCP-Compatible Platforms (Native Support)

These platforms support the **Model Context Protocol (MCP)** natively and can use PCL directly without modification.

### 1. Claude Desktop ✅

**Status:** Full native MCP support

**Setup:**

1. **Install PCL SDK:**
   ```bash
   npm install @pcl/sdk
   ```

2. **Create MCP Server:** (`pcl-mcp-server.js`)
   ```javascript
   import { PclServer, StdioTransport, createRuntime, compile } from '@pcl/sdk';
   import { readFileSync } from 'fs';

   const source = readFileSync('./personas.pcl', 'utf-8');
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

3. **Configure Claude Desktop:**

   Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

   ```json
   {
     "mcpServers": {
       "pcl": {
         "command": "node",
         "args": ["/absolute/path/to/pcl-mcp-server.js"]
       }
     }
   }
   ```

4. **Restart Claude Desktop**

5. **Use PCL Personas:**
   ```
   You: List available PCL personas

   Claude: [Calls persona/list tool automatically]

   You: Execute the Analyst persona to analyze this data

   Claude: [Calls persona/execute with Analyst]
   ```

---

### 2. Claude Code (VS Code Extension) ✅

**Status:** Full MCP support

**Setup:**

1. Install Claude Code extension in VS Code

2. Create `.claude/mcp.json` in your workspace:
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

3. Claude Code will automatically discover and use PCL tools

---

### 3. Cursor ✅

**Status:** MCP support available

**Setup:**

1. Create `cursor-mcp.json`:
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

2. Configure in Cursor settings

3. Use PCL personas in Cursor chat

---

### 4. Zed Editor ✅

**Status:** MCP support

**Setup:**

Similar to Claude Code - configure MCP server in Zed settings.

---

### 5. Continue.dev ✅

**Status:** MCP compatible

**Setup:**

Configure in Continue.dev extension settings.

---

## ❌ Non-MCP Platforms (Requires REST API Wrapper)

These platforms **do not support MCP** natively. You need to create a REST API wrapper.

### 1. ChatGPT (OpenAI) ❌

**Status:** No MCP support - use REST API + Actions

**Setup:**

#### Step 1: Create REST API Server

Use the provided REST API wrapper:

```bash
# In examples/
node rest-api-wrapper.ts
```

This starts an HTTP server at `http://localhost:3000` with endpoints:
- `GET /api/personas` - List personas
- `POST /api/personas/:id/execute` - Execute persona
- `GET /api/teams` - List teams
- `POST /api/teams/:id/execute` - Execute team

#### Step 2: Deploy REST API

Deploy to a public URL (Render, Railway, Fly.io, etc.):

```bash
# Example: Deploy to Render
git push render main
```

Get your public URL: `https://your-pcl-api.onrender.com`

#### Step 3: Create ChatGPT Action

1. Go to ChatGPT → Create a GPT
2. Click "Configure" → "Actions" → "Create new action"
3. Import OpenAPI spec from `examples/openapi-spec.yaml`
4. Update server URL to your deployed API
5. Save and test

#### Step 4: Use in ChatGPT

```
You: List available PCL personas

ChatGPT: [Calls GET /api/personas]

You: Execute the Analyst persona with this data: [...]

ChatGPT: [Calls POST /api/personas/Analyst/execute]
```

**Limitations:**
- Requires separate REST API deployment
- Not as seamless as MCP
- Additional latency from HTTP calls
- Need to manage API authentication

---

### 2. DeepSeek ❌

**Status:** No MCP support - use REST API

**Setup:**

Same as ChatGPT above. DeepSeek would need to:
1. Access your deployed REST API
2. Use standard HTTP requests
3. Parse JSON responses

**Current Status:** DeepSeek doesn't have a plugin/action system like ChatGPT, so integration is more limited.

---

### 3. Google Gemini ❌

**Status:** No MCP support - use REST API + Extensions

**Setup:**

Similar to ChatGPT - deploy REST API and configure as a Gemini Extension.

---

### 4. Perplexity AI ❌

**Status:** No MCP support

Limited integration options currently.

---

## Comparison Matrix

| Platform | MCP Support | Integration Method | Difficulty | Latency |
|----------|-------------|-------------------|------------|---------|
| **Claude Desktop** | ✅ Native | MCP (stdio) | Easy | Low |
| **Claude Code** | ✅ Native | MCP (stdio) | Easy | Low |
| **Cursor** | ✅ Native | MCP (stdio) | Easy | Low |
| **Zed** | ✅ Native | MCP (stdio) | Easy | Low |
| **Continue.dev** | ✅ Native | MCP (stdio) | Easy | Low |
| **ChatGPT** | ❌ None | REST API + Actions | Medium | Medium |
| **DeepSeek** | ❌ None | REST API (manual) | Hard | Medium |
| **Gemini** | ❌ None | REST API + Extensions | Medium | Medium |
| **Perplexity** | ❌ None | Not available | N/A | N/A |

---

## Recommended Approach by Use Case

### For Development (Best Experience)
**Use:** Claude Desktop or Claude Code
- ✅ Native MCP support
- ✅ Lowest latency
- ✅ Best integration
- ✅ No deployment needed

### For Production/Public Access
**Use:** REST API + ChatGPT Actions
- ✅ Wider accessibility
- ✅ Can serve multiple clients
- ⚠️ Requires deployment
- ⚠️ Additional latency

### For Team Collaboration
**Use:** Cursor + MCP
- ✅ IDE integration
- ✅ Team can share MCP config
- ✅ Version control friendly

---

## Future MCP Support

Platforms that **might** add MCP support:
- 🔮 ChatGPT (if OpenAI adopts MCP)
- 🔮 DeepSeek (if they implement MCP client)
- 🔮 GitHub Copilot (possible future integration)
- 🔮 Gemini (Google may support MCP)

MCP is an **open protocol** created by Anthropic, so adoption depends on each platform choosing to implement it.

---

## Quick Decision Guide

**Do you have Claude Desktop?**
- YES → Use MCP (easiest!)
- NO → Continue below

**Do you use VS Code?**
- YES → Use Claude Code extension with MCP
- NO → Continue below

**Do you need ChatGPT specifically?**
- YES → Deploy REST API + create ChatGPT Action
- NO → Try Cursor or Zed with MCP

**Do you want the simplest setup?**
- Download Claude Desktop + configure MCP (5 minutes)

---

## Summary

**Best Option:** Claude Desktop or Claude Code (native MCP support)

**For ChatGPT/DeepSeek:** You must create a REST API wrapper and deploy it publicly

**Key Takeaway:** MCP provides the **best** PCL integration experience, but you can still use PCL with non-MCP platforms through HTTP APIs.

---

## Additional Resources

- [MCP Integration Guide](./MCP_INTEGRATION_GUIDE.md)
- [REST API Example](../examples/rest-api-wrapper.ts)
- [OpenAPI Specification](../examples/openapi-spec.yaml)
- [MCP Protocol Spec](https://modelcontextprotocol.io)
