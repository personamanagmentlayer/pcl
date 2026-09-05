---
name: cypress-expert
version: 1.1.0
description: >-
  Expert in Cypress testing framework, custom commands, fixtures, plugins, visual testing,
  and component testing. Use when the user mentions testing, end-to-end tests, QA,
  automation, end-to-end testing, or Cypress commands, or when the task involves Cypress
  Framework, Test Structure, Advanced Features, or Custom Commands.
category: qa
tags:
  [
    testing,
    e2e,
    cypress,
    qa,
    automation,
    e2e-testing,
    cypress-commands,
    fixtures,
    cypress-plugins,
    visual-testing,
    component-testing,
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

# Cypress Expert

## Core Concepts

### Cypress Framework

- **JavaScript-Based** - Native JavaScript testing
- **Real-Time Reloads** - Auto-reloading on file changes
- **Time Travel** - Debug via snapshots
- **Automatic Waiting** - No explicit waits needed
- **Network Control** - Request stubbing and spying
- **Screenshots & Videos** - Built-in capture

### Test Structure

- **describe/it** - Mocha-style test organization
- **Hooks** - before, beforeEach, after, afterEach
- **Custom Commands** - Reusable test logic
- **Fixtures** - Test data management
- **Aliases** - Reference DOM elements and requests
- **Chains** - Fluent command interface

### Advanced Features

- **Intercepts** - Network request control
- **Component Testing** - React, Vue, Angular components
- **Visual Testing** - Applitools integration
- **Code Coverage** - Test coverage reports
- **Parallelization** - Cypress Cloud parallel execution
- **Plugins** - Extend functionality

## Best Practices

### Test Organization

- Keep tests independent and isolated
- Use descriptive test names
- Group related tests with describe blocks
- Use beforeEach for common setup
- Clean up after tests
- Avoid test interdependencies

### Selectors

- Prefer data-\* attributes for testing
- Use cy.contains() for text-based selection
- Avoid CSS classes and IDs tied to styling
- Use role-based selectors when possible
- Create stable selectors
- Document selector strategies

### Assertions

- Use should() for auto-retry assertions
- Chain assertions when appropriate
- Test both positive and negative cases
- Provide meaningful assertion messages
- Use explicit assertions
- Verify multiple aspects

### Performance

- Use cy.session() for authentication
- Leverage fixtures for test data
- Mock external API calls
- Minimize page visits
- Use aliases to avoid repeated queries
- Run tests in parallel with Cypress Cloud

## Anti-Patterns

### Common Mistakes

- Using cy.wait() with arbitrary time
- Not using data-testid attributes
- Overly complex test logic
- Sharing state between tests
- Testing implementation details
- Missing cleanup in afterEach

### Selector Issues

- Using fragile CSS selectors
- Relying on element position
- Not using data attributes
- Over-specific selectors
- Using XPath unnecessarily
- Coupling tests to UI structure

### Test Design Problems

- Tests depending on execution order
- Too many assertions in one test
- Not testing edge cases
- Missing error scenarios
- Duplicate test logic
- Poor fixture management

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Implementation Examples](references/EXAMPLES.md) — Basic Test Structure, Custom Commands, Network Interception, Fixtures and Test Data, Page Object Pattern, Component Testing, Configuration (cypress.config.js)

## Resources

### Official Documentation

- [Cypress Documentation](https://docs.cypress.io/) - Complete guide
- [API Reference](https://docs.cypress.io/api/table-of-contents) - API docs
- [Best Practices](https://docs.cypress.io/guides/references/best-practices) - Guidelines
- [Real World App](https://github.com/cypress-io/cypress-realworld-app) - Example app

### Learning Resources

- [Cypress YouTube](https://www.youtube.com/channel/UC-EOsTo2l2x39e4JmSaWNRQ) - Video tutorials
- [Cypress Examples](https://example.cypress.io/) - Live examples
- [Cypress Discord](https://discord.com/invite/cypress) - Community chat
- [Cypress Blog](https://www.cypress.io/blog/) - Articles and updates

### Tools & Extensions

- [Cypress Studio](https://docs.cypress.io/guides/references/cypress-studio) - Test generator
- [Cypress Dashboard](https://www.cypress.io/dashboard) - Test analytics
- [Testing Library](https://testing-library.com/docs/cypress-testing-library/intro/) - Better selectors
- [Cypress Plugins](https://docs.cypress.io/plugins) - Plugin directory

### Community Resources

- [GitHub Discussions](https://github.com/cypress-io/cypress/discussions) - Q&A
- [Stack Overflow](https://stackoverflow.com/questions/tagged/cypress) - Community help
- [Awesome Cypress](https://github.com/chrisbreiding/awesome-cypress) - Curated resources
- [Gitter Chat](https://gitter.im/cypress-io/cypress) - Real-time chat
