import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Vitest configuration for HTTP service tests
 * These tests are excluded from default runs because they can hang in CI
 * Use: npm run test:http or vitest --config vitest.http.config.ts
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/http/**/*.test.ts'],
    exclude: ['tests/**/*.mjs'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/http/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/index.ts'],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
  },
  resolve: {
    alias: {
      '@pcl/types': resolve(__dirname, './src/types'),
      '@pcl/ast': resolve(__dirname, './src/ast'),
      '@pcl/lexer': resolve(__dirname, './src/lexer'),
      '@pcl/parser': resolve(__dirname, './src/parser'),
    },
  },
  esbuild: {
    target: 'es2022',
  },
});
