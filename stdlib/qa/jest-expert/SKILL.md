---
name: jest-expert
version: 1.1.0
description: >-
  Expert in Jest unit testing framework, mocks, snapshots, coverage reports, watch mode,
  and custom matchers. Use when the user mentions testing, unit testing, JavaScript, QA,
  mocking, or snapshots, or when the task involves Jest Framework, Test Structure, Advanced
  Features, or Basic Unit Tests.
category: qa
tags:
  [
    testing,
    unit-testing,
    jest,
    javascript,
    qa,
    mocking,
    snapshots,
    test-coverage,
    jest-matchers,
    javascript-testing,
  ]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
metadata:
  author: PCL Standard Library
  complexity: expert
---

# Jest Expert

## Core Concepts

### Jest Framework

- **Zero Config** - Works out of the box
- **Snapshot Testing** - UI component testing
- **Mocking** - Functions, modules, and timers
- **Code Coverage** - Built-in coverage reports
- **Watch Mode** - Interactive test runner
- **Parallel Testing** - Fast test execution

### Test Structure

- **describe/it** - Test organization
- **Matchers** - Assertion library
- **Setup/Teardown** - beforeEach, afterEach, beforeAll, afterAll
- **Mock Functions** - jest.fn(), jest.spyOn()
- **Async Testing** - Promises, async/await
- **Test Lifecycle** - Hooks and execution order

### Advanced Features

- **Custom Matchers** - Extend expect
- **Module Mocking** - Mock entire modules
- **Timer Mocks** - Control time in tests
- **Manual Mocks** - **mocks** directory
- **Configuration** - jest.config.js
- **Transformers** - Babel, TypeScript support

## Best Practices

### Test Organization

- One test file per source file
- Group related tests with describe
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests simple and focused
- Test behavior, not implementation

### Mocking

- Mock external dependencies
- Use jest.fn() for function mocks
- Clear mocks between tests
- Mock at the right level
- Avoid over-mocking
- Document mock behavior

### Assertions

- Use specific matchers
- One assertion per test when possible
- Test edge cases
- Verify error conditions
- Use snapshots judiciously
- Provide clear failure messages

### Coverage

- Aim for high coverage (80%+)
- Don't chase 100% coverage
- Focus on critical paths
- Test edge cases and errors
- Exclude generated code
- Review coverage reports

## Anti-Patterns

### Common Mistakes

- Testing implementation details
- Too many assertions in one test
- Sharing state between tests
- Not cleaning up after tests
- Ignoring async/await
- Hard-coding test data

### Mocking Issues

- Over-mocking everything
- Not resetting mocks
- Mocking too deep
- Inconsistent mock data
- Forgetting to restore mocks
- Mocking what you don't need

### Test Design Problems

- Tests depending on execution order
- Flaky tests due to timing
- No arrange-act-assert structure
- Testing multiple things at once
- Duplicate test code
- Poor test names

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Implementation Examples](references/EXAMPLES.md) — Basic Unit Tests, Testing Async Code, Mocking and Spies, Snapshot Testing, Testing React Components with React Testing Library, Timer Mocks, Custom Matchers, Configuration (jest.config.js)

## Resources

### Official Documentation

- [Jest Documentation](https://jestjs.io/docs/getting-started) - Complete guide
- [API Reference](https://jestjs.io/docs/api) - API docs
- [Expect Matchers](https://jestjs.io/docs/expect) - Assertion reference
- [Mock Functions](https://jestjs.io/docs/mock-functions) - Mocking guide

### Learning Resources

- [Testing JavaScript](https://testingjavascript.com/) - Kent C. Dodds course
- [Jest Crash Course](https://www.youtube.com/watch?v=7r4xVDI2vho) - Video tutorial
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) - React testing
- [Jest Cheat Sheet](https://github.com/sapegin/jest-cheat-sheet) - Quick reference

### Tools & Extensions

- [VS Code Jest Extension](https://marketplace.visualstudio.com/items?itemName=Orta.vscode-jest) - IDE integration
- [jest-watch-typeahead](https://github.com/jest-community/jest-watch-typeahead) - Better watch mode
- [jest-extended](https://github.com/jest-community/jest-extended) - Additional matchers
- [snapshot-diff](https://github.com/jest-community/snapshot-diff) - Snapshot comparison

### Community Resources

- [GitHub Jest](https://github.com/facebook/jest) - Source code and issues
- [Stack Overflow](https://stackoverflow.com/questions/tagged/jestjs) - Community help
- [Discord Jest](https://discord.gg/j6FKKQQrW9) - Community chat
- [Jest Blog](https://jestjs.io/blog) - Updates and articles
