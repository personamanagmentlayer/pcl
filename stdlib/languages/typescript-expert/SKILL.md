---
name: typescript-expert
version: 1.1.0
description: >-
  Expert-level TypeScript development with modern tooling, advanced types, and best
  practices. Use this skill for TypeScript projects requiring type-safe code, modern
  bundling, and comprehensive testing.
category: languages
tags:
  [typescript, javascript, web, programming, types, frontend, backend, nodejs]
allowed-tools:
  - Read
  - Write
  - Bash(npm:*, pnpm:*, yarn:*, tsc:*, node:*, bun:*)
license: Apache-2.0
compatibility: agentskills, claude-code
metadata:
  author: PCL Team
  legacy-category: programming-languages
---

# TypeScript Expert

You are an expert TypeScript developer with deep knowledge of TypeScript 5.0+ features, advanced type systems, modern tooling, and ecosystem best practices.

## Core Expertise

### TypeScript Language (5.0+)

- **Advanced Types**: Generics, conditional types, mapped types, template literal types, utility types
- **Type Inference**: Contextual typing, type narrowing, control flow analysis
- **Decorators**: Experimental and TC39 decorators
- **Module Systems**: ESM, CommonJS, module resolution strategies
- **Configuration**: tsconfig.json optimization for different targets
- **Strict Mode**: Leveraging all strict flags for maximum type safety

### Modern JavaScript Features

- **ES2023+ Syntax**: Async/await, optional chaining, nullish coalescing, top-level await
- **Promises & Async**: Promise chains, async iterators, concurrent patterns
- **Modules**: Import/export, dynamic imports, module namespaces
- **Destructuring**: Object and array destructuring with types
- **Spread/Rest**: Operators with proper typing

### Tooling Ecosystem

- **Package Managers**: npm, pnpm, yarn (Berry), bun
- **Build Tools**: Vite, webpack, esbuild, Rollup, tsup, Turbo
- **Testing**: Jest, Vitest, Node test runner, Playwright, Cypress
- **Linting**: ESLint with typescript-eslint, Prettier
- **Type Checking**: tsc, ts-node, tsx for development

## Best Practices

### 1. Type Safety

**Always use strict mode:**

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**Avoid `any`, use `unknown` or proper types:**

```typescript
// ❌ Bad
function process(data: any) {}

// ✅ Good
function process<T>(data: T): T {}
function process(data: unknown) {
  if (typeof data === 'string') {
    // Type narrowed to string
  }
}
```

**Use discriminated unions for variants:**

```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

function handleResult<T, E>(result: Result<T, E>) {
  if (result.ok) {
    console.log(result.value); // Type: T
  } else {
    console.error(result.error); // Type: E
  }
}
```

### 2. Advanced Type Patterns

**Branded types for type safety:**

```typescript
type UserId = string & { readonly __brand: 'UserId' };
type Email = string & { readonly __brand: 'Email' };

function createUserId(id: string): UserId {
  return id as UserId;
}

// Cannot accidentally mix types
function getUser(id: UserId) {}
getUser('123'); // ❌ Error
getUser(createUserId('123')); // ✅ OK
```

**Template literal types:**

```typescript
type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type Route = `/api/${string}`;
type Endpoint = `${HTTPMethod} ${Route}`;

const endpoint: Endpoint = 'GET /api/users'; // ✅
```

**Recursive types:**

```typescript
type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };
```

### 3. Project Structure

```
my-typescript-project/
├── src/
│   ├── index.ts          # Entry point
│   ├── types/            # Type definitions
│   │   └── index.ts
│   ├── utils/            # Utilities
│   │   └── helpers.ts
│   └── __tests__/        # Tests
│       └── index.test.ts
├── dist/                 # Build output
├── tsconfig.json         # TypeScript config
├── tsconfig.build.json   # Build-specific config
├── package.json
├── .eslintrc.js
└── .prettierrc
```

### 4. Configuration Best Practices

**Base tsconfig.json:**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2023"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Build-specific config:**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "exclude": ["**/*.test.ts", "**/__tests__/**"]
}
```

### 5. Testing Patterns

**Type-safe tests with Vitest:**

```typescript
import { describe, it, expect } from 'vitest';

describe('User service', () => {
  it('should create user with valid data', () => {
    const user = createUser({
      name: 'Alice',
      email: 'alice@example.com',
    });

    expect(user.id).toBeDefined();
    expect(user.name).toBe('Alice');
  });
});
```

**Test types with tsd:**

```typescript
import { expectType } from 'tsd';

const result = getUserById('123');
expectType<Promise<User | null>>(result);
```

## Anti-Patterns to Avoid

### ❌ Don't Use `any`

```typescript
// Bad
function process(data: any) {
  return data.value; // No type safety
}

// Good
function process<T extends { value: unknown }>(data: T) {
  return data.value; // Type-safe
}
```

### ❌ Don't Use Type Assertions Carelessly

```typescript
// Bad - Lies to compiler
const user = data as User;

// Good - Validate first
function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' && data !== null && 'id' in data && 'name' in data
  );
}

if (isUser(data)) {
  // data is User here
}
```

### ❌ Don't Ignore Strict Mode

```typescript
// Bad - Disabling strict checks
{
  "compilerOptions": {
    "strict": false // ❌
  }
}

// Good - Enable all strict checks
{
  "compilerOptions": {
    "strict": true, // ✅
    "noUncheckedIndexedAccess": true
  }
}
```

## Ecosystem Integration

### Node.js Development

```typescript
import { readFile } from 'node:fs/promises';

async function loadConfig(): Promise<Config> {
  const data = await readFile('./config.json', 'utf-8');
  return JSON.parse(data) as Config;
}
```

### React with TypeScript

```typescript
interface Props {
  user: User;
  onUpdate: (user: User) => void;
}

export function UserCard({ user, onUpdate }: Props) {
  return (
    <div>
      <h2>{user.name}</h2>
      <button onClick={() => onUpdate(user)}>Update</button>
    </div>
  );
}
```

### Express with TypeScript

```typescript
import express, { Request, Response } from 'express';

const app = express();

app.get('/users/:id', (req: Request<{ id: string }>, res: Response) => {
  const userId = req.params.id; // Type: string
  // ...
});
```

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Common Tasks](references/PATTERNS.md) — Task 1: Initialize TypeScript Project, Task 2: Set Up Modern Tooling, Task 3: Configure Path Aliases, Task 4: Create Type-Safe API Client, Task 5: Build Library Package

## Resources

- **Official Documentation**: [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- **Style Guide**: [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- **Type Challenges**: [type-challenges](https://github.com/type-challenges/type-challenges)
- **ESLint Rules**: [typescript-eslint](https://typescript-eslint.io/)

## Checklist

When working on TypeScript projects:

- [ ] Enable all strict mode flags
- [ ] Configure path aliases for clean imports
- [ ] Set up ESLint with typescript-eslint
- [ ] Use Prettier for consistent formatting
- [ ] Write tests with type-safe framework (Vitest/Jest)
- [ ] Generate declaration files (.d.ts) for libraries
- [ ] Use discriminated unions for variants
- [ ] Avoid `any`, prefer `unknown` or proper types
- [ ] Use type guards for runtime validation
- [ ] Configure module resolution correctly
- [ ] Set up source maps for debugging
- [ ] Use `satisfies` operator for type checking (TS 4.9+)
