---
name: playwright-expert
version: 1.1.0
description: >-
  Expert in Playwright E2E testing framework, auto-waiting mechanisms, test generation,
  trace viewer, and CI/CD integration. Use when the user mentions testing, end-to-end
  tests, QA, automation, end-to-end testing, or test automation, or when the task involves
  Playwright Framework, Test Organization, Advanced Features, or Basic Test Structure.
category: qa
tags:
  [
    testing,
    e2e,
    playwright,
    qa,
    automation,
    e2e-testing,
    test-automation,
    browser-testing,
    trace-viewer,
    playwright-codegen,
    cross-browser,
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

# Playwright Expert

## Core Concepts

### Playwright Framework

- **Cross-Browser** - Chromium, Firefox, WebKit support
- **Auto-Waiting** - Smart waits for elements and network
- **Browser Contexts** - Isolated browser sessions
- **Page Objects** - Organize test code
- **Fixtures** - Reusable test setup
- **Trace Viewer** - Visual debugging

### Test Organization

- **Test Suites** - Grouping related tests
- **Hooks** - beforeEach, afterEach, beforeAll, afterAll
- **Annotations** - @skip, @only, @slow, @fail
- **Tags** - Filter and organize tests
- **Parallelization** - Concurrent test execution
- **Retries** - Automatic retry on failure

### Advanced Features

- **Network Interception** - Mock API responses
- **Video Recording** - Capture test execution
- **Screenshots** - Visual verification
- **Code Generation** - Record and generate tests
- **Accessibility Testing** - Built-in a11y checks
- **Mobile Emulation** - Test responsive designs

## Best Practices

### Test Organization

- Use descriptive test names
- Group related tests in describe blocks
- Use page object model for maintainability
- Create reusable fixtures
- Keep tests independent
- Avoid test interdependencies

### Selectors

- Prefer user-facing attributes (text, role, label)
- Use data-testid for complex elements
- Avoid CSS selectors tied to styling
- Use getByRole for accessibility
- Chain locators for specificity
- Use nth() judiciously

### Assertions

- Use specific expect matchers
- Wait for conditions before asserting
- Use soft assertions for multiple checks
- Provide meaningful error messages
- Test both positive and negative cases
- Verify visual changes with screenshots

### Performance

- Run tests in parallel
- Use browser context for isolation
- Reuse authentication state
- Mock external dependencies
- Minimize navigation between pages
- Use API calls for setup/teardown

## Anti-Patterns

### Common Mistakes

- Using arbitrary waits (page.waitForTimeout)
- Not handling network conditions
- Coupling tests to implementation details
- Missing cleanup in afterEach
- Too many assertions in one test
- Hard-coded test data

### Selector Issues

- Using XPath excessively
- Relying on CSS class names
- Not using accessible selectors
- Fragile selectors that break easily
- Over-specific selectors
- Missing data-testid attributes

### Test Design Problems

- Tests depending on execution order
- Shared state between tests
- Testing too much in one test
- Not testing edge cases
- Missing error scenarios
- No retry strategy

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Implementation Examples](references/EXAMPLES.md) — Basic Test Structure, Page Object Model, Custom Fixtures, API Testing and Mocking, Visual Testing and Debugging, Configuration (playwright.config.ts)

## Resources

### Official Documentation

- [Playwright Documentation](https://playwright.dev/) - Complete guide
- [API Reference](https://playwright.dev/docs/api/class-playwright) - API docs
- [Best Practices](https://playwright.dev/docs/best-practices) - Guidelines
- [Trace Viewer](https://playwright.dev/docs/trace-viewer) - Debugging tool

### Learning Resources

- [Playwright YouTube Channel](https://www.youtube.com/@Playwrightdev) - Video tutorials
- [Playwright Examples](https://playwright.dev/docs/examples) - Code samples
- [Playwright Discord](https://discord.com/invite/playwright-807756831384403968) - Community chat
- [Awesome Playwright](https://github.com/mxschmitt/awesome-playwright) - Curated resources

### Tools & Extensions

- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright) - IDE integration
- [Test Generator](https://playwright.dev/docs/codegen) - Record tests
- [Playwright Inspector](https://playwright.dev/docs/inspector) - Debug tool
- [Trace Viewer](https://trace.playwright.dev/) - Visual debugger

### Community Resources

- [GitHub Discussions](https://github.com/microsoft/playwright/discussions) - Q&A
- [Stack Overflow](https://stackoverflow.com/questions/tagged/playwright) - Community help
- [Playwright Blog](https://playwright.dev/blog) - Updates and articles
- [Twitter @playwrightweb](https://twitter.com/playwrightweb) - News and tips
