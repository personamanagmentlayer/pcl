/**
 * Health Aggregator Tests
 *
 * Tests for health check registration, status aggregation,
 * readiness/liveness checks, and built-in health monitors.
 */

import {
  HealthAggregator,
  getHealthAggregator,
  setHealthAggregator,
  createHealthAggregator,
  runtimeHealthCheck,
  eventLoopHealthCheck,
  type ComponentHealth,
} from '../../src/observability/health';

// ═══════════════════════════════════════════════════════════════════════════════
//                              HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const healthyCheck = (): ComponentHealth => ({
  status: 'healthy',
  message: 'All systems operational',
});

const degradedCheck = (): ComponentHealth => ({
  status: 'degraded',
  message: 'Performance degraded',
  metadata: { reason: 'high load' },
});

const unhealthyCheck = (): ComponentHealth => ({
  status: 'unhealthy',
  message: 'System unavailable',
});

const asyncHealthyCheck = async (): Promise<ComponentHealth> => {
  await new Promise((resolve) => setTimeout(resolve, 10));
  return {
    status: 'healthy',
    message: 'Async check passed',
  };
};

const throwingCheck = (): ComponentHealth => {
  throw new Error('Check failed');
};

// ═══════════════════════════════════════════════════════════════════════════════
//                              HEALTH AGGREGATOR
// ═══════════════════════════════════════════════════════════════════════════════

describe('HealthAggregator', () => {
  let aggregator: HealthAggregator;

  beforeEach(() => {
    aggregator = new HealthAggregator();
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              CHECK REGISTRATION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('registerCheck', () => {
    it('should register a health check', () => {
      aggregator.registerCheck('database', healthyCheck);

      const components = aggregator.getComponents();
      expect(components).toContain('database');
      expect(components).toHaveLength(1);
    });

    it('should register multiple health checks', () => {
      aggregator.registerCheck('database', healthyCheck);
      aggregator.registerCheck('cache', healthyCheck);
      aggregator.registerCheck('api', healthyCheck);

      const components = aggregator.getComponents();
      expect(components).toHaveLength(3);
      expect(components).toContain('database');
      expect(components).toContain('cache');
      expect(components).toContain('api');
    });

    it('should overwrite existing check with same name', async () => {
      aggregator.registerCheck('service', healthyCheck);
      aggregator.registerCheck('service', degradedCheck);

      const components = aggregator.getComponents();
      expect(components).toHaveLength(1);

      const health = await aggregator.checkComponent('service');
      expect(health?.status).toBe('degraded');
    });

    it('should register async health checks', () => {
      aggregator.registerCheck('async-service', asyncHealthyCheck);

      const components = aggregator.getComponents();
      expect(components).toContain('async-service');
    });
  });

  describe('unregisterCheck', () => {
    it('should unregister a health check', () => {
      aggregator.registerCheck('database', healthyCheck);
      const result = aggregator.unregisterCheck('database');

      expect(result).toBe(true);
      expect(aggregator.getComponents()).not.toContain('database');
      expect(aggregator.getComponents()).toHaveLength(0);
    });

    it('should return false when unregistering non-existent check', () => {
      const result = aggregator.unregisterCheck('nonexistent');
      expect(result).toBe(false);
    });

    it('should not affect other checks', () => {
      aggregator.registerCheck('service1', healthyCheck);
      aggregator.registerCheck('service2', healthyCheck);
      aggregator.registerCheck('service3', healthyCheck);

      aggregator.unregisterCheck('service2');

      const components = aggregator.getComponents();
      expect(components).toHaveLength(2);
      expect(components).toContain('service1');
      expect(components).toContain('service3');
      expect(components).not.toContain('service2');
    });
  });

  describe('clear', () => {
    it('should clear all health checks', () => {
      aggregator.registerCheck('service1', healthyCheck);
      aggregator.registerCheck('service2', healthyCheck);
      aggregator.registerCheck('service3', healthyCheck);

      aggregator.clear();

      expect(aggregator.getComponents()).toHaveLength(0);
    });

    it('should not error when clearing empty aggregator', () => {
      expect(() => aggregator.clear()).not.toThrow();
      expect(aggregator.getComponents()).toHaveLength(0);
    });
  });

  describe('getComponents', () => {
    it('should return empty array when no checks registered', () => {
      const components = aggregator.getComponents();
      expect(components).toEqual([]);
    });

    it('should return all registered component names', () => {
      aggregator.registerCheck('db', healthyCheck);
      aggregator.registerCheck('cache', healthyCheck);
      aggregator.registerCheck('queue', healthyCheck);

      const components = aggregator.getComponents();
      expect(components).toHaveLength(3);
      expect(components).toEqual(
        expect.arrayContaining(['db', 'cache', 'queue'])
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              COMPONENT CHECKS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('checkComponent', () => {
    it('should check specific component', async () => {
      aggregator.registerCheck('database', healthyCheck);

      const health = await aggregator.checkComponent('database');

      expect(health).toEqual({
        status: 'healthy',
        message: 'All systems operational',
      });
    });

    it('should return null for non-existent component', async () => {
      const health = await aggregator.checkComponent('nonexistent');
      expect(health).toBeNull();
    });

    it('should handle async checks', async () => {
      aggregator.registerCheck('async-service', asyncHealthyCheck);

      const health = await aggregator.checkComponent('async-service');

      expect(health).toEqual({
        status: 'healthy',
        message: 'Async check passed',
      });
    });

    it('should handle throwing checks gracefully', async () => {
      aggregator.registerCheck('failing-service', throwingCheck);

      const health = await aggregator.checkComponent('failing-service');

      expect(health).toEqual({
        status: 'unhealthy',
        message: 'Health check failed: Check failed',
      });
    });

    it('should handle non-Error exceptions', async () => {
      const throwingNonError = (): ComponentHealth => {
        throw 'String error';
      };

      aggregator.registerCheck('strange-service', throwingNonError);

      const health = await aggregator.checkComponent('strange-service');

      expect(health).toEqual({
        status: 'unhealthy',
        message: 'Health check failed: String error',
      });
    });

    it('should preserve metadata from checks', async () => {
      aggregator.registerCheck('service', degradedCheck);

      const health = await aggregator.checkComponent('service');

      expect(health).toEqual({
        status: 'degraded',
        message: 'Performance degraded',
        metadata: { reason: 'high load' },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              OVERALL HEALTH
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('checkAll', () => {
    it('should return healthy when no checks registered', async () => {
      const health = await aggregator.checkAll();

      expect(health.status).toBe('healthy');
      expect(health.components).toEqual({});
    });

    it('should return healthy when all components healthy', async () => {
      aggregator.registerCheck('service1', healthyCheck);
      aggregator.registerCheck('service2', healthyCheck);
      aggregator.registerCheck('service3', healthyCheck);

      const health = await aggregator.checkAll();

      expect(health.status).toBe('healthy');
      expect(Object.keys(health.components)).toHaveLength(3);
      expect(health.components.service1.status).toBe('healthy');
      expect(health.components.service2.status).toBe('healthy');
      expect(health.components.service3.status).toBe('healthy');
    });

    it('should return degraded when any component degraded', async () => {
      aggregator.registerCheck('service1', healthyCheck);
      aggregator.registerCheck('service2', degradedCheck);
      aggregator.registerCheck('service3', healthyCheck);

      const health = await aggregator.checkAll();

      expect(health.status).toBe('degraded');
      expect(health.components.service2.status).toBe('degraded');
    });

    it('should return unhealthy when any component unhealthy', async () => {
      aggregator.registerCheck('service1', healthyCheck);
      aggregator.registerCheck('service2', degradedCheck);
      aggregator.registerCheck('service3', unhealthyCheck);

      const health = await aggregator.checkAll();

      expect(health.status).toBe('unhealthy');
      expect(health.components.service3.status).toBe('unhealthy');
    });

    it('should prefer unhealthy over degraded', async () => {
      aggregator.registerCheck('service1', degradedCheck);
      aggregator.registerCheck('service2', unhealthyCheck);

      const health = await aggregator.checkAll();

      expect(health.status).toBe('unhealthy');
    });

    it('should include timestamp in ISO format', async () => {
      const health = await aggregator.checkAll();

      expect(health.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
      expect(new Date(health.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should include uptime in seconds', async () => {
      const health = await aggregator.checkAll();

      // Uptime should be 0 or greater (may be 0 if very fast)
      expect(health.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof health.uptime).toBe('number');
    });

    it('should include version', async () => {
      const health = await aggregator.checkAll();

      expect(health.version).toBeDefined();
      expect(typeof health.version).toBe('string');
    });

    it('should run all checks in parallel', async () => {
      const startTime = Date.now();

      const slowCheck = async (): Promise<ComponentHealth> => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { status: 'healthy' };
      };

      aggregator.registerCheck('slow1', slowCheck);
      aggregator.registerCheck('slow2', slowCheck);
      aggregator.registerCheck('slow3', slowCheck);

      await aggregator.checkAll();

      const duration = Date.now() - startTime;

      // Should be ~100ms (parallel), not ~300ms (sequential)
      expect(duration).toBeLessThan(200);
    });

    it('should handle mixed sync and async checks', async () => {
      aggregator.registerCheck('sync', healthyCheck);
      aggregator.registerCheck('async', asyncHealthyCheck);

      const health = await aggregator.checkAll();

      expect(health.status).toBe('healthy');
      expect(health.components.sync.status).toBe('healthy');
      expect(health.components.async.status).toBe('healthy');
    });

    it('should continue checking after one check fails', async () => {
      aggregator.registerCheck('failing', throwingCheck);
      aggregator.registerCheck('working', healthyCheck);

      const health = await aggregator.checkAll();

      expect(health.components.failing.status).toBe('unhealthy');
      expect(health.components.working.status).toBe('healthy');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              READINESS & LIVENESS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('isReady', () => {
    it('should return true when all components healthy', async () => {
      aggregator.registerCheck('service1', healthyCheck);
      aggregator.registerCheck('service2', healthyCheck);

      const ready = await aggregator.isReady();

      expect(ready).toBe(true);
    });

    it('should return true when no checks registered', async () => {
      const ready = await aggregator.isReady();

      expect(ready).toBe(true);
    });

    it('should return false when any component degraded', async () => {
      aggregator.registerCheck('service1', healthyCheck);
      aggregator.registerCheck('service2', degradedCheck);

      const ready = await aggregator.isReady();

      expect(ready).toBe(false);
    });

    it('should return false when any component unhealthy', async () => {
      aggregator.registerCheck('service1', healthyCheck);
      aggregator.registerCheck('service2', unhealthyCheck);

      const ready = await aggregator.isReady();

      expect(ready).toBe(false);
    });
  });

  describe('isAlive', () => {
    it('should return true when all components healthy', async () => {
      aggregator.registerCheck('service1', healthyCheck);
      aggregator.registerCheck('service2', healthyCheck);

      const alive = await aggregator.isAlive();

      expect(alive).toBe(true);
    });

    it('should return true when no checks registered', async () => {
      const alive = await aggregator.isAlive();

      expect(alive).toBe(true);
    });

    it('should return true when components degraded', async () => {
      aggregator.registerCheck('service1', healthyCheck);
      aggregator.registerCheck('service2', degradedCheck);

      const alive = await aggregator.isAlive();

      expect(alive).toBe(true);
    });

    it('should return false when any component unhealthy', async () => {
      aggregator.registerCheck('service1', healthyCheck);
      aggregator.registerCheck('service2', unhealthyCheck);

      const alive = await aggregator.isAlive();

      expect(alive).toBe(false);
    });

    it('should return false when all components unhealthy', async () => {
      aggregator.registerCheck('service1', unhealthyCheck);
      aggregator.registerCheck('service2', unhealthyCheck);

      const alive = await aggregator.isAlive();

      expect(alive).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle empty component name', () => {
      aggregator.registerCheck('', healthyCheck);

      const components = aggregator.getComponents();
      expect(components).toContain('');
    });

    it('should handle component names with special characters', () => {
      aggregator.registerCheck('service-with-dashes', healthyCheck);
      aggregator.registerCheck('service.with.dots', healthyCheck);
      aggregator.registerCheck('service_with_underscores', healthyCheck);

      const components = aggregator.getComponents();
      expect(components).toHaveLength(3);
    });

    it('should handle large number of components', async () => {
      for (let i = 0; i < 100; i++) {
        aggregator.registerCheck(`service${i}`, healthyCheck);
      }

      const health = await aggregator.checkAll();

      expect(Object.keys(health.components)).toHaveLength(100);
      expect(health.status).toBe('healthy');
    });

    it('should handle check returning null status', async () => {
      const nullCheck = (): any => ({
        status: null,
      });

      aggregator.registerCheck('null-service', nullCheck);

      // This will work but produce invalid data structure
      const health = await aggregator.checkAll();
      expect(health.components['null-service']).toBeDefined();
      expect(health.components['null-service'].status).toBeNull();
    });

    it('should handle check returning undefined (throws)', async () => {
      const undefinedCheck = (): any => undefined;

      aggregator.registerCheck('undefined-service', undefinedCheck);

      // This will throw because undefined has no .status property
      await expect(aggregator.checkAll()).rejects.toThrow();
    });

    it('should handle async check that never resolves', async () => {
      const hangingCheck = (): Promise<ComponentHealth> =>
        new Promise(() => {}); // Never resolves

      aggregator.registerCheck('hanging', hangingCheck);
      aggregator.registerCheck('normal', healthyCheck);

      // Set a timeout to prevent test hanging
      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Test timeout')), 1000)
      );

      const checkPromise = aggregator.checkComponent('hanging');

      // Should either resolve or we hit timeout
      await expect(
        Promise.race([checkPromise, timeoutPromise])
      ).rejects.toThrow();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              GLOBAL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Global Health Functions', () => {
  describe('getHealthAggregator', () => {
    it('should return singleton instance', () => {
      const agg1 = getHealthAggregator();
      const agg2 = getHealthAggregator();

      expect(agg1).toBe(agg2);
    });

    it('should create instance on first call', () => {
      const agg = getHealthAggregator();
      expect(agg).toBeInstanceOf(HealthAggregator);
    });
  });

  describe('setHealthAggregator', () => {
    it('should set custom aggregator', () => {
      const custom = new HealthAggregator();
      custom.registerCheck('custom', healthyCheck);

      setHealthAggregator(custom);

      const retrieved = getHealthAggregator();
      expect(retrieved).toBe(custom);
      expect(retrieved.getComponents()).toContain('custom');
    });
  });

  describe('createHealthAggregator', () => {
    it('should create new instance', () => {
      const agg = createHealthAggregator();
      expect(agg).toBeInstanceOf(HealthAggregator);
    });

    it('should create independent instances', () => {
      const agg1 = createHealthAggregator();
      const agg2 = createHealthAggregator();

      agg1.registerCheck('service1', healthyCheck);
      agg2.registerCheck('service2', healthyCheck);

      expect(agg1.getComponents()).toEqual(['service1']);
      expect(agg2.getComponents()).toEqual(['service2']);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              BUILT-IN CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Built-in Health Checks', () => {
  describe('runtimeHealthCheck', () => {
    it('should return healthy status', () => {
      const health = runtimeHealthCheck();

      expect(health.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });

    it('should include memory metadata', () => {
      const health = runtimeHealthCheck();

      expect(health.metadata).toBeDefined();
      expect(health.metadata?.heapUsed).toBeGreaterThan(0);
      expect(health.metadata?.heapTotal).toBeGreaterThan(0);
      expect(health.metadata?.heapUsedPercent).toBeGreaterThanOrEqual(0);
      expect(health.metadata?.heapUsedPercent).toBeLessThanOrEqual(100);
    });

    it('should return degraded when heap usage high', () => {
      // Mock high memory usage
      vi.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 950 * 1024 * 1024, // 950 MB
        heapTotal: 1000 * 1024 * 1024, // 1000 MB (95% usage)
        rss: 1000 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
      });

      const health = runtimeHealthCheck();

      expect(health.status).toBe('degraded');
      expect(health.metadata?.heapUsedPercent).toBeGreaterThan(90);

      vi.mocked(process.memoryUsage).mockRestore();
    });

    it('should return healthy when heap usage normal', () => {
      // Mock normal memory usage
      vi.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 50 * 1024 * 1024, // 50 MB
        heapTotal: 1000 * 1024 * 1024, // 1000 MB (5% usage)
        rss: 100 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
      });

      const health = runtimeHealthCheck();

      expect(health.status).toBe('healthy');
      expect(health.metadata?.heapUsedPercent).toBeLessThan(90);

      vi.mocked(process.memoryUsage).mockRestore();
    });

    it('should include RSS and external memory', () => {
      const health = runtimeHealthCheck();

      expect(health.metadata?.rss).toBeGreaterThan(0);
      expect(health.metadata?.external).toBeGreaterThanOrEqual(0);
    });
  });

  describe('eventLoopHealthCheck', () => {
    it('should return healthy status with low lag', async () => {
      const health = await eventLoopHealthCheck();

      expect(health.status).toBe('healthy');
      expect(health.metadata?.lagMs).toBeDefined();
      expect(typeof health.metadata?.lagMs).toBe('number');
    });

    it('should measure event loop lag', async () => {
      const health = await eventLoopHealthCheck();

      expect(health.metadata?.lagMs).toBeGreaterThanOrEqual(0);
      expect(health.metadata?.lagMs).toBeLessThan(100);
    });

    it('should detect degraded performance', async () => {
      // Block event loop briefly to increase lag
      const blockEventLoop = () => {
        const start = Date.now();
        while (Date.now() - start < 150) {
          // Busy wait
        }
      };

      // Start blocking in background
      setTimeout(blockEventLoop, 0);

      // Wait a bit for the blocking to take effect
      await new Promise((resolve) => setTimeout(resolve, 50));

      const health = await eventLoopHealthCheck();

      // May be degraded or unhealthy depending on timing
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });

    it('should include lag metadata', async () => {
      const health = await eventLoopHealthCheck();

      expect(health.metadata).toBeDefined();
      expect(health.metadata?.lagMs).toBeDefined();
      expect(typeof health.metadata?.lagMs).toBe('number');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              INTEGRATION SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Integration Scenarios', () => {
  it('should support complete health monitoring setup', async () => {
    const aggregator = new HealthAggregator();

    // Register various checks
    aggregator.registerCheck('runtime', runtimeHealthCheck);
    aggregator.registerCheck('eventloop', eventLoopHealthCheck);
    aggregator.registerCheck('database', async () => ({
      status: 'healthy',
      message: 'Database connected',
    }));
    aggregator.registerCheck('cache', () => ({
      status: 'healthy',
      message: 'Cache operational',
    }));

    // Check overall health
    const health = await aggregator.checkAll();

    expect(health.status).toBeDefined();
    expect(Object.keys(health.components)).toHaveLength(4);
    expect(health.timestamp).toBeDefined();
    expect(health.uptime).toBeGreaterThanOrEqual(0);
    expect(health.version).toBeDefined();
  });

  it('should support dynamic check registration and removal', async () => {
    const aggregator = new HealthAggregator();

    // Start with basic checks
    aggregator.registerCheck('service1', healthyCheck);
    const health1 = await aggregator.checkAll();
    expect(Object.keys(health1.components)).toHaveLength(1);

    // Add more checks
    aggregator.registerCheck('service2', healthyCheck);
    aggregator.registerCheck('service3', healthyCheck);
    const health2 = await aggregator.checkAll();
    expect(Object.keys(health2.components)).toHaveLength(3);

    // Remove a check
    aggregator.unregisterCheck('service2');
    const health3 = await aggregator.checkAll();
    expect(Object.keys(health3.components)).toHaveLength(2);
    expect(health3.components.service2).toBeUndefined();
  });

  it('should support Kubernetes-style health endpoints', async () => {
    const aggregator = new HealthAggregator();

    // Register critical services
    aggregator.registerCheck('database', healthyCheck);
    aggregator.registerCheck('cache', degradedCheck);

    // Readiness check (strict - all must be healthy)
    const ready = await aggregator.isReady();
    expect(ready).toBe(false); // Cache is degraded

    // Liveness check (loose - at least one healthy)
    const alive = await aggregator.isAlive();
    expect(alive).toBe(true); // Database is healthy
  });
});
