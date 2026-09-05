---
name: selenium-expert
version: 1.1.0
description: >-
  Expert in Selenium WebDriver, Selenium Grid, page object model, waits, cross-browser
  testing, and test automation frameworks. Use when the user mentions testing, end-to-end
  tests, QA, automation, WebDriver, or Selenium grid, or when the task involves Selenium
  Components, Browser Support, Advanced Features, or Basic WebDriver Setup.
category: qa
tags:
  [
    testing,
    e2e,
    selenium,
    qa,
    automation,
    webdriver,
    selenium-grid,
    page-object-model,
    cross-browser-testing,
    test-automation,
    selenium-python,
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

# Selenium Expert

## Core Concepts

### Selenium Components

- **WebDriver** - Browser automation API
- **Selenium Grid** - Distributed test execution
- **IDE** - Record and playback tool
- **Locator Strategies** - Find elements (ID, CSS, XPath)
- **Wait Mechanisms** - Explicit, implicit, fluent waits
- **Actions API** - Complex user interactions

### Browser Support

- **Chrome/Chromium** - ChromeDriver
- **Firefox** - GeckoDriver
- **Safari** - SafariDriver
- **Edge** - EdgeDriver
- **IE** - IEDriver (legacy)
- **Remote** - Selenium Grid execution

### Advanced Features

- **Page Object Model** - Design pattern
- **Test Frameworks** - TestNG, JUnit, pytest
- **Parallel Execution** - Grid and ThreadLocal
- **Screenshots** - Visual verification
- **JavaScript Execution** - Execute custom scripts
- **Mobile Testing** - Appium integration

## Best Practices

### Locator Strategy

- Prefer ID over other locators
- Use CSS selectors over XPath
- Add data-testid attributes
- Avoid fragile locators
- Use relative locators (Selenium 4+)
- Document locator choices

### Wait Strategy

- Use explicit waits over implicit
- Set appropriate timeouts
- Wait for specific conditions
- Avoid Thread.sleep()
- Handle stale elements
- Use fluent waits for complex conditions

### Test Design

- Implement Page Object Model
- Keep tests independent
- Use proper test data management
- Implement proper cleanup
- Handle flaky tests
- Log and screenshot failures

### Performance

- Reuse browser sessions when possible
- Use parallel execution
- Optimize wait times
- Close unused windows/tabs
- Clear cache between tests
- Monitor Grid performance

## Anti-Patterns

### Common Mistakes

- Using sleep instead of waits
- Hard-coded wait times
- Not handling stale elements
- Missing implicit wait configuration
- Too many XPath locators
- No error handling

### Locator Issues

- Brittle XPath expressions
- Using absolute XPath
- Relying on index positions
- No fallback locators
- Missing data-testid attributes
- Coupling to UI changes

### Test Design Problems

- Tests depending on order
- Shared state between tests
- No Page Object Model
- Testing too much at once
- Missing cleanup
- Poor error messages

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Implementation Examples](references/EXAMPLES.md) — Basic WebDriver Setup (Python), Page Object Model (Python), Java WebDriver Example, Selenium Grid Configuration, Advanced Waits and Actions

## Resources

### Official Documentation

- [Selenium Documentation](https://www.selenium.dev/documentation/) - Complete guide
- [WebDriver API](https://www.selenium.dev/selenium/docs/api/py/) - Python API docs
- [Selenium Grid](https://www.selenium.dev/documentation/grid/) - Grid guide
- [Best Practices](https://www.selenium.dev/documentation/test_practices/) - Guidelines

### Learning Resources

- [Selenium YouTube](https://www.youtube.com/@SeleniumConference) - Conference talks
- [Test Automation University](https://testautomationu.applitools.com/) - Free courses
- [Selenium Blog](https://www.selenium.dev/blog/) - Updates and articles
- [Awesome Selenium](https://github.com/christian-bromann/awesome-selenium) - Resources

### Tools & Extensions

- [Selenium IDE](https://www.selenium.dev/selenium-ide/) - Record and playback
- [WebDriver Manager](https://github.com/bonigarcia/webdrivermanager) - Driver management
- [Selenoid](https://aerokube.com/selenoid/) - Alternative to Grid
- [Zalenium](https://github.com/zalando/zalenium) - Selenium Grid alternative

### Community Resources

- [Selenium Forum](https://groups.google.com/g/selenium-users) - Google Group
- [Stack Overflow](https://stackoverflow.com/questions/tagged/selenium) - Q&A
- [GitHub Selenium](https://github.com/SeleniumHQ/selenium) - Source code
- [Slack Selenium](https://selenium.dev/support/) - Community chat
