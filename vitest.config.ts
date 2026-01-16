import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
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
      '@pcl/types': '/src/types',
      '@pcl/ast': '/src/ast',
      '@pcl/lexer': '/src/lexer',
      '@pcl/parser': '/src/parser',
    },
  },
});
