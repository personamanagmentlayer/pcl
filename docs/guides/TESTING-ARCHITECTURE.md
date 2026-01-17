# Testing Architecture: scripts/ vs tests/

**Understanding the separation of concerns in PCL's testing infrastructure**

---

## Quick Answer

| Folder         | Purpose                  | Contains                                        |
| -------------- | ------------------------ | ----------------------------------------------- |
| **`tests/`**   | Unit & integration tests | `.test.ts` files for automated testing          |
| **`scripts/`** | Development tools        | Runners, debug utils, manual test orchestration |

---

## Detailed Breakdown

### 📦 `tests/` - The Test Suite

**Purpose:** Automated test cases that verify code correctness

**What's inside:**

- **Unit tests** (`*.test.ts`) - Test individual components
  - `pcl.test.ts` - Lexer and parser tests
  - `semantic.test.ts` - Type checking tests
  - `runtime.test.ts` - Execution engine tests

- **Integration tests** - Test component interactions
  - `integration.test.ts` - End-to-end workflows
  - `phase2-module-visibility.test.ts` - Module system tests

- **Example test files** (`*.test.mjs`) - Quick validation scripts
  - `simple-persona-test.mjs` - Basic persona tests
  - `persona-skills-test.mjs` - Skills system tests

**Characteristics:**

- ✅ Run by test framework (Vitest)
- ✅ Include assertions (`expect()`)
- ✅ Generate coverage reports
- ✅ Run in CI/CD pipeline
- ✅ Part of quality gates

**Example:**

```typescript
// tests/pcl.test.ts
import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser';

describe('Parser', () => {
  it('should parse persona declaration', () => {
    const result = parse('persona TEST { }');
    expect(result.ok).toBe(true);
    expect(result.value.program.statements).toHaveLength(1);
  });
});
```

**Run with:**

```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report
```

---

### 🔧 `scripts/` - Development Tools

**Purpose:** Tools and utilities that help developers work with the codebase

**What's inside:**

- **Test runners** - Orchestrate multiple test suites
  - `run-all-tests.mjs` - Run all standalone tests
  - `test-full-features.mjs` - Comprehensive feature testing
  - `test-parser-capabilities.mjs` - Parser capability checks

- **Debug utilities** - Help troubleshoot issues
  - `debug.js` - Debug helpers
  - `debug-duplicate.js` - Detect duplicates

**Characteristics:**

- ✅ Standalone executables
- ✅ Development workflow tools
- ✅ Not run by test framework
- ✅ Manual or npm script execution
- ❌ Not in CI/CD (usually)
- ❌ Don't generate coverage

**Example:**

```javascript
// scripts/run-all-tests.mjs
#!/usr/bin/env node
import { spawn } from 'child_process';

const tests = [
  { name: 'Parser', file: 'tests/test-simple.mjs' },
  { name: 'Runtime', file: 'tests/runtime-test.mjs' }
];

for (const test of tests) {
  console.log(`Running ${test.name}...`);
  await runTest(test.file);
}
```

**Run with:**

```bash
npm run test:standalone     # Run script-based tests
node scripts/run-all-tests.mjs   # Direct execution
```

---

## Architectural Decision

### Why Separate Them?

**1. Different Execution Contexts**

```
tests/     → Vitest framework → Coverage → CI/CD
scripts/   → Node.js directly → Manual → Development
```

**2. Different Purposes**

```
tests/     → Verify correctness (What works?)
scripts/   → Facilitate development (How to work?)
```

**3. Different Lifecycles**

```
tests/     → Run automatically (every commit/PR)
scripts/   → Run on-demand (when needed)
```

**4. Different Outputs**

```
tests/     → Pass/Fail + Coverage report
scripts/   → Console logs + Debug info
```

---

## Decision Tree: Where Should My File Go?

```
Is it testing code correctness?
├─ YES → tests/
│   ├─ Does it use test framework?
│   │   ├─ YES → *.test.ts (Unit/Integration)
│   │   └─ NO → *.test.mjs (Example/Manual)
│   └─ Does it need to run in CI?
│       ├─ YES → tests/ (with proper assertions)
│       └─ NO → Consider scripts/ instead
│
└─ NO → Is it a development tool?
    ├─ YES → scripts/
    │   ├─ Test orchestration → run-*.mjs
    │   ├─ Debug helpers → debug-*.js
    │   └─ Build/Deploy → *.sh, *.mjs
    │
    └─ NEITHER → Wrong folder!
        └─ Consider: src/, examples/, or docs/
```

---

## Examples by Category

### ✅ Belongs in `tests/`

**Unit Tests:**

```typescript
// tests/lexer.test.ts
describe('Lexer', () => {
  it('tokenizes keywords', () => {
    const tokens = tokenize('persona team workflow');
    expect(tokens).toHaveLength(3);
  });
});
```

**Integration Tests:**

```typescript
// tests/e2e.test.ts
describe('End-to-End', () => {
  it('compiles and executes persona', async () => {
    const code = 'persona TEST { intent: "test" }';
    const result = await compile(code);
    expect(result.ok).toBe(true);
  });
});
```

### ✅ Belongs in `scripts/`

**Test Runner:**

```javascript
// scripts/run-all-tests.mjs
#!/usr/bin/env node
console.log('Running all test suites...');
await runTests('tests/*.test.mjs');
console.log('✓ All tests passed');
```

**Debug Utility:**

```javascript
// scripts/debug-ast.js
// Pretty-print AST for debugging
import { parse } from '../src/parser.js';
const ast = parse(process.argv[2]);
console.log(JSON.stringify(ast, null, 2));
```

**Build Script:**

```javascript
// scripts/build-examples.mjs
// Compile all example files
import { compileFile } from '../dist/index.js';
for (const file of exampleFiles) {
  await compileFile(file);
}
```

---

## Common Patterns

### Pattern 1: Test Suite + Runner

```
tests/
├── parser.test.ts        ← Vitest unit tests
├── runtime.test.ts       ← Vitest unit tests
└── simple-test.mjs       ← Standalone validation

scripts/
└── run-all-tests.mjs     ← Orchestrates standalone tests
```

**Why?**

- Unit tests verify correctness (CI/CD)
- Runner provides quick manual validation (development)

### Pattern 2: Debug Workflows

```
tests/
└── integration.test.ts   ← Automated integration tests

scripts/
├── debug.js              ← Debug helpers
└── debug-duplicate.js    ← Specific debug tool
```

**Why?**

- Tests verify behavior
- Scripts help investigate issues

### Pattern 3: Multiple Test Types

```
tests/
├── *.test.ts             ← Framework-based (Vitest)
└── *.test.mjs            ← Standalone quick checks

scripts/
├── test-full-features.mjs     ← Comprehensive suite
└── test-parser-capabilities.mjs ← Specific capability check
```

**Why?**

- Different granularities for different needs
- Scripts provide flexibility outside framework constraints

---

## Best Practices

### ✅ DO

**In tests/:**

- Use test framework features (describe, it, expect)
- Write focused, isolated tests
- Aim for high coverage
- Include edge cases

**In scripts/:**

- Make scripts executable (`chmod +x`)
- Add shebang (`#!/usr/bin/env node`)
- Document usage in README
- Keep scripts simple and maintainable

### ❌ DON'T

**In tests/:**

- ❌ Put orchestration logic
- ❌ Make scripts that just run other tests
- ❌ Include debug-only code

**In scripts/:**

- ❌ Write test assertions
- ❌ Duplicate test logic
- ❌ Put core application logic

---

## Migration Guide

**Moving from tests/ to scripts/:**

```bash
# If your file:
# - Doesn't use test framework
# - Runs other tests
# - Is a development tool

git mv tests/run-all.mjs scripts/run-all-tests.mjs
```

**Moving from scripts/ to tests/:**

```bash
# If your file:
# - Tests correctness
# - Should run in CI/CD
# - Needs coverage tracking

git mv scripts/parser-test.mjs tests/parser.test.ts
# Then: Convert to Vitest format
```

---

## Summary

| Aspect          | `tests/`           | `scripts/`             |
| --------------- | ------------------ | ---------------------- |
| **Purpose**     | Verify correctness | Facilitate development |
| **Framework**   | Vitest             | Standalone Node.js     |
| **Execution**   | `npm test`         | `npm run script:name`  |
| **CI/CD**       | ✅ Yes             | ❌ Usually not         |
| **Coverage**    | ✅ Yes             | ❌ No                  |
| **Assertions**  | ✅ Yes             | ❌ Optional            |
| **When to use** | Automated testing  | Manual workflows       |

**Golden Rule:**

- If it **verifies behavior** → `tests/`
- If it **helps you work** → `scripts/`

---

## See Also

- [Getting Started Guide](./GETTING-STARTED.md)
- [Contributing Guidelines](../../CONTRIBUTING.md)
- [scripts/README.md](../../scripts/README.md) - Script documentation

---

**Last Updated:** 2026-01-17
**Maintained by:** PCL Core Team
