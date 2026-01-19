---
description: Expert in Cypress testing framework, custom commands, fixtures, plugins, visual testing, and component testing
keywords: [cypress, e2e-testing, cypress-commands, fixtures, cypress-plugins, visual-testing, component-testing]
category: qa
expertise_level: expert
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

## Implementation Examples

### Basic Test Structure

```javascript
describe('User Authentication', () => {
    beforeEach(() => {
        cy.visit('/login');
    });

    it('successfully logs in with valid credentials', () => {
        cy.get('input[name="email"]').type('user@example.com');
        cy.get('input[name="password"]').type('SecurePass123');
        cy.get('button[type="submit"]').click();

        cy.url().should('include', '/dashboard');
        cy.get('.user-menu').should('be.visible');
        cy.contains('Welcome back').should('be.visible');
    });

    it('shows error with invalid credentials', () => {
        cy.get('input[name="email"]').type('invalid@example.com');
        cy.get('input[name="password"]').type('WrongPassword');
        cy.get('button[type="submit"]').click();

        cy.get('.error-message')
            .should('be.visible')
            .and('contain', 'Invalid email or password');

        cy.url().should('include', '/login');
    });

    it('validates required fields', () => {
        cy.get('button[type="submit"]').click();

        cy.get('input[name="email"]:invalid').should('exist');
        cy.get('input[name="password"]:invalid').should('exist');
    });
});
```

### Custom Commands

```javascript
// cypress/support/commands.js
Cypress.Commands.add('login', (email, password) => {
    cy.session([email, password], () => {
        cy.visit('/login');
        cy.get('input[name="email"]').type(email);
        cy.get('input[name="password"]').type(password);
        cy.get('button[type="submit"]').click();
        cy.url().should('include', '/dashboard');
    });
});

Cypress.Commands.add('logout', () => {
    cy.get('.user-menu').click();
    cy.contains('Logout').click();
    cy.url().should('include', '/login');
});

Cypress.Commands.add('createUser', (userData) => {
    cy.request({
        method: 'POST',
        url: '/api/users',
        body: userData,
        headers: {
            'Authorization': `Bearer ${Cypress.env('API_TOKEN')}`
        }
    }).then((response) => {
        expect(response.status).to.eq(201);
        return response.body;
    });
});

Cypress.Commands.add('fillForm', (formData) => {
    Object.keys(formData).forEach(key => {
        cy.get(`[name="${key}"]`).type(formData[key]);
    });
});

Cypress.Commands.add('waitForApi', (alias) => {
    cy.wait(alias).its('response.statusCode').should('eq', 200);
});

// Usage in tests
describe('Authenticated Tests', () => {
    beforeEach(() => {
        cy.login('user@example.com', 'SecurePass123');
        cy.visit('/dashboard');
    });

    it('can create a new project', () => {
        cy.fillForm({
            title: 'New Project',
            description: 'Project Description',
            budget: '50000'
        });

        cy.get('button[type="submit"]').click();
        cy.contains('Project created successfully').should('be.visible');
    });
});
```

### Network Interception

```javascript
describe('API Integration', () => {
    beforeEach(() => {
        cy.intercept('GET', '/api/users', {
            statusCode: 200,
            body: {
                users: [
                    { id: 1, name: 'John Doe', email: 'john@example.com' },
                    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
                ]
            }
        }).as('getUsers');

        cy.visit('/users');
    });

    it('displays mocked user data', () => {
        cy.wait('@getUsers');

        cy.get('table tbody tr').should('have.length', 2);
        cy.contains('John Doe').should('be.visible');
        cy.contains('Jane Smith').should('be.visible');
    });

    it('handles API errors gracefully', () => {
        cy.intercept('POST', '/api/users', {
            statusCode: 500,
            body: { error: 'Internal server error' }
        }).as('createUser');

        cy.get('button:contains("Add User")').click();
        cy.fillForm({
            name: 'Test User',
            email: 'test@example.com'
        });
        cy.get('button[type="submit"]').click();

        cy.wait('@createUser');
        cy.contains('Failed to create user').should('be.visible');
    });

    it('monitors network requests', () => {
        cy.intercept('GET', '/api/profile').as('getProfile');
        cy.intercept('GET', '/api/settings').as('getSettings');

        cy.visit('/profile');

        cy.wait('@getProfile').then((interception) => {
            expect(interception.response.statusCode).to.equal(200);
            expect(interception.response.body).to.have.property('name');
        });

        cy.wait('@getSettings').its('response.body.theme').should('eq', 'dark');
    });
});
```

### Fixtures and Test Data

```javascript
// cypress/fixtures/users.json
{
  "validUser": {
    "email": "user@example.com",
    "password": "SecurePass123"
  },
  "adminUser": {
    "email": "admin@example.com",
    "password": "AdminPass456"
  },
  "testUsers": [
    {
      "name": "Alice Johnson",
      "email": "alice@example.com",
      "role": "developer"
    },
    {
      "name": "Bob Wilson",
      "email": "bob@example.com",
      "role": "designer"
    }
  ]
}

// cypress/fixtures/products.json
{
  "products": [
    {
      "id": 1,
      "name": "Laptop",
      "price": 1200,
      "category": "Electronics"
    },
    {
      "id": 2,
      "name": "Mouse",
      "price": 25,
      "category": "Accessories"
    }
  ]
}

// Using fixtures in tests
describe('User Management', () => {
    beforeEach(() => {
        cy.fixture('users').as('userData');
    });

    it('logs in with fixture data', function() {
        cy.login(this.userData.validUser.email, this.userData.validUser.password);
        cy.visit('/dashboard');
        cy.contains('Welcome back').should('be.visible');
    });

    it('creates multiple users from fixture', function() {
        cy.login(this.userData.adminUser.email, this.userData.adminUser.password);
        cy.visit('/admin/users');

        this.userData.testUsers.forEach(user => {
            cy.get('button:contains("Add User")').click();
            cy.fillForm(user);
            cy.get('button[type="submit"]').click();
            cy.contains(`${user.name} created`).should('be.visible');
        });
    });
});

describe('Product Catalog', () => {
    it('displays products from fixture', () => {
        cy.fixture('products').then((data) => {
            cy.intercept('GET', '/api/products', {
                statusCode: 200,
                body: data
            }).as('getProducts');

            cy.visit('/products');
            cy.wait('@getProducts');

            data.products.forEach(product => {
                cy.contains(product.name).should('be.visible');
                cy.contains(`$${product.price}`).should('be.visible');
            });
        });
    });
});
```

### Page Object Pattern

```javascript
// cypress/support/pages/LoginPage.js
class LoginPage {
    visit() {
        cy.visit('/login');
    }

    fillEmail(email) {
        cy.get('input[name="email"]').clear().type(email);
        return this;
    }

    fillPassword(password) {
        cy.get('input[name="password"]').clear().type(password);
        return this;
    }

    submit() {
        cy.get('button[type="submit"]').click();
        return this;
    }

    login(email, password) {
        this.fillEmail(email);
        this.fillPassword(password);
        this.submit();
        return this;
    }

    getErrorMessage() {
        return cy.get('.error-message');
    }

    togglePasswordVisibility() {
        cy.get('button[aria-label="Show password"]').click();
        return this;
    }
}

export default LoginPage;

// cypress/support/pages/DashboardPage.js
class DashboardPage {
    visit() {
        cy.visit('/dashboard');
    }

    getUserMenu() {
        return cy.get('.user-menu');
    }

    getWelcomeMessage() {
        return cy.get('h1');
    }

    logout() {
        this.getUserMenu().click();
        cy.contains('Logout').click();
    }

    navigateToProjects() {
        cy.get('nav').contains('Projects').click();
    }

    getProjectCount() {
        return cy.get('.project-card').its('length');
    }
}

export default DashboardPage;

// Using page objects
import LoginPage from '../support/pages/LoginPage';
import DashboardPage from '../support/pages/DashboardPage';

describe('Login Flow', () => {
    const loginPage = new LoginPage();
    const dashboardPage = new DashboardPage();

    it('complete login flow', () => {
        loginPage.visit();
        loginPage.login('user@example.com', 'SecurePass123');

        cy.url().should('include', '/dashboard');
        dashboardPage.getWelcomeMessage().should('contain', 'Welcome back');
        dashboardPage.getUserMenu().should('be.visible');
    });

    it('password visibility toggle', () => {
        loginPage.visit();
        loginPage.fillPassword('test123');

        cy.get('input[name="password"]').should('have.attr', 'type', 'password');

        loginPage.togglePasswordVisibility();
        cy.get('input[name="password"]').should('have.attr', 'type', 'text');
    });
});
```

### Component Testing

```javascript
// Component test for React component
import React from 'react';
import { mount } from '@cypress/react';
import Button from '../../src/components/Button';

describe('Button Component', () => {
    it('renders with text', () => {
        mount(<Button>Click me</Button>);
        cy.contains('Click me').should('be.visible');
    });

    it('handles click events', () => {
        const onClickSpy = cy.spy().as('onClick');
        mount(<Button onClick={onClickSpy}>Click me</Button>);

        cy.contains('Click me').click();
        cy.get('@onClick').should('have.been.calledOnce');
    });

    it('applies variant styles', () => {
        mount(<Button variant="primary">Primary</Button>);
        cy.get('button').should('have.class', 'btn-primary');

        mount(<Button variant="secondary">Secondary</Button>);
        cy.get('button').should('have.class', 'btn-secondary');
    });

    it('disables when prop is set', () => {
        mount(<Button disabled>Disabled</Button>);
        cy.get('button').should('be.disabled');
    });

    it('shows loading state', () => {
        mount(<Button loading>Loading...</Button>);
        cy.get('button').should('have.class', 'btn-loading');
        cy.get('.spinner').should('be.visible');
    });
});
```

### Configuration (cypress.config.js)

```javascript
const { defineConfig } = require('cypress');

module.exports = defineConfig({
    e2e: {
        baseUrl: 'http://localhost:3000',
        viewportWidth: 1280,
        viewportHeight: 720,
        video: true,
        screenshotOnRunFailure: true,
        experimentalSessionAndOrigin: true,
        setupNodeEvents(on, config) {
            // Code coverage
            require('@cypress/code-coverage/task')(on, config);

            // Custom tasks
            on('task', {
                log(message) {
                    console.log(message);
                    return null;
                },
                table(data) {
                    console.table(data);
                    return null;
                }
            });

            return config;
        },
        env: {
            API_URL: 'http://localhost:4000/api',
            API_TOKEN: 'test-token'
        }
    },

    component: {
        devServer: {
            framework: 'react',
            bundler: 'vite'
        },
        setupNodeEvents(on, config) {
            require('@cypress/code-coverage/task')(on, config);
            return config;
        }
    },

    retries: {
        runMode: 2,
        openMode: 0
    },

    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
    requestTimeout: 10000,
    responseTimeout: 30000
});
```

## Best Practices

### Test Organization
- Keep tests independent and isolated
- Use descriptive test names
- Group related tests with describe blocks
- Use beforeEach for common setup
- Clean up after tests
- Avoid test interdependencies

### Selectors
- Prefer data-* attributes for testing
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
