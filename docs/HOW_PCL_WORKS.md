# How PCL Works: Architecture & Internals

**Version:** 1.0.0
**Last Updated:** 2026-01-30
**Audience:** Developers, Contributors, Advanced Users

---

## Table of Contents

1. [Overview](#overview)
2. [The Big Picture](#the-big-picture)
3. [Compilation Pipeline](#compilation-pipeline)
4. [Runtime Execution](#runtime-execution)
5. [Core Components](#core-components)
6. [Data Flow](#data-flow)
7. [Under the Hood](#under-the-hood)
8. [Examples](#examples)

---

## Overview

**PCL (Persona Control Language)** is a domain-specific language for managing AI personas and multi-agent workflows. Unlike traditional programming languages, PCL is **declarative** and **configuration-focused**, designed specifically for AI orchestration.

### What Makes PCL Different?

| Traditional Languages  | PCL                                         |
| ---------------------- | ------------------------------------------- |
| Imperative (how to do) | Declarative (what to achieve)               |
| General-purpose        | Domain-specific (AI personas)               |
| Runtime interpretation | Compile-time validation + runtime execution |
| Weakly typed           | Strongly typed with inference               |
| Focus on algorithms    | Focus on configuration                      |

### Core Philosophy

```pcl
// You write WHAT you want
persona DEVELOPER {
  intent: "Write production-quality code"
  skills: ["TypeScript", "Testing", "Documentation"]
  constraints: ["Follow best practices"]
}

// PCL figures out HOW to achieve it
```

---

## The Big Picture

### PCL Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PCL SOURCE CODE                              │
│                     (your-persona.pcl)                               │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      COMPILATION PIPELINE                            │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │  LEXER   │───▶│  PARSER  │───▶│ SEMANTIC │───▶│ CODEGEN  │     │
│  │(Tokenize)│    │(AST Build)│    │(Validate)│    │(Generate)│     │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  Outputs:      │
                    │  • TypeScript  │
                    │  • JSON        │
                    │  • Markdown    │
                    │  • Prompts     │
                    └────────┬───────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        RUNTIME SYSTEM                                │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │ PERSONA  │◀──▶│   LLM    │◀──▶│  MEMORY  │◀──▶│ WORKFLOW │     │
│  │ MANAGER  │    │PROVIDERS │    │ MANAGER  │    │  ENGINE  │     │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
│       │               │                │                │            │
│       └───────────────┴────────────────┴────────────────┘           │
│                            │                                         │
│                            ▼                                         │
│                  ┌──────────────────┐                               │
│                  │   ORCHESTRATION  │                               │
│                  │   • Teams        │                               │
│                  │   • Routing      │                               │
│                  │   • Merging      │                               │
│                  └──────────────────┘                               │
└─────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  AI RESPONSES  │
                    │  • Claude      │
                    │  • GPT-4       │
                    │  • Gemini      │
                    │  • etc.        │
                    └────────────────┘
```

---

## Compilation Pipeline

PCL uses a **four-stage compilation pipeline** similar to traditional compilers, but optimized for configuration validation.

### Stage 1: Lexical Analysis (Lexer)

**Purpose:** Convert source code into tokens

**Input:** Raw PCL source code (string)
**Output:** Token stream

**Process:**

1. Read source character by character
2. Identify keywords, identifiers, operators, literals
3. Track position (line, column) for error reporting
4. Filter out comments and whitespace

**Example:**

```pcl
persona SEC { intent: "Security" }
```

Becomes:

```javascript
[
  { type: 'KEYWORD', value: 'persona', line: 1, col: 1 },
  { type: 'PERSONA_ID', value: 'SEC', line: 1, col: 9 },
  { type: 'LBRACE', value: '{', line: 1, col: 13 },
  { type: 'IDENTIFIER', value: 'intent', line: 1, col: 15 },
  { type: 'COLON', value: ':', line: 1, col: 21 },
  { type: 'STRING', value: 'Security', line: 1, col: 23 },
  { type: 'RBRACE', value: '}', line: 1, col: 34 },
];
```

**Implementation:** [src/lexer/](../src/lexer/)

**Coverage:** 99.02% tested ✅

---

### Stage 2: Syntax Analysis (Parser)

**Purpose:** Build Abstract Syntax Tree (AST)

**Input:** Token stream
**Output:** AST (Abstract Syntax Tree)

**Process:**

1. Recursive descent parsing with Pratt parsing for expressions
2. Build tree structure representing program semantics
3. Detect syntax errors (missing braces, invalid expressions)
4. Apply operator precedence

**Example AST:**

```javascript
{
  kind: 'Program',
  statements: [
    {
      kind: 'PersonaDeclaration',
      id: 'SEC',
      body: {
        intent: {
          kind: 'StringLiteral',
          value: 'Security'
        }
      }
    }
  ]
}
```

**Parser Features:**

- **Error Recovery:** Continues parsing after errors
- **Position Tracking:** Every node knows its source location
- **Type Annotations:** Captures type information for semantic analysis

**Implementation:** [src/parser/](../src/parser/)

**Coverage:** 98.56% tested ✅

---

### Stage 3: Semantic Analysis

**Purpose:** Validate types, scopes, and semantic rules

**Input:** AST
**Output:** Validated AST + symbol table + error list

**Process:**

1. **Symbol Resolution:** Build symbol table of all declarations
2. **Type Checking:** Verify type compatibility
3. **Scope Analysis:** Check variable/function visibility
4. **Semantic Validation:**
   - Duplicate declarations
   - Undefined references
   - Type mismatches
   - Constraint violations

**Example:**

```pcl
persona SEC {}
persona SEC {}  // ❌ Error: Duplicate persona 'SEC'

team REVIEW {
  members: [SEC, AUDIT]  // ❌ Error: Undefined persona 'AUDIT'
}
```

**Semantic Rules:**

- Personas must have unique IDs
- Team members must be defined personas
- Type annotations must match usage
- Constraints must be valid expressions

**Implementation:** [src/semantic/](../src/semantic/)

**Coverage:** 93.22% tested ✅

---

### Stage 4: Code Generation

**Purpose:** Transform validated AST into target formats

**Input:** Validated AST
**Output:** Generated code/configuration

**Targets:**

#### 1. System Prompt (for LLMs)

```markdown
# PERSONA: SEC - Security Analyst

## Identity

You are a security analyst focused on identifying vulnerabilities.

## Skills

- OWASP Top 10
- Threat modeling
- Security code review

## Constraints

- Always assume breach
- Prioritize user data protection
```

#### 2. TypeScript (for Node.js)

```typescript
export const SEC = {
  id: 'SEC',
  name: 'Security Analyst',
  config: {
    intent: 'Identify security vulnerabilities',
    skills: ['OWASP Top 10', 'Threat modeling'],
    constraints: ['Always assume breach'],
  },
};
```

#### 3. JSON (for APIs)

```json
{
  "id": "SEC",
  "name": "Security Analyst",
  "config": {
    "intent": "Identify security vulnerabilities",
    "skills": ["OWASP Top 10", "Threat modeling"]
  }
}
```

#### 4. Markdown (for Documentation)

```markdown
## SEC - Security Analyst

**Intent:** Identify security vulnerabilities

**Skills:**

- OWASP Top 10
- Threat modeling
```

**Implementation:** [src/codegen/](../src/codegen/)

**Coverage:** 51.91% tested ⚠️

---

## Runtime Execution

Once compiled, PCL personas are executed by the **Runtime System**.

### Runtime Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     RUNTIME MANAGER                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐               │
│  │  Persona   │  │   Team     │  │  Workflow  │               │
│  │  Registry  │  │  Manager   │  │  Engine    │               │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘               │
│        │                │                │                       │
│        └────────────────┴────────────────┘                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          │                             │
          ▼                             ▼
┌──────────────────┐          ┌──────────────────┐
│  LLM PROVIDERS   │          │  MEMORY SYSTEM   │
│  • Claude        │          │  • Short-term    │
│  • OpenAI        │          │  • Long-term     │
│  • Gemini        │          │  • Context       │
│  • Ollama        │          │  • Facts         │
│  • etc.          │          └──────────────────┘
└──────────────────┘
```

### Execution Flow

#### 1. **Message Reception**

```typescript
const runtime = createRuntime();
const persona = runtime.getPersona('SEC');

// User message arrives
const message = {
  id: '1',
  content: 'Review this authentication code',
  from: 'user',
  to: 'SEC',
};
```

#### 2. **Persona Activation**

```typescript
// Runtime activates persona
runtime.activate('SEC');

// Loads:
// - Persona configuration
// - Skills context
// - Memory state
// - Constraints
```

#### 3. **Context Building**

```typescript
// Build prompt context
const context = {
  identity: persona.config.intent,
  skills: persona.config.skills,
  constraints: persona.config.constraints,
  memory: persona.getMemory(),
  conversation: recentMessages,
};
```

#### 4. **LLM Invocation**

```typescript
// Select provider based on persona config
const provider = runtime.getProvider(persona.config.model);

// Generate system prompt
const systemPrompt = generatePrompt(persona);

// Call LLM
const response = await provider.complete({
  system: systemPrompt,
  messages: [message],
  temperature: persona.config.temperature,
  maxTokens: persona.config.maxTokens,
});
```

#### 5. **Response Processing**

```typescript
// Process response
const processed = {
  id: generateId(),
  personaId: 'SEC',
  content: response.content,
  confidence: response.confidence,
  metadata: {
    model: response.model,
    tokens: response.usage,
    timestamp: new Date(),
  },
};

// Update memory
persona.updateMemory(message, processed);

// Return to user
return processed;
```

**Implementation:** [src/runtime/](../src/runtime/)

**Coverage:** 42.07% tested ⚠️

---

## Core Components

### 1. Persona Manager

**Responsibilities:**

- Store persona definitions
- Activate/deactivate personas
- Manage persona state
- Track statistics (messages, tokens, performance)

**State Machine:**

```
┌──────────┐
│ Inactive │
└─────┬────┘
      │ activate()
      ▼
┌──────────┐
│  Active  │◀───┐
└─────┬────┘    │
      │         │ process()
      │ deactivate()
      ▼         │
┌──────────┐    │
│Processing├────┘
└──────────┘
```

**Implementation:** [src/runtime/persona.ts](../src/runtime/persona.ts)

---

### 2. LLM Provider System

**Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                    Provider Registry                         │
└────┬────────────────────────────────────────────────────────┘
     │
     ├─▶ Anthropic (Claude)
     ├─▶ OpenAI (GPT-4)
     ├─▶ Google (Gemini)
     ├─▶ DeepSeek
     ├─▶ Ollama (Local)
     ├─▶ Azure OpenAI
     ├─▶ AWS Bedrock
     └─▶ Mock (Testing)
```

**Features:**

- **Health Monitoring:** Circuit breakers, retry logic
- **Cost Tracking:** Per-model pricing, usage analytics
- **Rate Limiting:** Token bucket algorithm
- **Fallback Chains:** Automatic failover to backup models
- **Connection Pooling:** Reuse HTTP connections

**Example:**

```typescript
// Health-based fallback chain
const provider = createFallbackProvider({
  strategy: 'health',
  providers: [
    claude, // Primary
    gpt4, // Fallback 1
    gemini, // Fallback 2
  ],
});

// If Claude fails, automatically tries GPT-4, then Gemini
const response = await provider.complete(request);
```

**Implementation:** [src/runtime/providers/](../src/runtime/providers/)

**Coverage:** 49.39% tested ⚠️

---

### 3. Memory System

**Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                      MEMORY LAYERS                           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Short-Term Memory (STM)                             │  │
│  │  • Recent messages (last 10-20)                      │  │
│  │  • Context window management                         │  │
│  │  • Automatic pruning                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Long-Term Memory (LTM)                              │  │
│  │  • Persistent facts                                  │  │
│  │  • User preferences                                  │  │
│  │  • Domain knowledge                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Semantic Memory                                     │  │
│  │  • Vector embeddings                                 │  │
│  │  • Similarity search                                 │  │
│  │  • Knowledge graph                                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Memory Operations:**

```typescript
// Store message in STM
persona.memory.store(message);

// Add fact to LTM
persona.memory.addFact('user_prefers_typescript', true);

// Retrieve relevant context
const context = persona.memory.recall({
  query: 'What language does user prefer?',
  limit: 5,
});

// Prune old memories
persona.memory.prune({ maxAge: '7d', maxCount: 100 });
```

**Implementation:** [src/runtime/memory/](../src/runtime/memory/)

**Coverage:** 0% tested ❌ (TODO: Add tests)

---

### 4. Team Orchestration

**Team Merge Strategies:**

#### Primary Mode

```
         User Query
              │
              ▼
        ┌─────────┐
        │ Primary │───▶ Final Response
        │ Persona │
        └─────────┘
              ▲
              │
     ┌────────┴────────┐
     │                 │
┌─────────┐      ┌─────────┐
│Member 1 │      │Member 2 │
│(Advisor)│      │(Advisor)│
└─────────┘      └─────────┘
```

#### Consensus Mode

```
         User Query
              │
    ┌─────────┼─────────┐
    │         │         │
    ▼         ▼         ▼
┌────────┐ ┌────────┐ ┌────────┐
│Persona1│ │Persona2│ │Persona3│
└───┬────┘ └───┬────┘ └───┬────┘
    │          │          │
    └──────────┼──────────┘
               ▼
        ┌────────────┐
        │  Synthesize│───▶ Consensus Response
        └────────────┘
```

#### Debate Mode

```
Round 1:
┌────────┐    ┌────────┐    ┌────────┐
│   A    │───▶│   B    │───▶│   C    │
└────────┘    └────────┘    └────────┘
     │             │             │
     └─────────────┼─────────────┘
                   ▼
Round 2:
┌────────┐    ┌────────┐    ┌────────┐
│   A'   │───▶│   B'   │───▶│   C'   │
└────────┘    └────────┘    └────────┘
     │             │             │
     └─────────────┼─────────────┘
                   ▼
            Final Synthesis
```

**Implementation:** [src/runtime/teams/](../src/runtime/teams/)

**Coverage:** 0% tested ❌ (TODO: Add tests)

---

### 5. Workflow Engine

**Workflow Execution:**

```
┌─────────────────────────────────────────────────────────────┐
│                    Workflow Definition                       │
│                                                              │
│  ARCHI ──▶ (SEC || AUDIT) ──▶ merge(Debate) ──▶ CRITIC     │
│                                                              │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Execution Graph                           │
│                                                              │
│   Step 1        Step 2              Step 3         Step 4   │
│  ┌──────┐    ┌────────┐          ┌────────┐     ┌────────┐ │
│  │ARCHI │───▶│SEC     │─┐        │ Debate │────▶│CRITIC  │ │
│  └──────┘    │        │ │        │ Merge  │     └────────┘ │
│              └────────┘ │        └────────┘                 │
│                         ├───────▶   ▲                       │
│              ┌────────┐ │           │                       │
│              │AUDIT   │─┘───────────┘                       │
│              └────────┘                                     │
└─────────────────────────────────────────────────────────────┘
```

**Workflow Features:**

- **Sequential:** A → B → C
- **Parallel:** (A || B || C)
- **Conditional:** if condition then A else B
- **Merge Points:** Combine parallel outputs
- **Error Handling:** Retry, fallback, timeout

**Implementation:** [src/runtime/workflow.ts](../src/runtime/workflow.ts)

---

## Data Flow

### Complete Request-Response Cycle

```
1. USER REQUEST
   │
   ▼
2. ROUTING (if using router)
   │ • Tag matching
   │ • Skill matching
   │ • Context analysis
   ▼
3. PERSONA SELECTION
   │ • Single persona OR
   │ • Team of personas
   ▼
4. CONTEXT ASSEMBLY
   │ • Load persona config
   │ • Retrieve memory
   │ • Add skills context
   │ • Apply constraints
   ▼
5. PROMPT GENERATION
   │ • Build system prompt
   │ • Format conversation
   │ • Add examples (few-shot)
   ▼
6. LLM INVOCATION
   │ • Select provider
   │ • Rate limit check
   │ • Make API call
   │ • Retry if needed
   ▼
7. RESPONSE PROCESSING
   │ • Validate response
   │ • Extract content
   │ • Check constraints
   │ • Update statistics
   ▼
8. MEMORY UPDATE
   │ • Store in STM
   │ • Extract facts → LTM
   │ • Update context
   ▼
9. TEAM MERGING (if team)
   │ • Collect all responses
   │ • Apply merge strategy
   │ • Generate final output
   ▼
10. RETURN TO USER
```

### Data Structures

**Message:**

```typescript
interface Message {
  id: string;
  from: string | null; // 'user' or persona ID
  to: string | null; // persona ID or 'user'
  content: string;
  metadata: {
    timestamp: Date;
    model?: string;
    tokens?: number;
    [key: string]: any;
  };
}
```

**Persona State:**

```typescript
interface PersonaState {
  id: string;
  name: string;
  active: boolean;
  config: PersonaConfig;
  memory: {
    shortTerm: Message[];
    context: Map<string, any>;
    facts: Map<string, any>;
  };
  stats: {
    messagesProcessed: number;
    tokensUsed: number;
    activationCount: number;
    averageResponseTime: number;
  };
}
```

---

## Under the Hood

### Performance Optimizations

#### 1. **Incremental Parsing**

```typescript
// Only re-parse changed sections
const result = parser.parseIncremental(previousAST, changes);
```

#### 2. **Lazy Loading**

```typescript
// Don't load providers until needed
const provider = lazy(() => import('./anthropic'));
```

#### 3. **Connection Pooling**

```typescript
// Reuse HTTP connections
const pool = createConnectionPool({
  maxConnections: 10,
  keepAlive: true,
});
```

#### 4. **Memory Pruning**

```typescript
// Automatically prune old messages
persona.memory.autoPrune({
  maxMessages: 100,
  maxAge: '7d',
});
```

#### 5. **Caching**

```typescript
// Cache compiled prompts
const promptCache = new LRUCache({
  max: 100,
  ttl: 3600000, // 1 hour
});
```

---

### Error Handling

**Error Hierarchy:**

```
PCLError (base)
├── CompilationError
│   ├── LexicalError
│   ├── SyntaxError
│   └── SemanticError
├── RuntimeError
│   ├── PersonaNotFoundError
│   ├── ProviderError
│   │   ├── RateLimitError
│   │   ├── TimeoutError
│   │   └── APIError
│   └── MemoryError
└── ValidationError
    ├── ConstraintViolationError
    └── TypeMismatchError
```

**Error Recovery:**

```typescript
try {
  const response = await persona.process(message);
} catch (error) {
  if (error instanceof RateLimitError) {
    // Wait and retry
    await sleep(error.retryAfter);
    return persona.process(message);
  } else if (error instanceof TimeoutError) {
    // Use fallback provider
    return fallbackProvider.process(message);
  } else {
    // Log and return graceful error
    logger.error(error);
    return {
      content: 'I apologize, but I encountered an error.',
      error: true,
    };
  }
}
```

---

### Security

**Security Layers:**

1. **Input Validation**
   - Sanitize user input
   - Validate PCL syntax
   - Check for injection attacks

2. **Persona Boundaries**
   - Enforce constraints
   - Limit capabilities
   - Prevent escalation

3. **Provider Security**
   - API key rotation
   - Rate limiting
   - Request signing

4. **Audit Logging**
   - Log all interactions
   - Track persona usage
   - Monitor anomalies

**Implementation:** See [SECURITY.md](../SECURITY.md)

---

## Examples

### Example 1: Simple Persona Execution

```typescript
import { createRuntime } from '@pcl/sdk';

// Initialize runtime
const runtime = createRuntime();

// Load persona from PCL
runtime.loadPersona(`
  persona HELPER {
    intent: "Provide helpful assistance"
    tone: friendly
  }
`);

// Execute
const response = await runtime.execute('HELPER', {
  content: 'How do I install PCL?',
});

console.log(response.content);
```

### Example 2: Team Collaboration

```typescript
import { createRuntime } from '@pcl/sdk';

const runtime = createRuntime();

// Load team
runtime.loadTeam(`
  persona RESEARCHER {
    intent: "Research topics thoroughly"
  }

  persona WRITER {
    intent: "Write clear explanations"
  }

  team CONTENT_CREATORS {
    members: [RESEARCHER, WRITER]
    merge: Chain
  }
`);

// Researcher gathers info, Writer produces content
const response = await runtime.executeTeam('CONTENT_CREATORS', {
  content: 'Explain quantum computing',
});
```

### Example 3: Custom Provider

```typescript
import { BaseProvider } from '@pcl/sdk/providers';

class MyCustomProvider extends BaseProvider {
  async complete(request) {
    const response = await fetch('https://my-llm-api.com/complete', {
      method: 'POST',
      body: JSON.stringify({
        prompt: request.system + '\n' + request.messages,
        max_tokens: request.maxTokens,
      }),
    });

    return {
      content: response.text,
      model: 'my-custom-model',
      usage: response.tokens,
    };
  }
}

// Register custom provider
runtime.registerProvider('custom', new MyCustomProvider());

// Use in persona
runtime.loadPersona(`
  persona CUSTOM {
    intent: "Use custom LLM"
    model: "custom"
  }
`);
```

---

## Debugging

### Debug Mode

```bash
# Enable debug logging
DEBUG=pcl:* npm start

# Specific modules
DEBUG=pcl:parser,pcl:runtime npm start
```

### Performance Profiling

```typescript
import { createRuntime, enableProfiling } from '@pcl/sdk';

const runtime = createRuntime();
enableProfiling(runtime);

// Execute
await runtime.execute('HELPER', { content: 'test' });

// View profile
const profile = runtime.getProfile();
console.log(profile);
// {
//   parsing: 12ms,
//   compilation: 45ms,
//   execution: 1234ms,
//   llm_call: 1180ms,
//   total: 1291ms
// }
```

### State Inspection

```typescript
// Inspect persona state
const state = persona.getState();
console.log(state.memory.shortTerm); // Recent messages
console.log(state.stats); // Usage statistics

// Create snapshot
const snapshot = runtime.createSnapshot();
// Restore later
runtime.restore(snapshot);
```

---

## Further Reading

### Architecture Documents

- [Compiler Architecture](./architecture/COMPILER.md)
- [Runtime Architecture](./architecture/RUNTIME.md)
- [Provider System](./architecture/PROVIDERS.md)

### API Reference

- [Parser API](./api/PARSER.md)
- [Runtime API](./api/RUNTIME.md)
- [Codegen API](./api/CODEGEN.md)

### Guides

- [Building Custom Providers](./guides/CUSTOM_PROVIDERS.md)
- [Memory Management](./guides/MEMORY.md)
- [Team Orchestration](./guides/TEAMS.md)

### Testing

- [Coverage Roadmap](./testing/COVERAGE_ROADMAP.md)
- [Testing Status](./testing/TESTING_STATUS.md)

---

## Contributing

Want to contribute to PCL's internals?

1. Read [CONTRIBUTING.md](../CONTRIBUTING.md)
2. Review [CLAUDE.md](../.claude/CLAUDE.md) for architecture principles
3. Check [GitHub Issues](https://github.com/pcl-lang/pcl/issues)
4. Join our [Discord](https://discord.gg/pcl-lang)

---

**Last Updated:** 2026-01-30
**Version:** 1.0.0
**Status:** Living Document
