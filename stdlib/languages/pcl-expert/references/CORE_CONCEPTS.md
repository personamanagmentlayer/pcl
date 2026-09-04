# PCL Expert — Core Competencies

Reference material for the `pcl-expert` skill. See [SKILL.md](../SKILL.md).

## Core Competencies

### Language Design & Specification

- **PCL Syntax & Grammar**: EBNF grammar definitions, concrete and abstract syntax
- **Type System**: Nominal typing, branded types, interface hierarchies, type inference
- **Semantic Rules**: Scope resolution, symbol tables, type checking, validation
- **Language Evolution**: Backward compatibility, deprecation strategies, versioning
- **Standards Alignment**: ISO 5218, ISO 639-1, IEEE, W3C specifications

### Compiler Architecture

#### Lexical Analysis (Lexer)

```typescript
// Token classification and scanning
interface Token {
  type: TokenType;
  value: string;
  position: Position;
  range: SourceRange;
}

// Advanced tokenization patterns
class Lexer {
  // Character-by-character scanning
  // Position tracking (line, column, offset)
  // Error recovery mechanisms
  // Unicode support (UTF-8)
  // Comment handling (single-line, multi-line)
  // String literal processing (escape sequences)
  // Numeric literal parsing (integers, floats, scientific)
}
```

#### Syntactic Analysis (Parser)

```typescript
// Recursive descent parsing
interface Parser {
  // Top-down parsing strategy
  // AST node construction
  // Error synchronization
  // Predictive parsing (lookahead)
  // Operator precedence handling
  // Left-recursion elimination
}

// AST node patterns
type ASTNode =
  | PersonaDeclaration
  | SkillDeclaration
  | TeamDeclaration
  | WorkflowDeclaration
  | Expression
  | Statement;

// Discriminated unions for type safety
interface PersonaDeclaration {
  type: 'PersonaDeclaration';
  id: PersonaId;
  skills: Skill[];
  metadata: PersonaMetadata;
  range: SourceRange;
}
```

#### Semantic Analysis

```typescript
// Type checking and validation
class SemanticAnalyzer {
  private symbolTable: SymbolTable;
  private typeChecker: TypeChecker;
  private validator: Validator;

  // Two-pass analysis
  // 1. Declaration phase: Build symbol table
  // 2. Validation phase: Type check and validate

  analyzePersona(node: PersonaDeclaration): Result<void, Error[]> {
    // Validate persona ID uniqueness
    // Check skill references exist
    // Verify composition constraints
    // Ensure no circular dependencies
  }

  analyzeTeam(node: TeamDeclaration): Result<void, Error[]> {
    // Validate team composition rules
    // Check merge mode compatibility
    // Verify persona references
    // Validate weight distributions
  }
}
```

#### Code Generation

```typescript
// Target: JavaScript/TypeScript runtime
class CodeGenerator {
  // Generate executable runtime code
  // Optimize for performance
  // Generate source maps
  // Inline constants
  // Dead code elimination
  // Tree shaking

  generatePersona(node: PersonaDeclaration): string {
    // Emit JavaScript persona constructor
    // Include skill composition logic
    // Generate metadata serialization
  }

  generateWorkflow(node: WorkflowDeclaration): string {
    // Emit workflow orchestration code
    // Include state machine transitions
    // Generate error handling wrappers
  }
}
```

### Runtime Systems

#### Execution Engine

```typescript
// PCL runtime architecture
class PCLRuntime {
  // Persona lifecycle management
  // Team coordination and consensus
  // Workflow orchestration
  // Memory management
  // Event system
  // Provider abstraction

  async executePersona(
    persona: Persona,
    input: string,
    context: Context
  ): Promise<PersonaResponse> {
    // Activate persona with skills
    // Execute with provider (OpenAI, Anthropic, etc.)
    // Manage conversation context
    // Handle errors and fallbacks
  }

  async executeTeam(
    team: Team,
    input: string,
    options: TeamOptions
  ): Promise<TeamResponse> {
    // Coordinate multiple personas
    // Merge responses (consensus, weighted, etc.)
    // Track outcomes and performance
    // Adapt weights dynamically
  }
}
```

#### State Machine

```typescript
// Workflow state management
interface StateMachine {
  states: Map<string, State>;
  transitions: Transition[];
  currentState: string;

  // State transition logic
  transition(event: string, payload?: any): Promise<void>;

  // Snapshot and restore
  saveSnapshot(): Snapshot;
  restoreSnapshot(snapshot: Snapshot): void;

  // Event handlers
  onStateEnter(state: string, handler: Handler): void;
  onStateExit(state: string, handler: Handler): void;
}
```

#### Memory Management

```typescript
// Multi-session memory with knowledge sharing
class MemoryManager {
  // Short-term memory (current session)
  // Long-term memory (persistent storage)
  // Knowledge graphs (semantic relationships)
  // Memory retrieval (semantic search)
  // Memory consolidation (background process)

  async store(
    sessionId: string,
    content: MemoryContent,
    metadata: MemoryMetadata
  ): Promise<void>;

  async retrieve(
    sessionId: string,
    query: string,
    options: RetrievalOptions
  ): Promise<MemoryContent[]>;

  async shareKnowledge(
    sourcePersona: PersonaId,
    targetPersona: PersonaId,
    knowledge: Knowledge
  ): Promise<void>;
}
```

### Language Server Protocol (LSP)

```typescript
// PCL language server for IDE integration
class PCLLanguageServer {
  // Features:
  // - Syntax highlighting
  // - Code completion (personas, skills, keywords)
  // - Hover documentation
  // - Go to definition
  // - Find references
  // - Rename refactoring
  // - Code actions (quick fixes)
  // - Diagnostics (errors, warnings)
  // - Formatting

  provideCompletionItems(
    document: TextDocument,
    position: Position
  ): CompletionItem[] {
    // Context-aware completions
    // Skill suggestions from registry
    // Persona templates
    // Keyword completions
  }

  provideDiagnostics(document: TextDocument): Diagnostic[] {
    // Real-time error checking
    // Type validation
    // Semantic warnings
    // Performance hints
  }
}
```

### Model Context Protocol (MCP)

```typescript
// MCP server for AI tool integration
class PCLMCPServer {
  // Expose PCL capabilities as MCP tools
  // Resource management (personas, skills, teams)
  // Prompt templates
  // Sampling integration

  async handleToolCall(
    tool: string,
    params: Record<string, unknown>
  ): Promise<ToolResult> {
    switch (tool) {
      case 'persona/activate':
        return this.activatePersona(params);
      case 'team/compose':
        return this.composeTeam(params);
      case 'workflow/execute':
        return this.executeWorkflow(params);
    }
  }

  async listResources(): Promise<Resource[]> {
    // List available personas
    // List available skills
    // List available teams
    // List available workflows
  }
}
```

### Standard Library (stdlib)

```typescript
// Built-in personas, skills, and utilities
const stdlib = {
  personas: {
    ARCHI: {
      /* Architecture expert */
    },
    DEV: {
      /* Development expert */
    },
    SEC: {
      /* Security expert */
    },
    DEVOPS: {
      /* DevOps expert */
    },
    // 25+ built-in personas
  },

  skills: {
    foundation: ['communication', 'analysis', 'problem-solving'],
    technical: ['coding', 'debugging', 'testing'],
    security: ['threat-modeling', 'secure-coding'],
    architecture: ['system-design', 'patterns'],
    standards: ['compliance', 'governance'],
    tools: ['git', 'docker', 'kubernetes'],
  },

  teams: {
    'security-review': {
      personas: ['SEC', 'ARCHI', 'CRITIC'],
      mergeMode: 'consensus',
    },
    'dream-team': {
      personas: ['ARCHI', 'DEV', 'SEC', 'DEVOPS', 'QA'],
      mergeMode: 'weighted',
    },
    standardization: {
      personas: ['STANDARD_ARCHITECT', 'SPEC_EDITOR', 'COMPLIANCE_ENGINEER'],
      mergeMode: 'sequential',
    },
  },
};
```

### Registry & Package Management

```typescript
// Skill registry and artifact management
class SkillRegistry {
  // Version management (semver)
  // Dependency resolution
  // Artifact storage (local, HTTP, S3)
  // Search and discovery
  // Import/export

  async publish(
    skill: Skill,
    artifact: Artifact,
    metadata: Metadata
  ): Promise<void>;

  async install(skillId: string, version?: string): Promise<Skill>;

  async search(query: SearchQuery): Promise<SearchResult[]>;

  async resolve(dependencies: Dependency[]): Promise<Skill[]>;
}
```

### Observability & Telemetry

```typescript
// Production-ready observability stack
class Observability {
  // OpenTelemetry integration
  // Distributed tracing (Jaeger)
  // Metrics collection (Prometheus)
  // Structured logging
  // Health checks
  // Performance profiling
  // SLO tracking

  tracing: {
    instrumentWorkflow(workflow: Workflow): void;
    instrumentPersona(persona: Persona): void;
    instrumentProvider(provider: Provider): void;
  };

  metrics: {
    recordLatency(operation: string, duration: number): void;
    recordTokenUsage(provider: string, tokens: number): void;
    recordErrors(type: string, count: number): void;
  };

  logging: {
    debug(message: string, context?: Record<string, unknown>): void;
    info(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    error(
      message: string,
      error: Error,
      context?: Record<string, unknown>
    ): void;
  };
}
```
