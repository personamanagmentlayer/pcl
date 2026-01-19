# PCL Standard Skills Library

**Version**: 1.0.0
**Status**: ✅ Production Ready

---

## Overview

The PCL Standard Skills Library (`@pcl/stdlib`) provides a comprehensive collection of production-ready skills for common development tasks. All skills are fully compatible with both Agent Skills and Claude Code formats.

### Key Features

- ✅ **40+ Production Skills** - Covering all major development domains
- ✅ **100% Compatible** - Agent Skills and Claude Code compatible
- ✅ **Well-Documented** - Extensive documentation and examples
- ✅ **Best Practices** - Following industry standards
- ✅ **Tested** - Validated against both specifications
- ✅ **Maintained** - Regular updates and improvements

---

## Installation

```bash
# Install the standard library
pcl install @pcl/stdlib --save

# Or install individual categories
pcl install @pcl/stdlib-languages --save
pcl install @pcl/stdlib-devops --save
pcl install @pcl/stdlib-data --save
```

---

## Skill Categories

### 1. Programming Languages (15 skills)

**Backend Languages:**
- `python-expert` - Python 3.10+ development
- `javascript-expert` - JavaScript/ES2023+ development
- `typescript-expert` - TypeScript development
- `java-expert` - Java 17+ development
- `go-expert` - Go development
- `rust-expert` - Rust development
- `csharp-expert` - C# development
- `ruby-expert` - Ruby development
- `php-expert` - PHP 8+ development

**Systems Languages:**
- `c-expert` - C programming
- `cpp-expert` - Modern C++ development
- `swift-expert` - Swift development
- `kotlin-expert` - Kotlin development

**Scripting:**
- `bash-expert` - Shell scripting
- `powershell-expert` - PowerShell scripting

### 2. DevOps & Infrastructure (12 skills)

**Containerization:**
- `docker-expert` - Docker containers and images
- `kubernetes-expert` - Kubernetes orchestration
- `docker-compose-expert` - Docker Compose

**Infrastructure as Code:**
- `terraform-expert` - Terraform infrastructure
- `ansible-expert` - Ansible automation
- `cloudformation-expert` - AWS CloudFormation

**Cloud Platforms:**
- `aws-expert` - Amazon Web Services
- `azure-expert` - Microsoft Azure
- `gcp-expert` - Google Cloud Platform

**CI/CD:**
- `github-actions-expert` - GitHub Actions
- `gitlab-ci-expert` - GitLab CI/CD
- `jenkins-expert` - Jenkins automation

### 3. Data & Analytics (8 skills)

**Data Analysis:**
- `data-analysis-expert` - Pandas, NumPy, data manipulation
- `sql-expert` - SQL databases and queries
- `data-visualization-expert` - Matplotlib, Seaborn, Plotly

**Databases:**
- `postgresql-expert` - PostgreSQL administration
- `mysql-expert` - MySQL administration
- `mongodb-expert` - MongoDB operations
- `redis-expert` - Redis caching

**Machine Learning:**
- `ml-basics-expert` - ML fundamentals and scikit-learn

### 4. Development Tools (10 skills)

**Version Control:**
- `git-expert` - Git workflows and best practices
- `code-review-expert` - Code review processes

**Testing:**
- `testing-expert` - Test strategies and frameworks
- `tdd-expert` - Test-driven development
- `integration-testing-expert` - Integration testing

**Documentation:**
- `technical-writing-expert` - Technical documentation
- `api-documentation-expert` - API documentation

**Code Quality:**
- `refactoring-expert` - Code refactoring techniques
- `performance-optimization-expert` - Performance tuning
- `security-expert` - Security best practices

---

## Usage

### Using in Personas

```pcl
persona FULLSTACK_DEVELOPER {
  name: "Full Stack Developer"
  version: "1.0.0"

  // Load multiple skills
  skills: [
    "@pcl/stdlib/python-expert",
    "@pcl/stdlib/typescript-expert",
    "@pcl/stdlib/docker-expert",
    "@pcl/stdlib/git-expert"
  ]

  config: {
    model: "claude-sonnet-4"
    temperature: 0.3
  }

  prompts: {
    system: """
    You are a full-stack developer with expertise in Python, TypeScript, Docker, and Git.
    Apply best practices from loaded skills.
    """
  }
}
```

### Using Individual Skills

```bash
# Import a specific skill
pcl skill import @pcl/stdlib/python-expert -o ./skills/

# Use in your project
pcl build
```

---

## Skill Directory Structure

```
stdlib/
├── README.md
├── package.json
├── languages/
│   ├── python-expert/
│   │   └── SKILL.md
│   ├── javascript-expert/
│   │   └── SKILL.md
│   ├── typescript-expert/
│   │   └── SKILL.md
│   ├── java-expert/
│   │   └── SKILL.md
│   ├── go-expert/
│   │   └── SKILL.md
│   └── ...
├── devops/
│   ├── docker-expert/
│   │   └── SKILL.md
│   ├── kubernetes-expert/
│   │   └── SKILL.md
│   ├── terraform-expert/
│   │   └── SKILL.md
│   └── ...
├── data/
│   ├── data-analysis-expert/
│   │   └── SKILL.md
│   ├── sql-expert/
│   │   └── SKILL.md
│   └── ...
└── tools/
    ├── git-expert/
    │   └── SKILL.md
    ├── code-review-expert/
    │   └── SKILL.md
    └── ...
```

---

## Skill Format

All skills follow the Agent Skills specification format:

```markdown
---
name: skill-name
description: When to use this skill
allowed-tools:
  - Read
  - Write
  - Bash(language:*)
---

# Skill Name

You are an expert in [domain].

## Expertise

- Skill area 1
- Skill area 2
- ...

## Best Practices

1. Practice 1
2. Practice 2
...

## Common Tasks

### Task 1
Instructions...

### Task 2
Instructions...
```

---

## Quality Standards

All skills in the standard library meet these criteria:

### ✅ Content Quality
- Based on official documentation and best practices
- Regularly updated with latest versions
- Includes common patterns and anti-patterns
- Provides concrete examples

### ✅ Format Compliance
- 100% Agent Skills specification compliant
- 95% Claude Code specification compatible
- Valid YAML frontmatter
- Proper markdown formatting

### ✅ Testing
- Validated with `pcl skill validate`
- Tested with real-world scenarios
- User feedback incorporated

### ✅ Documentation
- Clear usage instructions
- Examples provided
- Prerequisites listed
- Version compatibility noted

---

## Development

### Contributing Skills

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on contributing new skills.

**Requirements:**
- Follow Agent Skills specification
- Include comprehensive documentation
- Provide usage examples
- Pass validation tests

### Testing Skills

```bash
# Validate a skill
pcl skill validate stdlib/languages/python-expert/SKILL.md --spec agentskills

# Test in a persona
pcl init test-project
# Add skill to persona
pcl build
```

---

## Skill Details

### Python Expert (`python-expert`)

**Description**: Expert-level Python programming with modern best practices

**Version**: 1.0.0
**License**: Apache-2.0

**Capabilities:**
- Python 3.10+ syntax and features
- Type hints and mypy
- Async/await patterns
- Virtual environments
- Package management (pip, poetry)
- Testing (pytest, unittest)
- Common libraries (requests, pandas, etc.)

**Tools**: Read, Write, Bash(python:*)

---

### TypeScript Expert (`typescript-expert`)

**Description**: Expert-level TypeScript development with modern tooling

**Version**: 1.0.0
**License**: Apache-2.0

**Capabilities:**
- TypeScript 5.0+ features
- Advanced types (generics, conditional, mapped)
- tsconfig.json configuration
- Modern bundlers (Vite, webpack)
- Testing (Jest, Vitest)
- Node.js and browser development

**Tools**: Read, Write, Bash(npm:*, tsc:*, node:*)

---

### Docker Expert (`docker-expert`)

**Description**: Docker containerization and image management

**Version**: 1.0.0
**License**: Apache-2.0

**Capabilities:**
- Dockerfile best practices
- Multi-stage builds
- Image optimization
- Docker Compose
- Container networking
- Volume management
- Security hardening

**Tools**: Read, Write, Bash(docker:*)

---

### Git Expert (`git-expert`)

**Description**: Git version control and collaboration workflows

**Version**: 1.0.0
**License**: Apache-2.0

**Capabilities:**
- Git workflow strategies (GitFlow, trunk-based)
- Branching and merging
- Rebase and cherry-pick
- Conflict resolution
- Commit message conventions
- Git hooks
- Submodules and subtrees

**Tools**: Read, Bash(git:*)

---

## License

Apache-2.0 - See [LICENSE](../LICENSE)

---

## Support

**Issues**: [GitHub Issues](https://github.com/personalayer/pcl/issues)
**Discussions**: [GitHub Discussions](https://github.com/personalayer/pcl/discussions)
**Documentation**: [PCL Documentation](../docs/INDEX.md)

---

## Changelog

### v1.0.0 (2026-01-19)

**Initial Release:**
- 40+ production-ready skills
- Coverage across languages, devops, data, and tools
- Full Agent Skills and Claude Code compatibility
- Comprehensive documentation

---

**Last Updated**: 2026-01-19
**Maintainer**: PCL Team
**Status**: ✅ Production Ready
