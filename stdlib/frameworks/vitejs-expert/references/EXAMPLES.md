# Vite Expert — Code Examples

Reference material for the `vitejs-expert` skill. See [SKILL.md](../SKILL.md).

## Code Examples

### Installation and Scaffolding

```bash
# Scaffold a new project (interactive template picker)
npm create vite@latest my-app

# Scaffold with an explicit template
npm create vite@latest my-app -- --template react-ts
npm create vite@latest my-app -- --template vue-ts
npm create vite@latest my-app -- --template svelte-ts
npm create vite@latest my-app -- --template vanilla-ts

cd my-app
npm install

# Dev server with HMR
npm run dev

# Production build (outputs to dist/ via Rollup)
npm run build

# Preview the production build locally
npm run preview

# Add a framework plugin
npm install -D @vitejs/plugin-react
```

### Configuration for React

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: mode !== 'production',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
}));
```

### Configuration for Vue

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
```

### Environment Variables

```bash
# .env
VITE_API_URL=https://api.example.com
# Not prefixed with VITE_, so it stays server-only (unavailable to client code)
INTERNAL_BUILD_TOKEN=do-not-expose
```

```typescript
// src/config.ts
export const apiUrl = import.meta.env.VITE_API_URL;
export const isDev = import.meta.env.DEV;
export const isProd = import.meta.env.PROD;
export const mode = import.meta.env.MODE;
```

```typescript
// env.d.ts — typed env vars
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### Glob Imports

```typescript
// Eagerly load every module matching the pattern at build time
const modules = import.meta.glob('./posts/*.md', { eager: true });

for (const path in modules) {
  console.log(path, modules[path]);
}

// Lazily load: each value is a () => Promise<Module> loader
const lazyModules = import.meta.glob('./posts/*.md');
const firstPost = await Object.values(lazyModules)[0]();
```

### Web Worker Imports

```typescript
// Bundles worker.ts as a separate chunk and returns a constructable Worker
import MyWorker from './worker.ts?worker';

const worker = new MyWorker();
worker.postMessage({ type: 'start' });
worker.onmessage = (event) => console.log(event.data);
```

```typescript
// worker.ts
self.onmessage = (event) => {
  const result = heavyComputation(event.data);
  self.postMessage(result);
};
```

### Static Assets and the Public Directory

```
project/
├── public/
│   └── favicon.svg      # copied as-is to dist/favicon.svg, never hashed
├── src/
│   └── logo.png         # imported and processed (hashed filename, inlined if small)
```

```typescript
// Referencing a public/ asset — always root-absolute, never imported
// <img src="/favicon.svg" />

// Referencing a src/ asset — imported so Vite can hash and optimize it
import logoUrl from './logo.png';
// <img src={logoUrl} />
```

### CSS Features

```bash
# Sass/Less work with zero config beyond the preprocessor itself
npm install -D sass
```

```css
/* Card.module.css — CSS Modules: class names are scoped automatically */
.card {
  border-radius: 8px;
}
```

```tsx
// Card.tsx
import styles from './Card.module.css';

export function Card() {
  return <div className={styles.card}>Content</div>;
}
```

```javascript
// postcss.config.js — auto-detected by Vite
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### Multi-Page App Configuration

```typescript
// vite.config.ts — multiple HTML entry points
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin/index.html'),
      },
    },
  },
});
```

### Custom Plugin

```typescript
// plugins/vite-plugin-banner.ts
import type { Plugin } from 'vite';

export function bannerPlugin(banner: string): Plugin {
  return {
    name: 'vite-plugin-banner',
    apply: 'build',
    generateBundle(_, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === 'chunk') {
          file.code = `/* ${banner} */\n${file.code}`;
        }
      }
    },
  };
}
```

```typescript
// vite.config.ts — using the custom plugin
import { defineConfig } from 'vite';
import { bannerPlugin } from './plugins/vite-plugin-banner';

export default defineConfig({
  plugins: [bannerPlugin('Built with Vite')],
});
```

### Library Mode

```typescript
// vite.config.ts — publishing a package
import { defineConfig } from 'vite';
import path from 'node:path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'MyLib',
      fileName: (format) => `my-lib.${format}.js`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      // Don't bundle peer dependencies into the library output
      external: ['react', 'react-dom'],
      output: {
        globals: { react: 'React', 'react-dom': 'ReactDOM' },
      },
    },
  },
});
```

### SSR Setup

```typescript
// server.ts — Node server embedding Vite in middleware mode
import express from 'express';
import { createServer as createViteServer } from 'vite';

async function createServer() {
  const app = express();

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  app.use(vite.middlewares);

  app.use('*', async (req, res, next) => {
    try {
      const { render } = await vite.ssrLoadModule('/src/entry-server.ts');
      const html = await render(req.originalUrl);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  app.listen(5173);
}

createServer();
```

### Testing with Vitest

```typescript
// vite.config.ts — sharing config between app and Vitest
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
```

```typescript
// src/components/Counter.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Counter } from './Counter';

describe('Counter', () => {
  it('increments on click', () => {
    render(<Counter />);
    fireEvent.click(screen.getByRole('button', { name: /increment/i }));
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
```

```bash
# Run Vitest
npx vitest run
npx vitest --ui
npx vitest run --coverage
```
