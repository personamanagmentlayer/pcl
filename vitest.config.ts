import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: [
      'tests/**/*.mjs',
      'tests/**/*.integration.test.ts', // Skip API integration tests by default
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/cli/**'],
    },
    testTimeout: 10000,
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
