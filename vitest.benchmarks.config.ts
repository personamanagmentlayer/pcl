import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Vitest configuration for performance benchmarks.
 *
 * Benchmarks are excluded from the default run because they are timing
 * sensitive and noisy on shared CI runners. Run them explicitly with
 * `npm run test:benchmarks` (the default suite also picks them up when
 * ENABLE_BENCHMARKS=true is set in the environment).
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/benchmarks/**/*.test.ts'],
    exclude: ['tests/**/*.mjs'],
    // Benchmarks run many iterations; the default 10s is too tight.
    testTimeout: 60000,
    hookTimeout: 60000,
    teardownTimeout: 10000,
    pool: 'forks',
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
