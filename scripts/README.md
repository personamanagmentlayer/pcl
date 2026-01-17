# Development Scripts

This folder contains development and testing scripts.

## Scripts

### Testing Scripts

- **`run-all-tests.mjs`** - Run all test suites

  ```bash
  npm run test:standalone
  ```

- **`test-full-features.mjs`** - Test full feature set

  ```bash
  npm run test:full
  ```

- **`test-parser-capabilities.mjs`** - Test parser capabilities

  ```bash
  npm run test:parser
  ```

### Debug Scripts

- **`debug.js`** - Debug utilities
- **`debug-duplicate.js`** - Debug duplicate detection

## Usage

All scripts can be run via npm scripts (see `package.json`) or directly:

```bash
node scripts/run-all-tests.mjs
node scripts/test-full-features.mjs
node scripts/test-parser-capabilities.mjs
```

## Note

These are development-only scripts and are not included in the published package.
