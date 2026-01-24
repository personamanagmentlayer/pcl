/**
 * Memory Cache Tests - Phase 1.2C
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
  });

  describe('TTL Support', () => {
    it('should expire values after TTL', async () => {
      await cache.set('key1', 'value1', 0.1); // 100ms

      let result = await cache.get<string>('key1');
      expect(result).toBe('value1');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

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
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used item when max size reached', async () => {
      const smallCache = new MemoryCache({ maxSize: 3 });

      await smallCache.set('key1', 'value1');
      await smallCache.set('key2', 'value2');
      await smallCache.set('key3', 'value3');

      // Access key1 to make it recently used
      await smallCache.get('key1');

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
  });

  describe('Cleanup Timer', () => {
    it('should automatically clean up expired entries', async () => {
      const quickCache = new MemoryCache({
        defaultTTL: 100, // 100ms
        cleanupInterval: 200, // 200ms
      });

      await quickCache.set('key1', 'value1');

      // Wait for expiration and cleanup
      await new Promise(resolve => setTimeout(resolve, 350));

      const result = await quickCache.get<string>('key1');
      expect(result).toBeNull();

      quickCache.stopCleanup();
    });

    it('should stop cleanup timer', () => {
      cache.stopCleanup();
      // Should not throw or cause errors
      expect(true).toBe(true);
    });
  });

  describe('Destroy', () => {
    it('should destroy cache and cleanup resources', () => {
      cache.destroy();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
    });
  });
});
