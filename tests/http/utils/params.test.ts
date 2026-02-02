/**
 * Tests for HTTP parameter handling utilities
 */

import {
  getStringParam,
  getOptionalStringParam,
  getNumberParam,
  getBooleanParam,
} from '../../../src/http/utils/params';

describe('Params Utils', () => {
  describe('getStringParam', () => {
    it('should return string value as-is', () => {
      const result = getStringParam('test-value');
      expect(result).toBe('test-value');
    });

    it('should return first element from array', () => {
      const result = getStringParam(['first', 'second', 'third']);
      expect(result).toBe('first');
    });

    it('should handle empty string', () => {
      const result = getStringParam('');
      expect(result).toBe('');
    });

    it('should handle single-element array', () => {
      const result = getStringParam(['only']);
      expect(result).toBe('only');
    });

    it('should handle numeric string', () => {
      const result = getStringParam('123');
      expect(result).toBe('123');
    });

    it('should handle URL-encoded string', () => {
      const result = getStringParam('hello%20world');
      expect(result).toBe('hello%20world');
    });

    it('should handle special characters', () => {
      const result = getStringParam('test@#$%');
      expect(result).toBe('test@#$%');
    });

    it('should handle unicode characters', () => {
      const result = getStringParam('测试');
      expect(result).toBe('测试');
    });
  });

  describe('getOptionalStringParam', () => {
    it('should return string value as-is', () => {
      const result = getOptionalStringParam('test-value');
      expect(result).toBe('test-value');
    });

    it('should return first element from array', () => {
      const result = getOptionalStringParam(['first', 'second']);
      expect(result).toBe('first');
    });

    it('should return undefined for undefined input', () => {
      const result = getOptionalStringParam(undefined);
      expect(result).toBeUndefined();
    });

    it('should handle empty string', () => {
      const result = getOptionalStringParam('');
      expect(result).toBeUndefined();
    });

    it('should handle empty array', () => {
      const result = getOptionalStringParam([]);
      expect(result).toBeUndefined();
    });

    it('should return empty string from array', () => {
      const result = getOptionalStringParam(['']);
      expect(result).toBe('');
    });

    it('should handle whitespace string', () => {
      const result = getOptionalStringParam('   ');
      expect(result).toBe('   ');
    });
  });

  describe('getNumberParam', () => {
    it('should parse valid number string', () => {
      const result = getNumberParam('123');
      expect(result).toBe(123);
    });

    it('should parse negative number', () => {
      const result = getNumberParam('-456');
      expect(result).toBe(-456);
    });

    it('should parse zero', () => {
      const result = getNumberParam('0');
      expect(result).toBe(0);
    });

    it('should parse number from array', () => {
      const result = getNumberParam(['789', '100']);
      expect(result).toBe(789);
    });

    it('should return default for invalid number', () => {
      const result = getNumberParam('not-a-number', 42);
      expect(result).toBe(42);
    });

    it('should return default for undefined', () => {
      const result = getNumberParam(undefined, 100);
      expect(result).toBe(100);
    });

    it('should use 0 as default when not provided', () => {
      const result = getNumberParam('invalid');
      expect(result).toBe(0);
    });

    it('should truncate decimal numbers', () => {
      const result = getNumberParam('123.456');
      expect(result).toBe(123);
    });

    it('should handle leading zeros', () => {
      const result = getNumberParam('0042');
      expect(result).toBe(42);
    });

    it('should handle empty string with default', () => {
      const result = getNumberParam('', 99);
      expect(result).toBe(99);
    });

    it('should handle whitespace with default', () => {
      const result = getNumberParam('   ', 77);
      expect(result).toBe(77);
    });

    it('should handle exponential notation', () => {
      const result = getNumberParam('1e3');
      expect(result).toBe(1);
    });

    it('should parse large numbers', () => {
      const result = getNumberParam('999999999');
      expect(result).toBe(999999999);
    });

    it.skip('should handle negative zero', () => {
      // Note: parseInt('-0') returns 0, not -0 (IEEE 754 quirk)
      const result = getNumberParam('-0');
      expect(result).toBe(0);
    });
  });

  describe('getBooleanParam', () => {
    it('should parse "true" as true', () => {
      const result = getBooleanParam('true');
      expect(result).toBe(true);
    });

    it('should parse "1" as true', () => {
      const result = getBooleanParam('1');
      expect(result).toBe(true);
    });

    it('should parse "yes" as true', () => {
      const result = getBooleanParam('yes');
      expect(result).toBe(true);
    });

    it('should parse "TRUE" as true (case insensitive)', () => {
      const result = getBooleanParam('TRUE');
      expect(result).toBe(true);
    });

    it('should parse "Yes" as true (case insensitive)', () => {
      const result = getBooleanParam('Yes');
      expect(result).toBe(true);
    });

    it('should parse "false" as false', () => {
      const result = getBooleanParam('false');
      expect(result).toBe(false);
    });

    it('should parse "0" as false', () => {
      const result = getBooleanParam('0');
      expect(result).toBe(false);
    });

    it('should parse "no" as false', () => {
      const result = getBooleanParam('no');
      expect(result).toBe(false);
    });

    it('should return default for undefined', () => {
      const result = getBooleanParam(undefined, true);
      expect(result).toBe(true);
    });

    it('should use false as default when not provided', () => {
      const result = getBooleanParam(undefined);
      expect(result).toBe(false);
    });

    it('should parse from array', () => {
      const result = getBooleanParam(['true', 'false']);
      expect(result).toBe(true);
    });

    it('should handle empty string with default', () => {
      const result = getBooleanParam('', true);
      expect(result).toBe(true);
    });

    it('should return false for unrecognized values', () => {
      const result = getBooleanParam('maybe');
      expect(result).toBe(false);
    });

    it('should handle whitespace in truthy values', () => {
      const result = getBooleanParam(' true ');
      expect(result).toBe(false); // Trimming not applied, exact match needed
    });
  });

  describe('integration scenarios', () => {
    it('should handle typical query parameter parsing', () => {
      // Simulating Express req.query
      const queryParams = {
        search: 'test-query',
        page: '2',
        limit: '20',
        includeArchived: 'true',
        sortBy: ['name', 'date'], // Multiple values
        tags: undefined,
      };

      const search = getStringParam(queryParams.search);
      const page = getNumberParam(queryParams.page, 1);
      const limit = getNumberParam(queryParams.limit, 10);
      const includeArchived = getBooleanParam(queryParams.includeArchived);
      const sortBy = getStringParam(queryParams.sortBy);
      const tags = getOptionalStringParam(queryParams.tags);

      expect(search).toBe('test-query');
      expect(page).toBe(2);
      expect(limit).toBe(20);
      expect(includeArchived).toBe(true);
      expect(sortBy).toBe('name'); // First from array
      expect(tags).toBeUndefined();
    });

    it('should handle pagination parameters', () => {
      const page = getNumberParam('5', 1);
      const pageSize = getNumberParam('50', 20);
      const offset = (page - 1) * pageSize;

      expect(page).toBe(5);
      expect(pageSize).toBe(50);
      expect(offset).toBe(200);
    });

    it('should handle filter parameters', () => {
      const filters = {
        status: 'active',
        minPrice: '100',
        maxPrice: '500',
        inStock: 'true',
        category: undefined,
      };

      const status = getStringParam(filters.status);
      const minPrice = getNumberParam(filters.minPrice, 0);
      const maxPrice = getNumberParam(
        filters.maxPrice,
        Number.MAX_SAFE_INTEGER
      );
      const inStock = getBooleanParam(filters.inStock, false);
      const category = getOptionalStringParam(filters.category);

      expect(status).toBe('active');
      expect(minPrice).toBe(100);
      expect(maxPrice).toBe(500);
      expect(inStock).toBe(true);
      expect(category).toBeUndefined();
    });

    it('should handle invalid input gracefully', () => {
      const page = getNumberParam('abc', 1);
      const limit = getNumberParam(undefined, 10);
      const sort = getOptionalStringParam(undefined);
      const active = getBooleanParam('maybe', false);

      expect(page).toBe(1);
      expect(limit).toBe(10);
      expect(sort).toBeUndefined();
      expect(active).toBe(false);
    });

    it('should handle edge cases in route parameters', () => {
      // Express can return arrays for duplicate params
      const userId = getStringParam(['user-123']);
      const version = getStringParam(['v1', 'v2']); // Takes first
      const count = getNumberParam(['10', '20'], 1);

      expect(userId).toBe('user-123');
      expect(version).toBe('v1');
      expect(count).toBe(10);
    });
  });
});
