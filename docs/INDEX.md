# PCL Documentation Index

Complete guide to all PCL documentation, organized by topic and phase.

---

## 🚀 Getting Started

### New Users
- [Getting Started Guide (Current Features)](guides/GETTING-STARTED-CURRENT.md) - Start here!
- [README.md](../README.md) - Project overview and quick start
- [Installation Guide](#installation) - Setup instructions

### Core Concepts
- [PCL Specification v1](../SPEC/PCL_SPEC_v1.md) - Official language specification (RFC-style)
- [Language Grammar](../SPEC/PCL_GRAMMAR.md) - Formal grammar definition
- [Type System](../SPEC/PCL_TYPE_SYSTEM.md) - Type system documentation

---

## 📚 Phase 1: Core Language (100% Complete)

### Parser & Compiler
- [Parser Documentation](api/PARSER.md) - Parser API and usage
- [Semantic Analyzer](api/SEMANTIC.md) - Type checking and analysis
- [AST Reference](api/AST.md) - Abstract Syntax Tree nodes
- [Code Generation](api/CODEGEN.md) - Code generation to various formats

### Runtime & Execution
- [Runtime Documentation](api/RUNTIME.md) - Runtime system overview
- [Provider System](api/PROVIDERS.md) - LLM provider architecture
- [Expression Evaluator](api/EXPRESSIONS.md) - Expression evaluation

### Registry System
- [Registry Architecture](api/REGISTRY.md) - Multi-backend registry
- [Backend Comparison](api/REGISTRY-BACKENDS.md) - Memory, JSON, SQLite, PostgreSQL
- [Search & Indexing](api/REGISTRY-SEARCH.md) - Full-text search

### CLI Commands
- [CLI Reference](api/CLI.md) - Command-line interface
- [Registry Commands](api/CLI-REGISTRY.md) - 7 registry commands

### Phase 1 Completion
- [Phase 1.2-1.4 Complete](.roadmap/status/PHASE-1.2-1.4-COMPLETE.md) - Registry completion summary

---

## 💻 Phase 2.1: IDE Support (100% Complete)

### Language Server Protocol
- [LSP Overview](.roadmap/status/PHASE-2.1-COMPLETE.md) - Complete LSP implementation summary
- [Server Architecture](lsp/SERVER-ARCHITECTURE.md) - LSP server design
- [Provider System](lsp/PROVIDERS.md) - Individual providers

### LSP Features
- **Diagnostics** - Real-time error detection
- **Completion** - IntelliSense with 26 keywords, 13 snippets
- **Hover** - Documentation on hover (30+ properties)
- **Definition** - Go to definition (Ctrl+Click)
- **References** - Find all references
- **Symbols** - Document outline
- **Formatting** - Auto-format code

### VSCode Extension
- [Extension README](../vscode-pcl/README.md) - VSCode extension documentation
- [Installation Guide](../vscode-pcl/README.md#installation) - Setup instructions
- [Features Guide](../vscode-pcl/README.md#features) - What the extension provides

### Phase Completion Documents
- [Phase 2.1 Complete](.roadmap/status/PHASE-2.1-COMPLETE.md) - Full phase summary (700 lines)
- [Day 1-2 Complete](.roadmap/status/PHASE-2.1-DAY1-2-COMPLETE.md) - Server scaffold
- [Day 3-5 Complete](.roadmap/status/PHASE-2.1-DAY3-5-COMPLETE.md) - Document manager
- [Day 6-8 Complete](.roadmap/status/PHASE-2.1-DAY6-8-COMPLETE.md) - Diagnostics
- [Day 11-13 Complete](.roadmap/status/PHASE-2.1-DAY11-13-COMPLETE.md) - Completion
- [Day 14-15 Complete](.roadmap/status/PHASE-2.1-DAY14-15-COMPLETE.md) - Hover

---

## 🎯 Phase 2.2: Skills Ecosystem (100% Complete)

### Skills Overview
- [Skills Ecosystem Complete](.roadmap/status/PHASE-2.2-CLAUDE-CODE-SKILLS.md) - Full phase summary (700 lines)
- [Claude Code Compatibility](skills/CLAUDE-CODE-COMPATIBILITY.md) - Claude Code integration guide (2,800 lines)
- [Agent Skills Compatibility](skills/AGENT-SKILLS-COMPATIBILITY.md) - agentskills.io integration (1,500 lines)

### Skills Specifications
- [Agent Skills Spec](https://agentskills.io/specification) - Official Agent Skills specification
- [Claude Code Skills](https://code.claude.com/docs/en/skills) - Official Claude Code documentation
- [PCL Skills Format](skills/PCL-SKILLS-FORMAT.md) - PCL native skill format

### Skills Usage
- [Creating Skills](skills/CREATING-SKILLS.md) - How to write skills
- [Using Skills](skills/USING-SKILLS.md) - How to use skills in personas
- [Skill Loader API](../src/skills/skill-loader.ts) - TypeScript API reference
- [Example Skills](../examples/skills/) - Production-ready examples

### Example Skills
- [Python Expert](../examples/skills/python-expert/SKILL.md) - Python programming skill (270 lines)
- More skills coming in standard library

### Compatibility
- **Agent Skills**: 100% compatible (all required + optional fields)
- **Claude Code**: 95% compatible (100% core features)
- **Bidirectional**: Import/export both formats
- **Progressive Disclosure**: 3-tier loading pattern supported

---

## 🏛️ Governance & Compliance

### Security & Standards
- [Security Model](../GOVERNANCE/PCL_SECURITY_MODEL.md) - ISO 27001/42001 security architecture
- [Governance Framework](../GOVERNANCE/PCL_GOVERNANCE.md) - ISO 38500 governance
- [Security Policy](../SECURITY.md) - Security practices and reporting

### Standards Compliance
- **ISO/IEC 27001** - Information Security Management
- **ISO/IEC 42001** - AI Management System
- **OWASP LLM Top 10** - LLM security best practices
- **EU AI Act** - High-risk AI regulation
- **NIST SP 800-207** - Zero Trust Architecture

### Compliance Documents
- [Standards Alignment](../GOVERNANCE/STANDARDS-ALIGNMENT.md) - How PCL meets standards
- [Risk Classification](../GOVERNANCE/RISK-CLASSIFICATION.md) - AI risk levels
- [Audit Logging](../GOVERNANCE/AUDIT-LOGGING.md) - Compliance logging

---

## 📖 Tutorials & Guides

### Beginner
- [Getting Started](guides/GETTING-STARTED-CURRENT.md) - Your first PCL program
- [Basic Personas](guides/BASIC-PERSONAS.md) - Creating simple personas
- [Type System Basics](guides/TYPES-BASICS.md) - Understanding types

### Intermediate
- [Team Composition](guides/TEAMS.md) - Multi-agent teams
- [Workflow Orchestration](guides/WORKFLOWS.md) - Complex workflows
- [Registry Usage](guides/REGISTRY.md) - Using the registry system
- [Skills Integration](guides/SKILLS.md) - Using skills from ecosystem

### Advanced
- [Custom Providers](guides/CUSTOM-PROVIDERS.md) - Building LLM providers
- [Plugin System](guides/PLUGINS.md) - Extending PCL
- [Performance Tuning](guides/PERFORMANCE.md) - Optimization techniques
- [Security Hardening](guides/SECURITY-HARDENING.md) - Production security

---

## 🔧 API Reference

### Core APIs
- [Parser API](api/PARSER.md) - `parse()`, `parseExpression()`, etc.
- [Semantic API](api/SEMANTIC.md) - `analyze()`, type checking
- [Runtime API](api/RUNTIME.md) - `createRuntime()`, execution
- [Registry API](api/REGISTRY.md) - `RegistryManager`, backends

### LSP APIs
- [LSP Server API](api/LSP-SERVER.md) - Language server API
- [Document Manager](api/LSP-DOCUMENT-MANAGER.md) - Document lifecycle
- [Providers](api/LSP-PROVIDERS.md) - Completion, hover, etc.

### Skills APIs
- [Skill Loader](api/SKILL-LOADER.md) - Load and convert skills
- [Skill Resolver](api/SKILL-RESOLVER.md) - Resolve skill references
- [Skill Compiler](api/SKILL-COMPILER.md) - Compile skills

### Code Generation
- [Code Generator](api/CODEGEN.md) - Generate code
- [JSON Export](api/CODEGEN-JSON.md) - Export to JSON
- [YAML Export](api/CODEGEN-YAML.md) - Export to YAML
- [Markdown Export](api/CODEGEN-MARKDOWN.md) - Documentation generation

---

## 📋 Examples

### Basic Examples
- [Hello World](../examples/hello-world.pcl) - Simplest persona
- [Simple Persona](../examples/simple-persona.pcl) - Basic structure
- [Type Examples](../examples/types.pcl) - Type system features

### Advanced Examples
- [Multi-Agent Team](../examples/team-example.pcl) - Team composition
- [Complex Workflow](../examples/workflow-example.pcl) - Orchestration
- [Full Application](../examples/full-app/) - Complete application

### Skill Examples
- [Python Expert](../examples/skills/python-expert/SKILL.md) - Programming skill
- [Code Review](../examples/skills/code-review/SKILL.md) - Review skill
- [Data Analysis](../examples/skills/data-analysis/SKILL.md) - Analysis skill

### Test Examples
- [Parser Tests](../test/parser/) - Parser test cases
- [Semantic Tests](../test/semantic/) - Type checker tests
- [Runtime Tests](../test/runtime/) - Execution tests
- [Skills Tests](../test/skills/) - Skill loader tests

---

## 🛣️ Roadmap & Planning

### Project Roadmap
- [ROADMAP.md](../.roadmap/ROADMAP.md) - Complete project roadmap
- [Current Status](../.roadmap/ROADMAP.md#current-focus-2026-01-18) - What's done

### Phase Completion Documents
- [Phase 0 Complete](../.roadmap/status/PHASE-0-COMPLETE.md) - Foundation
- [Phase 1 Complete](../.roadmap/status/PHASE-1.2-1.4-COMPLETE.md) - Core language
- [Phase 2.1 Complete](../.roadmap/status/PHASE-2.1-COMPLETE.md) - LSP
- [Phase 2.2 Complete](../.roadmap/status/PHASE-2.2-CLAUDE-CODE-SKILLS.md) - Skills
- [Session Summary](../.roadmap/status/SESSION-SUMMARY-2026-01-18.md) - Latest session

### Future Plans
- [Phase 2.3 Plan](../.roadmap/PHASE-2.3-PLAN.md) - IDE extensions
- [Phase 2.4 Plan](../.roadmap/PHASE-2.4-PLAN.md) - Build system
- [Phase 3 Plan](../.roadmap/PHASE-3-PLAN.md) - Advanced features

---

## 🧪 Testing & Quality

### Test Suites
- [Test Overview](../test/README.md) - Testing strategy
- [Unit Tests](../test/README.md#unit-tests) - Component tests
- [Integration Tests](../test/README.md#integration-tests) - End-to-end tests
- [Benchmarks](../test/benchmarks/) - Performance benchmarks

### Quality Assurance
- [Code Style Guide](../CONTRIBUTING.md#code-style) - Coding standards
- [Review Process](../CONTRIBUTING.md#review-process) - PR guidelines
- [Security Testing](../GOVERNANCE/SECURITY-TESTING.md) - Security validation

---

## 🤝 Contributing

### Getting Involved
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute
- [Code of Conduct](../CODE_OF_CONDUCT.md) - Community guidelines
- [Development Setup](../CONTRIBUTING.md#development-setup) - Local development

### Community
- [Discussions](https://github.com/personalayer/pcl/discussions) - Ask questions
- [Issues](https://github.com/personalayer/pcl/issues) - Report bugs
- [Pull Requests](https://github.com/personalayer/pcl/pulls) - Contribute code

---

## 📜 Legal & Licensing

### Licenses
- [LICENSE](../LICENSE) - Apache 2.0 license
- [NOTICE](../NOTICE) - Third-party notices
- [Copyright](../COPYRIGHT) - Copyright information

### Policies
- [Security Policy](../SECURITY.md) - Vulnerability reporting
- [Privacy Policy](../PRIVACY.md) - Data handling
- [Terms of Use](../TERMS.md) - Usage terms

---

## 🔍 Quick Reference

### Common Tasks

| Task | Documentation |
|------|---------------|
| Install PCL | [README.md](../README.md#installation) |
| Create first persona | [Getting Started](guides/GETTING-STARTED-CURRENT.md) |
| Use VSCode extension | [Extension README](../vscode-pcl/README.md) |
| Import Agent Skills | [Agent Skills Guide](skills/AGENT-SKILLS-COMPATIBILITY.md) |
| Import Claude Code skills | [Claude Code Guide](skills/CLAUDE-CODE-COMPATIBILITY.md) |
| Set up registry | [Registry Guide](guides/REGISTRY.md) |
| Run tests | [Testing Guide](../test/README.md) |
| Deploy to production | [Deployment Guide](guides/DEPLOYMENT.md) |

### API Quick Links

| API | Link |
|-----|------|
| `parse()` | [Parser API](api/PARSER.md#parse) |
| `analyze()` | [Semantic API](api/SEMANTIC.md#analyze) |
| `createRuntime()` | [Runtime API](api/RUNTIME.md#createRuntime) |
| `RegistryManager` | [Registry API](api/REGISTRY.md#RegistryManager) |
| `parseSkillMd()` | [Skill Loader](../src/skills/skill-loader.ts) |

### Specification Quick Links

| Spec | Link |
|------|------|
| Language Grammar | [PCL_GRAMMAR.md](../SPEC/PCL_GRAMMAR.md) |
| Type System | [PCL_TYPE_SYSTEM.md](../SPEC/PCL_TYPE_SYSTEM.md) |
| Security Model | [PCL_SECURITY_MODEL.md](../GOVERNANCE/PCL_SECURITY_MODEL.md) |
| Agent Skills | [agentskills.io/specification](https://agentskills.io/specification) |
| Claude Code Skills | [code.claude.com/docs](https://code.claude.com/docs/en/skills) |

---

## 📊 Documentation Statistics

| Category | Documents | Lines |
|----------|-----------|-------|
| Core Specs | 5 | ~10,000 |
| API Reference | 15 | ~5,000 |
| Tutorials | 10 | ~3,000 |
| Examples | 25+ | ~2,000 |
| Phase Completions | 8 | ~5,000 |
| Skills Documentation | 3 | ~5,500 |
| Governance | 6 | ~4,000 |
| **Total** | **70+** | **~35,000** |

---

## 🆕 Latest Updates (2026-01-18)

### Phase 2.1: LSP Implementation ✅
- Complete Language Server Protocol with 8 features
- VSCode extension with syntax highlighting
- Real-time diagnostics, completion, hover, navigation
- [Full documentation](.roadmap/status/PHASE-2.1-COMPLETE.md)

### Phase 2.2: Skills Ecosystem ✅
- 100% compatible with Agent Skills specification
- 95% compatible with Claude Code SKILL.md format
- Bidirectional conversion (PCL ↔ SKILL.md)
- [Full documentation](.roadmap/status/PHASE-2.2-CLAUDE-CODE-SKILLS.md)
- [Claude Code guide](skills/CLAUDE-CODE-COMPATIBILITY.md)
- [Agent Skills guide](skills/AGENT-SKILLS-COMPATIBILITY.md)

---

## 📞 Support

### Getting Help
- **Documentation**: Start with this index
- **Examples**: Check [examples/](../examples/)
- **Discussions**: [GitHub Discussions](https://github.com/personalayer/pcl/discussions)
- **Issues**: [GitHub Issues](https://github.com/personalayer/pcl/issues)

### Reporting Issues
- **Bugs**: Use [bug report template](.github/ISSUE_TEMPLATE/bug_report.md)
- **Features**: Use [feature request template](.github/ISSUE_TEMPLATE/feature_request.md)
- **Security**: Email security@pcl.dev (see [SECURITY.md](../SECURITY.md))

---

**Last Updated**: 2026-01-18
**Documentation Version**: 1.0.0
**PCL Version**: 1.0.0-alpha
