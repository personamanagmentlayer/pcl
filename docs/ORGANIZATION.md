# PCL Documentation Organization

**Last Updated**: 2026-01-19

---

## Overview

This document describes the organization of PCL documentation to make it easy to find what you need.

---

## Root Directory

The root directory contains only essential project files:

| File | Purpose |
|------|---------|
| `README.md` | Project overview and quick start |
| `CHANGELOG.md` | Version history and changes |
| `CONTRIBUTING.md` | How to contribute to PCL |
| `SECURITY.md` | Security policy and vulnerability reporting |
| `LICENSE` | Apache 2.0 license |
| `package.json` | NPM package configuration |
| `.gitignore` | Git ignore rules |
| `.editorconfig` | Editor configuration |
| `.prettierrc` | Code formatting rules |
| `.eslintrc.json` | Linting configuration |

All other documentation is organized in the `docs/` directory.

---

## Documentation Structure

```
docs/
├── INDEX.md                    # Main documentation index (START HERE!)
├── ORGANIZATION.md             # This file
│
├── phases/                     # Phase completion documents
│   ├── PHASE-2.4-COMPLETE.md
│   ├── PHASE-2.5-2.7-PLAN.md
│   ├── PHASE-2.5-2.7-PROGRESS.md
│   ├── PHASE-2-COMPLETE.md
│   ├── PHASE-2-VALIDATION.md
│   └── SKILLS-CLI-COMPLETE.md
│
├── quickref/                   # Quick reference guides
│   ├── QUICKSTART.md
│   ├── BUILD-QUICK-REF.md
│   └── SKILLS-CLI-QUICK-REF.md
│
├── sessions/                   # Session summaries
│   ├── SESSION-2026-01-18-FINAL.md
│   └── SESSION-SUMMARY-DETAILED.md
│
├── guides/                     # User guides and tutorials
│   ├── GETTING-STARTED.md
│   ├── GETTING-STARTED-CURRENT.md
│   ├── EVENT-SYSTEM.md
│   ├── REGISTRY-USAGE.md
│   └── ...
│
├── api/                        # API reference documentation
│   ├── PARSER.md
│   ├── SEMANTIC.md
│   ├── CODEGEN.md
│   ├── REGISTRY-ARCHITECTURE.md
│   └── ...
│
├── skills/                     # Skills ecosystem docs
│   ├── CLAUDE-CODE-COMPATIBILITY.md
│   ├── AGENT-SKILLS-COMPATIBILITY.md
│   └── CLI-USAGE.md
│
├── registry/                   # Registry system docs
│   ├── REGISTRY-CHEATSHEET.md
│   ├── DATABASE-FREE-REGISTRY.md
│   └── TEST-RESULTS.md
│
├── reference/                  # Language reference
│   ├── LANGUAGE.md
│   ├── SYNTAX.md
│   └── ERROR-CODES.md
│
└── changelog/                  # Detailed changelogs
    └── CHANGELOG-2026-01-18.md
```

---

## Finding What You Need

### I'm New to PCL

Start here in order:
1. [Root README](../README.md) - Project overview
2. [Quickstart Guide](quickref/QUICKSTART.md) - Get started in 5 minutes
3. [Getting Started Guide](guides/GETTING-STARTED-CURRENT.md) - Full tutorial
4. [Documentation Index](INDEX.md) - Browse all documentation

### I Want to Build Something

Build system resources:
1. [Build Quick Reference](quickref/BUILD-QUICK-REF.md) - Commands overview
2. [Build System Guide](BUILD-SYSTEM.md) - Complete guide
3. [Phase 2.4 Complete](phases/PHASE-2.4-COMPLETE.md) - Build system details

### I Want to Use Skills

Skills resources:
1. [Skills CLI Quick Reference](quickref/SKILLS-CLI-QUICK-REF.md) - Commands overview
2. [Skills CLI Usage](skills/CLI-USAGE.md) - Complete guide
3. [Claude Code Compatibility](skills/CLAUDE-CODE-COMPATIBILITY.md) - Claude Code integration
4. [Agent Skills Compatibility](skills/AGENT-SKILLS-COMPATIBILITY.md) - agentskills.io integration

### I'm Using an IDE

IDE integration:
1. [VSCode Setup](guides/VSCODE-SETUP.md) - VSCode extension setup
2. [Phase 2.1 Complete](../.roadmap/status/PHASE-2.1-COMPLETE.md) - LSP features
3. [Phase 2.5-2.7 Plan](phases/PHASE-2.5-2.7-PLAN.md) - JetBrains/Neovim plans

### I Need API Documentation

API references:
1. [Parser API](api/PARSER.md) - Parsing PCL code
2. [Semantic API](api/SEMANTIC.md) - Type checking
3. [Codegen API](api/CODEGEN.md) - Code generation
4. [Registry API](api/REGISTRY-ARCHITECTURE.md) - Registry system

### I Want to Contribute

Contributing resources:
1. [Contributing Guide](../CONTRIBUTING.md) - How to contribute
2. [Project Structure](PROJECT-STRUCTURE.md) - Codebase organization
3. [Phase Documentation](phases/) - Current development status

### I Found a Security Issue

Security resources:
1. [Security Policy](../SECURITY.md) - Vulnerability reporting
2. [Security Hardening](SECURITY_HARDENING.md) - Best practices
3. [Security Bootstrap](SECURITY_BOOTSTRAP.md) - Security setup

---

## Documentation Categories

### 1. Quick References (`quickref/`)

Fast, actionable guides:
- Command syntax
- Common patterns
- Cheat sheets
- Quick examples

**Best for**: Daily development, looking up commands

### 2. Guides (`guides/`)

Step-by-step tutorials:
- Getting started
- Feature deep-dives
- Best practices
- Integration guides

**Best for**: Learning, onboarding, understanding features

### 3. API Documentation (`api/`)

Technical reference:
- Function signatures
- Class interfaces
- Return types
- Usage examples

**Best for**: Programming, integration, automation

### 4. Phase Documents (`phases/`)

Development tracking:
- Feature completion
- Implementation plans
- Progress updates
- Roadmap status

**Best for**: Understanding project status, contributing

### 5. Session Summaries (`sessions/`)

Development sessions:
- What was built
- Decisions made
- Problems solved
- Next steps

**Best for**: Understanding context, reviewing history

---

## Documentation Standards

### File Naming

- Use kebab-case: `my-document.md`
- Be descriptive: `BUILD-QUICK-REF.md` not `BUILD.md`
- Add prefixes for categories: `PHASE-2.4-COMPLETE.md`

### Headings

- Start with H1 (`#`) for title
- Use H2 (`##`) for major sections
- Use H3 (`###`) for subsections
- Include table of contents for long documents

### Links

- Use relative paths: `../README.md`
- Link to specific sections: `#installation`
- Keep links up to date when reorganizing

### Examples

- Include practical examples
- Show both good and bad patterns
- Provide context and explanation
- Keep examples focused and concise

---

## Maintenance

### Adding New Documentation

1. Choose appropriate directory
2. Follow naming conventions
3. Update `INDEX.md`
4. Update this file if adding new category
5. Cross-link from related documents

### Updating Documentation

1. Update modification date
2. Maintain backward compatibility of links
3. Update cross-references
4. Run link checker (if available)

### Reorganizing

1. Update all internal links
2. Update `INDEX.md`
3. Update this file
4. Create redirects if needed (GitHub Pages)
5. Announce in changelog

---

## Search and Discovery

### Documentation Index

The [Documentation Index](INDEX.md) is the master catalog:
- Organized by topic
- Links to all documents
- Quick reference tables
- Statistics and metrics

### Full-Text Search

Use GitHub's search:
1. Navigate to repository
2. Press `/` to open search
3. Search within: `path:docs/`
4. Example: `path:docs/ quickstart`

### Directory Listing

Each category has its own folder:
- `ls docs/guides/` - List all guides
- `ls docs/api/` - List all API docs
- `ls docs/phases/` - List phase documents

---

## Related Resources

### External Documentation

- **SPEC/**: Language specification (formal grammar, type system)
- **GOVERNANCE/**: Governance and compliance docs
- **.roadmap/**: Project roadmap and planning
- **examples/**: Code examples
- **test/**: Test documentation

### Repository Links

- **Issues**: https://github.com/personalayer/pcl/issues
- **Discussions**: https://github.com/personalayer/pcl/discussions
- **Pull Requests**: https://github.com/personalayer/pcl/pulls

---

## Quick Links

| Documentation | Location |
|--------------|----------|
| **Main Index** | [docs/INDEX.md](INDEX.md) |
| **Quickstart** | [docs/quickref/QUICKSTART.md](quickref/QUICKSTART.md) |
| **Getting Started** | [docs/guides/GETTING-STARTED-CURRENT.md](guides/GETTING-STARTED-CURRENT.md) |
| **Build System** | [docs/BUILD-SYSTEM.md](BUILD-SYSTEM.md) |
| **Skills CLI** | [docs/skills/CLI-USAGE.md](skills/CLI-USAGE.md) |
| **API Reference** | [docs/api/](api/) |
| **Contributing** | [CONTRIBUTING.md](../CONTRIBUTING.md) |

---

**Maintained by**: PCL Team
**Questions**: [GitHub Discussions](https://github.com/personalayer/pcl/discussions)
**Issues**: [GitHub Issues](https://github.com/personalayer/pcl/issues)
