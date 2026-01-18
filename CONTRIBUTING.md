# Contributing to PCL (Persona Control Language)

Thank you for your interest in contributing to the Persona Control Language!

## 📋 Quick Links

- **Full Contributing Guide**: [GOVERNANCE/CONTRIBUTING_COMPLIANCE.md](GOVERNANCE/CONTRIBUTING_COMPLIANCE.md)
- **Governance Framework**: [GOVERNANCE/PCL_GOVERNANCE.md](GOVERNANCE/PCL_GOVERNANCE.md)
- **Code of Conduct**: [docs/community/CODE_OF_CONDUCT.md](docs/community/CODE_OF_CONDUCT.md) _(coming soon)_
- **Security Policy**: [GOVERNANCE/PCL_SECURITY_MODEL.md](GOVERNANCE/PCL_SECURITY_MODEL.md)

## 🚀 Quick Start

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create a branch** from `main`
4. **Make your changes** following our standards
5. **Test** your changes (`npm test`, coverage ≥80%)
6. **Commit** with conventional commit messages
7. **Push** to your fork
8. **Open a Pull Request**

## 📝 Conventional Commits

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add workflow orchestration support
fix: correct OWASP LLM01 mitigation in parser
docs: update ISO 42001 compliance guide
chore: update dependencies
test: add semantic validation tests
security: patch prompt injection vulnerability
```

## 🧪 Running Tests

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run with coverage (must be ≥80%)
npm run test:coverage

# Run linting
npm run lint

# Run type checking
npx tsc --noEmit

# Full quality gate (before PR)
npm run lint && npm test && npm run build
```

## 🔒 Security & Compliance

**All contributions MUST maintain:**

- ✅ ISO 27001 security controls (see [PCL_SECURITY_MODEL.md](GOVERNANCE/PCL_SECURITY_MODEL.md))
- ✅ OWASP LLM Top 10 mitigations
- ✅ Test coverage ≥80%
- ✅ TypeScript strict mode compliance
- ✅ Audit logging for security-relevant operations

See [CONTRIBUTING_COMPLIANCE.md](GOVERNANCE/CONTRIBUTING_COMPLIANCE.md) for detailed requirements.

## 📖 Documentation

- **Specifications**: [SPEC/](SPEC/) - Formal language specifications
- **Core Concepts**: [CORE/](CORE/) - Language fundamentals and invariants
- **Reference Examples**: [REF/](REF/) - Integration patterns and examples
- **Governance**: [GOVERNANCE/](GOVERNANCE/) - Compliance and governance docs
- **User Guides**: [docs/](docs/) - Tutorials and API documentation

## 🎯 Contribution Types

### 🐛 Bug Fixes

- Include test case reproducing the bug
- Reference issue number in commit message
- Update relevant documentation

### ✨ New Features

- Discuss in GitHub Issues first (for significant features)
- Follow RFC process for language changes (see [PCL_GOVERNANCE.md](GOVERNANCE/PCL_GOVERNANCE.md))

- Include comprehensive tests and documentation
- Consider ISO/OWASP compliance implications

### 📚 Documentation

- Documen<security@pcl-lang.org>g>g>4.0 license (see [LICENSE-DOCS](LICENSE-DOCS))
- Update both user-facing docs and code comments

- Include examples where applicable
  <security@pcl-lang.org>

### 🔒 Security

- **DO NOT** open public issues for vulnerabilities
- Email: security@pcl-lang.org
- See [PCL_SECURITY_MODEL.md](GOVERNANCE/PCL_SECURITY_MODEL.md) for reporting process

## 🤝 Community

- **Discussions**: [GitHub Discussions](https://github.com/personamanagmentlayer/pcl/discussions) _(coming soon)_
- **Issues**: [GitHub Issues](https://github.com/personamanagmentlayer/pcl/issues)
- **Roadmap**: [GOVERNANCE/ROADMAP.md](GOVERNANCE/ROADMAP.md)

## ⚖️ Licenses

PCL uses dual licensing:

- **Code** (src/, tests/, scripts/): [Apache 2.0](LICENSE)
- **Documentation** (docs/, SPEC/, GOVERNANCE/): [CC BY 4.0](LICENSE-DOCS)
- **Trademarks**: IbIFACE - See [TRADEMARK_POLICY.md](GOVERNANCE/TRADEMARK_POLICY.md)

By contributing, you agree that your code contributions will be licensed under Apache 2.0 and documentation contributions under CC BY 4.0.

## 📋 Pull Request Checklist

Before submitting your PR, ensure:

- [ ] Code follows TypeScript best practices (see [copilot-instructions.md](.github/copilot-instructions.md))
- [ ] Tests pass (`npm test`)
- [ ] Test coverage ≥80% (`npm run test:coverage`)
- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npx tsc --noEmit`)
- [ ] Security considerations documented

- [ ] OWASP LLM mitigations validated (if applicable)
- [ ] Documentation updated (if needed)
- [ ] CHANGELOG.md updated (for user-facing changes)
- [ ] Conventional commit message format used

## 🎓 Learning Resources

**New to PCL?**

- Start with [d<info@pcl-lang.org>g>g>G-STARTED.md](docs/guides/GETTING-STARTED.md)
- Review [CORE/R<security@pcl-lang.org>g>g>.md) for language principles
- Explore [REF/](R<governance@pcl-lang.org>g>g>amples
  <legal@ibiface.com<legal@ibiface.com>m>
  **Want to contribute to standards?**

- Read [SPEC/PC<info@pcl-lang.org>C/PCL_SPEC_v1.md)
- Understand the<security@pcl-lang.org>GOVERNANCE.md](GOVERNANCE/PCL_GOVERNANCE.md)
- Review [STANDARD<governance@pcl-lang.org>CE/STANDARDS_OVERVIEW.md)
  <legal@ibiface.com>

## 📞 Questions?

- **General**: info@pcl-lang.org
- **Security**: security@pcl-lang.org
- **Governance**: governance@pcl-lang.org
- **Trademarks**: legal@ibiface.com

---

For detailed contribution guidelines including compliance requirements,
code examples, and standards alignment, see:
**[GOVERNANCE/CONTRIBUTING_COMPLIANCE.md](GOVERNANCE/CONTRIBUTING_COMPLIANCE.md)**

---

**Thank you for making PCL better! 🚀**
