---
name: pcl-expert
version: 1.1.0
description: >-
  Expert in Persona Control Language (PCL) - language design, compiler architecture,
  runtime systems, and ecosystem development. Use when the user mentions persona control
  language, compiler design, language design, DSL, runtime systems, or lexer, or when the
  task involves Language Design & Specification, Compiler Architecture, Language Server
  Protocol, or Model Context Protocol.
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

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Core Competencies](references/CORE_CONCEPTS.md) — Language Design & Specification, Compiler Architecture, Runtime Systems, Language Server Protocol (LSP), Model Context Protocol (MCP), Standard Library (stdlib), Registry & Package Management, Observability & Telemetry
- [Best Practices](references/BEST_PRACTICES.md) — Compiler Development, Runtime Design, Language Design, Testing Strategy

## Resources

### Official Documentation

- **GitHub Repository**: <https://github.com/personamanagmentlayer/pcl>
- **Language Specification**: [docs/reference/LANGUAGE.md](../../../docs/reference/LANGUAGE.md)
- **Compiler Design**: [docs/HOW_PCL_WORKS.md](../../../docs/HOW_PCL_WORKS.md)
- **Runtime Systems**: [docs/SKILL_RUNTIME.md](../../../docs/SKILL_RUNTIME.md)
- **LSP Implementation**: [docs/guides/VSCODE-SETUP.md](../../../docs/guides/VSCODE-SETUP.md)

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
