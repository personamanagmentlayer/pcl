# How to Use PCL - Complete Guide

## Understanding PCL Commands

### ❌ Common Mistake: `npm run dev`

**DO NOT USE `npm run dev` for interactive usage!**

The `dev` command is a **watch mode** for development - it restarts the CLI whenever source files change. It's NOT a persistent REPL or interactive mode.

```bash
# ❌ Wrong - This will just show help and exit
npm run dev

# ❌ Wrong - This restarts on every file change
npm run dev
```

### ✅ Correct Ways to Use PCL

---

## Option 1: Interactive REPL (Best for Learning)

The REPL (Read-Eval-Print Loop) is an interactive shell for trying PCL code:

```bash
npm run repl
```

**What you can do in the REPL:**

```
pcl> .help           # Show REPL commands
pcl> .history        # Show command history
pcl> .clear          # Clear screen
pcl> .exit           # Exit

# Enter PCL code directly:
pcl> persona Helper { name: "Assistant" }
✓ Parsed 1 statement(s)
  PersonaDeclaration

pcl> team Reviewers { members: [A, B, C] }
✓ Parsed 1 statement(s)
  TeamDeclaration
```

**Note:** The current REPL parses and validates syntax only - it doesn't execute personas yet (execution coming soon).

---

## Option 2: Parse PCL Files

Parse and validate PCL syntax:

```bash
# Parse a single file
npm run parse examples/personas/simple-assistant.pcl

# Tokenize/lex a file
npm run lex examples/personas/simple-assistant.pcl
```

**Output:** Shows the Abstract Syntax Tree (AST) of your PCL code.

---

## Option 3: Type Check & Validate

Validate semantics and types:

```bash
npm run check examples/personas/simple-assistant.pcl

# With strict mode
npm run check examples/personas/simple-assistant.pcl -- --strict
```

**Output:** Reports type errors, undefined references, and semantic issues.

---

## Option 4: Generate Code

Compile PCL to different target formats:

```bash
# Generate system prompt
npm run gen examples/personas/simple-assistant.pcl -- --target prompt

# Generate TypeScript
npm run gen examples/personas/simple-assistant.pcl -- --target typescript

# Generate JSON config
npm run gen examples/personas/simple-assistant.pcl -- --target json

# Generate Markdown documentation
npm run gen examples/personas/simple-assistant.pcl -- --target markdown

# Save to file
npm run gen examples/personas/simple-assistant.pcl -- --target typescript -o output.ts
```

**Targets:**

- `prompt` - System prompt text for LLMs
- `typescript` - TypeScript SDK code
- `json` - JSON configuration
- `markdown` - Documentation

---

## Option 5: Run PCL Files (Runtime Execution)

Load and execute PCL personas:

```bash
npm run run examples/personas/simple-assistant.pcl
```

**Note:** Requires environment variables for AI providers (ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.)

---

## Option 6: Format PCL Files

Auto-format PCL code with standard style:

```bash
# Format and print to stdout
npm run fmt examples/personas/simple-assistant.pcl

# Format and save to file
npm run fmt examples/personas/simple-assistant.pcl -- -o formatted.pcl
```

---

## Option 7: HTTP Server (Production Ready)

Start a REST API server for PCL personas:

```bash
# Build the project first
npm run build

# Start server
node dist/http/server.js

# Custom port
PORT=8080 node dist/http/server.js
```

Then use the API:

```bash
# List personas
curl http://localhost:3000/api/personas

# Process a message
curl -X POST http://localhost:3000/api/personas/Helper/process \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'
```

---

## Option 8: Use the Node.js SDK

Use PCL in your TypeScript/JavaScript projects:

```typescript
import { PersonaInstance, TeamInstance, MemoryManager } from '@pcl/sdk';

// Create a persona
const assistant = new PersonaInstance({
  name: 'Helper',
  provider: 'claude',
  model: 'claude-sonnet-4.5',
  instructions: 'Be helpful and concise',
  temperature: 0.7,
});

// Process a message
const response = await assistant.process({
  role: 'user',
  content: 'What is TypeScript?',
});

console.log(response.content);
```

---

## Option 9: Registry Commands

Manage PCL artifacts (personas, skills, workflows):

```bash
# Initialize registry
npm run start registry init -- --backend sqlite

# Create artifact from PCL file
npm run start registry create examples/personas/simple-assistant.pcl

# Search registry
npm run start registry search "assistant"

# List all artifacts
npm run start registry list

# Get artifact info
npm run start registry info simple-assistant

# Publish artifact
npm run start registry publish simple-assistant
```

---

## Option 10: Skill Commands

Work with reusable skill modules:

```bash
# Import skills from SKILL.md format
npm run start skill import ~/.claude/skills/python-expert/SKILL.md -o ./skills/

# Export skill to SKILL.md format
npm run start skill export ./skills/python-expert.pcl -- --format claude-code

# Validate skill
npm run start skill validate ./skills/python-expert.pcl -- --spec agentskills

# List all skills
npm run start skill list

# Get skill info
npm run start skill info python-expert

# Interactive skill wizard
npm run start skill wizard

# Lint skill for quality
npm run start skill lint ./skills/python-expert.pcl
```

---

## Option 11: Try the Phase 2.3 Memory Demo

Test the new memory and context features:

```bash
node examples/compiled/examples/memory-demo.js
```

**Demonstrates:**

- Long-term memory with importance tracking
- Context compression
- Knowledge sharing between personas
- Conversation threading
- Semantic deduplication
- Context prioritization

---

## Quick Reference

| What You Want     | Command                                          |
| ----------------- | ------------------------------------------------ |
| Interactive shell | `npm run repl`                                   |
| Parse a file      | `npm run parse <file>`                           |
| Validate types    | `npm run check <file>`                           |
| Generate code     | `npm run gen <file> -- --target <type>`          |
| Run persona       | `npm run run <file>`                             |
| Format code       | `npm run fmt <file>`                             |
| Start HTTP server | `node dist/http/server.js`                       |
| Memory demo       | `node examples/compiled/examples/memory-demo.js` |
| Build project     | `npm run build`                                  |
| Run tests         | `npm test`                                       |

---

## Environment Setup

For runtime execution, set your API keys:

```bash
# Claude (Anthropic)
export ANTHROPIC_API_KEY="sk-ant-..."

# OpenAI (GPT)
export OPENAI_API_KEY="sk-..."

# Google (Gemini)
export GOOGLE_API_KEY="..."

# DeepSeek
export DEEPSEEK_API_KEY="..."
```

On Windows (PowerShell):

```powershell
$env:ANTHROPIC_API_KEY="sk-ant-..."
$env:OPENAI_API_KEY="sk-..."
```

---

## Example Workflow

### 1. Create a Persona

Create `my-coder.pcl`:

```pcl
persona MyCoder {
  name: "Coding Assistant"
  description: "Helps with programming tasks"

  provider: "claude"
  model: "claude-sonnet-4.5"

  instructions: """
    You are a helpful coding assistant.
    - Write clean, well-documented code
    - Explain your reasoning
    - Follow best practices
    - Use TypeScript when possible
  """

  temperature: 0.7
  max_tokens: 2000
}
```

### 2. Validate It

```bash
npm run check my-coder.pcl
```

### 3. Generate TypeScript

```bash
npm run gen my-coder.pcl -- --target typescript -o my-coder.ts
```

### 4. Use It

```typescript
import { PersonaInstance } from './my-coder.ts';

const coder = new PersonaInstance();
const response = await coder.process({
  role: 'user',
  content: 'Write a function to reverse a string',
});

console.log(response.content);
```

---

## Common Issues & Solutions

### Issue: "npm run dev does nothing"

**Solution:** Don't use `npm run dev`. Use `npm run repl` for interactive mode or specific commands like `npm run parse`.

### Issue: "Module not found"

**Solution:** Build the project first: `npm run build`

### Issue: "Provider not configured"

**Solution:** Set your API keys as environment variables (see Environment Setup above)

### Issue: "Command not found: pcl"

**Solution:** Use npm scripts (`npm run parse`) or install globally: `npm install -g @pcl/sdk`

### Issue: "REPL doesn't execute personas"

**Solution:** The REPL currently only parses syntax. Use `npm run run <file>` to actually execute personas.

---

## Next Steps

1. **Learn by Example**: Check `examples/` directory
2. **Read Docs**: See `docs/` for detailed guides
3. **Try Memory Features**: Run the Phase 2.3 demo
4. **Build Teams**: Create multi-persona workflows
5. **Explore Standard Library**: Look at `stdlib/` for pre-built personas

**Happy coding with PCL!** 🚀
