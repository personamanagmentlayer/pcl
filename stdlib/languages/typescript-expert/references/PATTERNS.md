# TypeScript Expert — Common Tasks

Reference material for the `typescript-expert` skill. See [SKILL.md](../SKILL.md).

## Common Tasks

### Task 1: Initialize TypeScript Project

```bash

# Create project directory
mkdir my-project && cd my-project

# Initialize package.json
npm init -y

# Install TypeScript
npm install -D typescript @types/node

# Create tsconfig.json
npx tsc --init --strict

# Create source structure
mkdir src
echo 'console.log("Hello TypeScript");' > src/index.ts

# Add build script to package.json
npm pkg set scripts.build="tsc"
npm pkg set scripts.dev="tsc --watch"

# Build
npm run build
```

### Task 2: Set Up Modern Tooling

```bash

# Install Vite for fast builds
npm install -D vite

# Install testing framework
npm install -D vitest @vitest/ui

# Install linting
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Install formatting
npm install -D prettier eslint-config-prettier

# Update package.json
npm pkg set scripts.dev="vite"
npm pkg set scripts.build="vite build"
npm pkg set scripts.test="vitest"
npm pkg set scripts.lint="eslint src --ext .ts"
npm pkg set scripts.format="prettier --write \"src/**/*.ts\""
```

### Task 3: Configure Path Aliases

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/types/*": ["src/types/*"],
      "@/utils/*": ["src/utils/*"]
    }
  }
}
```

```typescript
// Now use clean imports
import { helper } from '@/utils/helper';
import type { User } from '@/types';
```

### Task 4: Create Type-Safe API Client

```typescript
type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface RequestOptions<T = unknown> {
  method: HTTPMethod;
  body?: T;
  headers?: Record<string, string>;
}

class APIClient {
  constructor(private baseUrl: string) {}

  async request<TResponse, TBody = unknown>(
    endpoint: string,
    options: RequestOptions<TBody>
  ): Promise<TResponse> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<TResponse, TBody = unknown>(
    endpoint: string,
    body: TBody
  ): Promise<TResponse> {
    return this.request<TResponse, TBody>(endpoint, {
      method: 'POST',
      body,
    });
  }
}

// Usage with full type safety
interface User {
  id: string;
  name: string;
  email: string;
}

const api = new APIClient('https://api.example.com');
const user = await api.get<User>('/users/123'); // Type: User
```

### Task 5: Build Library Package

```json
// package.json
{
  "name": "my-library",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts"
  }
}
```
