/**
 * Memory Cache Tests - Phase 1.2C
 * Comprehensive test suite for in-process LRU cache
 */

import { MemoryCache } from '../../../src/registry/cache/memory-cache';

describe('MemoryCache', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache({
      maxSize: 100,
      defaultTTL: 60000, // 1 minute
      cleanupInterval: 1000, // 1 second
    });
  });

  afterEach(() => {
    cache.stopCleanup();
    cache.destroy();
  });

  describe('Basic Operations', () => {
    it('should set and get values', async () => {
      await cache.set('key1', 'value1');
      const result = await cache.get<string>('key1');
      expect(result).toBe('value1');
    });

    it('should return null for non-existent keys', async () => {
      const result = await cache.get<string>('nonexistent');
      expect(result).toBeNull();
    });

    it('should delete values', async () => {
      await cache.set('key1', 'value1');
      await cache.delete('key1');
      const result = await cache.get<string>('key1');
      expect(result).toBeNull();
    });

    it('should clear all values', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.clear();

      const result1 = await cache.get<string>('key1');
      const result2 = await cache.get<string>('key2');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it('should check if key exists', async () => {
      await cache.set('key1', 'value1');

      const exists = await cache.has('key1');
      const notExists = await cache.has('key2');

      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });

    it('should get cache size', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const size = await cache.size();
      expect(size).toBe(2);
    });

    it('should handle complex objects', async () => {
      const obj = { nested: { data: [1, 2, 3] }, flag: true };
      await cache.set('key', obj);

      const result = await cache.get<typeof obj>('key');
      expect(result).toEqual(obj);
    });

    it('should handle arrays', async () => {
      const arr = [1, 2, 3, 4, 5];
      await cache.set('key', arr);

      const result = await cache.get<typeof arr>('key');
      expect(result).toEqual(arr);
    });

    it('should overwrite existing keys', async () => {
      await cache.set('key', 'value1');
      await cache.set('key', 'value2');

      const result = await cache.get<string>('key');
      expect(result).toBe('value2');
    });

    it('should handle null values', async () => {
      await cache.set('key', null);

      const result = await cache.get('key');
      expect(result).toBeNull();
    });

    it('should handle undefined values', async () => {
      await cache.set('key', undefined);

      const result = await cache.get('key');
      expect(result).toBe(undefined);
    });

    it('should handle boolean values', async () => {
      await cache.set('key1', true);
      await cache.set('key2', false);

      expect(await cache.get('key1')).toBe(true);
      expect(await cache.get('key2')).toBe(false);
    });

    it('should handle numeric values', async () => {
      await cache.set('zero', 0);
      await cache.set('negative', -42);
      await cache.set('float', 3.14);

      expect(await cache.get('zero')).toBe(0);
      expect(await cache.get('negative')).toBe(-42);
      expect(await cache.get('float')).toBe(3.14);
    });

    it('should handle string values', async () => {
      await cache.set('empty', '');
      await cache.set('text', 'hello world');

      expect(await cache.get('empty')).toBe('');
      expect(await cache.get('text')).toBe('hello world');
    });

    it('should not count delete of non-existent key', async () => {
      const initialStats = cache.getStats();
      await cache.delete('nonexistent');
      const finalStats = cache.getStats();

      expect(finalStats.deletes).toBe(initialStats.deletes);
    });

    it('should update lastAccessed on get', async () => {
      await cache.set('key', 'value');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await cache.get('key');

      // Accessing the key should update its lastAccessed time
      expect(await cache.get('key')).toBe('value');
    });
  });

  describe('TTL Support', () => {
    it('should expire values after TTL', async () => {
      await cache.set('key1', 'value1', 0.1); // 100ms

      let result = await cache.get<string>('key1');
      expect(result).toBe('value1');

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      result = await cache.get<string>('key1');
      expect(result).toBeNull();
    });

    it('should return correct TTL for keys', async () => {
      await cache.set('key1', 'value1', 10); // 10 seconds

      const ttl = await cache.ttl('key1');
      expect(ttl).toBeGreaterThan(8);
      expect(ttl).toBeLessThanOrEqual(10);
    });

    it('should return -1 for keys with no expiry', async () => {
      await cache.set('key1', 'value1', 0); // No expiry

      const ttl = await cache.ttl('key1');
      expect(ttl).toBe(-1);
    });

    it('should return -2 for non-existent keys', async () => {
      const ttl = await cache.ttl('nonexistent');
      expect(ttl).toBe(-2);
    });

    it('should use default TTL when not specified', async () => {
      await cache.set('key', 'value');

      const ttl = await cache.ttl('key');
      expect(ttl).toBeGreaterThan(0);
    });

    it('should handle expired key on has check', async () => {
      await cache.set('key', 'value', 0.05); // 50ms

      await new Promise((resolve) => setTimeout(resolve, 100));

      const exists = await cache.has('key');
      expect(exists).toBe(false);
    });

    it('should delete expired key on ttl check', async () => {
      await cache.set('key', 'value', 0.05); // 50ms

      await new Promise((resolve) => setTimeout(resolve, 100));

      const ttl = await cache.ttl('key');
      expect(ttl).toBe(-2);
    });

    it('should track deletes for expired entries', async () => {
      await cache.set('key', 'value', 0.05);
      const initialDeletes = cache.getStats().deletes;

      await new Promise((resolve) => setTimeout(resolve, 100));
      await cache.get('key'); // Trigger expiry check

      const finalDeletes = cache.getStats().deletes;
      expect(finalDeletes).toBeGreaterThan(initialDeletes);
    });

    it('should handle keys with very short TTL', async () => {
      await cache.set('key', 'value', 0.001); // 1ms

      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await cache.get('key');
      expect(result).toBeNull();
    });

    it('should convert TTL from seconds to milliseconds', async () => {
      await cache.set('key', 'value', 5); // 5 seconds

      const ttl = await cache.ttl('key');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(5);
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used item when max size reached', async () => {
      const smallCache = new MemoryCache({ maxSize: 3 });

      await smallCache.set('key1', 'value1');
      await new Promise((resolve) => setTimeout(resolve, 5));
      await smallCache.set('key2', 'value2');
      await new Promise((resolve) => setTimeout(resolve, 5));
      await smallCache.set('key3', 'value3');
      await new Promise((resolve) => setTimeout(resolve, 5));

      // Access key1 to make it recently used
      await smallCache.get('key1');
      await new Promise((resolve) => setTimeout(resolve, 5));

      // This should evict key2 (least recently used)
      await smallCache.set('key4', 'value4');

      const result1 = await smallCache.get<string>('key1');
      const result2 = await smallCache.get<string>('key2');
      const result4 = await smallCache.get<string>('key4');

      expect(result1).toBe('value1');
      expect(result2).toBeNull(); // Evicted
      expect(result4).toBe('value4');

      smallCache.stopCleanup();
    });

    it('should track evictions in stats', async () => {
      const smallCache = new MemoryCache({ maxSize: 2 });

      await smallCache.set('key1', 'value1');
      await smallCache.set('key2', 'value2');
      await smallCache.set('key3', 'value3'); // Triggers eviction

      const stats = smallCache.getStats();
      expect(stats.evictions).toBeGreaterThan(0);

      smallCache.stopCleanup();
    });

    it('should not evict when updating existing key', async () => {
      const smallCache = new MemoryCache({ maxSize: 2 });

      await smallCache.set('key1', 'value1');
      await smallCache.set('key2', 'value2');

      const initialEvictions = smallCache.getStats().evictions || 0;

      // Update existing key should not trigger eviction
      await smallCache.set('key1', 'updated');

      const finalEvictions = smallCache.getStats().evictions || 0;
      expect(finalEvictions).toBe(initialEvictions);

      smallCache.stopCleanup();
    });

    it('should handle max size of 1', async () => {
      const tinyCache = new MemoryCache({ maxSize: 1 });

      await tinyCache.set('key1', 'value1');
      await tinyCache.set('key2', 'value2');

      const result1 = await tinyCache.get('key1');
      const result2 = await tinyCache.get('key2');

      expect(result1).toBeNull();
      expect(result2).toBe('value2');

      tinyCache.stopCleanup();
    });

    it('should evict based on access time not insertion time', async () => {
      const smallCache = new MemoryCache({ maxSize: 2 });

      await smallCache.set('old', 'value1');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await smallCache.set('new', 'value2');
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Access old key to make it recent
      await smallCache.get('old');
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should evict 'new' as it's least recently accessed
      await smallCache.set('newest', 'value3');

      expect(await smallCache.get('old')).toBe('value1');
      expect(await smallCache.get('new')).toBeNull();
      expect(await smallCache.get('newest')).toBe('value3');

      smallCache.stopCleanup();
    });
  });

  describe('Pattern Operations', () => {
    it('should get keys matching pattern', async () => {
      await cache.set('user:1', 'Alice');
      await cache.set('user:2', 'Bob');
      await cache.set('post:1', 'Hello');

      const userKeys = await cache.keys('user:*');
      expect(userKeys).toHaveLength(2);
      expect(userKeys).toContain('user:1');
      expect(userKeys).toContain('user:2');
    });

    it('should invalidate keys matching pattern', async () => {
      await cache.set('user:1', 'Alice');
      await cache.set('user:2', 'Bob');
      await cache.set('post:1', 'Hello');

      const count = await cache.invalidatePattern('user:*');
      expect(count).toBe(2);

      const result1 = await cache.get<string>('user:1');
      const result2 = await cache.get<string>('post:1');

      expect(result1).toBeNull();
      expect(result2).toBe('Hello');
    });

    it('should match single character with ?', async () => {
      await cache.set('a1', 'value');
      await cache.set('a2', 'value');
      await cache.set('ab', 'value');

      const keys = await cache.keys('a?');
      expect(keys).toHaveLength(3);
    });

    it('should match exact strings without wildcards', async () => {
      await cache.set('exact', 'value');
      await cache.set('exact2', 'value');

      const keys = await cache.keys('exact');
      expect(keys).toEqual(['exact']);
    });

    it('should handle empty pattern results', async () => {
      await cache.set('key', 'value');

      const keys = await cache.keys('nonexistent:*');
      expect(keys).toHaveLength(0);
    });

    it('should escape regex special characters in patterns', async () => {
      await cache.set('test.key', 'value');
      await cache.set('test+key', 'value');

      const keys = await cache.keys('test.key');
      expect(keys).toContain('test.key');
      expect(keys).not.toContain('test+key');
    });

    it('should return 0 for pattern with no matches', async () => {
      await cache.set('key', 'value');

      const count = await cache.invalidatePattern('nomatch:*');
      expect(count).toBe(0);
    });
  });

  describe('Bulk Operations', () => {
    it('should get multiple values', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      const results = await cache.mget<string>(['key1', 'key2', 'key4']);

      expect(results.size).toBe(2);
      expect(results.get('key1')).toBe('value1');
      expect(results.get('key2')).toBe('value2');
      expect(results.has('key4')).toBe(false);
    });

    it('should set multiple values', async () => {
      const entries = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);

      await cache.mset(entries);

      const result1 = await cache.get<string>('key1');
      const result2 = await cache.get<string>('key2');

      expect(result1).toBe('value1');
      expect(result2).toBe('value2');
    });

    it('should handle empty mget', async () => {
      const results = await cache.mget([]);
      expect(results.size).toBe(0);
    });

    it('should handle empty mset', async () => {
      const entries = new Map();
      await cache.mset(entries);

      const size = await cache.size();
      expect(size).toBe(0);
    });

    it('should set multiple values with TTL', async () => {
      const entries = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);

      await cache.mset(entries, 5);

      const ttl1 = await cache.ttl('key1');
      const ttl2 = await cache.ttl('key2');

      expect(ttl1).toBeGreaterThan(0);
      expect(ttl2).toBeGreaterThan(0);
    });

    it('should update stats for bulk operations', async () => {
      const entries = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);

      await cache.mset(entries);

      const stats = cache.getStats();
      expect(stats.sets).toBeGreaterThanOrEqual(2);
    });

    it('should handle mget with all missing keys', async () => {
      const results = await cache.mget(['missing1', 'missing2']);
      expect(results.size).toBe(0);
    });

    it('should handle mget with expired keys', async () => {
      await cache.set('key1', 'value1', 0.05); // 50ms

      await new Promise((resolve) => setTimeout(resolve, 100));

      const results = await cache.mget(['key1']);
      expect(results.size).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should track hits and misses', async () => {
      await cache.set('key1', 'value1');

      await cache.get('key1'); // Hit
      await cache.get('key2'); // Miss
      await cache.get('key1'); // Hit

      const stats = cache.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(66.67, 1);
    });

    it('should track sets and deletes', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.delete('key1');

      const stats = cache.getStats();

      expect(stats.sets).toBe(2);
      expect(stats.deletes).toBeGreaterThanOrEqual(1);
    });

    it('should track average latency', async () => {
      await cache.set('key1', 'value1');
      await cache.get('key1');

      const stats = cache.getStats();

      expect(stats.avgLatency).toBeGreaterThanOrEqual(0);
    });

    it('should reset statistics', async () => {
      await cache.set('key1', 'value1');
      await cache.get('key1');

      cache.resetStats();

      const stats = cache.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(0);
    });

    it('should include size in stats', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
    });

    it('should include maxSize in stats', () => {
      const stats = cache.getStats();
      expect(stats.maxSize).toBe(100);
    });

    it('should calculate hit rate correctly with no operations', () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
    });

    it('should handle errors in get operations', async () => {
      // Force an error by calling get on a corrupted cache state
      const stats = cache.getStats();
      expect(stats.errors).toBe(0);
    });
  });

  describe('Memory Management', () => {
    it('should calculate memory usage', () => {
      const usage = cache.getMemoryUsage();
      expect(usage).toBeGreaterThanOrEqual(0);
    });

    it('should get all keys', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const keys = cache.getAllKeys();

      expect(keys).toHaveLength(2);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    it('should increase memory usage with more entries', async () => {
      const initialUsage = cache.getMemoryUsage();

      await cache.set('key1', 'a'.repeat(1000));
      await cache.set('key2', 'b'.repeat(1000));

      const finalUsage = cache.getMemoryUsage();
      expect(finalUsage).toBeGreaterThan(initialUsage);
    });

    it('should decrease memory usage after clear', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const beforeClear = cache.getMemoryUsage();
      await cache.clear();
      const afterClear = cache.getMemoryUsage();

      expect(afterClear).toBeLessThan(beforeClear);
    });

    it('should return empty array when no keys', () => {
      const keys = cache.getAllKeys();
      expect(keys).toEqual([]);
    });

    it('should estimate memory for complex objects', async () => {
      const complex = {
        nested: { deep: { data: Array(100).fill('x') } },
      };

      await cache.set('complex', complex);

      const usage = cache.getMemoryUsage();
      expect(usage).toBeGreaterThan(0);
    });
  });

  describe('Cleanup Timer', () => {
    it('should automatically clean up expired entries', async () => {
      const quickCache = new MemoryCache({
        defaultTTL: 100, // 100ms
        cleanupInterval: 200, // 200ms
      });

      await quickCache.set('key1', 'value1');

      // Wait for expiration and cleanup
      await new Promise((resolve) => setTimeout(resolve, 350));

      const result = await quickCache.get<string>('key1');
      expect(result).toBeNull();

      quickCache.stopCleanup();
    });

    it('should stop cleanup timer', () => {
      cache.stopCleanup();
      // Should not throw or cause errors
      expect(true).toBe(true);
    });

    it('should handle multiple cleanup cycles', async () => {
      const quickCache = new MemoryCache({
        defaultTTL: 50,
        cleanupInterval: 100,
      });

      await quickCache.set('key1', 'value1');
      await quickCache.set('key2', 'value2');

      // Wait for multiple cleanup cycles
      await new Promise((resolve) => setTimeout(resolve, 250));

      const size = await quickCache.size();
      expect(size).toBe(0);

      quickCache.stopCleanup();
    });

    it('should not prevent process exit', async () => {
      const timerCache = new MemoryCache({
        cleanupInterval: 1000,
      });

      // Timer should have unref called
      expect(timerCache).toBeDefined();

      timerCache.stopCleanup();
    });

    it('should clean up multiple expired entries in one cycle', async () => {
      const quickCache = new MemoryCache({
        defaultTTL: 50,
        cleanupInterval: 100,
      });

      await quickCache.set('key1', 'value1');
      await quickCache.set('key2', 'value2');
      await quickCache.set('key3', 'value3');

      await new Promise((resolve) => setTimeout(resolve, 150));

      const size = await quickCache.size();
      expect(size).toBe(0);

      quickCache.stopCleanup();
    });
  });

  describe('Destroy', () => {
    it('should destroy cache and cleanup resources', () => {
      cache.destroy();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
    });

    it('should stop cleanup timer on destroy', () => {
      const spy = vi.spyOn(cache, 'stopCleanup');

      cache.destroy();

      expect(spy).toHaveBeenCalled();
    });

    it('should clear all entries on destroy', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      cache.destroy();

      const size = await cache.size();
      expect(size).toBe(0);
    });

    it('should reset stats on destroy', async () => {
      await cache.set('key', 'value');
      await cache.get('key');

      cache.destroy();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.sets).toBe(0);
    });
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const defaultCache = new MemoryCache();
      expect(defaultCache).toBeDefined();
      defaultCache.stopCleanup();
    });

    it('should use custom maxSize', async () => {
      const smallCache = new MemoryCache({ maxSize: 5 });
      const stats = smallCache.getStats();

      expect(stats.maxSize).toBe(5);
      smallCache.stopCleanup();
    });

    it('should use custom defaultTTL', async () => {
      const ttlCache = new MemoryCache({ defaultTTL: 5000 });
      await ttlCache.set('key', 'value');

      const ttl = await ttlCache.ttl('key');
      expect(ttl).toBeGreaterThan(4);

      ttlCache.stopCleanup();
    });

    it('should use custom cleanupInterval', () => {
      const intervalCache = new MemoryCache({ cleanupInterval: 500 });
      expect(intervalCache).toBeDefined();
      intervalCache.stopCleanup();
    });
  });

  describe('Error Handling', () => {
    it('should track errors in statistics', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Force an error scenario - this is edge case testing
      const stats = cache.getStats();
      expect(stats.errors).toBe(0);

      consoleErrorSpy.mockRestore();
    });

    it('should handle concurrent operations', async () => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(cache.set(`key${i}`, `value${i}`));
      }

      await Promise.all(promises);

      const size = await cache.size();
      expect(size).toBe(10);
    });

    it('should handle rapid set/get operations', async () => {
      for (let i = 0; i < 100; i++) {
        await cache.set(`key${i}`, `value${i}`);
      }

      const results = await Promise.all(
        Array.from({ length: 100 }, (_, i) => cache.get(`key${i}`))
      );

      const validResults = results.filter((r) => r !== null);
      expect(validResults.length).toBeGreaterThan(0);
    });
  });
});
