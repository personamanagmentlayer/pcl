# PCL Test Coverage Roadmap

**Status:** In Progress - Baseline Established
**Current Coverage:** 28.76% lines, 32.07% functions, 69.81% branches
**Target:** 90% (per [CLAUDE.md](../../.claude/CLAUDE.md) Quality Gates)

---

## Executive Summary

PCL currently has **632 passing tests** with baseline coverage established. This roadmap outlines the path from the current **29% coverage** to the production target of **90% coverage**.

### Current State (2026-01-30)

| Metric         | Current | Target | Gap     |
| -------------- | ------- | ------ | ------- |
| **Lines**      | 28.76%  | 90%    | +61.24% |
| **Functions**  | 32.07%  | 90%    | +57.93% |
| **Branches**   | 69.81%  | 90%    | +20.19% |
| **Statements** | 28.76%  | 90%    | +61.24% |

**Test Files:** 26 passing
**Total Tests:** 632 passing, 33 skipped

---

## Coverage by Module

### ✅ Well-Covered Modules (>80%)

| Module                                  | Coverage | Status       |
| --------------------------------------- | -------- | ------------ |
| `src/lexer`                             | 99.02%   | ✅ Excellent |
| `src/parser`                            | 98.56%   | ✅ Excellent |
| `src/semantic`                          | 93.22%   | ✅ Excellent |
| `src/ast`                               | 100%     | ✅ Perfect   |
| `src/types`                             | 100%     | ✅ Perfect   |
| `src/runtime/providers/mock.ts`         | 100%     | ✅ Perfect   |
| `src/runtime/providers/rate-limiter.ts` | 84.34%   | ✅ Good      |
| `src/skills/skill-compiler.ts`          | 100%     | ✅ Perfect   |
| `src/skills/skill-merger.ts`            | 95.47%   | ✅ Excellent |

### ⚠️ Partially Covered Modules (30-80%)

| Module                  | Coverage | Priority |
| ----------------------- | -------- | -------- |
| `src/codegen`           | 51.91%   | High     |
| `src/formatter`         | 74.76%   | Medium   |
| `src/runtime`           | 42.07%   | High     |
| `src/runtime/providers` | 49.39%   | High     |
| `src/runtime/events`    | 49.22%   | High     |
| `src/skills`            | 40.15%   | High     |
| `src/lsp`               | 59.51%   | Medium   |
| `src/registry`          | 64.13%   | Medium   |

### ❌ Uncovered Modules (0-30%)

| Module                         | Coverage | Priority           |
| ------------------------------ | -------- | ------------------ |
| `src/http`                     | 0%       | Low (deferred)     |
| `src/mcp`                      | 19.64%   | Medium             |
| `src/runtime/memory`           | 0%       | High               |
| `src/runtime/routing`          | 0%       | High               |
| `src/runtime/teams`            | 0%       | High               |
| `src/runtime/experiments`      | 0%       | Low (experimental) |
| `src/skills/skill-context.ts`  | 0%       | High               |
| `src/skills/skill-resolver.ts` | 0%       | High               |
| `src/utils/queue.ts`           | 0%       | Medium             |

---

## Roadmap to 90%

### Phase 1: Foundation (Q1 2026) - Target: 50%

**Goal:** Cover all provider implementations and core runtime features

**Estimated Effort:** 3-4 weeks

**Tasks:**

1. **Provider Tests** (+15% coverage)
   - [ ] Anthropic provider integration tests
   - [ ] OpenAI provider integration tests
   - [ ] Gemini provider integration tests
   - [ ] DeepSeek provider integration tests
   - [ ] Ollama provider integration tests
   - [ ] Azure OpenAI provider tests
   - [ ] AWS Bedrock provider tests
   - [ ] Provider fallback chain tests
   - [ ] Connection pool tests

2. **Runtime Core Tests** (+5% coverage)
   - [ ] Memory manager tests
   - [ ] Routing system tests
   - [ ] Team processing tests
   - [ ] Workflow execution tests

3. **Code Generation Tests** (+2% coverage)
   - [ ] TypeScript generator edge cases
   - [ ] JSON generator validation
   - [ ] Markdown generator formatting
   - [ ] Prompt generator multi-language

**Milestone:** Reach 50% coverage, all critical paths tested

---

### Phase 2: Integration (Q2 2026) - Target: 70%

**Goal:** Comprehensive integration and end-to-end tests

**Estimated Effort:** 4-5 weeks

**Tasks:**

1. **Skills System Tests** (+8% coverage)
   - [ ] Skill context management
   - [ ] Skill resolver with dependencies
   - [ ] Claude Code skill import
   - [ ] agentskills.io integration
   - [ ] Multi-file skill loading

2. **MCP Integration Tests** (+5% coverage)
   - [ ] Server initialization
   - [ ] Tool execution
   - [ ] Resource management
   - [ ] Transport layer (stdio, HTTP/SSE)
   - [ ] Error handling

3. **LSP Advanced Tests** (+3% coverage)
   - [ ] Rename refactoring
   - [ ] Code actions
   - [ ] Semantic tokens
   - [ ] Incremental parsing

4. **Registry Advanced Tests** (+4% coverage)
   - [ ] PostgreSQL backend
   - [ ] Cache invalidation
   - [ ] Version conflict resolution
   - [ ] Search relevance

**Milestone:** Reach 70% coverage, all features tested

---

### Phase 3: Comprehensive (Q3 2026) - Target: 90%

**Goal:** Edge cases, error paths, and stress testing

**Estimated Effort:** 3-4 weeks

**Tasks:**

1. **Edge Case Coverage** (+10% coverage)
   - [ ] Malformed input handling
   - [ ] Resource exhaustion scenarios
   - [ ] Concurrent access patterns
   - [ ] Network failure recovery
   - [ ] Rate limit handling

2. **Error Path Testing** (+5% coverage)
   - [ ] All error branches
   - [ ] Exception handling
   - [ ] Graceful degradation
   - [ ] User-friendly error messages

3. **Performance & Stress Tests** (+5% coverage)
   - [ ] Large file parsing
   - [ ] High-frequency requests
   - [ ] Memory leak detection
   - [ ] Connection pool saturation

**Milestone:** Reach 90% coverage, production-ready

---

## Implementation Strategy

### Test Writing Guidelines

1. **Focus on Value**
   - Test behavior, not implementation
   - Cover critical paths first
   - Prioritize high-risk areas

2. **Test Structure**
   - Use AAA pattern (Arrange, Act, Assert)
   - One assertion per test when possible
   - Clear, descriptive test names

3. **Mock Strategy**
   - Mock external dependencies (LLM APIs)
   - Use real implementations for internal components
   - Provide test fixtures for common scenarios

4. **Coverage Metrics**
   - Run coverage locally: `npm run test:coverage`
   - Review HTML report: `coverage/index.html`
   - Focus on uncovered lines in critical modules

### Continuous Improvement

**Weekly:**

- Run full test suite with coverage
- Review new uncovered code
- Add tests for new features

**Monthly:**

- Coverage review meeting
- Update roadmap progress
- Adjust thresholds in `vitest.config.ts`

**Quarterly:**

- Comprehensive coverage audit
- Refactor flaky tests
- Update testing infrastructure

---

## Coverage Thresholds

Progressive thresholds prevent regression while allowing incremental improvement:

```typescript
// vitest.config.ts - Updated as coverage improves
thresholds: {
  lines: 28,        // Q1 2026: 50, Q2 2026: 70, Q3 2026: 90
  functions: 32,    // Q1 2026: 50, Q2 2026: 70, Q3 2026: 90
  branches: 69,     // Q1 2026: 75, Q2 2026: 80, Q3 2026: 90
  statements: 28,   // Q1 2026: 50, Q2 2026: 70, Q3 2026: 90
}
```

**Update Process:**

1. Achieve target coverage
2. Update thresholds to new baseline
3. Document in CHANGELOG.md
4. Announce in team meeting

---

## Tools & Infrastructure

### Current Setup

✅ **Vitest** - Fast unit test runner with V8 coverage
✅ **@vitest/coverage-v8** - Native V8 coverage (accurate)
✅ **HTML Reports** - Interactive coverage browser
✅ **LCOV Reports** - CI integration
✅ **Codecov Integration** - PR comments and trends
✅ **GitHub Actions** - Automated coverage on every push

### Recommended Additions

🔄 **Coverage Trends** - Track coverage over time
🔄 **Diff Coverage** - Only new code must meet 90%
🔄 **Mutation Testing** - Verify test quality (Stryker)
🔄 **Visual Regression** - Screenshot comparison for UI

---

## Blockers & Risks

### Identified Blockers

1. **HTTP Server Tests Hang in CI** (Resolved)
   - Status: Excluded from CI in vitest.config.ts
   - Solution: Separate integration test suite

2. **Provider API Rate Limits**
   - Impact: Can't test all providers in CI
   - Mitigation: Mock providers for most tests

3. **Long-Running Tests**
   - Impact: Slow feedback loop
   - Mitigation: Parallel execution, test categorization

### Risk Mitigation

| Risk             | Impact | Likelihood | Mitigation                |
| ---------------- | ------ | ---------- | ------------------------- |
| Flaky tests      | High   | Medium     | Retry logic, better mocks |
| CI timeout       | Medium | Low        | Test parallelization      |
| Coverage plateau | Medium | Medium     | Refactor untestable code  |
| Test maintenance | High   | High       | Regular refactoring       |

---

## Success Metrics

### Leading Indicators

- **Tests Added/Week:** Target 20-30 new tests
- **Coverage Growth:** Target +2-3% per week
- **Test Execution Time:** Keep under 2 minutes
- **Flaky Test Rate:** Keep under 1%

### Lagging Indicators

- **Production Bugs Found:** Decreasing trend
- **Bug Severity:** Lower severity over time
- **Customer Confidence:** Survey feedback
- **Release Frequency:** Faster, safer releases

---

## Resources

### Documentation

- [Vitest Documentation](https://vitest.dev/)
- [V8 Coverage](https://v8.dev/blog/javascript-code-coverage)
- [Testing Best Practices](https://testingjavascript.com/)

### Examples

- `tests/pcl.test.ts` - Comprehensive parser tests
- `tests/semantic.test.ts` - Type checking tests
- `tests/integration/phase-1.2.test.ts` - Integration patterns
- `tests/providers/mock.test.ts` - Provider testing

### Commands

```bash
# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test tests/parser.test.ts

# Run tests in watch mode
npm run test:watch

# View HTML coverage report
open coverage/index.html  # macOS
start coverage/index.html # Windows
xdg-open coverage/index.html # Linux
```

---

## Changelog

| Date       | Coverage | Change               | Notes                                        |
| ---------- | -------- | -------------------- | -------------------------------------------- |
| 2026-01-30 | 28.76%   | Baseline established | Fixed 3 failing tests, added coverage config |

---

## Next Actions

**Immediate (This Week):**

1. ✅ Fix 3 failing test suites
2. ✅ Configure coverage reporting
3. ✅ Update CI/CD pipeline
4. ✅ Document coverage roadmap
5. [ ] Add provider tests (Anthropic, OpenAI)

**Short Term (Next 2 Weeks):**

1. [ ] Complete Phase 1 provider tests
2. [ ] Add memory manager tests
3. [ ] Add routing system tests
4. [ ] Reach 35% coverage

**Medium Term (Next Month):**

1. [ ] Complete Phase 1 milestone (50%)
2. [ ] Update thresholds
3. [ ] Begin Phase 2 planning

---

**Last Updated:** 2026-01-30
**Owner:** Development Team
**Status:** ✅ Baseline Established, 🔄 Phase 1 In Progress
