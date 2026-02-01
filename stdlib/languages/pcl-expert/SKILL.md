---
name: pcl-expert
version: 1.0.0
description: Expert in Persona Control Language (PCL) - language design, compiler architecture, runtime systems, and ecosystem development
category: languages
tags:
  [
    pcl,
    persona-control-language,
    compiler-design,
    language-design,
    dsl,
    runtime-systems,
    lexer,
    parser,
    semantic-analysis,
    codegen,
    type-systems,
    ast,
    lsp,
    mcp,
  ]
allowed-tools:
  - Read
  - Write
  - Edit
  - Execute
  - Debug
  - Test
---

# PCL Expert

Master expert in **Persona Control Language (PCL)** - a domain-specific programming language and compiler for AI persona management. Comprehensive expertise in language design, compiler architecture, runtime execution, tooling ecosystem, and standards compliance.

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

## Advanced Features

### Adaptive Intelligence (Phase 1.2)

```typescript
// Learning and optimization systems
interface AdaptiveIntelligence {
  // Memory management
  memory: {
    store: MemoryStorage;
    manager: MemoryManager;
    knowledgeSharing: KnowledgeSharing;
  };

  // Analytics and insights
  analytics: {
    performanceTracker: PerformanceTracker;
    trendAnalyzer: TrendAnalyzer;
    analyticsStore: AnalyticsStore;
  };

  // Intelligent routing
  routing: {
    router: IntelligentRouter;
    taskClassifier: TaskClassifier;
  };

  // Response caching
  cache: {
    responseCache: ResponseCache;
    semanticMatcher: SemanticMatcher;
  };

  // A/B testing
  experiments: {
    manager: ExperimentManager;
    variantSelector: VariantSelector;
    resultsAnalyzer: ResultsAnalyzer;
  };

  // Confidence scoring
  confidence: {
    scorer: ConfidenceScorer;
    signalCollector: SignalCollector;
    calibration: CalibrationEngine;
  };

  // Context management
  context: {
    windowManager: ContextWindowManager;
    deduplication: Deduplication;
    prioritization: Prioritization;
    threading: Threading;
  };

  // Escalation management
  escalation: {
    manager: EscalationManager;
    triggers: EscalationTriggers;
  };

  // Team optimization
  teams: {
    outcomeTracker: OutcomeTracker;
    weightAdapter: WeightAdapter;
  };
}
```

### HTTP Registry Server

```typescript
// REST API for remote artifact management
class HTTPRegistryServer {
  // Express-based HTTP server
  // OpenAPI/Swagger documentation
  // JWT authentication
  // Rate limiting
  // CORS support
  // Compression (gzip, brotli)
  // Security headers (Helmet)

  routes: {
    // Authentication
    'POST /auth/register': RegisterHandler;
    'POST /auth/login': LoginHandler;
    'POST /auth/refresh': RefreshTokenHandler;
    'POST /auth/logout': LogoutHandler;

    // Artifacts
    'GET /artifacts': ListArtifactsHandler;
    'GET /artifacts/:name': GetArtifactHandler;
    'POST /artifacts': PublishArtifactHandler;
    'PUT /artifacts/:name': UpdateArtifactHandler;
    'DELETE /artifacts/:name': DeleteArtifactHandler;

    // Versions
    'GET /artifacts/:name/versions': ListVersionsHandler;
    'GET /artifacts/:name/versions/:version': GetVersionHandler;

    // Search
    'GET /search': SearchHandler;
    'GET /search/suggestions': SuggestionsHandler;

    // Metrics & Health
    'GET /metrics': MetricsHandler;
    'GET /health': HealthCheckHandler;
    'GET /profiler': ProfilerHandler;
  };
}
```

### CLI Tools

```typescript
// Command-line interface for PCL development
const cli = {
  // Compilation
  'pcl build': 'Compile PCL to JavaScript/TypeScript',
  'pcl watch': 'Watch mode for development',

  // Execution
  'pcl run': 'Execute a PCL program',
  'pcl repl': 'Interactive REPL',

  // Skills management
  'pcl skills list': 'List installed skills',
  'pcl skills search': 'Search skill registry',
  'pcl skills install': 'Install a skill',
  'pcl skills create': 'Create a new skill',
  'pcl skills publish': 'Publish to registry',
  'pcl skills validate': 'Validate skill format',

  // Registry
  'pcl registry export': 'Export registry',
  'pcl registry import': 'Import registry',
  'pcl registry search': 'Search remote registry',

  // Initialization
  'pcl init': 'Initialize PCL project',
  'pcl completion': 'Shell completion scripts',

  // Language server
  'pcl lsp': 'Start language server',

  // MCP server
  'pcl mcp': 'Start MCP server',

  // HTTP server
  'pcl serve': 'Start HTTP registry server',
};
```

## PCL Language Examples

### Basic Persona Declaration

```pcl
persona TYPESCRIPT_EXPERT {
  description: "Expert in TypeScript development"
  skills: [
    "typescript-advanced",
    "type-system-design",
    "compiler-api",
    "testing-frameworks"
  ]
  provider: "anthropic:claude-3-5-sonnet"
  temperature: 0.7
  maxTokens: 4096
}
```

### Team Composition

```pcl
team CODE_REVIEW_TEAM {
  description: "Comprehensive code review team"
  personas: [
    TYPESCRIPT_EXPERT,
    SECURITY_EXPERT,
    PERFORMANCE_EXPERT
  ]
  mergeMode: "consensus"
  weights: {
    TYPESCRIPT_EXPERT: 0.5,
    SECURITY_EXPERT: 0.3,
    PERFORMANCE_EXPERT: 0.2
  }
}
```

### Workflow Orchestration

```pcl
workflow CODE_REVIEW_WORKFLOW {
  description: "Automated code review process"

  step ANALYZE {
    persona: TYPESCRIPT_EXPERT
    input: file("src/components/Button.tsx")
    output: "analysis"
  }

  step SECURITY_CHECK {
    persona: SECURITY_EXPERT
    input: $analysis
    output: "security_report"
  }

  step FINAL_REVIEW {
    team: CODE_REVIEW_TEAM
    input: {
      analysis: $analysis,
      security: $security_report
    }
    output: "final_verdict"
  }
}
```

### Skill Declaration

```pcl
skill RUST_EXPERT {
  name: "rust-expert"
  version: "1.0.0"
  category: "languages"
  description: "Expert in Rust programming"

  capabilities: [
    "memory-safety",
    "concurrency",
    "zero-cost-abstractions",
    "trait-system"
  ]

  tools: ["Read", "Write", "Execute", "Debug"]
}
```

## Best Practices

### Compiler Development

1. **Immutable AST**: Never mutate AST nodes; return new nodes
2. **Position Tracking**: Always include source positions for error messages
3. **Error Recovery**: Continue parsing/analysis after errors
4. **Two-Pass Analysis**: Separate declaration and validation phases
5. **Type Safety**: Use discriminated unions and branded types
6. **Testing**: 80%+ code coverage, especially for critical paths

### Runtime Design

1. **Lazy Evaluation**: Don't execute until needed
2. **Memory Safety**: No leaks, proper cleanup
3. **Async/Await**: Use promises for all I/O operations
4. **Error Handling**: Return Result types, don't throw
5. **Provider Abstraction**: Support multiple AI providers
6. **Observability**: Instrument all critical paths

### Language Design

1. **Simplicity**: Keep syntax minimal and intuitive
2. **Consistency**: Follow established patterns
3. **Extensibility**: Design for future enhancements
4. **Documentation**: Comprehensive specs and examples
5. **Backward Compatibility**: Deprecate gracefully
6. **Standards Compliance**: Align with industry standards

### Testing Strategy

```typescript
// Unit tests for each compiler phase
describe('Lexer', () => {
  it('tokenizes persona declaration', () => {
    const source = 'persona ARCHI { }';
    const tokens = lexer.scan(source);
    expect(tokens[0].type).toBe('KEYWORD');
  });
});

// Integration tests for full pipeline
describe('Compiler', () => {
  it('compiles valid PCL to JavaScript', () => {
    const source = readFile('examples/persona.pcl');
    const result = compile(source);
    expect(result.ok).toBe(true);
  });
});

// End-to-end tests for runtime
describe('Runtime', () => {
  it('executes persona with OpenAI provider', async () => {
    const persona = loadPersona('ARCHI');
    const response = await runtime.execute(persona, 'Design a REST API');
    expect(response.content).toBeDefined();
  });
});
```

## Anti-Patterns

### ❌ Global State

```typescript
// BAD
let currentPersona: Persona | null = null;

// GOOD
class Parser {
  private currentPersona: Persona | null = null;
}
```

### ❌ Throwing Exceptions

```typescript
// BAD
function parse(source: string): AST {
  throw new Error('Parse failed');
}

// GOOD
function parse(source: string): Result<AST, Error[]> {
  const errors: Error[] = [];
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: ast };
}
```

### ❌ Mutable AST

```typescript
// BAD
function transform(node: PersonaDeclaration) {
  node.skills.push(newSkill);
}

// GOOD
function transform(node: PersonaDeclaration): PersonaDeclaration {
  return {
    ...node,
    skills: [...node.skills, newSkill],
  };
}
```

### ❌ Missing Type Safety

```typescript
// BAD
function processNode(node: any) {
  if (node.type === 'PersonaDecl') {
    // Typo - should be PersonaDeclaration
  }
}

// GOOD
type ASTNode =
  | { type: 'PersonaDeclaration' /* ... */ }
  | { type: 'SkillDeclaration' /* ... */ };

function processNode(node: ASTNode) {
  switch (
    node.type
    // TypeScript enforces correct types
  ) {
  }
}
```

## Performance Optimization

### Caching Strategies

```typescript
// Memoize expensive computations
const typeCache = new Map<ASTNode, Type>();

function inferType(node: ASTNode): Type {
  if (typeCache.has(node)) {
    return typeCache.get(node)!;
  }
  const type = computeType(node);
  typeCache.set(node, type);
  return type;
}
```

### String Interning

```typescript
// Deduplicate identical strings
class StringPool {
  private pool = new Map<string, string>();

  intern(str: string): string {
    if (this.pool.has(str)) {
      return this.pool.get(str)!;
    }
    this.pool.set(str, str);
    return str;
  }
}
```

### Stream Processing

```typescript
// Process large files in chunks
async function* parseStream(stream: ReadableStream): AsyncGenerator<ASTNode> {
  const lexer = new StreamingLexer(stream);
  const parser = new IncrementalParser(lexer);

  for await (const node of parser.parseNodes()) {
    yield node;
  }
}
```

## Resources

### Official Documentation

- **GitHub Repository**: <https://github.com/personamanagmentlayer/pcl>
- **Language Specification**: [docs/reference/LANGUAGE_SPEC.md](../../../docs/reference/LANGUAGE_SPEC.md)
- **Compiler Design**: [docs/reference/COMPILER_ARCHITECTURE.md](../../../docs/reference/COMPILER_ARCHITECTURE.md)
- **Runtime Systems**: [docs/reference/RUNTIME_GUIDE.md](../../../docs/reference/RUNTIME_GUIDE.md)
- **LSP Implementation**: [docs/reference/LSP_GUIDE.md](../../../docs/reference/LSP_GUIDE.md)

### Learning Resources

- **Crafting Interpreters**: <https://craftinginterpreters.com/>
- **Modern Compiler Implementation**: <https://www.cs.princeton.edu/~appel/modern/>
- **TypeScript Deep Dive**: <https://basarat.gitbook.io/typescript/>
- **Language Server Protocol**: <https://microsoft.github.io/language-server-protocol/>
- **Model Context Protocol**: <https://modelcontextprotocol.io/>

### Standards & Specifications

- **ISO 5218**: Gender Representation
- **ISO 639-1**: Language Codes
- **IEEE 2410**: Biometric Open Protocol
- **W3C**: Web Standards
- **OpenTelemetry**: Observability Standards
- **OpenAPI**: API Specification

### Community

- **Discord**: PCL Developer Community
- **Stack Overflow**: Tag `persona-control-language`
- **GitHub Discussions**: Q&A and feature requests
- **Newsletter**: Monthly PCL updates

---

## Version History

- **v1.0.0** (2026-01-31): Initial PCL Expert skill
  - Comprehensive compiler architecture coverage
  - Runtime systems and execution engine
  - LSP and MCP integration
  - Adaptive intelligence features
  - HTTP registry server
  - CLI tooling
  - Standard library overview
  - Best practices and anti-patterns
  - Performance optimization techniques

## Maintenance

**Status**: ✅ Active
**Last Updated**: 2026-01-31
**Maintainer**: PCL Core Team
**License**: MIT
