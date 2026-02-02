# PCL — Persona Control Language

<div align="center">

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   ██████╗  ██████╗██╗                                                         ║
║   ██╔══██╗██╔════╝██║         The World's First Programming Language          ║
║   ██████╔╝██║     ██║              for AI Persona Management                  ║
║   ██╔═══╝ ██║     ██║                                                         ║
║   ██║     ╚██████╗███████╗    Make AI behavior programmable, portable,        ║
║   ╚═╝      ╚═════╝╚══════╝           and predictable.                         ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0--alpha-orange.svg)](CHANGELOG.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Security](https://img.shields.io/badge/Security-Policy-green.svg)](SECURITY.md)
[![Dependabot](https://img.shields.io/badge/Dependabot-Enabled-blue.svg)](.github/dependabot.yml)

**Standards Compliance**:
[![ISO 27001](https://img.shields.io/badge/ISO_27001-Aligned-green.svg)](GOVERNANCE/PCL_SECURITY_MODEL.md)
[![ISO 42001](https://img.shields.io/badge/ISO_42001-Aligned-green.svg)](GOVERNANCE/PCL_GOVERNANCE.md)
[![OWASP LLM](https://img.shields.io/badge/OWASP_LLM-Top_10_Mitigated-green.svg)](GOVERNANCE/PCL_SECURITY_MODEL.md)
[![EU AI Act](https://img.shields.io/badge/EU_AI_Act-Ready-green.svg)](SPEC/PCL_SPEC_v1.md)
[![Zero Trust](https://img.shields.io/badge/Zero_Trust-NIST_SP_800--207-green.svg)](GOVERNANCE/PCL_SECURITY_MODEL.md)

</div>

---

## What is PCL?

**PCL (Persona Control Language)** is a **governance-first programming language** for AI persona management and multi-agent orchestration. Unlike traditional application languages, PCL is designed for **accountability, security, and compliance** in AI systems.

### PCL = Terraform + OpenPolicyAgent + AI Personas

PCL enables enterprises and developers to:

- **Define** personas with explicit capabilities, constraints, and risk classifications (ISO 42001)
- **Govern** AI behavior through auditable policies and access controls (ISO 27001)
- **Orchestrate** complex multi-agent workflows with human oversight
- **Deploy** consistently across Claude, GPT, Gemini, Azure, and open-source LLMs
- **Audit** every action with immutable logs aligned to compliance frameworks
- **Comply** with EU AI Act, GDPR, OWASP LLM Top 10, and Zero Trust principles

### Why PCL Exists

Traditional AI development lacks:

✗ **Accountability** – Who made what decision?
✗ **Portability** – Vendor lock-in
✗ **Security** – No defense against prompt injection, excessive agency
✗ **Compliance** – ISO, EU AI Act, OWASP alignment
✗ **Governance** – No clear policy enforcement

**PCL solves this** by treating AI personas as **governed entities**, not just code.

## ⚡ Quick Start - What Works Today

> **📖 New User?** Read the [**Getting Started Guide (Current Features)**](docs/guides/GETTING-STARTED-CURRENT.md) for a practical, working introduction to PCL's implemented features.

**What PCL can do right now** (Phases 1 & 2.1 & 2.2 Complete):

### Core Language (Phase 1) ✅

- ✅ Parse PCL files to AST
- ✅ Type checking and semantic analysis
- ✅ Runtime with **8 LLM providers** (Mock, Claude, OpenAI, Gemini, DeepSeek, Ollama, Azure, Bedrock)
- ✅ Enterprise provider features: health monitoring, fallback chains, rate limiting, cost tracking
- ✅ Registry system with 4 backends (Memory, JSON File, SQLite, PostgreSQL)
- ✅ Full-text search with filters
- ✅ CLI with 7 registry commands
- ✅ Expression evaluator

### IDE Support (Phase 2.1) ✅ **NEW!**

- ✅ Full Language Server Protocol (LSP) implementation
- ✅ VSCode extension with syntax highlighting
- ✅ Real-time diagnostics and error detection
- ✅ IntelliSense auto-completion (26 keywords, 13 snippets)
- ✅ Hover documentation (30+ properties)
- ✅ Go to definition (Ctrl+Click)
- ✅ Find all references
- ✅ Document outline/symbols
- ✅ Auto-formatting

### Skills Ecosystem (Phase 2.2) ✅

- ✅ **100% compatible** with [Agent Skills](https://agentskills.io) specification
- ✅ **95% compatible** with [Claude Code](https://code.claude.com/docs/en/skills) SKILL.md format
- ✅ Import skills from agentskills.io and Claude Code
- ✅ Bidirectional skill conversion (PCL ↔ SKILL.md)
- ✅ Skill loader for YAML frontmatter + Markdown
- ✅ Progressive disclosure pattern
- ✅ Multi-file skills support

### Model Context Protocol (Phase 3.3) ✅ **NEW!**

- ✅ **Full MCP implementation** - Expose personas as standardized AI services
- ✅ **Claude Code integration** - Zero-config persona discovery
- ✅ **5 built-in tools** - persona/execute, persona/list, persona/info, team/execute, workflow/execute
- ✅ **Stdio transport** - CLI tool compatibility
- ✅ **HTTP/SSE transport** - Web application support
- ✅ **Resource access** - persona://, team://, workflow:// definitions
- ✅ **Type-safe protocol** - Complete JSON-RPC 2.0 + MCP types
- ✅ **Production-ready** - Full error handling, graceful shutdown

### Example Persona (Current Syntax)

```pcl
// Define a security analyst persona
pub persona SEC {
  intent: "Identify and mitigate security vulnerabilities"
  tone: vigilant

  skills {
    "OWASP Top 10"
    "STRIDE threat modeling"
    "Security code review"
  }

  constraints {
    "Always assume breach"
    maxResponseTime <= 5s
  }

  pub fn analyze(target: String) -> SecurityReport {
    // Analysis implementation
  }
}

// Compose a security review team
pub team SecurityReview {
  members: [SEC, AUDIT, ARCHI, CRITIC]
  primary: SEC
  merge: Debate
  quorum: 3/4
}

// Define a code review workflow
pub workflow CodeReview {
  steps: DEV -> (ARCHI || SEC) -> CRITIC -> merge(Consensus)
  timeout: 60s
  fallback: SIMPLIFY
}
```

### Example: Using Skills from Ecosystem

```pcl
// Import skills from agentskills.io or Claude Code
persona PYTHON_DEVELOPER {
  name: "Python Developer"
  version: "1.0.0"

  // Load skills from ecosystem
  skills: [
    "@agentskills/python-expert",     // From agentskills.io
    "@claude-code/code-review",       // From Claude Code
    "@pcl/skills/testing"             // From PCL standard library
  ]

  config: {
    model: "claude-sonnet-4"
    temperature: 0.3
  }

  prompts: {
    system: """
    You are a professional Python developer.
    Apply expertise from your loaded skills.
    """
  }
}
```

**Skills are 100% compatible with**:

- ✅ [agentskills.io](https://agentskills.io) - Open skill specification
- ✅ [Claude Code Skills](https://code.claude.com/docs/en/skills) - Claude's skill format
- ✅ PCL native skills - Enhanced with types and dependencies

## 🏛️ Standards & Compliance

PCL is built on international standards for enterprise-grade security and AI governance:

### Security & Information Management

| Standard             | Description                     | PCL Implementation                                      |
| -------------------- | ------------------------------- | ------------------------------------------------------- |
| **ISO/IEC 27001**    | Information Security Management | Access control, audit logging, risk management          |
| **ISO/IEC 27002**    | Security Controls               | A.9 (Access), A.10 (Crypto), A.12 (Logging), A.14 (Dev) |
| **OWASP LLM Top 10** | LLM Security Best Practices     | All 10 threats mitigated (prompt injection, DoS, etc.)  |
| **NIST SP 800-207**  | Zero Trust Architecture         | Never trust, least privilege, continuous verification   |

### AI Governance & Ethics

| Standard             | Description             | PCL Implementation                                   |
| -------------------- | ----------------------- | ---------------------------------------------------- |
| **ISO/IEC 42001**    | AI Management System    | Risk classification, competence tracking, monitoring |
| **ISO/IEC 23894**    | AI Risk Management      | Persona risk levels, constraint validation           |
| **EU AI Act**        | High-Risk AI Regulation | Risk classification, transparency, human oversight   |
| **IEEE 7000 series** | Ethical AI              | Transparency, privacy, fail-safe design              |

### Interoperability & Quality

| Standard        | Description        | PCL Implementation                       |
| --------------- | ------------------ | ---------------------------------------- |
| **RFC 2119**    | Requirement Levels | MUST/SHOULD/MAY in specifications        |
| **JSON Schema** | Data Validation    | Import/export format validation          |
| **ISO 38500**   | IT Governance      | Evaluate-Direct-Monitor governance cycle |

**📋 Full Compliance Documentation**:

- [PCL_SPEC_v1.md](PCL_SPEC_v1.md) – RFC-style language specification
- [PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md) – ISO 27001/42001 security architecture
- [PCL_GOVERNANCE.md](PCL_GOVERNANCE.md) – ISO 38500 governance framework
- [ROADMAP.md](ROADMAP.md) – Standards compliance roadmap

## 🤖 Supported AI Providers

PCL supports **8 AI providers** with automatic health monitoring, cost tracking, and fallback chains:

| Provider          | Models                         | Context | Cost (1M tokens) | Features                           |
| ----------------- | ------------------------------ | ------- | ---------------- | ---------------------------------- |
| **Anthropic**     | Claude 3.5 Sonnet, Opus, Haiku | 200K    | $3-$75           | ✅ Streaming, Tool calling         |
| **OpenAI**        | GPT-4 Turbo, GPT-4, GPT-3.5    | 128K    | $0.5-$60         | ✅ Streaming, Tool calling, Vision |
| **Google Gemini** | 1.5 Pro, Flash, 1.0 Pro        | **1M**  | $0.075-$10.50    | ✅ Streaming, Tool calling, Vision |
| **DeepSeek**      | Chat, Coder                    | 64K     | **$0.14-$0.28**  | ✅ Streaming, Tool calling         |
| **Ollama**        | Llama, Mistral, CodeLlama      | 8K+     | **FREE**         | ✅ Streaming, Local, Privacy       |
| **Azure OpenAI**  | GPT-4, GPT-3.5                 | 128K    | Same as OpenAI   | ✅ Enterprise, Compliance          |
| **AWS Bedrock**   | Claude, Titan, Llama           | 200K    | Varies           | ✅ Multi-model, AWS native         |
| **Mock**          | Test Provider                  | -       | FREE             | ✅ Testing, Development            |

**Enterprise Features:**

- ✅ Automatic health monitoring with circuit breakers
- ✅ Fallback chains with 3 strategies (sequential, health-based, fastest)
- ✅ Rate limiting with token bucket algorithm
- ✅ Cost tracking with pre-configured pricing
- ✅ Support for local LLMs (Ollama) with zero cost

**📖 [Complete Provider Guide](docs/providers/README.md)** | **💡 [Provider Examples](docs/providers/examples.md)**

---

## Installation

```bash
# Clone the repository
git clone https://github.com/personamanagmentlayer/pcl.git
cd pcl

# Install dependencies
npm install

# Build PCL
npm run build

# Verify installation
node dist/cli/index.js --version
```

**Available Commands**:

```bash
# Parsing & Analysis
node dist/cli/index.js parse <file>      # Parse PCL → AST
node dist/cli/index.js check <file>      # Type check PCL file
node dist/cli/index.js repl              # Interactive REPL

# Registry Management (Database-Free!)
node dist/cli/index.js registry init                 # Initialize registry
node dist/cli/index.js registry create <file>        # Add persona
node dist/cli/index.js registry search <query>       # Search personas
node dist/cli/index.js registry list                 # List all personas
node dist/cli/index.js registry info <id|slug>       # View details
node dist/cli/index.js registry publish <id|slug>    # Publish persona
node dist/cli/index.js registry delete <id|slug>     # Delete persona
```

## Development

### Watch Mode for Active Development

PCL includes watch mode for automatic rebuilding during development, providing immediate feedback as you modify source files:

```bash
# Watch mode - automatically rebuilds on source file changes
npm run build:watch

# The watch mode monitors:
# - src/ directory for all TypeScript changes
# - Rebuilds compiler, CLI, and LSP components
# - Provides immediate feedback (typically <1s)
```

**When to use watch mode:**

- ✅ Active feature development
- ✅ Debugging compiler or runtime issues
- ✅ Rapid prototyping and testing
- ✅ Integration development

**Development workflow:**

```bash
# Terminal 1: Start watch mode
npm run build:watch

# Terminal 2: Run tests or CLI commands
npm test
# or
node dist/cli/index.js parse examples/my-persona.pcl
```

Watch mode uses [tsup](https://tsup.egoist.dev/) for fast, incremental TypeScript compilation with automatic rebuilds on file changes.

### Source Maps

PCL builds include source maps for better debugging experience:

```bash
# Source maps are automatically generated during build
npm run build

# Enable source maps in Node.js for better stack traces
node --enable-source-maps dist/cli/index.js parse example.pcl
```

**Benefits:**

- ✅ **Better Error Messages**: Stack traces show original TypeScript source locations
- ✅ **Debugging Support**: Step through original source code in debuggers
- ✅ **Development Experience**: Faster issue resolution
- ✅ **Production Ready**: Source maps help diagnose issues in deployed code

All builds include `.js.map` files that map compiled JavaScript back to the original TypeScript source. When using Node.js with `--enable-source-maps`, errors will automatically reference the TypeScript source files.

### Shell Completions

PCL provides tab completion support for bash, zsh, fish, and PowerShell shells:

```bash
# Generate completion for your shell
pcl completion --shell bash    # Bash
pcl completion --shell zsh     # Zsh
pcl completion --shell fish    # Fish
pcl completion --shell powershell  # PowerShell
```

**Installation:**

```bash
# Bash (add to ~/.bashrc or ~/.bash_profile)
source <(pcl completion --shell bash)

# Zsh (add to ~/.zshrc)
source <(pcl completion --shell zsh)

# Fish (save to completions directory)
pcl completion --shell fish > ~/.config/fish/completions/pcl.fish

# PowerShell (add to your profile: $PROFILE)
pcl completion --shell powershell | Out-String | Invoke-Expression
```

**Features:**

- ✅ Command completion (`pcl <TAB>` shows all commands)
- ✅ Subcommand completion (`pcl registry <TAB>` shows registry commands)
- ✅ Option completion (`pcl parse --<TAB>` shows available options)
- ✅ File completion (automatically completes `.pcl` files)
- ✅ Smart context-aware suggestions

## 🎉 Database-Free Registry

PCL now includes a **zero-dependency JSON File backend** for the registry system:

- ✅ **No Database Required** - Works out of the box with no PostgreSQL or SQLite installation
- ✅ **Human-Readable Storage** - All personas stored in `~/.pcl/registry.json`
- ✅ **Git-Friendly** - Version control your personas with ease
- ✅ **Portable** - Single JSON file contains your entire registry
- ✅ **Production-Ready** - Handles up to ~1,000 artifacts efficiently

### Quick Start

```bash
# Initialize registry (creates ~/.pcl/registry.json)
pcl registry init --backend json-file

# Create a persona
pcl registry create ./my-persona.pcl

# List all personas
pcl registry list

# View details
pcl registry info my-persona
```

**Learn More**: See [DATABASE-FREE-REGISTRY.md](docs/registry/DATABASE-FREE-REGISTRY.md) for complete guide with examples.

## 🔍 Search & Testing

PCL includes powerful search capabilities and **production-grade testing infrastructure**:

### Comprehensive Test Suite ✅

**Test Coverage (Production-Ready):**

- **5,720 total tests** (5,507 passing - **96.3% pass rate**)
- **153 test files** covering all major modules
- **50.66%+ code coverage** (baseline established, targeting 90%)
- **Comprehensive module testing**: LSP, Observability, MCP, Registry, Providers, CLI, Codegen, Parser, E2E

**Key Testing Achievements:**

```bash
# Run complete test suite
npm test

# Run with coverage reporting
npm run test:coverage

# View interactive coverage report
open coverage/index.html
```

**Module Coverage Status:**

- ✅ **LSP (Language Server)** - 1,055 tests (completion, diagnostics, navigation, code actions)
- ✅ **Observability** - 600+ tests (metrics, SLO tracking, tracing, telemetry, health checks)
- ✅ **MCP (Model Context Protocol)** - 427 tests (server, client, transports, types)
- ✅ **Registry** - 470+ tests (4 backends: Memory, JSON, SQLite, PostgreSQL)
- ✅ **AI Providers** - 427 tests (8 providers fully tested)
- ✅ **CLI** - 527 tests (skills, registry, build, utilities)
- ✅ **Code Generation** - 120+ tests (11 languages, multi-target)
- ✅ **Parser & Compiler** - 241+ tests (error recovery, edge cases)
- ✅ **E2E Integration** - 64 tests (complete workflow testing)

### Full-Text Search

Search across all your personas with filters and relevance scoring:

```bash
# Basic search
pcl registry search "code review"

# Search with filters
pcl registry search "python" --type persona --tags development

# Search specific fields
pcl registry search "security" --fields name,description --limit 10
```

### Performance Benchmarks

Run comprehensive benchmarks to understand backend performance:

```bash
# Run performance benchmarks
ENABLE_BENCHMARKS=true npm test -- tests/registry/benchmarks.test.ts
```

**Results Summary:**

- **MemoryBackend**: 100+ ops/sec, <10ms latency (best for testing)
- **JSONFileBackend**: 10-100 ops/sec, <100ms latency (best for local dev)
- **SQLiteBackend**: 100-1000 ops/sec, <5ms latency (best for production)
- **PostgreSQLBackend**: 1000+ ops/sec, enterprise-scale (best for multi-user)

**Learn More**:

- [Testing Status Report](docs/testing/TESTING_STATUS.md) - Detailed coverage and results
- [Coverage Roadmap](docs/testing/COVERAGE_ROADMAP.md) - Path to 90% coverage
- [Test Documentation](docs/testing/) - Complete testing guide

## Core Concepts

### Personas

First-class citizens in PCL representing distinct AI behaviors:

```pcl
pub persona ARCHI {
  id: "ARCHI"
  name: "Software Architect"
  intent: "Design robust, scalable systems"
  tone: analytical

  skills {
    "System design"
    "Design patterns"
    "Trade-off analysis"
  }

  constraints {
    "Consider maintainability"
    "Document decisions"
  }
}
```

### Teams

Groups of personas working together:

```pcl
pub team ArchitectureReview {
  members: [ARCHI, SEC, DEV, CRITIC]
  primary: ARCHI
  merge: Consensus
  quorum: 3/4
}
```

### Workflows

Orchestration of personas through declarative expressions:

```pcl
// Sequential
ARCHI -> DEV -> SEC

// Parallel
(ARCHI || SEC || AUDIT)

// With merge
(ARCHI || SEC) -> merge(Debate) -> CRITIC

// Conditional
if critical then SEC -> AUDIT else DEV
```

### Merge Modes

Control how multiple persona outputs combine:

| Mode        | Description                         |
| ----------- | ----------------------------------- |
| `Primary`   | Lead persona decides, others advise |
| `Consensus` | Synthesize all perspectives         |
| `Majority`  | Weighted voting                     |
| `Debate`    | Visible deliberation                |
| `Compare`   | Side-by-side comparison             |
| `Chain`     | Sequential transformation           |

## Type System

PCL features a rich, statically-typed system:

```pcl
// Built-in types
String, Int, Float, Bool, Void, Never

// Collection types
Array<T>, Map<K, V>, Set<T>, Tuple<...T>

// Result types (Rust-inspired)
Option<T>, Result<T, E>

// PCL-specific types
Persona, Team, Workflow<I, O>, Skill, Constraint

// Union and intersection
type SecurityPersona = SEC | AUDIT | COMPLIANCE
type FullStackDev = DEV & ARCHI & UX

// Generics with constraints
persona DataProcessor<T: Serializable> { ... }
```

## Commands (PCL/Lite)

PCL supports a command syntax compatible with chat interfaces:

```pcl
// Activation
@activate SEC ARCHI CRITIC
@deactivate AUDIT
@spawn 3xSEC

// Configuration
@primary SEC
@merge Debate
@weights SEC=0.4, ARCHI=0.3, CRITIC=0.3
@quorum 2/3

// Cognitive parameters
@depth 4
@verbosity 2
@tone formal
@output markdown

// Workflow
@workflow ARCHI -> SEC -> CRITIC
@workflow run CodeReview

// Observability
@trace on
@audit strict
@metrics
```

## Project Structure

```
pcl-language/
├── src/
│   ├── grammar/              # Formal EBNF grammar
│   │   └── pcl.ebnf
│   ├── types/                # Core type definitions
│   ├── ast/                  # AST node types
│   ├── lexer/                # Tokenizer
│   ├── parser/               # Parser (recursive descent + Pratt)
│   ├── semantic/             # Semantic analysis
│   ├── runtime/              # Execution engine
│   ├── compiler/             # Code generators
│   ├── stdlib/               # Standard library
│   └── cli/                  # Command-line interface
├── examples/                 # Example programs
├── tests/                    # Test suites
└── docs/                     # Documentation
```

## Language Family

PCL comes in several variants:

| Variant        | Purpose          | Target             |
| -------------- | ---------------- | ------------------ |
| **PCL/Lite**   | Portable subset  | Chat interfaces    |
| **PCL/Core**   | Full language    | Node.js, Browsers  |
| **PCL/Script** | Scripting        | Automation         |
| **PCL/Query**  | SQL-like queries | Data exploration   |
| **PCL/ML**     | ML workflows     | Training pipelines |

## Compilation Targets

PCL compiles to multiple targets:

```bash
# Generate system prompt for AI chat
pcl build main.pcl --target prompt

# Transpile to TypeScript
pcl build main.pcl --target typescript

# Transpile to Python
pcl build main.pcl --target python

# Generate JSON schema
pcl build main.pcl --target json

# WebAssembly (upcoming)
pcl build main.pcl --target wasm
```

## Standard Library

```pcl
import { SEC, AUDIT } from "@pcl/security"
import { DEV, ARCHI } from "@pcl/engineering"
import { workflow, parallel } from "@pcl/workflow"
import { test, assert } from "@pcl/test"
```

## 📚 Documentation & Guides

### For Developers

- **[VS Code Setup Guide](docs/guides/VSCODE-SETUP.md)** - Complete IDE configuration for PCL development
- **[GitHub Copilot Quick Reference](docs/COPILOT-QUICK-REFERENCE.md)** - Essential Copilot commands and patterns
- **[Claude Quick Reference](docs/CLAUDE-QUICK-REFERENCE.md)** - Essential Claude commands and workflows
- **[GitHub Copilot Instructions](.github/copilot-instructions.md)** - Comprehensive coding standards (Copilot-optimized)
- **[Claude Instructions](.claude/CLAUDE-INSTRUCTIONS.md)** - Claude-specific configuration and best practices
- **[Getting Started](docs/guides/GETTING-STARTED.md)** - First steps with PCL

### Project Management

- **[Roadmap](.roadmap/ROADMAP.md)** - Complete development roadmap from Phase 0 to Phase 5
- **[Quick Status](.roadmap/QUICK-STATUS.md)** - Current capabilities and metrics
- **[Todo List](.roadmap/pcl_todo.md)** - Active work tracker
- **[PCL Bootstrap](.roadmap/bootstrap/BOOTSTRAP_EN.md)** - Embedded runtime v1.0 specification

### API Reference

- **[Parser API](docs/api/PARSER.md)** - Parser implementation details
- **[Semantic Analysis](docs/api/SEMANTIC.md)** - Type checking and validation
- **[Code Generation](docs/api/CODEGEN.md)** - Target code generators
- **[Language Reference](docs/reference/LANGUAGE.md)** - Complete language specification

### Tutorials

- **[Tutorial 1: Your First Persona](examples/tutorials/01-first-persona/)** - Create and execute a simple persona
- **[Tutorial 2: Teams](examples/tutorials/02-teams/)** - Multi-persona collaboration
- **[Tutorial 3: Workflows](examples/tutorials/03-workflows/)** - Orchestration patterns
- **[Tutorial 4: Real Application](examples/tutorials/04-real-app/)** - Building production apps
- **[Tutorial 5: Multi-Language](examples/tutorials/05-integration/)** - Cross-language integration
- **[Tutorial 6: Advanced Features](examples/tutorials/06-advanced/)** - Power user techniques

### For Contributors

- **[.vscode/README.md](.vscode/README.md)** - VS Code workspace configuration guide
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to PCL
- **[Code of Conduct](CODE_OF_CONDUCT.md)** - Community guidelines

## 🚀 High-Performance Development

### Using AI Assistants Effectively

PCL includes comprehensive guides for working with **GitHub Copilot** and **Claude Code**:

**Activate Specialized Personas:**

```markdown
/persona ARCHI - Design system architecture
/persona DEV - Implement features with tests
/persona SEC - Security audit and review
/persona TECH_WRITER - Write documentation
/team dream-team - Multi-perspective review
```

**Optimize for Performance:**

```markdown
✅ Batch operations - Request parallel file reads
✅ Precise context - Provide file paths and line ranges
✅ Quality gates - Always run lint + test after changes
✅ Track progress - Use manage_todo_list for complex work
```

**Quick Reference Cards:**

- **[GitHub Copilot Quick Reference](docs/COPILOT-QUICK-REFERENCE.md)** - Copilot-specific patterns
- **[Claude Quick Reference](docs/CLAUDE-QUICK-REFERENCE.md)** - Claude-specific workflows

### VS Code Configuration

Pre-configured workspace with:

- ✅ TypeScript optimization (4GB memory, auto-imports)
- ✅ Auto-formatting on save (ESLint + Prettier)
- ✅ Integrated testing (Vitest Explorer)
- ✅ Custom tasks (Quality Gate, Pre-Commit Check)
- ✅ Debugging configurations (Test, Parser, Runtime)

Full setup instructions: **[VS Code Setup Guide](docs/guides/VSCODE-SETUP.md)**

## Roadmap

### v1.0 — Core (Q2 2025)

- [x] EBNF Grammar specification
- [x] Lexer implementation
- [x] Parser implementation
- [ ] Type checker
- [ ] Runtime engine
- [ ] CLI tool

### v2.0 — Ecosystem (Q4 2025)

- [ ] Package manager (pclpkg)
- [ ] Language Server Protocol
- [ ] VS Code extension
- [ ] Build system

### v3.0 — Scale (Q2 2026)

- [ ] Multi-provider support
- [ ] MCP integration
- [ ] Distributed execution
- [ ] Enterprise security

### v4.0 — Maturity (Q4 2026)

- [ ] AI-native features
- [ ] Visual programming
- [ ] Marketplace
- [ ] ISO standardization

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Clone the repository
git clone https://github.com/pcl-lang/pcl.git
cd pcl

# Install dependencies
pnpm install

# Run tests
pnpm test

# Build all packages
pnpm build
```

## Documentation

### 📚 Complete Documentation

## 📚 Documentation Structure

📘 **[/SPEC](./SPEC/)** — Formal specifications & technical documentation
🧱 **[/CORE](./CORE/)** — Core concepts, invariants & design principles
🔬 **[/REF](./REF/)** — Reference implementations & integration examples
🧭 **[/GOVERNANCE](./GOVERNANCE/)** — Governance framework, compliance & licensing
📖 **[/docs](./docs/)** — User guides, API docs & tutorials

### 🧭 Governance & Compliance

- **[Governance Framework](./GOVERNANCE/PCL_GOVERNANCE.md)** - ISO 38500-aligned governance
- **[Security Model](./GOVERNANCE/PCL_SECURITY_MODEL.md)** - ISO 27001/42001 security architecture
- **[Compliance Quick Reference](./GOVERNANCE/COMPLIANCE_QUICK_REFERENCE.md)** - Auditor's guide
- **[Roadmap](./GOVERNANCE/ROADMAP.md)** - Strategic roadmap & compliance timeline
- **[Standards Overview](./GOVERNANCE/STANDARDS_OVERVIEW.md)** - Complete standards alignment

### 📘 Specifications

- **[PCL Specification v1.0](./SPEC/PCL_SPEC_v1.md)** - RFC-style formal specification
- **[EBNF Grammar](./src/grammar/pcl.ebnf)** - Formal grammar definition

### 🧱 Core Concepts

- **[Core Principles](./CORE/README.md)** - Language philosophy & invariants
- **[Language Reference](./docs/reference/LANGUAGE.md)** - Complete syntax & semantics
- **[Syntax Reference](./docs/reference/SYNTAX.md)** - Human-readable guide

### 🔬 Reference Implementations

- **[Integration Examples](./REF/)** - OpenAI, Anthropic, Azure integrations
- **[Security Examples](./REF/)** - OWASP LLM-aligned patterns
- **[Compliance Examples](./REF/)** - ISO 42001, EU AI Act implementations

### 🚀 Quick Start

- **[Getting Started Guide](./docs/guides/GETTING-STARTED.md)** - Your first PCL persona in 5 minutes
- **[Multi-Language Integration](./docs/guides/MULTI-LANGUAGE.md)** - Use PCL with Python, Go, Rust, Shell

### 📖 API Reference

- **[Parser API](./docs/api/PARSER.md)** - Parse PCL source code
- **[Semantic Analyzer API](./docs/api/SEMANTIC.md)** - Type checking and validation
- **[Code Generator API](./docs/api/CODEGEN.md)** - Generate TypeScript, YAML, JSON, Prompts

## Contributing

See **[Contributing Guide](./CONTRIBUTING.md)** for getting started, or review the full [standards-aligned compliance guide](./GOVERNANCE/CONTRIBUTING_COMPLIANCE.md).

## Community

- 📖 [Documentation](./docs/README.md)
- 🧭 [Governance](./GOVERNANCE/)
- 💬 [Discord](https://discord.gg/pcl-lang)
- 🐦 [Twitter](https://twitter.com/pcl_lang)
- 📧 [Mailing List](https://groups.google.com/g/pcl-lang)

## License

PCL uses dual licensing to support both software development and documentation sharing:

- **Code** (src/, tests/, scripts/): [Apache 2.0](LICENSE) - Permissive software license with patent grant
- **Documentation** (docs/, SPEC/, GOVERNANCE/): [CC BY 4.0](LICENSE-DOCS) - Creative Commons for specs and guides
- **Trademarks**: IbIFACE - See [Trademark Policy](./GOVERNANCE/TRADEMARK_POLICY.md)

This dual licensing approach follows industry best practices (Rust, Kubernetes, OpenAPI) and supports PCL's mission as a governance-first standard for enterprise AI.

For contribution licensing, see [NOTICE](NOTICE).

---

<div align="center">

**PCL** — _Making AI behavior programmable, portable, and predictable._

</div>
