# Getting Started with PCL

Welcome! This guide shows you how to experience the power of PCL (Persona Control Language).

## What Can You Do With PCL?

PCL is a domain-specific language for AI persona management with advanced features:

1. **Define AI Personas** - Create specialized AI agents with custom behaviors
2. **Build Teams** - Combine personas with different merge strategies (debate, chain, parallel)
3. **Create Workflows** - Orchestrate multi-step AI processes
4. **Use Skills** - Modular, reusable instruction blocks
5. **Memory & Context** - Persistent learning across sessions (NEW in v2.3!)
6. **Provider Abstraction** - Switch between Claude, GPT, Gemini, DeepSeek seamlessly

---

## Quick Start Options

### Option 1: Interactive REPL (Recommended for Beginners)

The REPL (Read-Eval-Print Loop) lets you experiment with PCL interactively:

```bash
npm run repl
```

Try these commands in the REPL:

```pcl
// Define a simple persona
persona Helper {
  name: "Friendly Assistant"
  description: "A helpful AI assistant"
  instructions: "Be friendly and concise"
}

// Use the persona
Helper.process("Hello!")
```

### Option 2: Parse and Validate PCL Files

Check if your PCL syntax is correct:

```bash
npm run parse examples/personas/simple-assistant.pcl
```

Validate semantics and types:

```bash
npm run check examples/personas/simple-assistant.pcl
```

### Option 3: Generate Code from PCL

Compile PCL to different targets:

```bash
# Generate system prompt
npm run gen examples/personas/simple-assistant.pcl --target prompt

# Generate TypeScript code
npm run gen examples/personas/simple-assistant.pcl --target typescript

# Generate JSON config
npm run gen examples/personas/simple-assistant.pcl --target json
```

### Option 4: Use the HTTP Server (Production-Ready)

Start the PCL HTTP server to use personas via REST API:

```bash
# Start server (default port 3000)
node dist/http/server.js

# Or specify custom port
PORT=8080 node dist/http/server.js
```

Then make requests:

```bash
curl -X POST http://localhost:3000/api/personas/Helper/process \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, how are you?"}'
```

### Option 5: Use the Node.js SDK

Import PCL directly in your TypeScript/JavaScript projects:

```typescript
import { PersonaInstance, TeamInstance } from '@pcl/sdk';

// Create a persona
const helper = new PersonaInstance({
  name: 'Helper',
  provider: 'claude',
  model: 'claude-sonnet-4.5',
  instructions: 'Be helpful and concise',
});

// Process a message
const response = await helper.process({
  role: 'user',
  content: 'Hello!',
});

console.log(response.content);
```

---

## Try the NEW Phase 2.3 Memory Features

We just implemented powerful memory and context features! Try this demo:

```bash
node examples/compiled/examples/memory-demo.js
```

This demonstrates:

- **Long-term memory** with importance tracking
- **Context windows** with intelligent compression
- **Knowledge sharing** between personas
- **Conversation threading** for multi-turn optimization
- **Semantic deduplication** to avoid redundancy
- **Context prioritization** for relevance

---

## Example: Create Your First Persona

### Step 1: Create a PCL file

Create `my-assistant.pcl`:

```pcl
persona MyAssistant {
  name: "My Custom Assistant"
  description: "A personalized AI helper"

  provider: "claude"
  model: "claude-sonnet-4.5"

  instructions: """
    You are a helpful assistant with these qualities:
    - Always be polite and professional
    - Provide clear, concise answers
    - Use examples when helpful
    - Admit when you don't know something
  """

  temperature: 0.7
  max_tokens: 2000
}
```

### Step 2: Validate it

```bash
npm run check my-assistant.pcl
```

### Step 3: Generate code

```bash
npm run gen my-assistant.pcl --target typescript > my-assistant.ts
```

### Step 4: Use it

```typescript
import { PersonaInstance } from './my-assistant.ts';

const assistant = new PersonaInstance();
const response = await assistant.process({
  role: 'user',
  content: 'What is TypeScript?',
});

console.log(response.content);
```

---

## Example: Build a Team

Create `code-review-team.pcl`:

```pcl
persona SecurityExpert {
  name: "Security Reviewer"
  instructions: "Review code for security vulnerabilities"
  provider: "claude"
  model: "claude-sonnet-4.5"
}

persona PerformanceExpert {
  name: "Performance Reviewer"
  instructions: "Analyze code for performance issues"
  provider: "claude"
  model: "claude-sonnet-4.5"
}

persona StyleExpert {
  name: "Style Reviewer"
  instructions: "Check code style and best practices"
  provider: "claude"
  model: "claude-sonnet-4.5"
}

team CodeReviewTeam {
  members: [SecurityExpert, PerformanceExpert, StyleExpert]
  merge: debate
  rounds: 2
  consensus_threshold: 0.7
}
```

Use the team:

```typescript
import { TeamInstance } from '@pcl/sdk';

const reviewTeam = new TeamInstance({
  name: 'CodeReviewTeam',
  members: [securityExpert, perfExpert, styleExpert],
  mergeStrategy: 'debate',
});

const review = await reviewTeam.process({
  role: 'user',
  content: 'Review this code: function foo() { eval(userInput); }',
});

console.log(review.content);
// Output: Combined insights from security, performance, and style experts
```

---

## Advanced: Try Different Merge Strategies

PCL supports 7 merge strategies for teams:

### 1. **Primary** (Use first member's response)

```pcl
team SimpleTeam {
  members: [Expert1, Expert2]
  merge: primary
}
```

### 2. **Consensus** (Combine similar responses)

```pcl
team ConsensusTeam {
  members: [Expert1, Expert2, Expert3]
  merge: consensus
  threshold: 0.7
}
```

### 3. **Majority** (Most common response)

```pcl
team VotingTeam {
  members: [Judge1, Judge2, Judge3, Judge4, Judge5]
  merge: majority
}
```

### 4. **Append** (Concatenate all responses)

```pcl
team BrainstormTeam {
  members: [Creative1, Creative2, Creative3]
  merge: append
  separator: "\n\n---\n\n"
}
```

### 5. **Debate** (Iterative refinement)

```pcl
team DebateTeam {
  members: [Optimist, Pessimist, Realist]
  merge: debate
  rounds: 3
}
```

### 6. **Chain** (Sequential processing)

```pcl
team PipelineTeam {
  members: [Researcher, Analyst, Writer]
  merge: chain
}
```

### 7. **Weighted** (Weighted combination)

```pcl
team ExpertTeam {
  members: [Senior, Junior]
  merge: weighted
  weights: [0.8, 0.2]
}
```

---

## Next Steps

1. **Explore Examples**: Check out `examples/` directory for more PCL files
2. **Read Documentation**: See `docs/` for detailed guides
3. **Try the Standard Library**: Explore `stdlib/` for pre-built personas
4. **Build Your Own**: Create custom personas for your use case
5. **Join the Community**: Contribute personas to the marketplace!

---

## Key Features to Explore

### Memory System (Phase 2.3)

```typescript
import { MemoryManager } from '@pcl/sdk';

const memory = new MemoryManager({
  memory: { enabled: true, persistToDisk: true },
  contextWindow: { maxTokens: 100000 },
  knowledgeSharing: { enabled: true },
});

// Store long-term memories
memory.storeMemory({
  personaId: 'assistant',
  type: 'preference',
  content: 'User prefers TypeScript over JavaScript',
  importance: 0.9,
  tags: ['preference', 'language'],
});

// Process messages with full context
const result = memory.processMessage(
  'developer-persona',
  'How should I structure my TypeScript project?'
);
```

### Provider Abstraction

```typescript
import { ProviderRegistry } from '@pcl/sdk';

const registry = new ProviderRegistry();

// Use any provider
const claudeProvider = registry.get('claude');
const gptProvider = registry.get('openai');
const geminiProvider = registry.get('google');

// Automatic fallback chains
const response = await provider.complete({
  messages: [...],
  fallbackChain: ['claude', 'openai', 'google'],
});
```

### Health Monitoring & Rate Limiting

```typescript
// Built-in circuit breaker
const health = registry.getHealthMonitor('claude');
console.log(health.getState()); // 'closed', 'open', or 'half-open'

// Automatic rate limiting
const rateLimiter = registry.getRateLimiter('openai');
// Requests are automatically queued and throttled
```

### Cost Tracking

```typescript
import { CostTrackerRegistry } from '@pcl/sdk';

const costTracker = new CostTrackerRegistry();
const tracker = costTracker.get('claude');

// Automatic cost calculation
console.log(tracker.getTotalCost());
console.log(tracker.getStats());
```

---

## Troubleshooting

### "Module not found" errors

Make sure you've built the project:

```bash
npm run build
```

### "Provider not configured" errors

Set your API keys in environment variables:

```bash
export ANTHROPIC_API_KEY="your-key"
export OPENAI_API_KEY="your-key"
export GOOGLE_API_KEY="your-key"
```

### TypeScript errors

Run type checking:

```bash
npm run typecheck
```

### Need help?

- Check the docs: `docs/`
- Run tests: `npm test`
- File an issue: GitHub Issues

---

## Quick Reference Card

| Command                | Purpose                    |
| ---------------------- | -------------------------- |
| `npm run repl`         | Interactive REPL           |
| `npm run parse <file>` | Parse PCL file             |
| `npm run check <file>` | Validate PCL file          |
| `npm run gen <file>`   | Generate code              |
| `npm run build`        | Build the project          |
| `npm test`             | Run tests                  |
| `npm run dev`          | Watch mode for development |

---

**Ready to experience the power of PCL? Start with the REPL!**

```bash
npm run repl
```

Have fun! 🚀
