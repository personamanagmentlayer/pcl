/**
 * Learned Router Tests
 *
 * Basic tests for routing engine
 * Target: 0% → 30%+ coverage (initial pass)
 */

import {
  LearnedRouter,
  type RoutableProvider,
} from '../../../src/runtime/routing/router';
import type {
  RoutingConfig,
  RoutingMessage,
} from '../../../src/runtime/routing/types';

describe('LearnedRouter', () => {
  const defaultConfig: RoutingConfig = {
    enabled: true,
    strategy: 'learned',
    fallbackChain: true,
    fallbackCount: 2,
    weights: {
      capability: 0.4,
      performance: 0.2,
      cost: 0.2,
      latency: 0.1,
      availability: 0.1,
    },
  };

  const mockProviders: RoutableProvider[] = [
    {
      name: 'provider1',
      capabilities: { code: true, json: true },
      defaultModel: 'model-1',
    },
    {
      name: 'provider2',
      capabilities: { vision: true, math: true },
      defaultModel: 'model-2',
    },
    {
      name: 'provider3',
      capabilities: { long_context: true },
      defaultModel: 'model-3',
    },
  ];

  const mockHealthCheck = (providerId: string) => ({ state: 'closed' });

  describe('Construction', () => {
    it('should create router with config', () => {
      const router = new LearnedRouter(defaultConfig);

      expect(router).toBeDefined();
    });

    it('should create router with custom weights', () => {
      const config: RoutingConfig = {
        ...defaultConfig,
        weights: {
          capability: 0.5,
          performance: 0.3,
          cost: 0.1,
          latency: 0.05,
          availability: 0.05,
        },
      };

      const router = new LearnedRouter(config);

      expect(router).toBeDefined();
    });
  });

  describe('Provider Selection', () => {
    let router: LearnedRouter;

    beforeEach(() => {
      router = new LearnedRouter(defaultConfig);
    });

    it('should select provider for message', () => {
      const message: RoutingMessage = {
        role: 'user',
        content: 'Write a Python function',
        metadata: {},
      };

      const decision = router.selectProvider(
        message,
        'test-persona',
        mockProviders,
        mockHealthCheck
      );

      expect(decision).toBeDefined();
      expect(decision.primary).toBeDefined();
      expect(decision.primary.providerId).toBeDefined();
    });

    it('should include reasoning in decision', () => {
      const message: RoutingMessage = {
        role: 'user',
        content: 'Test message',
        metadata: {},
      };

      const decision = router.selectProvider(
        message,
        'test-persona',
        mockProviders,
        mockHealthCheck
      );

      expect(decision.reasoning).toBeDefined();
    });

    it('should include timestamp', () => {
      const message: RoutingMessage = {
        role: 'user',
        content: 'Test',
        metadata: {},
      };

      const decision = router.selectProvider(
        message,
        'test-persona',
        mockProviders,
        mockHealthCheck
      );

      expect(decision.timestamp).toBeDefined();
      expect(typeof decision.timestamp).toBe('number');
    });

    it('should handle multiple providers', () => {
      const message: RoutingMessage = {
        role: 'user',
        content: 'Complex task',
        metadata: {},
      };

      const decision = router.selectProvider(
        message,
        'test-persona',
        mockProviders,
        mockHealthCheck
      );

      expect(decision.primary).toBeDefined();
      expect(decision.fallbacks).toBeDefined();
      expect(Array.isArray(decision.fallbacks)).toBe(true);
    });

    it('should filter unhealthy providers', () => {
      const unhealthyCheck = (providerId: string) =>
        providerId === 'provider1' ? { state: 'open' } : { state: 'closed' };

      const message: RoutingMessage = {
        role: 'user',
        content: 'Test',
        metadata: {},
      };

      const decision = router.selectProvider(
        message,
        'test-persona',
        mockProviders,
        unhealthyCheck
      );

      expect(decision.primary.providerId).not.toBe('provider1');
    });

    it('should handle all providers unhealthy', () => {
      const allUnhealthy = () => ({ state: 'open' });

      const message: RoutingMessage = {
        role: 'user',
        content: 'Test',
        metadata: {},
      };

      const decision = router.selectProvider(
        message,
        'test-persona',
        mockProviders,
        allUnhealthy
      );

      expect(decision).toBeDefined();
      expect(decision.primary).toBeDefined();
    });

    it('should handle single provider', () => {
      const message: RoutingMessage = {
        role: 'user',
        content: 'Test',
        metadata: {},
      };

      const decision = router.selectProvider(
        message,
        'test-persona',
        [mockProviders[0]],
        mockHealthCheck
      );

      expect(decision.primary.providerId).toBe('provider1');
    });
  });

  describe('Performance History', () => {
    let router: LearnedRouter;

    beforeEach(() => {
      router = new LearnedRouter(defaultConfig);
    });

    it('should update performance history', () => {
      const dataPoint = {
        timestamp: Date.now(),
        providerId: 'provider1',
        modelId: 'model-1',
        personaId: 'test-persona',
        taskType: 'code',
        latency: 100,
        success: true,
        error: undefined,
        tokenUsage: { input: 10, output: 20, total: 30 },
        cost: 0.001,
      };

      router.updateHistory(dataPoint);

      // No assertion needed - just verifying it doesn't throw
      expect(true).toBe(true);
    });

    it('should handle multiple history updates', () => {
      for (let i = 0; i < 10; i++) {
        router.updateHistory({
          timestamp: Date.now(),
          providerId: 'provider1',
          modelId: 'model-1',
          personaId: 'test-persona',
          taskType: 'code',
          latency: 100 + i,
          success: true,
          error: undefined,
          tokenUsage: { input: 10, output: 20, total: 30 },
          cost: 0.001,
        });
      }

      expect(true).toBe(true);
    });
  });

  describe('Fallback Configuration', () => {
    it('should respect fallback chain config', () => {
      const router = new LearnedRouter({
        ...defaultConfig,
        fallbackChain: true,
        fallbackCount: 2,
      });

      const message: RoutingMessage = {
        role: 'user',
        content: 'Test',
        metadata: {},
      };

      const decision = router.selectProvider(
        message,
        'test-persona',
        mockProviders,
        mockHealthCheck
      );

      expect(decision.fallbacks.length).toBeLessThanOrEqual(2);
    });

    it('should disable fallback chain when configured', () => {
      const router = new LearnedRouter({
        ...defaultConfig,
        fallbackChain: false,
      });

      const message: RoutingMessage = {
        role: 'user',
        content: 'Test',
        metadata: {},
      };

      const decision = router.selectProvider(
        message,
        'test-persona',
        mockProviders,
        mockHealthCheck
      );

      expect(decision.fallbacks.length).toBe(0);
    });
  });

  describe('Different Message Types', () => {
    let router: LearnedRouter;

    beforeEach(() => {
      router = new LearnedRouter(defaultConfig);
    });

    it('should handle code-related messages', () => {
      const message: RoutingMessage = {
        role: 'user',
        content: 'Write a Python function to parse JSON',
        metadata: {},
      };

      const decision = router.selectProvider(
        message,
        'test-persona',
        mockProviders,
        mockHealthCheck
      );

      expect(decision).toBeDefined();
    });

    it('should handle vision-related messages', () => {
      const message: RoutingMessage = {
        role: 'user',
        content: 'Analyze this image',
        metadata: {},
      };

      const decision = router.selectProvider(
        message,
        'test-persona',
        mockProviders,
        mockHealthCheck
      );

      expect(decision).toBeDefined();
    });

    it('should handle long context messages', () => {
      const message: RoutingMessage = {
        role: 'user',
        content: 'A'.repeat(5000),
        metadata: {},
      };

      const decision = router.selectProvider(
        message,
        'test-persona',
        mockProviders,
        mockHealthCheck
      );

      expect(decision).toBeDefined();
    });

    it('should handle empty messages', () => {
      const message: RoutingMessage = {
        role: 'user',
        content: '',
        metadata: {},
      };

      const decision = router.selectProvider(
        message,
        'test-persona',
        mockProviders,
        mockHealthCheck
      );

      expect(decision).toBeDefined();
    });
  });
});
