---
description: Expert in Playwright E2E testing framework, auto-waiting mechanisms, test generation, trace viewer, and CI/CD integration
keywords: [playwright, e2e-testing, test-automation, browser-testing, trace-viewer, playwright-codegen, cross-browser]
category: qa
expertise_level: expert
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

## Implementation Examples

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('User Authentication', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('https://example.com/login');
    });

    test('successful login with valid credentials', async ({ page }) => {
        // Fill login form
        await page.fill('input[name="email"]', 'user@example.com');
        await page.fill('input[name="password"]', 'SecurePass123');

        // Submit form
        await page.click('button[type="submit"]');

        // Verify redirect to dashboard
        await expect(page).toHaveURL(/.*dashboard/);

        // Verify user menu is visible
        await expect(page.locator('.user-menu')).toBeVisible();

        // Verify welcome message
        await expect(page.locator('h1')).toContainText('Welcome back');
    });

    test('failed login with invalid credentials', async ({ page }) => {
        await page.fill('input[name="email"]', 'invalid@example.com');
        await page.fill('input[name="password"]', 'WrongPassword');
        await page.click('button[type="submit"]');

        // Verify error message
        await expect(page.locator('.error-message')).toBeVisible();
        await expect(page.locator('.error-message'))
            .toHaveText('Invalid email or password');

        // Verify still on login page
        await expect(page).toHaveURL(/.*login/);
    });

    test('password visibility toggle', async ({ page }) => {
        const passwordInput = page.locator('input[name="password"]');
        const toggleButton = page.locator('button[aria-label="Show password"]');

        // Initially password is hidden
        await expect(passwordInput).toHaveAttribute('type', 'password');

        // Click toggle
        await toggleButton.click();

        // Password should be visible
        await expect(passwordInput).toHaveAttribute('type', 'text');

        // Click again to hide
        await toggleButton.click();
        await expect(passwordInput).toHaveAttribute('type', 'password');
    });
});
```

### Page Object Model

```typescript
// pages/LoginPage.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
    readonly page: Page;
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly submitButton: Locator;
    readonly errorMessage: Locator;
    readonly passwordToggle: Locator;

    constructor(page: Page) {
        this.page = page;
        this.emailInput = page.locator('input[name="email"]');
        this.passwordInput = page.locator('input[name="password"]');
        this.submitButton = page.locator('button[type="submit"]');
        this.errorMessage = page.locator('.error-message');
        this.passwordToggle = page.locator('button[aria-label="Show password"]');
    }

    async goto() {
        await this.page.goto('/login');
    }

    async login(email: string, password: string) {
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await this.submitButton.click();
    }

    async getErrorMessage(): Promise<string> {
        return await this.errorMessage.textContent() || '';
    }

    async togglePasswordVisibility() {
        await this.passwordToggle.click();
    }

    async isPasswordVisible(): Promise<boolean> {
        const type = await this.passwordInput.getAttribute('type');
        return type === 'text';
    }
}

// pages/DashboardPage.ts
export class DashboardPage {
    readonly page: Page;
    readonly userMenu: Locator;
    readonly welcomeMessage: Locator;
    readonly logoutButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.userMenu = page.locator('.user-menu');
        this.welcomeMessage = page.locator('h1');
        this.logoutButton = page.locator('button:has-text("Logout")');
    }

    async isLoaded(): Promise<boolean> {
        await this.page.waitForURL(/.*dashboard/);
        await this.userMenu.waitFor({ state: 'visible' });
        return true;
    }

    async logout() {
        await this.userMenu.click();
        await this.logoutButton.click();
    }

    async getWelcomeMessage(): Promise<string> {
        return await this.welcomeMessage.textContent() || '';
    }
}

// tests/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

test('login flow with page objects', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.login('user@example.com', 'SecurePass123');

    await expect(page).toHaveURL(/.*dashboard/);
    expect(await dashboardPage.isLoaded()).toBe(true);

    const welcomeMsg = await dashboardPage.getWelcomeMessage();
    expect(welcomeMsg).toContain('Welcome back');
});
```

### Custom Fixtures

```typescript
// fixtures/auth.fixture.ts
import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

type AuthFixtures = {
    loginPage: LoginPage;
    dashboardPage: DashboardPage;
    authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
    loginPage: async ({ page }, use) => {
        const loginPage = new LoginPage(page);
        await use(loginPage);
    },

    dashboardPage: async ({ page }, use) => {
        const dashboardPage = new DashboardPage(page);
        await use(dashboardPage);
    },

    authenticatedPage: async ({ page }, use) => {
        // Perform login
        await page.goto('/login');
        await page.fill('input[name="email"]', 'user@example.com');
        await page.fill('input[name="password"]', 'SecurePass123');
        await page.click('button[type="submit"]');
        await page.waitForURL(/.*dashboard/);

        // Use authenticated page
        await use(page);

        // Cleanup: logout
        await page.click('.user-menu');
        await page.click('button:has-text("Logout")');
    }
});

export { expect } from '@playwright/test';

// tests/protected-routes.spec.ts
import { test, expect } from '../fixtures/auth.fixture';

test('access protected route', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/admin/users');

    // Should be accessible when authenticated
    await expect(authenticatedPage).toHaveURL(/.*admin\/users/);
    await expect(authenticatedPage.locator('h1')).toContainText('User Management');
});
```

### API Testing and Mocking

```typescript
import { test, expect } from '@playwright/test';

test.describe('API Integration', () => {
    test('intercept and mock API response', async ({ page }) => {
        // Mock API response
        await page.route('**/api/users', async route => {
            const mockData = {
                users: [
                    { id: 1, name: 'John Doe', email: 'john@example.com' },
                    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
                ]
            };

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockData)
            });
        });

        await page.goto('/users');

        // Verify mocked data is displayed
        await expect(page.locator('tr')).toHaveCount(2);
        await expect(page.locator('text=John Doe')).toBeVisible();
        await expect(page.locator('text=Jane Smith')).toBeVisible();
    });

    test('make direct API request', async ({ request }) => {
        // POST request
        const createResponse = await request.post('/api/users', {
            data: {
                name: 'Test User',
                email: 'test@example.com'
            }
        });

        expect(createResponse.ok()).toBeTruthy();
        const user = await createResponse.json();
        expect(user.name).toBe('Test User');

        // GET request
        const getResponse = await request.get(`/api/users/${user.id}`);
        expect(getResponse.ok()).toBeTruthy();

        const fetchedUser = await getResponse.json();
        expect(fetchedUser.email).toBe('test@example.com');

        // DELETE request
        const deleteResponse = await request.delete(`/api/users/${user.id}`);
        expect(deleteResponse.ok()).toBeTruthy();
    });

    test('network monitoring', async ({ page }) => {
        const requests: string[] = [];
        const responses: number[] = [];

        // Listen to all requests
        page.on('request', request => {
            requests.push(request.url());
        });

        // Listen to all responses
        page.on('response', response => {
            responses.push(response.status());
        });

        await page.goto('/dashboard');

        // Verify API calls were made
        expect(requests.some(url => url.includes('/api/profile'))).toBeTruthy();
        expect(responses.every(status => status < 400)).toBeTruthy();
    });
});
```

### Visual Testing and Debugging

```typescript
import { test, expect } from '@playwright/test';

test.describe('Visual Testing', () => {
    test('full page screenshot comparison', async ({ page }) => {
        await page.goto('/');

        // Take screenshot and compare
        await expect(page).toHaveScreenshot('homepage.png', {
            fullPage: true,
            maxDiffPixels: 100
        });
    });

    test('element screenshot', async ({ page }) => {
        await page.goto('/pricing');

        const pricingCard = page.locator('.pricing-card').first();
        await expect(pricingCard).toHaveScreenshot('pricing-card.png');
    });

    test('trace recording', async ({ page, context }) => {
        // Start tracing
        await context.tracing.start({
            screenshots: true,
            snapshots: true,
            sources: true
        });

        await page.goto('/checkout');
        await page.fill('#email', 'user@example.com');
        await page.fill('#card-number', '4242424242424242');
        await page.click('button:has-text("Pay")');

        // Stop tracing and save
        await context.tracing.stop({
            path: 'trace.zip'
        });
    });

    test('accessibility testing', async ({ page }) => {
        await page.goto('/contact');

        // Run accessibility checks
        const accessibilityScanResults = await page.accessibility.snapshot();
        expect(accessibilityScanResults).toBeTruthy();

        // Check for specific ARIA attributes
        const submitButton = page.locator('button[type="submit"]');
        await expect(submitButton).toHaveAttribute('aria-label');
    });
});
```

### Configuration (playwright.config.ts)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [
        ['html'],
        ['json', { outputFile: 'test-results.json' }],
        ['junit', { outputFile: 'junit-results.xml' }]
    ],

    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        actionTimeout: 10000,
        navigationTimeout: 30000
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] }
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] }
        },
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] }
        },
        {
            name: 'Mobile Safari',
            use: { ...devices['iPhone 12'] }
        },
        {
            name: 'authenticated',
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'auth-state.json'
            },
            dependencies: ['setup']
        }
    ],

    webServer: {
        command: 'npm run start',
        port: 3000,
        reuseExistingServer: !process.env.CI
    }
});
```

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
