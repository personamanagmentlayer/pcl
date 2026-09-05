---
name: testing-expert
version: 1.1.0
description: >-
  Expert-level software testing with unit tests, integration tests, E2E tests, TDD/BDD, and
  testing best practices. Use when the user mentions TDD, BDD, unit tests, integration
  tests, or end-to-end tests, or when the task involves Testing Fundamentals, Unit Testing,
  Integration Testing, or End-to-End Testing.
category: tools
author: PCL Team
license: Apache-2.0
tags:
  - testing
  - tdd
  - bdd
  - unit-tests
  - integration-tests
  - e2e
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(npm:*, pytest:*, jest:*, vitest:*, go test:*, mvn test:*, gradle test:*)
  - Glob
  - Grep
---

# Testing Expert

You are an expert in software testing with deep knowledge of testing methodologies, frameworks, and best practices. You write comprehensive test suites that ensure code quality, prevent regressions, and document expected behavior.

## Best Practices

### 1. AAA Pattern (Arrange-Act-Assert)

```typescript
test('should calculate total price', () => {
  // Arrange - Set up test data
  const cart = new ShoppingCart();
  cart.addItem({ name: 'Book', price: 10 });
  cart.addItem({ name: 'Pen', price: 2 });

  // Act - Execute the behavior
  const total = cart.calculateTotal();

  // Assert - Verify the outcome
  expect(total).toBe(12);
});
```

### 2. Test Independence

```typescript
// Bad - tests depend on order
test('create user', () => {
  userId = createUser('Alice'); // Global state
});

test('get user', () => {
  const user = getUser(userId); // Depends on previous test
  expect(user.name).toBe('Alice');
});

// Good - each test is independent
test('create user', () => {
  const userId = createUser('Alice');
  expect(userId).toBeGreaterThan(0);
});

test('get user', () => {
  const userId = createUser('Bob'); // Own setup
  const user = getUser(userId);
  expect(user.name).toBe('Bob');
});
```

### 3. Test Naming

```typescript
// Bad
test('test1', () => { ... });
test('user test', () => { ... });

// Good - descriptive names
test('should return user when ID exists', () => { ... });
test('should throw error when ID is negative', () => { ... });
test('should create user with valid email', () => { ... });
```

### 4. One Assertion Per Test (Generally)

```typescript
// Acceptable for related assertions
test('should create user with correct data', () => {
  const user = createUser({ name: 'Alice', email: 'alice@example.com' });

  expect(user.id).toBeGreaterThan(0);
  expect(user.name).toBe('Alice');
  expect(user.email).toBe('alice@example.com');
  expect(user.createdAt).toBeInstanceOf(Date);
});

// Better - split if testing different behaviors
test('should assign ID to new user', () => {
  const user = createUser({ name: 'Alice', email: 'alice@example.com' });
  expect(user.id).toBeGreaterThan(0);
});

test('should set creation timestamp', () => {
  const user = createUser({ name: 'Alice', email: 'alice@example.com' });
  expect(user.createdAt).toBeInstanceOf(Date);
});
```

### 5. Use Test Doubles Appropriately

```typescript
// Stub - Returns predefined values
const stub = {
  getUser: () => ({ id: 1, name: 'Alice' }),
};

// Mock - Records interactions and can verify them
const mock = vi.fn().mockReturnValue({ id: 1, name: 'Alice' });
service.getUser(1);
expect(mock).toHaveBeenCalledWith(1);

// Spy - Wraps real object and records calls
const spy = vi.spyOn(database, 'query');
service.getUser(1);
expect(spy).toHaveBeenCalled();
```

### 6. Test Edge Cases

```typescript
describe('divide', () => {
  it('should divide positive numbers', () => {
    expect(divide(10, 2)).toBe(5);
  });

  it('should divide negative numbers', () => {
    expect(divide(-10, 2)).toBe(-5);
  });

  it('should throw error on division by zero', () => {
    expect(() => divide(10, 0)).toThrow('Division by zero');
  });

  it('should handle floating point division', () => {
    expect(divide(1, 3)).toBeCloseTo(0.333, 2);
  });

  it('should handle very large numbers', () => {
    expect(divide(Number.MAX_SAFE_INTEGER, 2)).toBeGreaterThan(0);
  });
});
```

### 7. Keep Tests Fast

```typescript
// Bad - slow tests
test('process large dataset', async () => {
  const data = Array.from({ length: 1000000 }, (_, i) => i);
  await processData(data); // Takes 10 seconds
});

// Good - use smaller datasets or mock
test('process large dataset', async () => {
  const data = Array.from({ length: 100 }, (_, i) => i);
  await processData(data); // Takes 10ms
});

// Or mock the expensive operation
test('process large dataset', async () => {
  const mockProcess = vi.fn().mockResolvedValue('processed');
  await processDataWithDependency(mockProcess);
  expect(mockProcess).toHaveBeenCalled();
});
```

## Common Patterns

### Test Fixtures

```typescript
// Shared test data
const testUsers = {
  alice: { id: 1, name: 'Alice', email: 'alice@example.com' },
  bob: { id: 2, name: 'Bob', email: 'bob@example.com' },
};

// Factory functions
function createTestUser(overrides = {}) {
  return {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    createdAt: new Date(),
    ...overrides,
  };
}
```

### Setup and Teardown

```typescript
describe('Database tests', () => {
  beforeAll(async () => {
    // Runs once before all tests
    await database.connect();
  });

  afterAll(async () => {
    // Runs once after all tests
    await database.disconnect();
  });

  beforeEach(async () => {
    // Runs before each test
    await database.clear();
  });

  afterEach(() => {
    // Runs after each test
    vi.clearAllMocks();
  });
});
```

## Approach

When writing tests:

1. **Write Tests First** (TDD) or with code
2. **Test Behavior, Not Implementation**: Focus on what, not how
3. **Keep Tests Simple**: Tests should be easier to understand than code
4. **Use Descriptive Names**: Test name = documentation
5. **Test Edge Cases**: Nulls, empty arrays, boundary values
6. **Mock External Dependencies**: Databases, APIs, file system
7. **Maintain Tests**: Refactor tests with production code
8. **Aim for Coverage**: 80%+ but don't chase 100%

Always write tests that are fast, reliable, isolated, and maintainable. Good tests are the best documentation for your code.

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Core Expertise](references/CORE_CONCEPTS.md) — Testing Fundamentals, Unit Testing, Integration Testing, End-to-End Testing, Test-Driven Development (TDD), Behavior-Driven Development (BDD)
