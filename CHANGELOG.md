# Changelog

All notable changes to PCL (Persona Control Language) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Comprehensive GitHub Actions CI/CD pipeline
  - Multi-platform testing (Ubuntu, Windows, macOS)
  - Security scanning with CodeQL and npm audit
  - Automated release workflow with npm publishing
  - PR validation with semantic commit checks
  - Code coverage reporting with Codecov integration
  - Automated dependency updates via Dependabot
- Auto-labeling system for PRs based on changed files
- PR size warnings for large changesets

### Fixed

- Semantic analyzer: Corrected TypeKind reference from enum to string literal in tests
- Semantic analyzer: Function parameter scope now properly managed with `globalScope.enterScope()`
- Build errors and type issues resolved

### Changed

- Test suite: 33/35 semantic tests now passing (94% pass rate)

## [1.0.0] - 2026-01-16

### 🎉 Initial Release

The world's first programming language for AI persona management!

### Added

#### Core Language Features

- **Lexer**: Complete tokenization with position tracking
  - Keyword recognition (persona, team, workflow, fn, etc.)
  - Operator support (composition, merge, delegation)
  - String literals with escape sequences
  - Numeric literals (int, float, scientific notation)
  - Comment support (single-line `//` and multi-line `/* */`)

- **Parser**: Full PCL grammar implementation
  - Persona declarations with extends/implements
  - Team composition and configuration
  - Workflow definitions with steps
  - Function declarations (sync and async)
  - Type system (primitives, arrays, tuples, unions, interfaces)
  - Control flow (if/else, for/while loops, match statements)
  - Import/export statements

- **Semantic Analyzer**: Type checking and validation
  - Symbol table with scope management
  - Type inference for literals and expressions
  - Union type handling with member assignability
  - Literal type widening (literal → base type)
  - Int → Float numeric coercion
  - Common type resolution for arrays
  - Duplicate declaration detection (partial)
  - Function parameter type checking

- **AST (Abstract Syntax Tree)**: Comprehensive node types
  - Declaration nodes (Persona, Team, Workflow, Function, etc.)
  - Expression nodes (Binary, Unary, Call, Member, etc.)
  - Statement nodes (If, For, While, Return, etc.)
  - Type annotation nodes (Primitive, Array, Union, etc.)

- **Type System**:
  - Primitive types: String, Int, Float, Bool
  - Literal types: "hello", 42, 3.14, true/false
  - Array types: T[]
  - Tuple types: [T1, T2, T3]
  - Union types: T1 | T2
  - Intersection types: T1 & T2
  - Function types with parameters and return types
  - Generic types and type variables
  - Special types: Any, Unknown, Never, Void
  - Persona, Team, Workflow, Skill types

- **Runtime**: Basic execution engine
  - Persona activation and management
  - Team composition
  - Message routing
  - State management
  - Error handling

- **CLI Tool** (`pcl` command):
  - `pcl parse <file>` - Parse and display AST
  - `pcl check <file>` - Type check and validate
  - `pcl repl` - Interactive REPL
  - `pcl gen <file>` - Code generation (placeholder)

#### Development Experience

- **VS Code Configuration**:
  - Comprehensive editor settings (format on save, bracket colorization)
  - GitHub Copilot integration with GPT-4
  - TypeScript IntelliSense with inlay hints
  - 30+ recommended extensions (ESLint, Prettier, Vitest, GitLens)
  - 6 debug configurations for CLI, tests, and TypeScript files
  - Custom keyboard shortcuts for Copilot and testing
  - Build, test, and lint tasks

- **Code Quality Tools**:
  - Prettier for code formatting (single quotes, 80 char width)
  - ESLint for code linting
  - EditorConfig for cross-editor consistency
  - TypeScript strict mode enabled
  - Vitest for testing with coverage support

- **Documentation**:
  - Comprehensive README with quick start guide
  - GitHub Copilot instructions (500+ lines) with:
    - Compiler architecture and design principles
    - TypeScript coding standards and patterns
    - Testing guidelines (80% coverage requirement)
    - Anti-patterns to avoid
    - Example code generation patterns
  - PCL Bootstrap specification (1800+ lines):
    - 25+ built-in personas (ARCHI, SEC, DEV, etc.)
    - 120+ /persona commands
    - Standardization personas for technical standards
    - Workflow orchestration framework
    - LLM calibration system

#### Project Infrastructure

- TypeScript 5.3+ with ESM modules
- Node.js 20+ required
- Build system with tsup (code splitting, DTS generation)
- Test suite with Vitest (35 semantic tests, 33 runtime tests, 17 integration tests)
- Git repository with develop/main branch workflow
- Apache-2.0 license
- Package: @pcl/sdk on npm (planned)

### Known Issues

- Parser may not fully recognize function declarations in some contexts
- Duplicate declaration detection needs improvement (2 failing validation tests)
- Integration tests: 12/17 failing (test suite under development)
- Runtime tests: 3/33 failing (team messaging, persona activation edge cases)
- Function parameter scope: Implementation complete, parser investigation needed

### Performance

- Fast lexing with character-by-character scanning
- Two-pass semantic analysis (collect declarations, then validate)
- Lazy evaluation in runtime
- Memoization for expensive type operations

### Testing

- **Test Coverage**: 94% pass rate for semantic tests (33/35)
- **Test Categories**:
  - Symbol table management (8 tests) ✅
  - Type checker operations (13 tests) ✅
  - Semantic analysis (14 tests) - 12/14 passing
  - Runtime tests (33 tests) - 30/33 passing
  - Integration tests (17 tests) - 5/17 passing

### Dependencies

- **Runtime**: None (zero dependencies)
- **Development**:
  - TypeScript 5.3.3
  - Vitest 1.0.4
  - tsup 8.0.1
  - tsx 4.6.2
  - ESLint 8.55.0
  - Prettier 3.1.0

---

## Release Notes

### What's Next?

- Complete integration test suite
- Improve duplicate declaration detection
- Parser investigation for function declaration edge cases
- Quick Start guide for new contributors
- Security review of Bootstrap persona loading
- npm package publication
- Documentation website

### Contributing

We welcome contributions! Please see:

- [GitHub Copilot Instructions](.github/copilot-instructions.md) for coding standards
- [PCL Bootstrap Specification](.roadmap/bootstrap/BOOTSTRAP_EN.md) for persona system details

### Links

- **Repository**: https://github.com/personamanagmentlayer/pcl
- **Issues**: https://github.com/personamanagmentlayer/pcl/issues
- **License**: Apache-2.0

---

## Versioning Strategy

PCL follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.x.x): Breaking changes to language syntax or semantics
- **MINOR** (x.1.x): New features, backward-compatible
- **PATCH** (x.x.1): Bug fixes, backward-compatible

---

[Unreleased]: https://github.com/personamanagmentlayer/pcl/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/personamanagmentlayer/pcl/releases/tag/v1.0.0
