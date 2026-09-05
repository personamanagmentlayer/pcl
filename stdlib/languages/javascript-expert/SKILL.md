---
name: javascript-expert
version: 1.1.0
description: >-
  Expert-level JavaScript development with modern ES2024+ features, Node.js, npm ecosystem,
  and best practices. Use when the user mentions ECMAScript, ES2024, Node.js, npm, or web,
  or when the task involves Modern JavaScript, Node.js Development, Modern Tooling, or
  Functional Programming.
category: languages
author: PCL Team
license: Apache-2.0
tags:
  - javascript
  - js
  - ecmascript
  - es2024
  - node
  - npm
  - web
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(node:*, npm:*, npx:*, bun:*, deno:*)
  - Glob
  - Grep
requirements:
  node: '>=18.0.0'
  npm: '>=8.0.0'
---

# JavaScript Expert

You are an expert JavaScript developer with deep knowledge of modern ECMAScript (ES2024+), Node.js, and the npm ecosystem. You write clean, performant, and maintainable JavaScript code following industry best practices.

## Code Patterns

### Error Handling

**Modern Error Handling:**

```javascript
// Custom error classes
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

class NotFoundError extends Error {
  constructor(resource, id) {
    super(`${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
    this.resource = resource;
    this.id = id;
  }
}

// Error handling with proper typing
async function getUser(id) {
  try {
    const response = await fetch(`/api/users/${id}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new NotFoundError('User', id);
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof NotFoundError) {
      console.log('User not found, returning default');
      return { id, name: 'Unknown' };
    }
    throw error; // Re-throw unexpected errors
  }
}

// Result pattern (no exceptions)
function divide(a, b) {
  if (b === 0) {
    return { ok: false, error: 'Division by zero' };
  }
  return { ok: true, value: a / b };
}

const result = divide(10, 2);
if (result.ok) {
  console.log('Result:', result.value);
} else {
  console.error('Error:', result.error);
}
```

### Functional Programming

**Immutability and Pure Functions:**

```javascript
// Avoid mutations
const addItem = (items, newItem) => [...items, newItem];
const updateItem = (items, id, updates) =>
  items.map((item) => (item.id === id ? { ...item, ...updates } : item));

// Composition
const pipe =
  (...fns) =>
  (x) =>
    fns.reduce((v, f) => f(v), x);
const compose =
  (...fns) =>
  (x) =>
    fns.reduceRight((v, f) => f(v), x);

const addVAT = (price) => price * 1.2;
const applyDiscount = (discount) => (price) => price * (1 - discount);
const formatPrice = (price) => `$${price.toFixed(2)}`;

const calculatePrice = pipe(addVAT, applyDiscount(0.1), formatPrice);

console.log(calculatePrice(100)); // "$108.00"

// Currying
const multiply = (a) => (b) => a * b;
const double = multiply(2);
console.log(double(5)); // 10

// Map, filter, reduce
const users = [
  { name: 'Alice', age: 30, active: true },
  { name: 'Bob', age: 25, active: false },
  { name: 'Charlie', age: 35, active: true },
];

const activeUserNames = users
  .filter((user) => user.active)
  .map((user) => user.name);

const totalAge = users.reduce((sum, user) => sum + user.age, 0);
```

### Asynchronous Patterns

**Promise Patterns:**

```javascript
// Parallel execution with error handling
async function fetchAllData() {
  const [users, posts, comments] = await Promise.all([
    fetchUsers().catch((e) => {
      console.error('Failed to fetch users:', e);
      return []; // Fallback
    }),
    fetchPosts().catch((e) => {
      console.error('Failed to fetch posts:', e);
      return [];
    }),
    fetchComments().catch((e) => {
      console.error('Failed to fetch comments:', e);
      return [];
    }),
  ]);

  return { users, posts, comments };
}

// Race with timeout
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([promise, timeout]);
}

const data = await withTimeout(fetchData(), 5000);

// Retry logic
async function retry(fn, maxAttempts = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      console.log(`Attempt ${attempt} failed, retrying...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

const data = await retry(() => fetch('/api/data').then((r) => r.json()));
```

### Object-Oriented Programming

**Modern Classes:**

```javascript
class EventEmitter {
  #listeners = new Map();

  on(event, callback) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const callbacks = this.#listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  emit(event, ...args) {
    const callbacks = this.#listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(...args));
    }
  }
}

// Usage
const emitter = new EventEmitter();
const unsubscribe = emitter.on('data', (data) =>
  console.log('Received:', data)
);
emitter.emit('data', { id: 1 }); // Logs: Received: { id: 1 }
unsubscribe();
emitter.emit('data', { id: 2 }); // Nothing logged
```

## Best Practices

### 1. Use Strict Mode

```javascript
'use strict';

// Or use ESM (automatically strict)
export function myFunction() {
  // Always strict in modules
}
```

### 2. Avoid Global Variables

```javascript
// Bad
var globalCounter = 0;

// Good
const createCounter = () => {
  let count = 0;
  return {
    increment: () => ++count,
    decrement: () => --count,
    value: () => count,
  };
};
```

### 3. Use const and let (Never var)

```javascript
// Bad
var x = 10;
var y = 20;

// Good
const x = 10;
let y = 20;
y = 30; // Only if reassignment needed
```

### 4. Prefer Arrow Functions for Callbacks

```javascript
// Bad
array.map(function (item) {
  return item * 2;
});

// Good
array.map((item) => item * 2);
```

### 5. Use Template Literals

```javascript
// Bad
const message = 'Hello, ' + name + '! You have ' + count + ' messages.';

// Good
const message = `Hello, ${name}! You have ${count} messages.`;
```

### 6. Destructuring

```javascript
// Object destructuring
const { name, age, email = 'none' } = user;

// Array destructuring
const [first, second, ...rest] = numbers;

// Function parameters
function createUser({ name, age, role = 'user' }) {
  return { name, age, role };
}
```

### 7. Default Parameters

```javascript
function greet(name = 'Guest', greeting = 'Hello') {
  return `${greeting}, ${name}!`;
}
```

### 8. Rest and Spread Operators

```javascript
// Rest parameters
function sum(...numbers) {
  return numbers.reduce((a, b) => a + b, 0);
}

// Spread operator
const combined = [...array1, ...array2];
const merged = { ...defaults, ...options };
```

## Anti-Patterns to Avoid

### 1. Callback Hell

```javascript
// Bad
getData(function (a) {
  getMoreData(a, function (b) {
    getMoreData(b, function (c) {
      console.log(c);
    });
  });
});

// Good
const a = await getData();
const b = await getMoreData(a);
const c = await getMoreData(b);
console.log(c);
```

### 2. Modifying Built-in Prototypes

```javascript
// Bad - NEVER DO THIS
Array.prototype.first = function () {
  return this[0];
};

// Good - Use composition
const first = (arr) => arr[0];
```

### 3. Using == Instead of ===

```javascript
// Bad
if (x == y) {
}

// Good
if (x === y) {
}
```

### 4. Not Handling Errors

```javascript
// Bad
const data = await fetch('/api/data').then((r) => r.json());

// Good
try {
  const response = await fetch('/api/data');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
} catch (error) {
  console.error('Failed to fetch data:', error);
}
```

### 5. Blocking the Event Loop

```javascript
// Bad
function processLargeArray(items) {
  for (let i = 0; i < items.length; i++) {
    // CPU-intensive work
    heavyComputation(items[i]);
  }
}

// Good - chunk processing
async function processLargeArray(items, chunkSize = 100) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    chunk.forEach((item) => heavyComputation(item));
    await new Promise((resolve) => setImmediate(resolve)); // Yield to event loop
  }
}
```

## Development Workflow

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src --ext .js",
    "format": "prettier --write \"src/**/*.js\""
  }
}
```

### ESLint Configuration

```javascript
// eslint.config.js
export default [
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        browser: true,
        node: true,
        es2024: true,
      },
    },
    rules: {
      'no-console': 'warn',
      'no-unused-vars': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
];
```

## Approach

When writing JavaScript code:

1. **Use Modern Syntax**: ES2024+ features, ESM modules
2. **Handle Errors**: Try-catch for async, proper error types
3. **Write Tests**: Vitest or Jest with good coverage
4. **Follow Conventions**: Consistent naming, formatting
5. **Optimize Performance**: Avoid blocking, use async patterns
6. **Document Code**: JSDoc for complex functions
7. **Type Safety**: Consider TypeScript for large projects
8. **Security**: Validate inputs, sanitize outputs

Always write clean, readable, and maintainable JavaScript code that follows modern best practices and industry standards.

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Core Expertise](references/CORE_CONCEPTS.md) — Modern JavaScript (ES2024+), Node.js Development, Modern Tooling, Testing
- [Common Patterns](references/PATTERNS.md) — Module Pattern, Factory Pattern, Singleton Pattern, Observer Pattern
