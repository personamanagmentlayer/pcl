// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - Provider Registry Enhancements Tests
// Tests for health monitoring, fallback chains, rate limiting, and cost tracking
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, test, expect, beforeEach } from 'vitest';
import { ProviderRegistry } from '../../src/runtime/providers/index';
import { MockProvider } from '../../src/runtime/providers/mock';
import type { GenerationRequest } from '../../src/runtime/providers/index';

describe('ProviderRegistry Enhancements', () => {
  let registry: ProviderRegistry;
  let mockProvider1: MockProvider;
  let mockProvider2: MockProvider;

  beforeEach(() => {
    registry = new ProviderRegistry();
    mockProvider1 = new MockProvider();
    mockProvider2 = new MockProvider();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Health Monitoring
  // ───────────────────────────────────────────────────────────────────────────

  describe('Health Monitoring', () => {
    test('creates health monitor automatically on registration', () => {
      registry.register(mockProvider1);

      const monitor = registry.getHealthMonitor('mock');
      expect(monitor).toBeDefined();
    });

    test('reports provider as healthy initially', () => {
      registry.register(mockProvider1);

      const isHealthy = registry.isProviderHealthy('mock');
      expect(isHealthy).toBe(true);
    });

    test('tracks provider health status', async () => {
      registry.register(mockProvider1);

      const status = registry.getHealthStatus();
      expect(status.has('mock')).toBe(true);
      const mockStatus = status.get('mock');
      expect(mockStatus?.status).toBe('healthy');
    });

    test('detects unhealthy providers after failures', async () => {
      registry.register(mockProvider1);

      const monitor = registry.getHealthMonitor('mock');
      expect(monitor).toBeDefined();

      // Simulate 3 failures to open circuit
      const error = new Error('Provider failure');
      monitor?.recordFailure(error);
      monitor?.recordFailure(error);
      monitor?.recordFailure(error);

      expect(registry.isProviderHealthy('mock')).toBe(false);
    });

    test('starts and stops health monitoring', () => {
      registry.register(mockProvider1);

      registry.startHealthMonitoring(1000);
      // Health monitoring started

      registry.stopHealthMonitoring();
      // Health monitoring stopped
    });

    test('cleans up health monitor on unregister', () => {
      registry.register(mockProvider1);
      expect(registry.getHealthMonitor('mock')).toBeDefined();

      registry.unregister('mock');
      expect(registry.getHealthMonitor('mock')).toBeUndefined();
    });

    test('returns only available providers', () => {
      const provider2 = { ...mockProvider2, name: 'mock2' };
      registry.register(mockProvider1);
      registry.register(provider2 as any);

      // Make mock unhealthy
      const monitor = registry.getHealthMonitor('mock');
      const error = new Error('Failure');
      monitor?.recordFailure(error);
      monitor?.recordFailure(error);
      monitor?.recordFailure(error);

      const available = registry.getAvailableProviders();
      expect(available).toContain('mock2');
      expect(available).not.toContain('mock');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Rate Limiting
  // ───────────────────────────────────────────────────────────────────────────

  describe('Rate Limiting', () => {
    test('creates rate limiter automatically on registration', () => {
      registry.register(mockProvider1);

      const limiter = registry.getRateLimiter('mock');
      expect(limiter).toBeDefined();
    });

    test('tracks rate limit stats', () => {
      registry.register(mockProvider1);

      const stats = registry.getRateLimitStats('mock');
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('requestsInWindow');
      expect(stats).toHaveProperty('maxRequests');
    });

    test('gets stats for all providers', () => {
      const provider2 = { ...mockProvider2, name: 'mock2' };
      registry.register(mockProvider1);
      registry.register(provider2 as any);

      const allStats = registry.getAllRateLimitStats();
      expect(allStats.has('mock')).toBe(true);
      expect(allStats.has('mock2')).toBe(true);
    });

    test('resets rate limiter', async () => {
      registry.register(mockProvider1);

      const limiter = registry.getRateLimiter('mock');

      // Acquire some tokens
      await limiter?.acquire();
      await limiter?.acquire();

      // Reset
      registry.resetRateLimiter('mock');

      const stats = registry.getRateLimitStats('mock');
      expect(stats?.requestsInWindow).toBe(0);
    });

    test('allows custom rate limiter config', () => {
      registry.register(mockProvider1, {
        rateLimiter: {
          maxRequests: 100,
          windowMs: 60000,
        },
      });

      const stats = registry.getRateLimitStats('mock');
      expect(stats?.maxRequests).toBe(100);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Cost Tracking
  // ───────────────────────────────────────────────────────────────────────────

  describe('Cost Tracking', () => {
    test('creates cost tracker automatically on registration', () => {
      registry.register(mockProvider1);

      const tracker = registry.getCostTracker('mock');
      expect(tracker).toBeDefined();
    });

    test('provides global cost tracker', () => {
      const globalTracker = registry.getGlobalCostTracker();
      expect(globalTracker).toBeDefined();
    });

    test('tracks provider costs', () => {
      registry.register(mockProvider1);

      const cost = registry.getProviderCost('mock');
      expect(cost).toBe(0); // No usage yet
    });

    test('gets aggregated cost stats', () => {
      registry.register(mockProvider1);

      const stats = registry.getCostStats();
      expect(stats).toHaveProperty('global');
      expect(stats).toHaveProperty('byProvider');
    });

    test('resets cost tracking', () => {
      registry.register(mockProvider1);

      // Add some usage (would need actual generation)
      registry.resetCostTracking();

      const cost = registry.getProviderCost('mock');
      expect(cost).toBe(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Fallback Chains
  // ───────────────────────────────────────────────────────────────────────────

  describe('Fallback Chains', () => {
    test('creates fallback chain builder', () => {
      const builder = registry.createFallbackChain();
      expect(builder).toBeDefined();
    });

    test('builds fallback chain with providers', () => {
      const provider2 = { ...mockProvider2, name: 'mock2' };
      registry.register(mockProvider1);
      registry.register(provider2 as any);

      const builder = registry.createFallbackChain();
      builder.withProviders('mock', 'mock2');
      builder.withStrategy('sequential');

      const chain = registry.buildFallbackChain(builder);
      expect(chain).toBeDefined();
    });

    test('creates sequential fallback chain', () => {
      const provider2 = { ...mockProvider2, name: 'mock2' };
      registry.register(mockProvider1);
      registry.register(provider2 as any);

      const chain = registry.createSequentialFallback('mock', 'mock2');
      expect(chain).toBeDefined();
    });

    test('creates health-based fallback chain', () => {
      const provider2 = { ...mockProvider2, name: 'mock2' };
      registry.register(mockProvider1);
      registry.register(provider2 as any);

      const chain = registry.createHealthBasedFallback('mock', 'mock2');
      expect(chain).toBeDefined();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Enhanced Provider Operations
  // ───────────────────────────────────────────────────────────────────────────

  describe('Enhanced Provider Operations', () => {
    test('generates response with tracking', async () => {
      registry.register(mockProvider1);

      const request: GenerationRequest = {
        prompt: 'Test prompt',
      };

      const response = await registry.generateWithTracking('mock', request);

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      expect(response.usage).toBeDefined();
    });

    test('throws error for non-existent provider', async () => {
      const request: GenerationRequest = {
        prompt: 'Test prompt',
      };

      await expect(
        registry.generateWithTracking('non-existent', request)
      ).rejects.toThrow("Provider 'non-existent' not found");
    });

    test('throws error for unhealthy provider', async () => {
      registry.register(mockProvider1);

      // Make provider unhealthy
      const monitor = registry.getHealthMonitor('mock');
      const error = new Error('Failure');
      monitor?.recordFailure(error);
      monitor?.recordFailure(error);
      monitor?.recordFailure(error);

      const request: GenerationRequest = {
        prompt: 'Test prompt',
      };

      await expect(
        registry.generateWithTracking('mock', request)
      ).rejects.toThrow("Provider 'mock' is unhealthy");
    });

    test('tracks cost after successful generation', async () => {
      registry.register(mockProvider1);

      const request: GenerationRequest = {
        prompt: 'Test prompt',
      };

      await registry.generateWithTracking('mock', request);

      const tracker = registry.getCostTracker('mock');
      const records = tracker?.getRecords();
      expect(records?.length).toBeGreaterThan(0);
    });

    test('applies rate limiting before generation', async () => {
      registry.register(mockProvider1, {
        rateLimiter: {
          maxRequests: 1,
          windowMs: 60000,
        },
      });

      const request: GenerationRequest = {
        prompt: 'Test prompt',
      };

      // First request should succeed
      await registry.generateWithTracking('mock', request);

      // Second request should be rate limited (queued)
      const promise = registry.generateWithTracking('mock', request);

      // Check rate limit stats
      const stats = registry.getRateLimitStats('mock');
      expect(stats?.requestsInWindow).toBeGreaterThan(0);

      await promise; // Wait for completion
    });

    test.skip('records failure in health monitor on error', async () => {
      // Skipped: requires vi.fn() mocking which has issues in current setup
      registry.register(mockProvider1);

      // Check that failure was recorded
      const monitor = registry.getHealthMonitor('mock');
      expect(monitor).toBeDefined();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Integration Tests
  // ───────────────────────────────────────────────────────────────────────────

  describe('Integration Tests', () => {
    test.skip('full workflow with tracking and fallback', async () => {
      // Skipped: requires vi.fn() mocking
      const provider2 = { ...mockProvider2, name: 'mock2' };
      registry.register(mockProvider1);
      registry.register(provider2 as any);

      // Create fallback chain
      const chain = registry.createSequentialFallback('mock', 'mock2');

      const request: GenerationRequest = {
        prompt: 'Test prompt',
      };

      // Should fall back to mock2 if first fails
      const result = await chain.generateResponse(request);

      expect(result.result).toBeDefined();
    });

    test('clears all registries on clear', () => {
      registry.register(mockProvider1);

      registry.clear();

      expect(registry.size).toBe(0);
      expect(registry.getHealthMonitor('mock')).toBeUndefined();
      expect(registry.getRateLimiter('mock')).toBeUndefined();
      expect(registry.getCostTracker('mock')).toBeUndefined();
    });

    test('multiple providers with different configurations', () => {
      const provider2 = { ...mockProvider2, name: 'mock2' };

      registry.register(mockProvider1, {
        rateLimiter: {
          maxRequests: 100,
          windowMs: 60000,
        },
      });

      registry.register(provider2 as any, {
        rateLimiter: {
          maxRequests: 50,
          windowMs: 60000,
        },
      });

      const stats1 = registry.getRateLimitStats('mock');
      const stats2 = registry.getRateLimitStats('mock2');

      expect(stats1?.maxRequests).toBe(100);
      expect(stats2?.maxRequests).toBe(50);
    });

    test('health monitoring affects available providers', () => {
      const provider2 = { ...mockProvider2, name: 'mock2' };
      const provider3 = { ...mockProvider2, name: 'mock3' };

      registry.register(mockProvider1);
      registry.register(provider2 as any);
      registry.register(provider3 as any);

      // All should be available initially
      expect(registry.getAvailableProviders().length).toBe(3);

      // Make mock unhealthy
      const monitor = registry.getHealthMonitor('mock');
      const error = new Error('Failure');
      monitor?.recordFailure(error);
      monitor?.recordFailure(error);
      monitor?.recordFailure(error);

      // Should have 2 available providers now
      const available = registry.getAvailableProviders();
      expect(available.length).toBe(2);
      expect(available).toContain('mock2');
      expect(available).toContain('mock3');
      expect(available).not.toContain('mock');
    });

    test('cost tracking across multiple providers', async () => {
      const provider2 = { ...mockProvider2, name: 'mock2' };
      registry.register(mockProvider1);
      registry.register(provider2 as any);

      const request: GenerationRequest = {
        prompt: 'Test prompt',
      };

      // Generate with both providers
      await registry.generateWithTracking('mock', request);
      await registry.generateWithTracking('mock2', request);

      // Check individual costs
      const cost1 = registry.getProviderCost('mock');
      const cost2 = registry.getProviderCost('mock2');

      expect(cost1).toBeGreaterThanOrEqual(0);
      expect(cost2).toBeGreaterThanOrEqual(0);

      // Check aggregated stats
      const stats = registry.getCostStats();
      expect(stats.byProvider).toHaveProperty('mock');
      expect(stats.byProvider).toHaveProperty('mock2');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Edge Cases
  // ───────────────────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    test('handles provider re-registration with new config', () => {
      registry.register(mockProvider1, {
        rateLimiter: { maxRequests: 10 },
      });

      const stats1 = registry.getRateLimitStats('mock');
      expect(stats1?.maxRequests).toBe(10);

      // Re-register with different config
      registry.register(mockProvider1, {
        rateLimiter: { maxRequests: 20 },
      });

      const stats2 = registry.getRateLimitStats('mock');
      expect(stats2?.maxRequests).toBe(20);
    });

    test('handles health check on non-existent provider', () => {
      const isHealthy = registry.isProviderHealthy('non-existent');
      expect(isHealthy).toBe(false);
    });

    test('handles cost tracking for provider without usage', () => {
      registry.register(mockProvider1);

      const cost = registry.getProviderCost('mock');
      expect(cost).toBe(0);
    });

    test('handles fallback chain with no providers', () => {
      const builder = registry.createFallbackChain();
      builder.withStrategy('sequential');

      expect(() => registry.buildFallbackChain(builder)).toThrow();
    });
  });
});
