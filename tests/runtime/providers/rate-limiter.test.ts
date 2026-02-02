// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - Rate Limiter Tests
// Comprehensive tests for rate limiting functionality
// ═══════════════════════════════════════════════════════════════════════════════

import {
  RateLimiter,
  RateLimiterRegistry,
  type RateLimiterConfig,
} from '../../../src/runtime/providers/rate-limiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  afterEach(() => {
    if (limiter) {
      limiter.stop();
    }
  });

  describe('initialization', () => {
    it('should create limiter with default config', () => {
      limiter = new RateLimiter();
      expect(limiter).toBeDefined();
      expect(limiter).toBeInstanceOf(RateLimiter);
    });

    it('should create limiter with custom config', () => {
      limiter = new RateLimiter({
        maxRequests: 10,
        windowMs: 1000,
      });

      const stats = limiter.getStats();
      expect(stats.maxRequests).toBe(10);
    });

    it('should start with zero requests', () => {
      limiter = new RateLimiter();
      const stats = limiter.getStats();

      expect(stats.requestsInWindow).toBe(0);
      expect(stats.queueSize).toBe(0);
    });
  });

  describe('acquire', () => {
    it('should allow requests within limit', async () => {
      limiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 });

      await expect(limiter.acquire()).resolves.toBeUndefined();
      await expect(limiter.acquire()).resolves.toBeUndefined();

      const stats = limiter.getStats();
      expect(stats.requestsInWindow).toBe(2);
    });

    it('should queue requests when limit exceeded', async () => {
      limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 5000,
        queueRequests: true,
      });

      // Fill up limit
      await limiter.acquire();
      await limiter.acquire();

      // This should queue - catch rejection when stopped
      const acquirePromise = limiter.acquire().catch(() => {});
      const stats = limiter.getStats();

      expect(stats.queueSize).toBeGreaterThan(0);

      // Clean up
      limiter.stop();
    });

    it('should throw when limit exceeded and queueing disabled', async () => {
      limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 1000,
        queueRequests: false,
      });

      await limiter.acquire();
      await limiter.acquire();

      await expect(limiter.acquire()).rejects.toThrow('Rate limit exceeded');
    });

    it('should throw when queue is full', async () => {
      limiter = new RateLimiter({
        maxRequests: 1,
        windowMs: 10000,
        queueRequests: true,
        maxQueueSize: 2,
      });

      // Fill limit
      await limiter.acquire();

      // Fill queue - catch rejections when stopped
      const p1 = limiter.acquire().catch(() => {});
      const p2 = limiter.acquire().catch(() => {});

      // This should throw
      await expect(limiter.acquire()).rejects.toThrow('queue full');

      // Clean up
      limiter.stop();
    });

    it('should track token usage', async () => {
      limiter = new RateLimiter({
        maxRequests: 10,
        maxTokens: 100,
        windowMs: 1000,
      });

      await limiter.acquire(30);
      await limiter.acquire(40);

      const stats = limiter.getStats();
      expect(stats.tokensUsed).toBe(70);
    });

    it('should enforce token limit', async () => {
      limiter = new RateLimiter({
        maxRequests: 10,
        maxTokens: 50,
        windowMs: 1000,
        queueRequests: false,
      });

      await limiter.acquire(30);

      // This should exceed token limit
      await expect(limiter.acquire(30)).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('tryAcquire', () => {
    it('should return true when capacity available', () => {
      limiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 });

      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);

      const stats = limiter.getStats();
      expect(stats.requestsInWindow).toBe(2);
    });

    it('should return false when limit exceeded', () => {
      limiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 });

      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(false);

      const stats = limiter.getStats();
      expect(stats.requestsInWindow).toBe(2);
    });

    it('should respect token limits', () => {
      limiter = new RateLimiter({
        maxRequests: 10,
        maxTokens: 50,
        windowMs: 1000,
      });

      expect(limiter.tryAcquire(30)).toBe(true);
      expect(limiter.tryAcquire(30)).toBe(false); // Would exceed token limit

      const stats = limiter.getStats();
      expect(stats.tokensUsed).toBe(30);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      limiter = new RateLimiter({ maxRequests: 10, windowMs: 1000 });

      limiter.tryAcquire();
      limiter.tryAcquire();
      limiter.tryAcquire();

      const stats = limiter.getStats();

      expect(stats.requestsInWindow).toBe(3);
      expect(stats.maxRequests).toBe(10);
      expect(stats.queueSize).toBe(0);
      expect(stats.utilizationPercent).toBe(30);
    });

    it('should include token stats when enabled', () => {
      limiter = new RateLimiter({
        maxRequests: 10,
        maxTokens: 100,
        windowMs: 1000,
      });

      limiter.tryAcquire(25);
      limiter.tryAcquire(25);

      const stats = limiter.getStats();

      expect(stats.tokensUsed).toBe(50);
      expect(stats.maxTokens).toBe(100);
    });
  });

  describe('reset', () => {
    it('should clear all requests', () => {
      limiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 });

      limiter.tryAcquire();
      limiter.tryAcquire();

      limiter.reset();

      const stats = limiter.getStats();
      expect(stats.requestsInWindow).toBe(0);
      expect(stats.tokensUsed).toBe(0);
    });

    it('should reject queued requests', async () => {
      limiter = new RateLimiter({
        maxRequests: 1,
        windowMs: 10000,
        queueRequests: true,
      });

      await limiter.acquire();
      const queuedPromise = limiter.acquire();

      limiter.reset();

      await expect(queuedPromise).rejects.toThrow('Rate limiter reset');
    });
  });

  describe('stop', () => {
    it('should stop queue processor', () => {
      limiter = new RateLimiter({ queueRequests: true });

      limiter.stop();

      // Should not throw
      expect(() => limiter.stop()).not.toThrow();
    });

    it('should reject queued requests', async () => {
      limiter = new RateLimiter({
        maxRequests: 1,
        windowMs: 10000,
        queueRequests: true,
      });

      await limiter.acquire();
      const queuedPromise = limiter.acquire();

      limiter.stop();

      await expect(queuedPromise).rejects.toThrow('Rate limiter stopped');
    });
  });

  describe('time window behavior', () => {
    it('should allow new requests after window expires', async () => {
      limiter = new RateLimiter({ maxRequests: 2, windowMs: 100 });

      // Fill limit
      await limiter.acquire();
      await limiter.acquire();

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be able to acquire again
      const result = limiter.tryAcquire();
      expect(result).toBe(true);
    });
  });
});

describe('RateLimiterRegistry', () => {
  let registry: RateLimiterRegistry;

  beforeEach(() => {
    registry = new RateLimiterRegistry();
  });

  afterEach(() => {
    registry.stopAll();
  });

  describe('initialization', () => {
    it('should create empty registry', () => {
      expect(registry).toBeDefined();
      expect(registry.size).toBe(0);
    });
  });

  describe('register', () => {
    it('should register new rate limiter', () => {
      const limiter = registry.register('provider-1');

      expect(limiter).toBeDefined();
      expect(limiter).toBeInstanceOf(RateLimiter);
      expect(registry.size).toBe(1);
    });

    it('should register with custom config', () => {
      const limiter = registry.register('provider-1', { maxRequests: 10 });

      const stats = limiter.getStats();
      expect(stats.maxRequests).toBe(10);
    });

    it('should throw if provider already registered', () => {
      registry.register('provider-1');

      expect(() => {
        registry.register('provider-1');
      }).toThrow('Rate limiter already exists');
    });
  });

  describe('unregister', () => {
    it('should unregister existing limiter', () => {
      registry.register('provider-1');

      const result = registry.unregister('provider-1');

      expect(result).toBe(true);
      expect(registry.size).toBe(0);
    });

    it('should return false for non-existent provider', () => {
      const result = registry.unregister('non-existent');
      expect(result).toBe(false);
    });

    it('should stop limiter when unregistering', () => {
      const limiter = registry.register('provider-1');
      limiter.stop = vi.fn();

      registry.unregister('provider-1');

      expect(limiter.stop).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should return registered limiter', () => {
      const registered = registry.register('provider-1');
      const retrieved = registry.get('provider-1');

      expect(retrieved).toBe(registered);
    });

    it('should return undefined for non-existent provider', () => {
      const limiter = registry.get('non-existent');
      expect(limiter).toBeUndefined();
    });
  });

  describe('getOrCreate', () => {
    it('should return existing limiter', () => {
      const registered = registry.register('provider-1');
      const retrieved = registry.getOrCreate('provider-1');

      expect(retrieved).toBe(registered);
    });

    it('should create new limiter if not exists', () => {
      const limiter = registry.getOrCreate('provider-1');

      expect(limiter).toBeDefined();
      expect(registry.size).toBe(1);
    });

    it('should create with custom config', () => {
      const limiter = registry.getOrCreate('provider-1', { maxRequests: 20 });

      const stats = limiter.getStats();
      expect(stats.maxRequests).toBe(20);
    });
  });

  describe('getAllStats / getStats', () => {
    it('should return stats for all limiters', () => {
      registry.register('provider-1');
      registry.register('provider-2');

      const stats = registry.getAllStats();

      expect(stats.size).toBe(2);
      expect(stats.has('provider-1')).toBe(true);
      expect(stats.has('provider-2')).toBe(true);
    });

    it('should return empty map for no limiters', () => {
      const stats = registry.getAllStats();
      expect(stats.size).toBe(0);
    });

    it('getStats should be alias for getAllStats', () => {
      registry.register('provider-1');

      const stats1 = registry.getAllStats();
      const stats2 = registry.getStats();

      expect(stats1.size).toBe(stats2.size);
    });
  });

  describe('resetAll', () => {
    it('should reset all limiters', () => {
      const limiter1 = registry.register('provider-1');
      const limiter2 = registry.register('provider-2');

      limiter1.tryAcquire();
      limiter2.tryAcquire();

      registry.resetAll();

      expect(limiter1.getStats().requestsInWindow).toBe(0);
      expect(limiter2.getStats().requestsInWindow).toBe(0);
    });
  });

  describe('stopAll', () => {
    it('should stop all limiters', () => {
      const limiter1 = registry.register('provider-1');
      const limiter2 = registry.register('provider-2');

      limiter1.stop = vi.fn();
      limiter2.stop = vi.fn();

      registry.stopAll();

      expect(limiter1.stop).toHaveBeenCalled();
      expect(limiter2.stop).toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should remove all limiters', () => {
      registry.register('provider-1');
      registry.register('provider-2');

      registry.clear();

      expect(registry.size).toBe(0);
    });

    it('should stop all limiters before clearing', () => {
      const limiter1 = registry.register('provider-1');
      limiter1.stop = vi.fn();

      registry.clear();

      expect(limiter1.stop).toHaveBeenCalled();
    });
  });

  describe('size', () => {
    it('should return number of registered limiters', () => {
      expect(registry.size).toBe(0);

      registry.register('provider-1');
      expect(registry.size).toBe(1);

      registry.register('provider-2');
      expect(registry.size).toBe(2);

      registry.unregister('provider-1');
      expect(registry.size).toBe(1);
    });
  });
});
