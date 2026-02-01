# PCL Quick Start Guide

**Get started with PCL in 5 minutes** ⚡

---

## What is PCL?

PCL (Persona Control Language) is a programming language for managing AI personas. Think of it as **configuration files for AI behavior** that work across different LLMs (Claude, GPT-4, Gemini, etc.).

```pcl
// Define who your AI should be
persona DEVELOPER {
  intent: "Write clean, tested code"
  skills: ["TypeScript", "Testing"]
  tone: professional
}

// Use it immediately
```

---

## Installation

```bash
npm install @pcl/sdk
```

**Requirements:**

- Node.js 20+
- npm or yarn

---

## Your First Persona (30 seconds)

### 1. Create a file: `my-persona.pcl`

```pcl
persona HELPER {
  intent: "Provide friendly, helpful assistance"
  tone: friendly
  skills: [
    "General knowledge",
    "Problem solving"
  ]
}
```

### 2. Use it in code:

```typescript
import { createRuntime } from '@pcl/sdk';

const runtime = createRuntime();

// Load your persona
await runtime.loadPersona('./my-persona.pcl');

// Execute
const response = await runtime.execute('HELPER', {
  content: 'How do I learn TypeScript?',
});

console.log(response.content);
```

---

## Core Concepts (2 minutes)

### Personas

Think of personas as **AI job descriptions**:

```pcl
persona CODE_REVIEWER {
  intent: "Review code for quality and security"

  skills: [
    "Code analysis",
    "Security best practices",
    "Performance optimization"
  ]

  constraints: [
    "Be constructive, not critical",
    "Suggest specific improvements"
  ]

  tone: professional
  depth: detailed
}
```

### Teams

Multiple personas working together:

```pcl
persona ARCHITECT {
  intent: "Design system architecture"
}

persona SECURITY {
  intent: "Identify security issues"
}

team DESIGN_REVIEW {
  members: [ARCHITECT, SECURITY]
  merge: Consensus  // Combine their perspectives
}
```

### Workflows

Orchestrate complex processes:

```pcl
workflow CODE_REVIEW {
  // Sequential: ARCHITECT → SECURITY → REVIEWER
  steps: ARCHITECT -> SECURITY -> REVIEWER

  // Parallel: All at once
  // steps: (ARCHITECT || SECURITY || REVIEWER)

  timeout: 60s
}
```

---

## Common Use Cases

### 1. Code Review Assistant

```pcl
persona CODE_REVIEWER {
  intent: "Review code for bugs and improvements"

  skills: [
    "Static analysis",
    "Best practices",
    "Security vulnerabilities"
  ]

  constraints: [
    "Focus on critical issues first",
    "Provide code examples for fixes"
  ]

  output: {
    format: markdown
    sections: ["Summary", "Issues", "Recommendations"]
  }
}
```

**Usage:**

```typescript
const review = await runtime.execute('CODE_REVIEWER', {
  content: `
    Review this function:
    ${codeToReview}
  `,
});
```

---

### 2. Multi-Expert Consultation

```pcl
persona BACKEND {
  intent: "Backend architecture and APIs"
  skills: ["Node.js", "Databases", "REST APIs"]
}

persona FRONTEND {
  intent: "Frontend development and UX"
  skills: ["React", "CSS", "Accessibility"]
}

persona DEVOPS {
  intent: "Deployment and infrastructure"
  skills: ["Docker", "CI/CD", "Cloud platforms"]
}

team FULL_STACK_TEAM {
  members: [BACKEND, FRONTEND, DEVOPS]
  merge: Debate  // They discuss and reach consensus
  quorum: 2/3    // Need at least 2 to agree
}
```

**Usage:**

```typescript
const solution = await runtime.executeTeam('FULL_STACK_TEAM', {
  content: 'Design a real-time chat application',
});
```

---

### 3. Content Creation Pipeline

```pcl
workflow CONTENT_CREATION {
  steps: [
    RESEARCHER,     // Gather information
    OUTLINER,       // Structure content
    WRITER,         // Write draft
    EDITOR,         // Polish and refine
    SEO_OPTIMIZER   // Optimize for search
  ]
}
```

---

## Provider Configuration

PCL works with multiple LLM providers:

```typescript
import { createRuntime } from '@pcl/sdk';
import { AnthropicProvider } from '@pcl/sdk/providers';

const runtime = createRuntime();

// Configure Claude
runtime.registerProvider(
  'claude',
  new AnthropicProvider({
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-5-sonnet-20241022',
  })
);

// Set as default
runtime.setDefaultProvider('claude');
```

**Supported Providers:**

- ✅ Anthropic (Claude)
- ✅ OpenAI (GPT-4)
- ✅ Google (Gemini)
- ✅ DeepSeek
- ✅ Ollama (local)
- ✅ Azure OpenAI
- ✅ AWS Bedrock

---

## Advanced Features

### Skills System

Import reusable skills:

```pcl
persona PYTHON_EXPERT {
  name: "Python Expert"

  // Import skills from ecosystem
  skills: [
    "@agentskills/python-expert",
    "@claude-code/code-review",
    "@pcl/skills/testing"
  ]
}
```

### Dynamic Routing

Automatically select the right persona:

```pcl
router SMART_ROUTER {
  rules: [
    { tags: ["code", "bug"], route: DEBUGGER },
    { tags: ["design", "architecture"], route: ARCHITECT },
    { skills: ["security"], route: SECURITY }
  ]

  fallback: GENERAL_ASSISTANT
}
```

### Memory & Context

```typescript
// Personas remember conversations
const response1 = await persona.process({
  content: 'My name is Alice',
});

const response2 = await persona.process({
  content: "What's my name?",
});
// → "Your name is Alice"

// Access memory
const memory = persona.getMemory();
console.log(memory.facts.get('user_name')); // "Alice"
```

---

## CLI Usage

PCL includes a powerful CLI:

```bash
# Parse and validate
pcl check my-persona.pcl

# Generate TypeScript
pcl gen my-persona.pcl --target typescript

# Interactive REPL
pcl repl

# Execute directly
pcl exec my-persona.pcl --persona HELPER --message "Hello!"
```

---

## VSCode Extension

Install the PCL extension for:

- ✅ Syntax highlighting
- ✅ Auto-completion
- ✅ Real-time error checking
- ✅ Go to definition
- ✅ Hover documentation

**Install:**

1. Open VSCode
2. Search for "PCL Language"
3. Click Install

---

## Best Practices

### 1. Start Simple

```pcl
// ✅ Good: Clear, focused persona
persona HELPER {
  intent: "Answer questions clearly"
  tone: friendly
}

// ❌ Too complex for beginners
persona EXPERT {
  intent: "Multi-modal analysis with quantum optimization"
  skills: [/* 50 skills */]
  constraints: [/* 20 constraints */]
}
```

### 2. Use Constraints

```pcl
persona DEVELOPER {
  constraints: [
    "Always include tests",
    "Follow TypeScript strict mode",
    "Add JSDoc comments"
  ]
}
```

### 3. Test Iteratively

```typescript
// Test with simple messages first
await runtime.execute('HELPER', { content: 'Hello' });

// Then more complex
await runtime.execute('HELPER', { content: complexQuery });
```

### 4. Monitor Usage

```typescript
const stats = persona.getStats();
console.log({
  messages: stats.messagesProcessed,
  tokens: stats.tokensUsed,
  avgTime: stats.averageResponseTime,
});
```

---

## Troubleshooting

### "Persona not found"

```typescript
// Ensure persona is loaded
await runtime.loadPersona('./my-persona.pcl');

// Or check registered personas
const personas = runtime.listPersonas();
console.log(personas);
```

### "Provider error"

```typescript
// Check API key
console.log(process.env.ANTHROPIC_API_KEY);

// Test provider directly
const provider = runtime.getProvider('claude');
const health = await provider.checkHealth();
```

### "Compilation error"

```bash
# Validate syntax
pcl check my-persona.pcl

# View detailed errors
pcl check my-persona.pcl --verbose
```

---

## Next Steps

### Learn More

- **[How PCL Works](./HOW_PCL_WORKS.md)** - Deep dive into architecture
- **[Language Reference](./reference/LANGUAGE.md)** - Complete syntax guide
- **[API Documentation](./api/)** - Full API reference
- **[Examples](../examples/)** - Real-world examples

### Tutorials

1. [Build a Code Review Bot](./tutorials/code-review-bot.md)
2. [Create a Multi-Agent System](./tutorials/multi-agent.md)
3. [Integrate with Your App](./tutorials/integration.md)

### Community

- 💬 [Discord](https://discord.gg/pcl-lang)
- 🐦 [Twitter](https://twitter.com/pcl_lang)
- 📧 [Mailing List](https://groups.google.com/g/pcl-lang)
- 🐛 [Issues](https://github.com/pcl-lang/pcl/issues)

---

## Complete Example

Here's everything together:

```pcl
// my-app.pcl

// Define personas
persona RESEARCHER {
  intent: "Research topics thoroughly"
  skills: ["Web search", "Data analysis"]
  depth: detailed
}

persona WRITER {
  intent: "Write clear, engaging content"
  skills: ["Technical writing", "Storytelling"]
  tone: professional
}

persona EDITOR {
  intent: "Polish and refine content"
  skills: ["Grammar", "Style", "Clarity"]
  constraints: ["Be concise", "Maintain author's voice"]
}

// Create workflow
workflow CONTENT_PIPELINE {
  steps: RESEARCHER -> WRITER -> EDITOR
  timeout: 120s
}

// Export for use
export { RESEARCHER, WRITER, EDITOR, CONTENT_PIPELINE }
```

**Use it:**

```typescript
import { createRuntime } from '@pcl/sdk';

const runtime = createRuntime();
await runtime.loadPersona('./my-app.pcl');

const article = await runtime.executeWorkflow('CONTENT_PIPELINE', {
  content: 'Write an article about TypeScript generics',
});

console.log(article.content);
```

---

**You're ready!** 🎉

Start building AI-powered applications with PCL. Remember:

- Start simple
- Test often
- Iterate based on results

Happy coding! 🚀
