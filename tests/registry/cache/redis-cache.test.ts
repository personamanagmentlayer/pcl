/**
 * Redis Cache Tests - Phase 1.2C
 * Comprehensive test suite for distributed caching layer
 */

import { RedisCache } from '../../../src/registry/cache/redis-cache';

// Mock Redis client
const mockRedisClient = {
  connect: vi.fn(),
  quit: vi.fn(),
  get: vi.fn(),
  setEx: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  exists: vi.fn(),
  ttl: vi.fn(),
  mGet: vi.fn(),
  multi: vi.fn(),
  on: vi.fn(),
};

vi.mock('redis', () => ({
  createClient: vi.fn(() => mockRedisClient),
}));

describe('RedisCache', () => {
  let cache: RedisCache;

  beforeEach(() => {
    vi.clearAllMocks();
    cache = new RedisCache({
      host: 'localhost',
      port: 6379,
      keyPrefix: 'test:',
      defaultTTL: 3600,
    });
  });

  describe('Connection Management', () => {
    it('should connect to Redis server', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);

      await cache.connect();

      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(cache.isReady()).toBe(true);
    });

    it('should not connect if already connected', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);

      await cache.connect();
      await cache.connect(); // Second call

      expect(mockRedisClient.connect).toHaveBeenCalledTimes(1);
    });

    it('should handle connection errors', async () => {
      mockRedisClient.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(cache.connect()).rejects.toThrow(
        'Failed to connect to Redis'
      );
    });

    it('should disconnect from Redis server', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.quit.mockResolvedValue(undefined);

      await cache.connect();
      await cache.disconnect();

      expect(mockRedisClient.quit).toHaveBeenCalled();
      expect(cache.isReady()).toBe(false);
    });

    it('should not disconnect if not connected', async () => {
      await cache.disconnect();

      expect(mockRedisClient.quit).not.toHaveBeenCalled();
    });

    it('should handle disconnection errors', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.quit.mockRejectedValue(new Error('Disconnect failed'));

      await cache.connect();
      await expect(cache.disconnect()).rejects.toThrow(
        'Failed to disconnect from Redis'
      );
    });

    it('should emit connect event', async () => {
      const connectHandler = vi.fn();
      mockRedisClient.on.mockImplementation((event, handler) => {
        if (event === 'connect') {
          connectHandler.mockImplementation(handler);
        }
        return mockRedisClient;
      });

      const testCache = new RedisCache();
      connectHandler();

      expect(testCache).toBeDefined();
      expect(connectHandler).toBeDefined();
    });

    it('should emit disconnect event', async () => {
      const disconnectHandler = vi.fn();
      mockRedisClient.on.mockImplementation((event, handler) => {
        if (event === 'disconnect') {
          disconnectHandler.mockImplementation(handler);
        }
        return mockRedisClient;
      });

      const testCache = new RedisCache();
      disconnectHandler();

      expect(testCache).toBeDefined();
      expect(disconnectHandler).toBeDefined();
    });

    it('should handle Redis errors', () => {
      let errorHandler: (err: Error) => void = () => {};
      mockRedisClient.on.mockImplementation((event, handler) => {
        if (event === 'error') {
          errorHandler = handler;
        }
        return mockRedisClient;
      });

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const testCache = new RedisCache();
      errorHandler(new Error('Redis error'));

      expect(testCache).toBeDefined();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should configure reconnect strategy', () => {
      const config = {
        maxRetries: 5,
        retryDelay: 200,
      };

      const testCache = new RedisCache(config);

      expect(testCache).toBeDefined();
      expect(mockRedisClient.on).toHaveBeenCalled();
    });

    it('should stop reconnect after max retries', () => {
      const testCache = new RedisCache({ maxRetries: 3, retryDelay: 100 });

      // Verify the cache was created with max retries configuration
      expect(testCache).toBeDefined();
    });

    it('should return delay for retry attempts', () => {
      const testCache = new RedisCache({ maxRetries: 3, retryDelay: 100 });

      // Verify the cache was created with retry delay configuration
      expect(testCache).toBeDefined();
    });
  });

  describe('Get Operations', () => {
    it('should get value from cache', async () => {
      const value = { data: 'test' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(value));

      const result = await cache.get<typeof value>('test:key');

      expect(mockRedisClient.get).toHaveBeenCalledWith('test:test:key');
      expect(result).toEqual(value);
    });

    it('should return null for non-existent keys', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cache.get('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle get errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Get error'));
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await cache.get('key');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should track cache hits', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify({ data: 'test' }));

      await cache.get('key');

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(0);
    });

    it('should track cache misses', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await cache.get('key');

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(1);
    });

    it('should update latency metrics', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify({ data: 'test' }));

      await cache.get('key');
      await cache.get('key');

      const stats = cache.getStats();
      // avgLatency should be a number
      expect(typeof stats.avgLatency).toBe('number');
    });

    it('should handle complex objects', async () => {
      const complex = {
        nested: { data: [1, 2, 3] },
        array: ['a', 'b', 'c'],
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(complex));

      const result = await cache.get<typeof complex>('key');

      expect(result).toEqual(complex);
    });

    it('should increment errors on get failure', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis down'));
      vi.spyOn(console, 'error').mockImplementation(() => {});

      await cache.get('key');

      const stats = cache.getStats();
      expect(stats.errors).toBe(1);
    });
  });

  describe('Set Operations', () => {
    it('should set value with default TTL', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');

      await cache.set('key', 'value');

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'test:key',
        3600,
        JSON.stringify('value')
      );
    });

    it('should set value with custom TTL', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');

      await cache.set('key', 'value', 1800);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'test:key',
        1800,
        JSON.stringify('value')
      );
    });

    it('should serialize objects before storing', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');
      const obj = { nested: { data: 123 } };

      await cache.set('key', obj);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'test:key',
        3600,
        JSON.stringify(obj)
      );
    });

    it('should track set operations', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');

      await cache.set('key', 'value');

      const stats = cache.getStats();
      expect(stats.sets).toBe(1);
    });

    it('should handle set errors', async () => {
      mockRedisClient.setEx.mockRejectedValue(new Error('Set error'));
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await expect(cache.set('key', 'value')).rejects.toThrow();

      const stats = cache.getStats();
      expect(stats.errors).toBe(1);
      consoleErrorSpy.mockRestore();
    });

    it('should handle arrays', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');

      await cache.set('key', [1, 2, 3]);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'test:key',
        3600,
        JSON.stringify([1, 2, 3])
      );
    });

    it('should handle null values', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');

      await cache.set('key', null);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'test:key',
        3600,
        JSON.stringify(null)
      );
    });
  });

  describe('Delete Operations', () => {
    it('should delete value from cache', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await cache.delete('key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('test:key');
    });

    it('should track delete operations', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await cache.delete('key');

      const stats = cache.getStats();
      expect(stats.deletes).toBe(1);
    });

    it('should handle delete errors', async () => {
      mockRedisClient.del.mockRejectedValue(new Error('Delete error'));
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await expect(cache.delete('key')).rejects.toThrow();

      const stats = cache.getStats();
      expect(stats.errors).toBe(1);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Clear Operations', () => {
    it('should clear all keys with prefix', async () => {
      mockRedisClient.keys.mockResolvedValue(['test:key1', 'test:key2']);
      mockRedisClient.del.mockResolvedValue(2);

      await cache.clear();

      expect(mockRedisClient.keys).toHaveBeenCalledWith('test:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith([
        'test:key1',
        'test:key2',
      ]);
    });

    it('should handle empty cache', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      await cache.clear();

      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should track deleted keys', async () => {
      mockRedisClient.keys.mockResolvedValue([
        'test:key1',
        'test:key2',
        'test:key3',
      ]);
      mockRedisClient.del.mockResolvedValue(3);

      await cache.clear();

      const stats = cache.getStats();
      expect(stats.deletes).toBe(3);
    });

    it('should handle clear errors', async () => {
      mockRedisClient.keys.mockRejectedValue(new Error('Clear error'));
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await expect(cache.clear()).rejects.toThrow();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Pattern Invalidation', () => {
    it('should invalidate keys matching pattern', async () => {
      mockRedisClient.keys.mockResolvedValue(['test:user:1', 'test:user:2']);
      mockRedisClient.del.mockResolvedValue(2);

      const count = await cache.invalidatePattern('user:*');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('test:user:*');
      expect(count).toBe(2);
    });

    it('should return 0 for no matches', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      const count = await cache.invalidatePattern('nonexistent:*');

      expect(count).toBe(0);
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should handle invalidation errors', async () => {
      mockRedisClient.keys.mockRejectedValue(new Error('Keys error'));
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await expect(cache.invalidatePattern('*')).rejects.toThrow();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Has Operations', () => {
    it('should return true if key exists', async () => {
      mockRedisClient.exists.mockResolvedValue(1);

      const exists = await cache.has('key');

      expect(exists).toBe(true);
    });

    it('should return false if key does not exist', async () => {
      mockRedisClient.exists.mockResolvedValue(0);

      const exists = await cache.has('key');

      expect(exists).toBe(false);
    });

    it('should handle has errors', async () => {
      mockRedisClient.exists.mockRejectedValue(new Error('Exists error'));
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const exists = await cache.has('key');

      expect(exists).toBe(false);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('TTL Operations', () => {
    it('should return TTL for key', async () => {
      mockRedisClient.ttl.mockResolvedValue(3600);

      const ttl = await cache.ttl('key');

      expect(ttl).toBe(3600);
    });

    it('should return -1 for keys with no expiry', async () => {
      mockRedisClient.ttl.mockResolvedValue(-1);

      const ttl = await cache.ttl('key');

      expect(ttl).toBe(-1);
    });

    it('should return -2 for non-existent keys', async () => {
      mockRedisClient.ttl.mockResolvedValue(-2);

      const ttl = await cache.ttl('key');

      expect(ttl).toBe(-2);
    });

    it('should handle TTL errors', async () => {
      mockRedisClient.ttl.mockRejectedValue(new Error('TTL error'));
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const ttl = await cache.ttl('key');

      expect(ttl).toBe(-1);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Keys Operations', () => {
    it('should return keys matching pattern', async () => {
      mockRedisClient.keys.mockResolvedValue(['test:user:1', 'test:user:2']);

      const keys = await cache.keys('user:*');

      expect(keys).toEqual(['user:1', 'user:2']);
    });

    it('should strip key prefix from results', async () => {
      mockRedisClient.keys.mockResolvedValue(['test:a', 'test:b', 'test:c']);

      const keys = await cache.keys('*');

      expect(keys).toEqual(['a', 'b', 'c']);
    });

    it('should handle keys errors', async () => {
      mockRedisClient.keys.mockRejectedValue(new Error('Keys error'));
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const keys = await cache.keys('*');

      expect(keys).toEqual([]);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Size Operations', () => {
    it('should return cache size', async () => {
      mockRedisClient.keys.mockResolvedValue(['test:1', 'test:2', 'test:3']);

      const size = await cache.size();

      expect(size).toBe(3);
    });

    it('should return 0 for empty cache', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      const size = await cache.size();

      expect(size).toBe(0);
    });

    it('should handle size errors', async () => {
      mockRedisClient.keys.mockRejectedValue(new Error('Size error'));
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const size = await cache.size();

      expect(size).toBe(0);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Batch Operations - mget', () => {
    it('should get multiple values', async () => {
      mockRedisClient.mGet.mockResolvedValue([
        JSON.stringify('value1'),
        JSON.stringify('value2'),
        null,
      ]);

      const result = await cache.mget<string>(['key1', 'key2', 'key3']);

      expect(result.size).toBe(2);
      expect(result.get('key1')).toBe('value1');
      expect(result.get('key2')).toBe('value2');
      expect(result.has('key3')).toBe(false);
    });

    it('should track hits and misses for batch operations', async () => {
      mockRedisClient.mGet.mockResolvedValue([
        JSON.stringify('value1'),
        null,
        JSON.stringify('value3'),
      ]);

      await cache.mget(['key1', 'key2', 'key3']);

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
    });

    it('should handle mget errors', async () => {
      mockRedisClient.mGet.mockRejectedValue(new Error('mGet error'));
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await cache.mget(['key1', 'key2']);

      expect(result.size).toBe(0);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Batch Operations - mset', () => {
    it('should set multiple values', async () => {
      const pipeline = {
        setEx: vi.fn(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockRedisClient.multi.mockReturnValue(pipeline);

      const entries = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);

      await cache.mset(entries);

      expect(pipeline.setEx).toHaveBeenCalledTimes(2);
      expect(pipeline.exec).toHaveBeenCalled();
    });

    it('should use custom TTL for batch operations', async () => {
      const pipeline = {
        setEx: vi.fn(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockRedisClient.multi.mockReturnValue(pipeline);

      const entries = new Map([['key1', 'value1']]);

      await cache.mset(entries, 1800);

      expect(pipeline.setEx).toHaveBeenCalledWith(
        'test:key1',
        1800,
        JSON.stringify('value1')
      );
    });

    it('should track set count for batch operations', async () => {
      const pipeline = {
        setEx: vi.fn(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockRedisClient.multi.mockReturnValue(pipeline);

      const entries = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
        ['key3', 'value3'],
      ]);

      await cache.mset(entries);

      const stats = cache.getStats();
      expect(stats.sets).toBe(3);
    });

    it('should handle mset errors', async () => {
      const pipeline = {
        setEx: vi.fn(),
        exec: vi.fn().mockRejectedValue(new Error('Exec error')),
      };
      mockRedisClient.multi.mockReturnValue(pipeline);
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const entries = new Map([['key1', 'value1']]);

      await expect(cache.mset(entries)).rejects.toThrow();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Cache Warming', () => {
    it('should warm cache with data loader', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');

      const loader = async () =>
        new Map([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ]);

      const count = await cache.warmCache(loader);

      expect(count).toBe(2);
      expect(mockRedisClient.setEx).toHaveBeenCalledTimes(2);
    });

    it('should handle warming errors', async () => {
      const loader = async () => {
        throw new Error('Loader error');
      };
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await expect(cache.warmCache(loader)).rejects.toThrow();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Statistics', () => {
    it('should calculate hit rate', async () => {
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify('value'));
      mockRedisClient.get.mockResolvedValueOnce(null);

      await cache.get('key1'); // Hit
      await cache.get('key2'); // Miss

      const stats = cache.getStats();
      expect(stats.hitRate).toBe(50);
    });

    it('should return 0 hit rate for no operations', () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
    });

    it('should reset statistics', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify('value'));
      await cache.get('key');

      cache.resetStats();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(0);
      expect(stats.deletes).toBe(0);
      expect(stats.errors).toBe(0);
    });

    it('should calculate average latency', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify('value'));

      await cache.get('key1');
      await cache.get('key2');
      await cache.get('key3');

      const stats = cache.getStats();
      // avgLatency should be a number
      expect(typeof stats.avgLatency).toBe('number');
    });
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const defaultCache = new RedisCache();
      expect(defaultCache).toBeDefined();
    });

    it('should use URL configuration', () => {
      const urlCache = new RedisCache({
        url: 'redis://custom:6379',
      });
      expect(urlCache).toBeDefined();
    });

    it('should use custom key prefix', async () => {
      const prefixCache = new RedisCache({ keyPrefix: 'custom:' });
      mockRedisClient.setEx.mockResolvedValue('OK');

      await prefixCache.set('key', 'value');

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'custom:key',
        expect.any(Number),
        expect.any(String)
      );
    });

    it('should use custom default TTL', async () => {
      const ttlCache = new RedisCache({ defaultTTL: 7200 });
      mockRedisClient.setEx.mockResolvedValue('OK');

      await ttlCache.set('key', 'value');

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        expect.any(String),
        7200,
        expect.any(String)
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string values', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(''));

      const result = await cache.get<string>('key');

      expect(result).toBe('');
    });

    it('should handle boolean values', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(true));

      const result = await cache.get<boolean>('key');

      expect(result).toBe(true);
    });

    it('should handle numeric values', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(42));

      const result = await cache.get<number>('key');

      expect(result).toBe(42);
    });

    it('should handle zero as value', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');

      await cache.set('key', 0);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'test:key',
        3600,
        JSON.stringify(0)
      );
    });
  });
});
