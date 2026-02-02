# Contributing to PCL (Persona Control Language)

Thank you for your interest in contributing to the Persona Control Language!

## 📋 Quick Links

- **Project Structure**: [docs/PROJECT-STRUCTURE.md](docs/PROJECT-STRUCTURE.md)
- **Code of Conduct**: [docs/GOVERNANCE_MODEL.md](docs/GOVERNANCE_MODEL.md)
- **Security Policy**: [SECURITY.md](SECURITY.md)

## 🚀 Quick Start

1. **Fork** the repository
2. **Clone** your fork locally
3. **Install dependencies**: `npm install`
4. **Create a branch** from `main`
5. **Make your changes** following our standards
6. **Test** your changes (`npm test`, coverage ≥90%)
7. **Commit** with conventional commit messages
8. **Push** to your fork
9. **Open a Pull Request**

## 🏗️ Development Setup

```bash
# Clone the repository
git clone https://github.com/personamanagementlayer/pcl.git
cd pcl

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run linter
npm run lint

# Type check
npx tsc --noEmit
```

## 📝 Conventional Commits

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add workflow orchestration support
fix: correct parser validation logic
docs: update getting started guide
chore: update dependencies
test: add integration tests for Phase 1.2
refactor: improve state machine performance
perf: optimize snapshot serialization
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes
- `ci`: CI/CD configuration changes

## 🧪 Running Tests

```bash
# Run all tests
npm test

# Run with coverage (target: ≥90%)
npm run test:coverage

# Run specific test file
npm test -- tests/runtime.test.ts

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Type checking
npx tsc --noEmit

# Full quality gate (before PR)
npm run lint && npm test && npm run build
```

## 🏛️ Project Structure

```
pcl/
├── src/              # Source code
│   ├── ast/          # Abstract Syntax Tree
│   ├── lexer/        # Lexical analyzer
│   ├── parser/       # Parser
│   ├── semantic/     # Semantic analyzer
│   ├── runtime/      # Runtime engine
│   ├── codegen/      # Code generators
│   └── cli/          # CLI interface
├── tests/            # Test suites
│   ├── integration/  # Integration tests
│   └── benchmarks/   # Performance benchmarks
├── docs/             # User-facing documentation
├── examples/         # Example projects
├── stdlib/           # Standard library (personas & skills)
└── scripts/          # Build and utility scripts
```

## 🎯 Contribution Types

### 🐛 Bug Fixes

- Include test case reproducing the bug
- Reference issue number in commit message: `fix: resolve parser issue (#123)`
- Update relevant documentation if behavior changes
- Ensure all existing tests still pass

### ✨ New Features

- **Discuss first**: Open an issue to discuss significant features
- **Design review**: For language changes, document the design approach
- **Tests required**: Include comprehensive unit and integration tests
- **Documentation**: Update user guides and API documentation
- **Examples**: Provide usage examples

### 📚 Documentation

- Documentation is licensed under CC BY 4.0 (see [LICENSE-DOCS](LICENSE-DOCS))
- Update both user-facing docs and inline code comments
- Include practical examples
- Check for broken links
- Ensure consistent formatting

### 🧪 Tests

- All new code must have tests
- Target coverage: ≥90%
- Write meaningful test descriptions
- Include edge cases and error scenarios
- Use descriptive test names

### 🔒 Security

- **DO NOT** open public issues for security vulnerabilities
- Report security issues via GitHub Security Advisories
- See [SECURITY.md](SECURITY.md) for reporting process
- Include proof of concept if applicable
- Allow time for fixes before disclosure

## 🔒 Security & Quality Standards

**All contributions MUST maintain:**

- ✅ TypeScript strict mode compliance
- ✅ Test coverage ≥90%
- ✅ No ESLint errors
- ✅ Proper error handling
- ✅ Input validation where applicable
- ✅ Audit logging for security-relevant operations

## 📖 Documentation Guidelines

### Code Documentation

- Use JSDoc for all public APIs
- Include examples in JSDoc comments
- Document parameters, return values, and exceptions
- Explain the "why" not just the "what"

### User Documentation

- Write for beginners and experts
- Include code examples
- Use clear, concise language
- Follow markdown best practices
- Test all code examples

### Examples

````typescript
/**
 * Creates a state machine with typed states and transitions.
 *
 * @example
 * ```typescript
 * const machine = createStateMachine<{ count: number }, string>()
 *   .withInitialState('idle')
 *   .addStates('processing', 'completed')
 *   .build();
 * ```
 *
 * @returns A new state machine builder
 */
export function createStateMachine<TContext, TEvent>() {
  return new StateMachineBuilder<TContext, TEvent>();
}
````

## 🤝 Community Guidelines

### Be Respectful

- Use welcoming and inclusive language
- Respect differing viewpoints and experiences
- Accept constructive criticism gracefully
- Focus on what's best for the community

### Be Professional

- Keep discussions on-topic
- Avoid personal attacks
- Provide constructive feedback
- Help newcomers

### Give Credit

- Acknowledge contributions from others
- Reference prior work
- Cite sources

## ⚖️ Licenses

PCL uses dual licensing:

- **Code** (src/, tests/, scripts/): [Apache 2.0 License](LICENSE)
- **Documentation** (docs/, \*.md): [CC BY 4.0](LICENSE-DOCS)

By contributing, you agree that:

- Your code contributions will be licensed under MIT
- Your documentation contributions will be licensed under CC BY 4.0
- You have the right to submit the work under these licenses
- You understand the contribution is public and preserved in version control

## 📋 Pull Request Checklist

Before submitting your PR, ensure:

- [ ] Code follows TypeScript best practices
- [ ] Tests pass locally (`npm test`)
- [ ] Test coverage ≥90% (`npm run test:coverage`)
- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npx tsc --noEmit`)
- [ ] Build succeeds (`npm run build`)
- [ ] Documentation updated (if applicable)
- [ ] CHANGELOG.md updated (for user-facing changes)
- [ ] Conventional commit message format used
- [ ] PR description clearly explains the change
- [ ] Related issues linked

## 📝 Pull Request Template

```markdown
## Description

Brief description of the changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

Describe the tests you ran and how to reproduce them

## Checklist

- [ ] Tests pass
- [ ] Documentation updated
- [ ] CHANGELOG updated
```

## 🎓 Learning Resources

**New to PCL?**

- Start with [Getting Started Guide](docs/guides/GETTING-STARTED.md)
- Read [Persona Building Guide](docs/PERSONA_BUILDING_GUIDE.md)
- Explore [examples/](examples/) directory
- Review [stdlib/](stdlib/) for standard personas and skills

**Contributing to Core?**

- Read [CLAUDE.md](CLAUDE.md) for project architecture
- Review [docs/PROJECT-STRUCTURE.md](docs/PROJECT-STRUCTURE.md)
- Check [tests/](tests/) for testing patterns
- Study existing code in [src/runtime/](src/runtime/)

**Phase 1.2 Implementation:**

- See [.roadmap/PHASE-1.2-COMPLETE.md](.roadmap/PHASE-1.2-COMPLETE.md)
- State Machines: [src/runtime/state-machine.ts](src/runtime/state-machine.ts)
- Team Edge Cases: [src/runtime/team-edge-cases.ts](src/runtime/team-edge-cases.ts)
- Snapshot/Restore: [src/runtime/snapshot.ts](src/runtime/snapshot.ts)

## 🔍 Code Review Process

1. **Automated Checks**: CI runs tests, linting, type checking
2. **Initial Review**: Maintainer reviews for general approach
3. **Detailed Review**: Line-by-line code review
4. **Revisions**: Address feedback and update PR
5. **Approval**: At least one maintainer approval required
6. **Merge**: Squash merge to main branch

## 🐛 Bug Report Guidelines

When reporting bugs, include:

1. **Environment**: OS, Node version, PCL version
2. **Steps to Reproduce**: Minimal reproduction steps
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Code Sample**: Minimal code that demonstrates the issue
6. **Logs**: Relevant error messages or stack traces

## 💡 Feature Request Guidelines

When requesting features:

1. **Use Case**: Describe the problem you're trying to solve
2. **Proposed Solution**: Suggest how it might work
3. **Alternatives**: What alternatives have you considered?
4. **Context**: Why is this important?
5. **Examples**: Provide usage examples if possible

## 📞 Getting Help

- **Questions**: Open a [GitHub Discussion](https://github.com/personamanagementlayer/pcl/discussions)
- **Issues**: Use [GitHub Issues](https://github.com/personamanagementlayer/pcl/issues)
- **Documentation**: Check [docs/](docs/) folder
- **Examples**: Review [examples/](examples/) folder

## 🌟 Recognition

Contributors are recognized in:

- `CHANGELOG.md` for their contributions
- GitHub insights and contribution graphs
- Project documentation (where appropriate)

## 📚 Additional Resources

- **Development Guide**: [CLAUDE.md](CLAUDE.md)
- **Project Structure**: [docs/PROJECT-STRUCTURE.md](docs/PROJECT-STRUCTURE.md)
- **Skills Guide**: [docs/SKILLS_INTEGRATION_GUIDE.md](docs/SKILLS_INTEGRATION_GUIDE.md)
- **VS Code Setup**: [docs/VSCODE_SETUP.md](docs/VSCODE_SETUP.md)

---

**Thank you for making PCL better! 🚀**

We appreciate your contributions and look forward to reviewing your pull requests.
