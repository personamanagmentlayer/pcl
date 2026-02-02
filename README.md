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
[![Version](https://img.shields.io/badge/version-26.2.2-orange.svg)](CHANGELOG.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Security](https://img.shields.io/badge/Security-Policy-green.svg)](SECURITY.md)
[![Tests](<https://img.shields.io/badge/Tests-5720%20(96.3%25)-success.svg>)](docs/testing/TESTING_STATUS.md)
[![Coverage](https://img.shields.io/badge/Coverage-50.66%25+-yellow.svg)](docs/testing/COVERAGE_ROADMAP.md)

**Standards Compliance**:
[![ISO 27001](https://img.shields.io/badge/ISO_27001-Aligned-green.svg)](GOVERNANCE/PCL_SECURITY_MODEL.md)
[![ISO 42001](https://img.shields.io/badge/ISO_42001-Aligned-green.svg)](GOVERNANCE/PCL_GOVERNANCE.md)
[![OWASP LLM](https://img.shields.io/badge/OWASP_LLM-Top_10_Mitigated-green.svg)](GOVERNANCE/PCL_SECURITY_MODEL.md)
[![EU AI Act](https://img.shields.io/badge/EU_AI_Act-Ready-green.svg)](SPEC/PCL_SPEC_v1.md)

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

---

## Quick Example

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

**[📖 Complete Installation Guide →](docs/INSTALLATION.md)**

---

## Documentation

### Getting Started

- **[Quick Start Guide](docs/QUICK_START.md)** - Get started in 5 minutes
- **[Core Concepts](docs/CORE_CONCEPTS.md)** - Personas, Teams, Workflows, and more
- **[Installation Guide](docs/INSTALLATION.md)** - Complete setup instructions
- **[Features Overview](docs/FEATURES.md)** - All features and capabilities

### For Developers

- **[Getting Started Tutorial](docs/guides/GETTING-STARTED-CURRENT.md)** - Practical working introduction
- **[VS Code Setup](docs/guides/VSCODE-SETUP.md)** - IDE configuration
- **[Testing Guide](docs/testing/TESTING_STATUS.md)** - Test coverage and benchmarks
- **[API Reference](docs/api/)** - Parser, Semantic Analysis, Code Generation

### Specifications & Standards

- **[PCL Specification v1.0](SPEC/PCL_SPEC_v1.md)** - RFC-style formal specification
- **[Governance Framework](GOVERNANCE/PCL_GOVERNANCE.md)** - ISO 38500-aligned governance
- **[Security Model](GOVERNANCE/PCL_SECURITY_MODEL.md)** - ISO 27001/42001 security architecture
- **[Standards Overview](GOVERNANCE/STANDARDS_OVERVIEW.md)** - Complete standards alignment

### Complete Documentation Index

**[📚 Full Documentation →](docs/README.md)**

---

## Key Features

### Production-Ready Testing ✅

- **5,720 total tests** (96.3% pass rate)
- **50.66%+ code coverage** (targeting 90%)
- **153 test files** covering all major modules
- **Comprehensive testing**: LSP, Observability, MCP, Registry, Providers, CLI, Codegen, Parser, E2E

**[📊 Testing Status →](docs/testing/TESTING_STATUS.md)** | **[🗺️ Coverage Roadmap →](docs/testing/COVERAGE_ROADMAP.md)**

### Supported AI Providers (8)

Anthropic Claude • OpenAI GPT • Google Gemini • DeepSeek • Ollama • Azure OpenAI • AWS Bedrock • Mock

**[🤖 Provider Guide →](docs/providers/README.md)**

### Core Capabilities

- ✅ **Language Server Protocol (LSP)** - Full IDE support with IntelliSense, diagnostics, navigation
- ✅ **Skills Ecosystem** - 100% compatible with agentskills.io and Claude Code
- ✅ **Model Context Protocol (MCP)** - Expose personas as standardized AI services
- ✅ **Registry System** - 4 backends (Memory, JSON, SQLite, PostgreSQL)
- ✅ **Observability** - Metrics, SLO tracking, tracing, telemetry, health checks
- ✅ **Code Generation** - Multi-target compilation (TypeScript, Python, JSON, YAML, Markdown)

**[🎯 Complete Features List →](docs/FEATURES.md)**

---

## Production Readiness

**Status:** 🟡 **APPROACHING PRODUCTION READY**

**Production Readiness Score: 78/100** (+33 from January 2026)

- ✅ **Safe for:** Development, prototyping, proof-of-concept, internal tools, beta testing
- 🟡 **Approaching:** Production, customer-facing applications (after final security audit)
- ❌ **Not yet ready for:** High-stakes regulated systems (needs 90% coverage)

**[📈 Production Readiness Report →](docs/PRODUCTION-READINESS.md)**

---

## Roadmap

### Phase 1: Foundation ✅ COMPLETE

- ✅ Core compiler implementation
- ✅ 8 AI provider integrations
- ✅ Registry system with 4 backends
- ✅ 50%+ test coverage baseline

### Phase 2: Ecosystem ✅ COMPLETE

- ✅ Language Server Protocol (LSP)
- ✅ VS Code extension
- ✅ Skills ecosystem integration
- ✅ Model Context Protocol (MCP)

### Phase 3: Scale (Q2 2026)

- 🔄 Advanced merge strategies
- 🔄 Event streaming & observability
- 🔄 90% test coverage
- 🔄 Production security audit

### Phase 4: Maturity (Q4 2026)

- 📅 Visual debugging tools
- 📅 Performance profiling
- 📅 Cloud deployment
- 📅 Marketplace

**[🗺️ Complete Roadmap →](.roadmap/ROADMAP.md)**

---

## Community & Support

- 📖 **[Documentation](docs/README.md)** - Complete guides and API reference
- 🐛 **[GitHub Issues](https://github.com/personamanagmentlayer/pcl/issues)** - Bug reports and feature requests
- 💬 **[Discord](https://discord.gg/pcl-lang)** - Community discussion
- 🐦 **[Twitter](https://twitter.com/pcl_lang)** - Updates and announcements

---

## Contributing

We welcome contributions! See **[CONTRIBUTING.md](CONTRIBUTING.md)** for guidelines.

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/pcl.git
cd pcl

# Install dependencies
npm install

# Run tests
npm test

# Build the project
npm run build
```

**[📋 Contributing Guide →](CONTRIBUTING.md)** | **[📜 Code of Conduct →](CODE_OF_CONDUCT.md)**

---

## License

PCL uses dual licensing to support both software development and documentation sharing:

- **Code** (src/, tests/, scripts/): [Apache 2.0](LICENSE) - Permissive software license with patent grant
- **Documentation** (docs/, SPEC/, GOVERNANCE/): [CC BY 4.0](LICENSE-DOCS) - Creative Commons for specs and guides
- **Trademarks**: IbIFACE - See [Trademark Policy](GOVERNANCE/TRADEMARK_POLICY.md)

This dual licensing approach follows industry best practices (Rust, Kubernetes, OpenAPI) and supports PCL's mission as a governance-first standard for enterprise AI.

For contribution licensing, see [NOTICE](NOTICE).

---

<div align="center">

**PCL** — _Making AI behavior programmable, portable, and predictable._

**[Get Started](docs/QUICK_START.md)** • **[Documentation](docs/README.md)** • **[Community](https://discord.gg/pcl-lang)**

</div>
