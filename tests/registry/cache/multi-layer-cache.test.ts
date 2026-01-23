/**
 * Multi-Layer Cache Tests - Phase 1.2C
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MultiLayerCache } from '../../../src/registry/cache/multi-layer-cache';
import { MemoryCache } from '../../../src/registry/cache/memory-cache';

describe('MultiLayerCache', () => {
  let l1: MemoryCache;
  let l2: MemoryCache;
  let l3: MemoryCache;
  let cache: MultiLayerCache;

  beforeEach(() => {
    l1 = new MemoryCache({ maxSize: 10, defaultTTL: 60000 });
    l2 = new MemoryCache({ maxSize: 100, defaultTTL: 120000 });
    l3 = new MemoryCache({ maxSize: 1000, defaultTTL: 180000 });

    cache = new MultiLayerCache({
      l1,
      l2,
      l3,
      populateOnMiss: true,
      propagateSets: true,
      propagateDeletes: true,
    });
  });

  afterEach(() => {
    l1.stopCleanup();
    l2.stopCleanup();
    l3.stopCleanup();
  });

  describe('Basic Operations', () => {
    it('should set value in all layers when propagateSets is true', async () => {
      await cache.set('key1', 'value1');

      const l1Value = await l1.get<string>('key1');
      const l2Value = await l2.get<string>('key1');
      const l3Value = await l3.get<string>('key1');

      expect(l1Value).toBe('value1');
      expect(l2Value).toBe('value1');
      expect(l3Value).toBe('value1');
    });

    it('should only set in L1 when propagateSets is false', async () => {
      const noPropagateCache = new MultiLayerCache({
        l1,
        l2,
        l3,
        propagateSets: false,
      });

      await noPropagateCache.set('key1', 'value1');

      const l1Value = await l1.get<string>('key1');
      const l2Value = await l2.get<string>('key1');

      expect(l1Value).toBe('value1');
      expect(l2Value).toBeNull();
    });

    it('should get value from first available layer', async () => {
      // Set only in L2
      await l2.set('key1', 'value1');

      const result = await cache.get<string>('key1');
      expect(result).toBe('value1');
    });

    it('should delete from all layers when propagateDeletes is true', async () => {
      await cache.set('key1', 'value1');
      await cache.delete('key1');

      const l1Value = await l1.get<string>('key1');
      const l2Value = await l2.get<string>('key1');
      const l3Value = await l3.get<string>('key1');

      expect(l1Value).toBeNull();
      expect(l2Value).toBeNull();
      expect(l3Value).toBeNull();
    });

    it('should clear all layers', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.clear();

      const result1 = await cache.get<string>('key1');
      const result2 = await cache.get<string>('key2');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('Cascading Lookup', () => {
    it('should try L1 → L2 → L3 in order', async () => {
      // Set only in L3
      await l3.set('key1', 'value1');

      const result = await cache.get<string>('key1');
      expect(result).toBe('value1');
    });

    it('should return null if not found in any layer', async () => {
      const result = await cache.get<string>('nonexistent');
      expect(result).toBeNull();
    });

    it('should stop searching after finding value in L1', async () => {
      await l1.set('key1', 'L1 value');
      await l2.set('key1', 'L2 value');

      const result = await cache.get<string>('key1');
      expect(result).toBe('L1 value');
    });
  });

  describe('Cache Population', () => {
    it('should populate upper layers when value found in lower layer', async () => {
      // Set only in L3
      await l3.set('key1', 'value1');

      // Get should populate L1 and L2
      await cache.get<string>('key1');

      const l1Value = await l1.get<string>('key1');
      const l2Value = await l2.get<string>('key1');

      expect(l1Value).toBe('value1');
      expect(l2Value).toBe('value1');
    });

    it('should not populate when populateOnMiss is false', async () => {
      const noPopulateCache = new MultiLayerCache({
        l1,
        l2,
        l3,
        populateOnMiss: false,
      });

      await l3.set('key1', 'value1');
      await noPopulateCache.get<string>('key1');

      const l1Value = await l1.get<string>('key1');
      expect(l1Value).toBeNull();
    });
  });

  describe('Layer Hit Tracking', () => {
    it('should track L1 hits', async () => {
      await l1.set('key1', 'value1');
      await cache.get('key1');

      const stats = cache.getStats();
      expect(stats.l1Hits).toBeGreaterThan(0);
    });

    it('should track L2 hits', async () => {
      await l2.set('key1', 'value1');
      await cache.get('key1');

      const stats = cache.getStats();
      expect(stats.l2Hits).toBeGreaterThan(0);
    });

    it('should track L3 hits', async () => {
      await l3.set('key1', 'value1');
      await cache.get('key1');

      const stats = cache.getStats();
      expect(stats.l3Hits).toBeGreaterThan(0);
    });

    it('should calculate layer hit rates', async () => {
      await l1.set('key1', 'value1');
      await l2.set('key2', 'value2');
      await l3.set('key3', 'value3');

      await cache.get('key1');
      await cache.get('key2');
      await cache.get('key3');

      const stats = cache.getStats();

      expect(stats.l1HitRate).toBeGreaterThan(0);
      expect(stats.l2HitRate).toBeGreaterThan(0);
      expect(stats.l3HitRate).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('should aggregate stats from all layers', async () => {
      await cache.set('key1', 'value1');
      await cache.get('key1');
      await cache.get('nonexistent');

      const stats = cache.getStats();

      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.layers).toBeDefined();
      expect(stats.layers).toHaveLength(3);
    });

    it('should reset stats for all layers', async () => {
      await cache.set('key1', 'value1');
      await cache.get('key1');

      cache.resetStats();

      const stats = cache.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.l1Hits).toBe(0);
      expect(stats.l2Hits).toBe(0);
      expect(stats.l3Hits).toBe(0);
    });
  });

  describe('Bulk Operations', () => {
    it('should get multiple values', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const results = await cache.mget<string>(['key1', 'key2', 'key3']);

      expect(results.size).toBe(2);
      expect(results.get('key1')).toBe('value1');
      expect(results.get('key2')).toBe('value2');
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

  describe('Pattern Operations', () => {
    it('should get keys from all layers', async () => {
      await l1.set('user:1', 'Alice');
      await l2.set('user:2', 'Bob');
      await l3.set('user:3', 'Charlie');

      const keys = await cache.keys('user:*');

      expect(keys).toHaveLength(3);
      expect(keys).toContain('user:1');
      expect(keys).toContain('user:2');
      expect(keys).toContain('user:3');
    });

    it('should invalidate pattern across all layers', async () => {
      await cache.set('user:1', 'Alice');
      await cache.set('user:2', 'Bob');
      await cache.set('post:1', 'Hello');

      const count = await cache.invalidatePattern('user:*');

      expect(count).toBeGreaterThan(0);

      const result1 = await cache.get<string>('user:1');
      const result2 = await cache.get<string>('post:1');

      expect(result1).toBeNull();
      expect(result2).toBe('Hello');
    });
  });

  describe('TTL Operations', () => {
    it('should check if key exists in any layer', async () => {
      await l2.set('key1', 'value1');

      const exists = await cache.has('key1');
      expect(exists).toBe(true);
    });

    it('should get TTL from first layer that has the key', async () => {
      await l2.set('key1', 'value1', 60);

      const ttl = await cache.ttl('key1');
      expect(ttl).toBeGreaterThan(0);
    });

    it('should return -2 for non-existent keys', async () => {
      const ttl = await cache.ttl('nonexistent');
      expect(ttl).toBe(-2);
    });
  });

  describe('Layer Access', () => {
    it('should get individual layers', () => {
      const layer0 = cache.getLayer(0);
      const layer1 = cache.getLayer(1);
      const layer2 = cache.getLayer(2);

      expect(layer0).toBe(l1);
      expect(layer1).toBe(l2);
      expect(layer2).toBe(l3);
    });

    it('should return undefined for invalid layer index', () => {
      const layer = cache.getLayer(5);
      expect(layer).toBeUndefined();
    });

    it('should get layer count', () => {
      const count = cache.getLayerCount();
      expect(count).toBe(3);
    });
  });

  describe('Single Layer', () => {
    it('should work with single layer', async () => {
      const singleCache = new MultiLayerCache({ l1 });

      await singleCache.set('key1', 'value1');
      const result = await singleCache.get<string>('key1');

      expect(result).toBe('value1');
      expect(singleCache.getLayerCount()).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when no layers provided', () => {
      expect(() => {
        new MultiLayerCache({});
      }).toThrow('MultiLayerCache requires at least one cache layer');
    });
  });
});
