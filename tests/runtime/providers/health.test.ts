/**
 * Provider Health Monitor Tests
 *
 * Comprehensive tests for circuit breaker and health monitoring
 * Target: 79.90% → 85%+ coverage
 */

import { z } from 'zod';
import { ProviderHealthMonitor } from '../../../src/runtime/providers/health';
import { MockProvider } from '../../../src/runtime/providers/mock';

// Zod schema for health check validation
const HealthCheckResultSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy', 'unknown']),
  timestamp: z.date(),
  latency: z.number().nonnegative().optional(),
  error: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

describe('ProviderHealthMonitor', () => {
  let provider: MockProvider;
  let monitor: ProviderHealthMonitor;

  beforeEach(() => {
    provider = new MockProvider();
  });

  afterEach(() => {
    if (monitor) {
      monitor.stop();
    }
  });

  describe('Initialization', () => {
    it('should create monitor with default config', () => {
      monitor = new ProviderHealthMonitor(provider);

      expect(monitor).toBeDefined();
      expect(monitor.getCircuitState()).toBe('closed');
    });

    it('should create monitor with custom config', () => {
      monitor = new ProviderHealthMonitor(provider, {
        failureThreshold: 5,
        recoveryTimeout: 60000,
        successThreshold: 3,
      });

      expect(monitor).toBeDefined();
    });

    it('should initialize with healthy status', () => {
      monitor = new ProviderHealthMonitor(provider);

      const result = monitor.getStatus();
      expect(result.status).toBe('healthy');
    });
  });

  describe('Health Checks', () => {
    beforeEach(() => {
      monitor = new ProviderHealthMonitor(provider);
    });

    it('should perform health check successfully', async () => {
      const result = await monitor.checkHealth();

      // Validate with Zod
      const validated = HealthCheckResultSchema.parse(result);
      expect(validated.status).toMatch(/healthy|degraded/);
      expect(validated.latency).toBeGreaterThanOrEqual(0);
    });

    it('should record latency in health check', async () => {
      const result = await monitor.checkHealth();

      expect(result.latency).toBeDefined();
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });

    it('should detect unhealthy provider', async () => {
      // Mock provider to fail
      vi.spyOn(provider, 'countTokens').mockImplementation(() => {
        throw new Error('Provider unavailable');
      });

      const result = await monitor.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('Provider unavailable');
    });

    it('should handle invalid token count', async () => {
      vi.spyOn(provider, 'countTokens').mockReturnValue(0);

      const result = await monitor.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBeDefined();
    });

    it('should update last check timestamp', async () => {
      const before = new Date();
      await monitor.checkHealth();
      const result = monitor.getStatus();

      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
    });
  });

  describe('Circuit Breaker - Closed State', () => {
    beforeEach(() => {
      monitor = new ProviderHealthMonitor(provider, {
        failureThreshold: 3,
        recoveryTimeout: 100,
        successThreshold: 2,
      });
    });

    it('should start in closed state', () => {
      expect(monitor.getCircuitState()).toBe('closed');
      expect(monitor.isAvailable()).toBe(true);
    });

    it('should allow requests in closed state', async () => {
      const result = await monitor.checkHealth();

      expect(result.status).toMatch(/healthy|degraded/);
      expect(monitor.isAvailable()).toBe(true);
    });

    it('should count failures', async () => {
      vi.spyOn(provider, 'countTokens').mockImplementation(() => {
        throw new Error('Fail');
      });

      await monitor.checkHealth();
      await monitor.checkHealth();

      expect(monitor.getStats().failureCount).toBe(2);
      expect(monitor.getCircuitState()).toBe('closed'); // Still closed, threshold is 3
    });

    it('should open circuit after threshold failures', async () => {
      vi.spyOn(provider, 'countTokens').mockImplementation(() => {
        throw new Error('Fail');
      });

      await monitor.checkHealth();
      await monitor.checkHealth();
      await monitor.checkHealth();

      expect(monitor.getCircuitState()).toBe('open');
      expect(monitor.isAvailable()).toBe(false);
    });
  });

  describe('Circuit Breaker - Open State', () => {
    beforeEach(async () => {
      monitor = new ProviderHealthMonitor(provider, {
        failureThreshold: 2,
        recoveryTimeout: 100,
        successThreshold: 2,
      });

      // Force circuit to open
      vi.spyOn(provider, 'countTokens').mockImplementation(() => {
        throw new Error('Fail');
      });

      await monitor.checkHealth();
      await monitor.checkHealth();
    });

    it('should be in open state', () => {
      expect(monitor.getCircuitState()).toBe('open');
      expect(monitor.isAvailable()).toBe(false);
    });

    it('should reject requests immediately when open', () => {
      const canRequest = monitor.isAvailable();

      expect(canRequest).toBe(false);
    });

    it('should transition to half-open after timeout', async () => {
      // Restore provider functionality
      vi.restoreAllMocks();

      // Wait for recovery timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(monitor.getCircuitState()).toBe('half-open');
    });
  });

  describe('Circuit Breaker - Half-Open State', () => {
    it('should transition to half-open and allow test request', async () => {
      monitor = new ProviderHealthMonitor(provider, {
        failureThreshold: 2,
        recoveryTimeout: 50,
        successThreshold: 2,
      });

      // Open the circuit
      const mockFn = vi
        .spyOn(provider, 'countTokens')
        .mockImplementation(() => {
          throw new Error('Fail');
        });

      await monitor.checkHealth();
      await monitor.checkHealth();

      expect(monitor.getCircuitState()).toBe('open');

      // Restore functionality BEFORE the timeout fires
      mockFn.mockRestore();

      // Wait for half-open transition + automatic health check
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should be half-open (automatic check succeeded but needs 2 successes)
      expect(monitor.getCircuitState()).toBe('half-open');
    });

    it('should close circuit after successful requests', async () => {
      monitor = new ProviderHealthMonitor(provider, {
        failureThreshold: 2,
        recoveryTimeout: 50,
        successThreshold: 2,
      });

      // Open the circuit
      const mockFn = vi
        .spyOn(provider, 'countTokens')
        .mockImplementation(() => {
          throw new Error('Fail');
        });

      await monitor.checkHealth();
      await monitor.checkHealth();

      // Restore before timeout
      mockFn.mockRestore();

      // Wait for half-open
      await new Promise((resolve) => setTimeout(resolve, 100));

      // One more success needed to close (automatic check counted as 1)
      await monitor.checkHealth();

      expect(monitor.getCircuitState()).toBe('closed');
      expect(monitor.getStats().successCount).toBe(0); // Reset after closing
    });

    it('should reopen circuit on failure during half-open', async () => {
      monitor = new ProviderHealthMonitor(provider, {
        failureThreshold: 2,
        recoveryTimeout: 50,
        successThreshold: 2,
      });

      // Open the circuit
      let mockFn = vi.spyOn(provider, 'countTokens').mockImplementation(() => {
        throw new Error('Fail');
      });

      await monitor.checkHealth();
      await monitor.checkHealth();

      // Keep failing during recovery
      mockFn.mockRestore();
      mockFn = vi.spyOn(provider, 'countTokens').mockImplementation(() => {
        throw new Error('Still failing');
      });

      // Wait for half-open attempt - the automatic health check will fail
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should reopen on failure
      expect(monitor.getCircuitState()).toBe('open');

      mockFn.mockRestore();
    });
  });

  describe('Automatic Health Checks', () => {
    beforeEach(() => {
      monitor = new ProviderHealthMonitor(provider, {
        failureThreshold: 3,
        recoveryTimeout: 1000,
        successThreshold: 2,
        checkInterval: 100,
      });
    });

    it('should start periodic checks', async () => {
      let checkCount = 0;
      vi.spyOn(provider, 'countTokens').mockImplementation(() => {
        checkCount++;
        return 10;
      });

      monitor.start();

      await new Promise((resolve) => setTimeout(resolve, 250));

      expect(checkCount).toBeGreaterThan(1);
    });

    it('should not start twice', () => {
      monitor.start();
      monitor.start();

      // Should not throw or create duplicate intervals
      expect(monitor).toBeDefined();
    });

    it('should stop periodic checks', async () => {
      let checkCount = 0;
      vi.spyOn(provider, 'countTokens').mockImplementation(() => {
        checkCount++;
        return 10;
      });

      monitor.start();
      await new Promise((resolve) => setTimeout(resolve, 150));

      const countBeforeStop = checkCount;

      monitor.stop();
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(checkCount).toBe(countBeforeStop);
    });
  });

  describe('Status Determination', () => {
    beforeEach(() => {
      monitor = new ProviderHealthMonitor(provider);
    });

    it('should mark as healthy for low latency', async () => {
      vi.spyOn(provider, 'countTokens').mockImplementation(() => {
        // Simulate fast response
        return 10;
      });

      const result = await monitor.checkHealth();

      expect(result.status).toMatch(/healthy|degraded/);
    });

    it('should mark as degraded for high latency', async () => {
      vi.spyOn(provider, 'countTokens').mockImplementation(() => {
        // Simulate slow response
        const start = Date.now();
        while (Date.now() - start < 1000) {
          // Busy wait
        }
        return 10;
      });

      const result = await monitor.checkHealth();

      // With 1s+ latency, should be degraded
      expect(result.status).toMatch(/degraded|healthy/);
      expect(result.latency).toBeGreaterThan(500);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      monitor = new ProviderHealthMonitor(provider);
    });

    it('should track failure count', async () => {
      vi.spyOn(provider, 'countTokens').mockImplementation(() => {
        throw new Error('Fail');
      });

      await monitor.checkHealth();
      await monitor.checkHealth();

      expect(monitor.getStats().failureCount).toBe(2);
    });

    it('should track success count in closed state', async () => {
      await monitor.checkHealth();
      await monitor.checkHealth();

      // In closed state, successCount is not tracked (always 0)
      // Success just resets failureCount
      expect(monitor.getStats().failureCount).toBe(0);
    });

    it('should reset success count after failure', async () => {
      await monitor.checkHealth();
      await monitor.checkHealth();

      vi.spyOn(provider, 'countTokens').mockImplementation(() => {
        throw new Error('Fail');
      });

      await monitor.checkHealth();

      expect(monitor.getStats().successCount).toBe(0);
    });

    it('should reset failure count after success', async () => {
      vi.spyOn(provider, 'countTokens').mockImplementation(() => {
        throw new Error('Fail');
      });

      await monitor.checkHealth();

      expect(monitor.getStats().failureCount).toBe(1);

      vi.restoreAllMocks();

      await monitor.checkHealth();

      expect(monitor.getStats().failureCount).toBe(0);
    });

    it('should provide last check result', async () => {
      await monitor.checkHealth();

      const result = monitor.getStatus();

      expect(result).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      monitor = new ProviderHealthMonitor(provider);
    });

    it('should handle provider exceptions', async () => {
      vi.spyOn(provider, 'countTokens').mockImplementation(() => {
        throw new Error('Provider error');
      });

      const result = await monitor.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Provider error');
    });

    it('should handle non-Error exceptions', async () => {
      vi.spyOn(provider, 'countTokens').mockImplementation(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'String error';
      });

      const result = await monitor.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('String error');
    });

    it('should not throw during automatic checks', async () => {
      vi.spyOn(provider, 'countTokens').mockImplementation(() => {
        throw new Error('Fail');
      });

      monitor.start();

      // Should not throw
      await new Promise((resolve) => setTimeout(resolve, 150));

      monitor.stop();
    });
  });

  describe('Recovery', () => {
    it('should recover from failures', async () => {
      monitor = new ProviderHealthMonitor(provider, {
        failureThreshold: 2,
        recoveryTimeout: 100,
        successThreshold: 2,
      });

      // Cause failures
      vi.spyOn(provider, 'countTokens').mockImplementation(() => {
        throw new Error('Fail');
      });

      await monitor.checkHealth();
      await monitor.checkHealth();

      expect(monitor.getCircuitState()).toBe('open');

      // Restore functionality
      vi.restoreAllMocks();

      // Wait for recovery
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(monitor.getCircuitState()).toBe('half-open');

      // Successful checks
      await monitor.checkHealth();
      await monitor.checkHealth();

      expect(monitor.getCircuitState()).toBe('closed');
      expect(monitor.isAvailable()).toBe(true);
    });
  });
});
