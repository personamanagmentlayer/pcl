# Root Folder Policy

**IMPORTANT**: This policy must be followed to maintain a clean and organized repository structure.

## ✅ ALLOWED Files in Root Directory

### Core Project Files

- `README.md` - Project overview and quick start
- `LICENSE` - Apache 2.0 license
- `LICENSE-DOCS` - Documentation license
- `NOTICE` - Legal notices
- `SECURITY.md` - Security policy and vulnerability reporting
- `CONTRIBUTING.md` - Contribution guidelines
- `CHANGELOG.md` - Version history and release notes
- `CODE_OF_CONDUCT.md` - Community code of conduct (if exists)

### Configuration Files

- `package.json` - NPM package configuration
- `package-lock.json` - NPM lockfile
- `tsconfig.json` - TypeScript compiler configuration
- `tsconfig.test.json` - Test TypeScript configuration
- `vitest.config.ts` - Test framework configuration
- `.gitignore` - Git ignore rules
- `.editorconfig` - Editor configuration
- `.eslintrc.json` - ESLint configuration
- `.prettierrc` - Prettier configuration
- `.gitleaks.toml` - Secret scanning configuration

### Special Files

- `.npmignore` - NPM publish ignore rules (if exists)
- `.nvmrc` - Node version specification (if exists)

## ❌ NOT ALLOWED in Root Directory

The following file types MUST be placed in their designated directories:

### Documentation Files

**❌ DON'T**: Place in root
**✅ DO**: Place in `docs/` or appropriate subdirectory

Examples:

- Implementation reports → `docs/implementation/`
- Security documentation → `docs/security/`
- API documentation → `docs/api/`
- Guides → `docs/guides/`
- Examples → `docs/examples/`

### Source Code

**❌ DON'T**: Place in root
**✅ DO**: Place in `src/`

### Scripts

**❌ DON'T**: Place in root
**✅ DO**: Place in `scripts/`

### Tests

**❌ DON'T**: Place in root
**✅ DO**: Place in `tests/`

### Build Output

**❌ DON'T**: Commit to repository
**✅ DO**: Add to `.gitignore`, generated in `dist/`

### Temporary/Generated Files

**❌ DON'T**: Commit any of these
**✅ DO**: Add to `.gitignore`

Examples:

- `nul` - Windows null device file
- `*.log` - Log files
- `*.tmp` - Temporary files
- `.DS_Store` - macOS metadata
- `Thumbs.db` - Windows metadata

## 📁 Proper Directory Structure

```
pcl-lite/
├── .github/                    # GitHub configuration
│   ├── workflows/             # CI/CD workflows
│   ├── ISSUE_TEMPLATE/        # Issue templates
│   └── ROOT_FOLDER_POLICY.md  # This file
├── .husky/                    # Git hooks
├── docs/                      # All documentation
│   ├── api/                  # API documentation
│   ├── guides/               # User guides
│   ├── reference/            # Reference docs
│   ├── security/             # Security docs
│   ├── implementation/       # Implementation reports
│   ├── examples/             # Code examples
│   └── README.md             # Documentation index
├── examples/                  # Example code/personas
│   └── personas/             # Persona examples
├── scripts/                   # Utility scripts
│   ├── generate-skill-catalog.py
│   └── validate-skills.py
├── src/                       # Source code
│   ├── ast/                  # Abstract syntax tree
│   ├── parser/               # Parser implementation
│   ├── semantic/             # Semantic analyzer
│   ├── codegen/              # Code generators
│   ├── cli/                  # CLI commands
│   ├── lsp/                  # Language server
│   ├── runtime/              # Runtime providers
│   ├── registry/             # Skill registry
│   └── index.ts              # Main entry point
├── stdlib/                    # Standard library (skills)
│   ├── catalog/              # Generated catalogs
│   └── [categories]/         # Skill categories
├── tests/                     # Test files
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── *.test.ts             # Test files
├── dist/                      # Build output (gitignored)
├── node_modules/              # Dependencies (gitignored)
├── README.md                  # Project README
├── package.json               # NPM configuration
├── tsconfig.json              # TypeScript config
└── [other config files]       # See allowed list above
```

## 🔍 Enforcement

### Pre-commit Hook

A Git hook should be configured to prevent commits of files in wrong locations:

```bash
# .husky/pre-commit
#!/bin/sh

# Check for documentation files in root
if git diff --cached --name-only | grep -E "^[A-Z_]+\.md$" | grep -v -E "^(README|CHANGELOG|SECURITY|CONTRIBUTING|LICENSE|NOTICE|CODE_OF_CONDUCT)\.md$"; then
  echo "❌ Error: Documentation files must be in docs/ directory"
  echo "Found: $(git diff --cached --name-only | grep -E "^[A-Z_]+\.md$" | grep -v -E "^(README|CHANGELOG|SECURITY|CONTRIBUTING|LICENSE|NOTICE|CODE_OF_CONDUCT)\.md$")"
  exit 1
fi

# Check for nul or temporary files
if git diff --cached --name-only | grep -E "^(nul|.*\.tmp|.*\.log)$"; then
  echo "❌ Error: Temporary files should not be committed"
  exit 1
fi
```

### CI/CD Check

GitHub Actions should validate directory structure:

```yaml
# .github/workflows/structure-check.yml
name: Directory Structure Check

on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check root folder
        run: |
          # Count non-config files in root
          COUNT=$(ls -1 | grep -E "\.md$" | grep -v -E "^(README|CHANGELOG|SECURITY|CONTRIBUTING|LICENSE|NOTICE|CODE_OF_CONDUCT)\.md$" | wc -l)
          if [ $COUNT -gt 0 ]; then
            echo "❌ Found unauthorized .md files in root:"
            ls -1 | grep -E "\.md$" | grep -v -E "^(README|CHANGELOG|SECURITY|CONTRIBUTING|LICENSE|NOTICE|CODE_OF_CONDUCT)\.md$"
            exit 1
          fi
```

## 📝 Examples

### ✅ CORRECT

```bash
# Creating security documentation
docs/security/SECURITY_AUDIT_REPORT.md

# Creating implementation report
docs/implementation/IMPLEMENTATION_COMPLETE.md

# Creating user guide
docs/guides/GETTING_STARTED.md

# Creating example
examples/personas/fullstack-developer.pcl

# Creating script
scripts/validate-skills.py
```

### ❌ INCORRECT

```bash
# DON'T create in root
./SECURITY_AUDIT_REPORT.md           # Should be: docs/security/
./IMPLEMENTATION_COMPLETE.md         # Should be: docs/implementation/
./GETTING_STARTED.md                 # Should be: docs/guides/
./fullstack-developer.pcl            # Should be: examples/personas/
./validate-skills.py                 # Should be: scripts/
./nul                                # Should not exist
./debug.log                          # Should be gitignored
```

## 🛠️ Migration

If files are found in the wrong location:

```bash
# 1. Move documentation files
mkdir -p docs/security docs/implementation
mv *_REPORT.md docs/security/
mv *_COMPLETE.md docs/implementation/

# 2. Remove temporary files
rm -f nul *.log *.tmp

# 3. Verify structure
ls -la | grep -E "\.md$"

# 4. Commit changes
git add .
git commit -m "chore: organize files according to ROOT_FOLDER_POLICY"
```

## 📚 Related Documentation

- [Project Structure](../docs/PROJECT-STRUCTURE.md) - Overall structure
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute
- [Documentation Index](../docs/README.md) - Documentation overview

## ✅ Checklist

Before committing, ensure:

- [ ] No documentation files in root (except README, CHANGELOG, etc.)
- [ ] No source code files in root
- [ ] No temporary files (nul, _.log, _.tmp)
- [ ] All new docs in appropriate `docs/` subdirectory
- [ ] All scripts in `scripts/`
- [ ] All tests in `tests/`
- [ ] All examples in `examples/`

## 🚨 Violations

If you find files violating this policy:

1. **Don't commit them** - Move to proper location first
2. **Update .gitignore** - If it's a generated file
3. **Report to maintainers** - If unsure where it belongs

## 📖 Version History

- **2026-01-20**: Initial policy creation
- Root folder cleaned up (moved 5 documentation files)

---

**Status**: ✅ Active Policy
**Enforcement**: Pre-commit hook + CI/CD
**Last Review**: 2026-01-20
