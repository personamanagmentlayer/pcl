# JavaScript Expert — Core Expertise

Reference material for the `javascript-expert` skill. See [SKILL.md](../SKILL.md).

## Core Expertise

### Modern JavaScript (ES2024+)

**Latest Features:**

```javascript
// Top-level await
const data = await fetch('/api/data').then((r) => r.json());

// Optional chaining and nullish coalescing
const user = response?.data?.user ?? { name: 'Guest' };

// Private class fields
class User {
  #password;

  constructor(username, password) {
    this.username = username;
    this.#password = password;
  }

  authenticate(input) {
    return this.#password === input;
  }
}

// Array methods (findLast, at)
const items = [1, 2, 3, 4, 5];
const last = items.at(-1); // 5
const lastEven = items.findLast((n) => n % 2 === 0); // 4

// Object.hasOwn (safer than hasOwnProperty)
const obj = { name: 'Alice' };
Object.hasOwn(obj, 'name'); // true

// Array.prototype.toSorted (non-mutating)
const original = [3, 1, 2];
const sorted = original.toSorted(); // [1, 2, 3]
console.log(original); // [3, 1, 2] - unchanged
```

**Async Patterns:**

```javascript
// Promise combinators
const results = await Promise.allSettled([
  fetchUser(),
  fetchPosts(),
  fetchComments(),
]);

results.forEach((result) => {
  if (result.status === 'fulfilled') {
    console.log('Success:', result.value);
  } else {
    console.error('Failed:', result.reason);
  }
});

// Async iteration
async function* generateData() {
  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    yield i;
  }
}

for await (const num of generateData()) {
  console.log(num);
}

// AbortController for cancellation
const controller = new AbortController();
const { signal } = controller;

setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch('/api/data', { signal });
  const data = await response.json();
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request was cancelled');
  }
}
```

### Node.js Development

**Modern Module System:**

```javascript
// package.json
{
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./utils": {
      "import": "./dist/utils.js",
      "require": "./dist/utils.cjs"
    }
  }
}

// ESM imports
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { URL } from 'node:url';

// __dirname equivalent in ESM
const __dirname = new URL('.', import.meta.url).pathname;

// Dynamic imports
if (condition) {
  const module = await import('./optional-module.js');
  module.doSomething();
}
```

**File System Operations:**

```javascript
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

// Read file
const content = await readFile('data.json', 'utf-8');
const data = JSON.parse(content);

// Write file with error handling
try {
  await mkdir('output', { recursive: true });
  await writeFile('output/result.json', JSON.stringify(data, null, 2));
} catch (error) {
  console.error('File operation failed:', error);
}

// Stream large files
await pipeline(
  createReadStream('large-input.txt'),
  transform,
  createWriteStream('large-output.txt')
);
```

**HTTP Server (Built-in):**

```javascript
import { createServer } from 'node:http';

const server = createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy' }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### Modern Tooling

**Package Managers:**

```bash
# npm (traditional)
npm install express
npm run build

# Bun (fast, modern)
bun install
bun run dev
bun build ./index.ts --outdir ./dist

# Deno (secure by default)
deno run --allow-net server.ts
deno task dev
```

**Build Tools:**

```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'MyLib',
      fileName: (format) => `my-lib.${format}.js`,
    },
    rollupOptions: {
      external: ['lodash'],
      output: {
        globals: {
          lodash: '_',
        },
      },
    },
  },
});
```

### Testing

**Vitest (Modern, Fast):**

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateTotal, fetchUser } from './utils.js';

describe('calculateTotal', () => {
  it('should sum numbers correctly', () => {
    expect(calculateTotal([1, 2, 3])).toBe(6);
  });

  it('should handle empty arrays', () => {
    expect(calculateTotal([])).toBe(0);
  });
});

describe('fetchUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch user data', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: 'Alice' }),
      })
    );

    global.fetch = mockFetch;

    const user = await fetchUser(1);
    expect(user.name).toBe('Alice');
    expect(mockFetch).toHaveBeenCalledWith('/api/users/1');
  });
});
```

**Jest (Popular):**

```javascript
// jest.config.js
export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  collectCoverageFrom: ['src/**/*.js', '!src/**/*.test.js'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```
