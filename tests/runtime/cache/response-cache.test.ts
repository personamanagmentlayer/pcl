/**
 * Response Cache Tests
 *
 * Basic tests for response caching system
 * Target: 0% → 50%+ coverage (initial pass)
 */

import {
  ResponseCache,
  type CacheMessage,
} from '../../../src/runtime/cache/response-cache';
import type { CacheConfig } from '../../../src/runtime/cache/types';

describe('ResponseCache', () => {
  const defaultConfig: CacheConfig = {
    enabled: true,
    maxSize: 1000,
    ttl: 3600000, // 1 hour
    semanticSimilarity: true,
    similarityThreshold: 0.85,
  };

  describe('Construction', () => {
    it('should create cache with config', () => {
      const cache = new ResponseCache(defaultConfig);

      expect(cache).toBeDefined();
    });

    it('should create cache with custom config', () => {
      const config: CacheConfig = {
        enabled: true,
        maxSize: 500,
        ttl: 1800000,
        semanticSimilarity: false,
        similarityThreshold: 0.9,
      };

      const cache = new ResponseCache(config);

      expect(cache).toBeDefined();
    });
  });

  describe('Get and Set', () => {
    let cache: ResponseCache;

    beforeEach(() => {
      cache = new ResponseCache(defaultConfig);
    });

    it('should return null for cache miss', async () => {
      const message: CacheMessage = {
        content: 'What is 2+2?',
        metadata: {},
      };

      const result = await cache.get(message, 'test-persona');

      expect(result).toBeNull();
    });

    it('should store and retrieve response', async () => {
      const message: CacheMessage = {
        content: 'What is 2+2?',
        metadata: {},
      };

      const response = { answer: '4' };

      cache.set(message, response, {
        personaId: 'test-persona',
        providerId: 'test-provider',
        modelId: 'test-model',
        cost: 0.001,
        latency: 100,
        confidence: 0.95,
      });

      const result = await cache.get(message, 'test-persona');

      expect(result).toEqual(response);
    });

    it('should handle different personas separately', async () => {
      const message: CacheMessage = {
        content: 'Test message',
        metadata: {},
      };

      cache.set(
        message,
        { result: 'persona1' },
        {
          personaId: 'persona-1',
          providerId: 'provider',
          modelId: 'model',
          cost: 0.001,
          latency: 100,
          confidence: 0.9,
        }
      );

      cache.set(
        message,
        { result: 'persona2' },
        {
          personaId: 'persona-2',
          providerId: 'provider',
          modelId: 'model',
          cost: 0.001,
          latency: 100,
          confidence: 0.9,
        }
      );

      const result1 = await cache.get(message, 'persona-1');
      const result2 = await cache.get(message, 'persona-2');

      expect(result1).toEqual({ result: 'persona1' });
      expect(result2).toEqual({ result: 'persona2' });
    });

    it('should handle metadata in messages', async () => {
      const message: CacheMessage = {
        content: 'Test',
        metadata: { tag: 'important' },
      };

      cache.set(
        message,
        { result: 'test' },
        {
          personaId: 'test-persona',
          providerId: 'provider',
          modelId: 'model',
          cost: 0.001,
          latency: 100,
          confidence: 0.9,
        }
      );

      const result = await cache.get(message, 'test-persona');

      expect(result).toEqual({ result: 'test' });
    });
  });

  describe('Disabled Cache', () => {
    it('should not cache when disabled', async () => {
      const cache = new ResponseCache({
        ...defaultConfig,
        enabled: false,
      });

      const message: CacheMessage = {
        content: 'Test',
        metadata: {},
      };

      cache.set(
        message,
        { result: 'test' },
        {
          personaId: 'test-persona',
          providerId: 'provider',
          modelId: 'model',
          cost: 0.001,
          latency: 100,
          confidence: 0.9,
        }
      );

      const result = await cache.get(message, 'test-persona');

      expect(result).toBeNull();
    });
  });

  describe('Cache Stats', () => {
    let cache: ResponseCache;

    beforeEach(() => {
      cache = new ResponseCache(defaultConfig);
    });

    it('should track cache hits', async () => {
      const message: CacheMessage = {
        content: 'Test',
        metadata: {},
      };

      cache.set(
        message,
        { result: 'test' },
        {
          personaId: 'test-persona',
          providerId: 'provider',
          modelId: 'model',
          cost: 0.001,
          latency: 100,
          confidence: 0.9,
        }
      );

      await cache.get(message, 'test-persona');

      const stats = cache.getStats();

      expect(stats.hits).toBeGreaterThan(0);
    });

    it('should track cache misses', async () => {
      const message: CacheMessage = {
        content: 'Not cached',
        metadata: {},
      };

      await cache.get(message, 'test-persona');

      const stats = cache.getStats();

      expect(stats.misses).toBeGreaterThan(0);
    });

    it('should calculate hit rate', async () => {
      const message: CacheMessage = {
        content: 'Test',
        metadata: {},
      };

      cache.set(
        message,
        { result: 'test' },
        {
          personaId: 'test-persona',
          providerId: 'provider',
          modelId: 'model',
          cost: 0.001,
          latency: 100,
          confidence: 0.9,
        }
      );

      await cache.get(message, 'test-persona');
      await cache.get(message, 'test-persona');

      const stats = cache.getStats();

      expect(stats.hitRate).toBeGreaterThan(0);
    });

    it('should track total entries', async () => {
      const message1: CacheMessage = { content: 'Test 1', metadata: {} };
      const message2: CacheMessage = { content: 'Test 2', metadata: {} };

      cache.set(
        message1,
        { result: 'test1' },
        {
          personaId: 'test-persona',
          providerId: 'provider',
          modelId: 'model',
          cost: 0.001,
          latency: 100,
          confidence: 0.9,
        }
      );

      cache.set(
        message2,
        { result: 'test2' },
        {
          personaId: 'test-persona',
          providerId: 'provider',
          modelId: 'model',
          cost: 0.001,
          latency: 100,
          confidence: 0.9,
        }
      );

      const stats = cache.getStats();

      expect(stats.totalEntries).toBeGreaterThanOrEqual(2);
    });

    it('should track cost savings', async () => {
      const message: CacheMessage = {
        content: 'Test',
        metadata: {},
      };

      cache.set(
        message,
        { result: 'test' },
        {
          personaId: 'test-persona',
          providerId: 'provider',
          modelId: 'model',
          cost: 0.01,
          latency: 100,
          confidence: 0.9,
        }
      );

      await cache.get(message, 'test-persona');

      const stats = cache.getStats();

      expect(stats.costSaved).toBeGreaterThan(0);
    });

    it('should track latency savings', async () => {
      const message: CacheMessage = {
        content: 'Test',
        metadata: {},
      };

      cache.set(
        message,
        { result: 'test' },
        {
          personaId: 'test-persona',
          providerId: 'provider',
          modelId: 'model',
          cost: 0.001,
          latency: 500,
          confidence: 0.9,
        }
      );

      await cache.get(message, 'test-persona');

      const stats = cache.getStats();

      expect(stats.latencySaved).toBeGreaterThan(0);
    });
  });

  describe('Cache Management', () => {
    let cache: ResponseCache;

    beforeEach(() => {
      cache = new ResponseCache(defaultConfig);
    });

    it('should clear cache', async () => {
      const message: CacheMessage = {
        content: 'Test',
        metadata: {},
      };

      cache.set(
        message,
        { result: 'test' },
        {
          personaId: 'test-persona',
          providerId: 'provider',
          modelId: 'model',
          cost: 0.001,
          latency: 100,
          confidence: 0.9,
        }
      );

      cache.clear();

      const result = await cache.get(message, 'test-persona');

      expect(result).toBeNull();
    });

    it('should reset stats on clear', () => {
      const message: CacheMessage = {
        content: 'Test',
        metadata: {},
      };

      cache.set(
        message,
        { result: 'test' },
        {
          personaId: 'test-persona',
          providerId: 'provider',
          modelId: 'model',
          cost: 0.001,
          latency: 100,
          confidence: 0.9,
        }
      );

      cache.clear();

      const stats = cache.getStats();

      expect(stats.totalEntries).toBe(0);
    });

    it('should handle multiple cache clears', () => {
      cache.clear();
      cache.clear();

      const stats = cache.getStats();

      expect(stats.totalEntries).toBe(0);
    });
  });
});
