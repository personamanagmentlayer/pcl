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
      'tests/http/**/*.test.ts', // HTTP server tests can hang: `npm run test:http`
      // Benchmarks are timing-sensitive and skipped unless explicitly enabled
      ...(process.env.ENABLE_BENCHMARKS === 'true'
        ? []
        : ['tests/benchmarks/**/*.test.ts']),
    ],
    globalTeardown: './tests/setup/global-teardown.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/cli/**',
        'src/**/*.d.ts',
        // Genuine barrel files (re-exports only). NOTE: `src/**/index.ts` must
        // NOT be excluded wholesale — the lexer, parser, semantic analyzer,
        // AST, codegen and type system are all implemented inside index.ts
        // files, and excluding them hid ~15k lines of the compiler core from
        // every coverage report.
        'src/index.ts',
        'src/lsp/index.ts',
        'src/mcp/index.ts',
        'src/registry/index.ts',
        'src/skills/index.ts',
        'src/observability/index.ts',
        'src/providers/index.ts',
        'src/http/routes/index.ts',
        'src/runtime/providers/index.ts',
        'src/runtime/events/index.ts',
        'src/runtime/events/adapters/index.ts',
        'src/runtime/events/handlers/index.ts',
        'src/runtime/analytics/index.ts',
        'src/runtime/confidence/index.ts',
        'src/runtime/routing/index.ts',
      ],
      // Thresholds sit just under the measured values so a regression fails
      // the build. Target: 90% for production (per CLAUDE.md).
      // Measured 2026-09-05: 71.9% lines, 78.8% functions, 83.5% branches.
      thresholds: {
        lines: 70,
        functions: 77,
        branches: 82,
        statements: 70,
        // Roadmap to 90% (see docs/testing/COVERAGE_ROADMAP.md):
        // - 80% once src/http is covered by the main suite
        // - 90% comprehensive coverage
      },
      all: true,
      clean: true,
      // Always emit the report, including when tests fail — otherwise a single
      // failing test leaves you with no coverage data at all.
      reportOnFailure: true,
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
