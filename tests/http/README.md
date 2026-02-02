# HTTP Utilities and Schemas Test Suite

## Overview

Comprehensive test coverage for HTTP layer with **234 tests** across 5 test files.

## Test Files

### Utils (134 tests)

- `utils/jwt.test.ts` - 34 tests - JWT token generation, verification, decoding
- `utils/password.test.ts` - 25 tests - Bcrypt hashing and verification
- `utils/response.test.ts` - 27 tests - HTTP response helpers
- `utils/params.test.ts` - 48 tests - Query/path parameter parsing

### Schemas (100 tests)

- `schemas/schemas.test.ts` - 100 tests - Zod schema validation for:
  - Artifact schemas (50 tests)
  - Search schemas (8 tests)
  - Version schemas (13 tests)
  - Auth schemas (29 tests)

## Running Tests

### Note: HTTP tests are excluded from default CI runs

These tests are excluded in `vitest.config.ts` to prevent hanging in CI. Run them explicitly:

### Run All HTTP Tests (bypassing exclude)

```bash
npx vitest run tests/http/ --no-coverage
```

### Run Individual Suites

```bash
# JWT utilities
npx vitest run tests/http/utils/jwt.test.ts --no-coverage

# Password utilities
npx vitest run tests/http/utils/password.test.ts --no-coverage

# Response utilities
npx vitest run tests/http/utils/response.test.ts --no-coverage

# Parameter utilities
npx vitest run tests/http/utils/params.test.ts --no-coverage

# All schemas
npx vitest run tests/http/schemas/schemas.test.ts --no-coverage
```

### Run with Watch Mode

```bash
npx vitest tests/http/utils/jwt.test.ts
```

### Run with Coverage

```bash
npx vitest run tests/http/ --coverage
```

## Test Characteristics

- **No explicit vitest imports** - Uses globals mode
- **Extensionless imports** - All imports use `.js` extension
- **Comprehensive edge cases** - Boundary values, invalid inputs, unicode
- **Security-focused** - Token tampering, injection, validation
- **Integration scenarios** - Complete user flows tested

## Coverage Areas

### JWT Utils (`jwt.test.ts`)

- Configuration management
- Token signing (access + refresh)
- Token verification
- Token decoding (unverified)
- Expiration parsing
- Security: tampering, expiration, invalid signatures

### Password Utils (`password.test.ts`)

- Bcrypt hashing
- Password verification
- Rehash detection
- Edge cases: empty, long, unicode, special chars
- Integration: registration, password change flows

### Response Utils (`response.test.ts`)

- Success responses (200, 201, 204)
- Error responses (400, 401, 403, 404, 409, 500)
- Validation errors
- Timestamp formatting
- Response structure consistency

### Params Utils (`params.test.ts`)

- String parameter extraction
- Optional string parameters
- Number parsing with defaults
- Boolean parsing (true/false/1/0/yes/no)
- Array parameter handling
- Integration: pagination, filtering

### Schemas (`schemas.test.ts`)

- **Artifacts**: Types, metadata, stats, CRUD operations, listing
- **Search**: Queries, results, highlights, suggestions
- **Versions**: Semver, metadata, comparison
- **Auth**: Registration, login, tokens, user data

## Quick Examples

### Running JWT tests

```bash
npx vitest run tests/http/utils/jwt.test.ts --no-coverage
# Expected: 34 tests passing
```

### Running all schemas

```bash
npx vitest run tests/http/schemas/schemas.test.ts --no-coverage
# Expected: 100 tests passing
```

### Check test count

```bash
grep -r "^\s*it(" tests/http/ | wc -l
# Expected: 234
```

## Documentation

See `docs/testing/HTTP_TESTS_SUMMARY.md` for detailed breakdown of all test cases.

## Notes

1. These tests are **excluded from CI** by default (see `vitest.config.ts`)
2. Run them explicitly during development with `npx vitest run tests/http/`
3. All tests use **vitest globals** - no imports needed
4. Tests are **isolated** - can run individually or in parallel
5. **Async tests** use proper async/await (password hashing)
6. **Mocking** for Express Response objects in response tests
7. **Fake timers** for consistent timestamp testing
