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

</div>

---

## What is PCL?

**PCL (Persona Control Language)** is a domain-specific programming language designed for defining, composing, and orchestrating AI personas across any language model. It enables developers to:

- **Define** personas with rich type systems, skills, and constraints
- **Compose** multiple personas using declarative operators
- **Orchestrate** complex multi-agent workflows
- **Deploy** consistently across Claude, GPT, Gemini, and other LLMs

## Quick Start

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

## Installation

```bash
# Install PCL CLI
npm install -g @pcl/cli

# Or with pnpm
pnpm add -g @pcl/cli

# Initialize a new project
pcl init my-project

# Run a PCL file
pcl run main.pcl
```

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

| Mode | Description |
|------|-------------|
| `Primary` | Lead persona decides, others advise |
| `Consensus` | Synthesize all perspectives |
| `Majority` | Weighted voting |
| `Debate` | Visible deliberation |
| `Compare` | Side-by-side comparison |
| `Chain` | Sequential transformation |

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
├── grammar/
│   └── pcl.ebnf              # Formal EBNF grammar
├── src/
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

| Variant | Purpose | Target |
|---------|---------|--------|
| **PCL/Lite** | Portable subset | Chat interfaces |
| **PCL/Core** | Full language | Node.js, Browsers |
| **PCL/Script** | Scripting | Automation |
| **PCL/Query** | SQL-like queries | Data exploration |
| **PCL/ML** | ML workflows | Training pipelines |

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

## Roadmap

### v1.0 — Core ✅ COMPLETE
- [x] EBNF Grammar specification (800+ lines)
- [x] Lexer implementation (1,157 lines, 70+ tokens)
- [x] Parser implementation (3,628 lines, recursive descent + Pratt)
- [x] Type checker & semantic analysis (2,270 lines)
- [x] Runtime engine (1,456 lines)
- [x] Code generators (1,606 lines)
- [x] Standard library (779 lines)
- [x] CLI tool (681 lines)
- [x] Test suite (2,000+ lines)

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

## Community

- 📖 [Documentation](https://docs.pcl.dev)
- 💬 [Discord](https://discord.gg/pcl-lang)
- 🐦 [Twitter](https://twitter.com/pcl_lang)
- 📧 [Mailing List](https://groups.google.com/g/pcl-lang)

## License

Apache 2.0 — See [LICENSE](LICENSE) for details.

---

<div align="center">

**PCL** — *Making AI behavior programmable, portable, and predictable.*

</div>
