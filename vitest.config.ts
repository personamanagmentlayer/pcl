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
      'tests/http/**/*.test.ts', // Skip HTTP server tests (they hang in CI)
      'tests/benchmarks/**/*.test.ts', // Skip benchmarks in CI (run with ENABLE_BENCHMARKS=true)
    ],
    globalTeardown: './tests/setup/global-teardown.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/cli/**',
        'src/**/*.d.ts',
        'src/**/index.ts', // Re-export files
        'src/types/index.ts',
      ],
      // Progressive thresholds - increase as test coverage improves
      // Target: 90% for production (per CLAUDE.md)
      // Current baseline: 28.76% lines, 32.07% functions, 69.81% branches
      thresholds: {
        lines: 28, // Current baseline - prevent regression
        functions: 32, // Current baseline - prevent regression
        branches: 69, // Current baseline - prevent regression
        statements: 28, // Current baseline - prevent regression
        // Roadmap to 90% (see docs/testing/COVERAGE_ROADMAP.md):
        // - Q1 2026: 50% (add provider tests)
        // - Q2 2026: 70% (add integration tests)
        // - Q3 2026: 90% (comprehensive coverage)
      },
      all: true,
      clean: true,
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    pool: 'forks', // Use process isolation to prevent hanging
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },
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
