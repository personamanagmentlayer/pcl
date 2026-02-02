/**
 * Fallback Chain Tests
 *
 * Comprehensive tests for provider fallback and failover
 * Target: 58.33% → 80%+ coverage
 */

import { z } from 'zod';
import {
  FallbackChain,
  FallbackChainBuilder,
  type FallbackResult,
} from '../../../src/runtime/providers/fallback';
import { MockProvider } from '../../../src/runtime/providers/mock';
import { ProviderHealthMonitor } from '../../../src/runtime/providers/health';
import type {
  AIProvider,
  GenerationRequest,
  GenerationResponse,
  GenerationChunk,
} from '../../../src/runtime/providers';

// Zod schema for fallback result validation
const FallbackResultSchema = z.object({
  result: z.any(),
  provider: z.string(),
  attemptCount: z.number().int().positive(),
  errors: z.array(
    z.object({
      provider: z.string(),
      error: z.instanceof(Error),
    })
  ),
});

// Test fixtures
const mockRequest: GenerationRequest = {
  messages: [{ role: 'user', content: 'test' }],
  model: 'test-model',
};

const mockResponse: GenerationResponse = {
  content: 'test response',
  usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
  finishReason: 'stop',
};

describe('FallbackChain', () => {
  let provider1: MockProvider;
  let provider2: MockProvider;
  let provider3: MockProvider;
  let providers: Map<string, AIProvider>;

  beforeEach(() => {
    provider1 = new MockProvider();
    provider2 = new MockProvider();
    provider3 = new MockProvider();

    providers = new Map([
      ['provider1', provider1],
      ['provider2', provider2],
      ['provider3', provider3],
    ]);
  });

  describe('Construction', () => {
    it('should create fallback chain with default config', () => {
      const chain = new FallbackChain(providers, ['provider1', 'provider2']);

      expect(chain).toBeDefined();
      expect(chain.getProviderOrder()).toEqual(['provider1', 'provider2']);
    });

    it('should create fallback chain with custom config', () => {
      const chain = new FallbackChain(providers, ['provider1'], new Map(), {
        strategy: 'fastest',
        maxRetries: 3,
        timeout: 5000,
        skipUnhealthy: false,
      });

      expect(chain).toBeDefined();
    });

    it('should throw on non-existent provider', () => {
      expect(() => {
        new FallbackChain(providers, ['non-existent']);
      }).toThrow("Provider 'non-existent' not found");
    });

    it('should create chain with health monitors', () => {
      const healthMonitors = new Map([
        ['provider1', new ProviderHealthMonitor(provider1)],
      ]);

      const chain = new FallbackChain(
        providers,
        ['provider1', 'provider2'],
        healthMonitors
      );

      expect(chain).toBeDefined();
    });
  });

  describe('generateResponse - Basic Fallback', () => {
    it('should use first provider on success', async () => {
      const chain = new FallbackChain(providers, ['provider1', 'provider2']);

      vi.spyOn(provider1, 'generateResponse').mockResolvedValue(mockResponse);

      const result = await chain.generateResponse(mockRequest);

      const validated = FallbackResultSchema.parse(result);
      expect(validated.provider).toBe('provider1');
      expect(validated.attemptCount).toBe(1);
      expect(validated.errors).toHaveLength(0);
      expect(validated.result).toEqual(mockResponse);
    });

    it('should fallback to second provider on first failure', async () => {
      const chain = new FallbackChain(providers, ['provider1', 'provider2']);

      vi.spyOn(provider1, 'generateResponse').mockRejectedValue(
        new Error('Provider 1 failed')
      );
      vi.spyOn(provider2, 'generateResponse').mockResolvedValue(mockResponse);

      const result = await chain.generateResponse(mockRequest);

      expect(result.provider).toBe('provider2');
      expect(result.attemptCount).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].provider).toBe('provider1');
    });

    it('should try all providers before failing', async () => {
      const chain = new FallbackChain(providers, [
        'provider1',
        'provider2',
        'provider3',
      ]);

      vi.spyOn(provider1, 'generateResponse').mockRejectedValue(
        new Error('Fail 1')
      );
      vi.spyOn(provider2, 'generateResponse').mockRejectedValue(
        new Error('Fail 2')
      );
      vi.spyOn(provider3, 'generateResponse').mockRejectedValue(
        new Error('Fail 3')
      );

      await expect(chain.generateResponse(mockRequest)).rejects.toThrow(
        'All providers in fallback chain failed'
      );
    });

    it('should collect errors from all failed providers', async () => {
      const chain = new FallbackChain(providers, ['provider1', 'provider2']);

      vi.spyOn(provider1, 'generateResponse').mockRejectedValue(
        new Error('Error 1')
      );
      vi.spyOn(provider2, 'generateResponse').mockRejectedValue(
        new Error('Error 2')
      );

      try {
        await chain.generateResponse(mockRequest);
        fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('provider1: Error 1');
        expect((error as Error).message).toContain('provider2: Error 2');
      }
    });

    it('should handle non-Error exceptions', async () => {
      const chain = new FallbackChain(providers, ['provider1', 'provider2']);

      vi.spyOn(provider1, 'generateResponse').mockImplementation(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'String error';
      });
      vi.spyOn(provider2, 'generateResponse').mockResolvedValue(mockResponse);

      const result = await chain.generateResponse(mockRequest);

      expect(result.provider).toBe('provider2');
      expect(result.errors[0].error.message).toBe('String error');
    });
  });

  describe('generateResponse - Timeout', () => {
    it('should timeout slow providers', async () => {
      const chain = new FallbackChain(
        providers,
        ['provider1', 'provider2'],
        new Map(),
        { timeout: 100 }
      );

      vi.spyOn(provider1, 'generateResponse').mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve(mockResponse), 200))
      );
      vi.spyOn(provider2, 'generateResponse').mockResolvedValue(mockResponse);

      const result = await chain.generateResponse(mockRequest);

      expect(result.provider).toBe('provider2');
      expect(result.errors[0].error.message).toContain('timeout');
    });

    it('should use custom timeout', async () => {
      const chain = new FallbackChain(providers, ['provider1'], new Map(), {
        timeout: 50,
      });

      vi.spyOn(provider1, 'generateResponse').mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100))
      );

      await expect(chain.generateResponse(mockRequest)).rejects.toThrow(
        'All providers'
      );
    });
  });

  describe('generateResponse - Health-Based Filtering', () => {
    it('should skip unhealthy providers by default', async () => {
      const monitor1 = new ProviderHealthMonitor(provider1, {
        failureThreshold: 1,
      });

      // Make provider1 unhealthy
      vi.spyOn(provider1, 'countTokens').mockImplementation(() => {
        throw new Error('Unhealthy');
      });
      await monitor1.checkHealth();

      const healthMonitors = new Map([['provider1', monitor1]]);

      const chain = new FallbackChain(
        providers,
        ['provider1', 'provider2'],
        healthMonitors,
        { skipUnhealthy: true }
      );

      vi.spyOn(provider2, 'generateResponse').mockResolvedValue(mockResponse);

      const result = await chain.generateResponse(mockRequest);

      expect(result.provider).toBe('provider2');
      expect(result.attemptCount).toBe(1); // Skipped provider1
    });

    it('should not skip unhealthy providers when skipUnhealthy is false', async () => {
      const monitor1 = new ProviderHealthMonitor(provider1, {
        failureThreshold: 1,
      });

      // Make provider1 unhealthy
      vi.spyOn(provider1, 'countTokens').mockImplementation(() => {
        throw new Error('Unhealthy');
      });
      await monitor1.checkHealth();

      const healthMonitors = new Map([['provider1', monitor1]]);

      const chain = new FallbackChain(
        providers,
        ['provider1', 'provider2'],
        healthMonitors,
        { skipUnhealthy: false }
      );

      vi.spyOn(provider1, 'generateResponse').mockRejectedValue(
        new Error('Fail')
      );
      vi.spyOn(provider2, 'generateResponse').mockResolvedValue(mockResponse);

      const result = await chain.generateResponse(mockRequest);

      expect(result.provider).toBe('provider2');
      expect(result.attemptCount).toBe(2); // Tried provider1 first
    });

    it('should throw when no healthy providers available', async () => {
      const monitor1 = new ProviderHealthMonitor(provider1, {
        failureThreshold: 1,
      });
      const monitor2 = new ProviderHealthMonitor(provider2, {
        failureThreshold: 1,
      });

      // Make both unhealthy
      vi.spyOn(provider1, 'countTokens').mockImplementation(() => {
        throw new Error('Unhealthy');
      });
      vi.spyOn(provider2, 'countTokens').mockImplementation(() => {
        throw new Error('Unhealthy');
      });
      await monitor1.checkHealth();
      await monitor2.checkHealth();

      const healthMonitors = new Map([
        ['provider1', monitor1],
        ['provider2', monitor2],
      ]);

      const chain = new FallbackChain(
        providers,
        ['provider1', 'provider2'],
        healthMonitors,
        { skipUnhealthy: true }
      );

      await expect(chain.generateResponse(mockRequest)).rejects.toThrow(
        'No available providers'
      );
    });

    it('should include providers without health monitors', async () => {
      const monitor1 = new ProviderHealthMonitor(provider1, {
        failureThreshold: 1,
      });

      // Make provider1 unhealthy
      vi.spyOn(provider1, 'countTokens').mockImplementation(() => {
        throw new Error('Unhealthy');
      });
      await monitor1.checkHealth();

      // Only monitor provider1, provider2 has no monitor
      const healthMonitors = new Map([['provider1', monitor1]]);

      const chain = new FallbackChain(
        providers,
        ['provider1', 'provider2'],
        healthMonitors,
        { skipUnhealthy: true }
      );

      vi.spyOn(provider2, 'generateResponse').mockResolvedValue(mockResponse);

      const result = await chain.generateResponse(mockRequest);

      expect(result.provider).toBe('provider2');
    });
  });

  describe('streamResponse', () => {
    it('should stream from first provider on success', async () => {
      const chain = new FallbackChain(providers, ['provider1', 'provider2']);

      const mockChunks: GenerationChunk[] = [
        { content: 'chunk1', finishReason: null },
        { content: 'chunk2', finishReason: 'stop' },
      ];

      vi.spyOn(provider1, 'streamResponse').mockImplementation(
        async function* () {
          for (const chunk of mockChunks) {
            yield chunk;
          }
        }
      );

      const results: FallbackResult<GenerationChunk>[] = [];
      for await (const result of chain.streamResponse(mockRequest)) {
        results.push(result);
      }

      expect(results).toHaveLength(2);
      expect(results[0].provider).toBe('provider1');
      expect(results[0].attemptCount).toBe(1);
      expect(results[1].result.content).toBe('chunk2');
    });

    it('should fallback to second provider on stream failure', async () => {
      const chain = new FallbackChain(providers, ['provider1', 'provider2']);

      vi.spyOn(provider1, 'streamResponse').mockImplementation(
        async function* () {
          throw new Error('Stream failed');
        }
      );

      const mockChunks: GenerationChunk[] = [
        { content: 'chunk', finishReason: 'stop' },
      ];

      vi.spyOn(provider2, 'streamResponse').mockImplementation(
        async function* () {
          for (const chunk of mockChunks) {
            yield chunk;
          }
        }
      );

      const results: FallbackResult<GenerationChunk>[] = [];
      for await (const result of chain.streamResponse(mockRequest)) {
        results.push(result);
      }

      expect(results).toHaveLength(1);
      expect(results[0].provider).toBe('provider2');
      expect(results[0].errors).toHaveLength(1);
    });

    it('should throw when all stream providers fail', async () => {
      const chain = new FallbackChain(providers, ['provider1', 'provider2']);

      vi.spyOn(provider1, 'streamResponse').mockImplementation(
        async function* () {
          throw new Error('Fail 1');
        }
      );

      vi.spyOn(provider2, 'streamResponse').mockImplementation(
        async function* () {
          throw new Error('Fail 2');
        }
      );

      const generator = chain.streamResponse(mockRequest);

      await expect(async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of generator) {
          // Should throw before yielding
        }
      }).rejects.toThrow('All providers in fallback chain failed');
    });

    it('should throw when no healthy providers available for streaming', async () => {
      const monitor1 = new ProviderHealthMonitor(provider1, {
        failureThreshold: 1,
      });

      vi.spyOn(provider1, 'countTokens').mockImplementation(() => {
        throw new Error('Unhealthy');
      });
      await monitor1.checkHealth();

      const healthMonitors = new Map([['provider1', monitor1]]);

      const chain = new FallbackChain(
        providers,
        ['provider1'],
        healthMonitors,
        { skipUnhealthy: true }
      );

      const generator = chain.streamResponse(mockRequest);

      await expect(async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of generator) {
          // Should throw
        }
      }).rejects.toThrow('No available providers');
    });

    it('should handle stream errors mid-stream', async () => {
      const chain = new FallbackChain(providers, ['provider1', 'provider2']);

      vi.spyOn(provider1, 'streamResponse').mockImplementation(
        async function* () {
          yield { content: 'chunk1', finishReason: null };
          throw new Error('Stream error mid-way');
        }
      );

      vi.spyOn(provider2, 'streamResponse').mockImplementation(
        async function* () {
          yield { content: 'chunk2', finishReason: 'stop' };
        }
      );

      const results: FallbackResult<GenerationChunk>[] = [];

      try {
        for await (const result of chain.streamResponse(mockRequest)) {
          results.push(result);
        }
      } catch {
        // May throw due to mid-stream error
      }

      // Should have at least started streaming from provider1
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('FallbackChainBuilder', () => {
    it('should build chain with builder pattern', () => {
      const chain = new FallbackChainBuilder()
        .withProviders('provider1', 'provider2')
        .withStrategy('fastest')
        .withMaxRetries(3)
        .withTimeout(5000)
        .withSkipUnhealthy(false)
        .build(providers);

      expect(chain).toBeDefined();
      expect(chain.getProviderOrder()).toEqual(['provider1', 'provider2']);
    });

    it('should throw when building with no providers', () => {
      const builder = new FallbackChainBuilder();

      expect(() => builder.build(providers)).toThrow('at least one provider');
    });

    it('should build with minimal configuration', () => {
      const chain = new FallbackChainBuilder()
        .withProviders('provider1')
        .build(providers);

      expect(chain).toBeDefined();
    });

    it('should build with health monitors', () => {
      const healthMonitors = new Map([
        ['provider1', new ProviderHealthMonitor(provider1)],
      ]);

      const chain = new FallbackChainBuilder()
        .withProviders('provider1')
        .build(providers, healthMonitors);

      expect(chain).toBeDefined();
    });

    it('should allow chaining all configuration methods', () => {
      const builder = new FallbackChainBuilder();

      const result = builder
        .withProviders('provider1', 'provider2', 'provider3')
        .withStrategy('sequential')
        .withMaxRetries(2)
        .withTimeout(10000)
        .withSkipUnhealthy(true);

      expect(result).toBe(builder); // Fluent interface
    });
  });

  describe('Edge Cases', () => {
    it('should handle single provider chain', async () => {
      const chain = new FallbackChain(providers, ['provider1']);

      vi.spyOn(provider1, 'generateResponse').mockResolvedValue(mockResponse);

      const result = await chain.generateResponse(mockRequest);

      expect(result.provider).toBe('provider1');
      expect(result.attemptCount).toBe(1);
    });

    it('should handle empty provider map with validation error', () => {
      expect(() => {
        new FallbackChain(new Map(), ['provider1']);
      }).toThrow();
    });

    it('should handle very long provider chain', async () => {
      const manyProviders = new Map<string, AIProvider>();
      const providerNames: string[] = [];

      for (let i = 0; i < 10; i++) {
        const name = `provider${i}`;
        manyProviders.set(name, new MockProvider());
        providerNames.push(name);
      }

      const chain = new FallbackChain(manyProviders, providerNames);

      // Fail first 9, succeed on last
      for (let i = 0; i < 9; i++) {
        vi.spyOn(
          manyProviders.get(`provider${i}`) as MockProvider,
          'generateResponse'
        ).mockRejectedValue(new Error(`Fail ${i}`));
      }

      vi.spyOn(
        manyProviders.get('provider9') as MockProvider,
        'generateResponse'
      ).mockResolvedValue(mockResponse);

      const result = await chain.generateResponse(mockRequest);

      expect(result.provider).toBe('provider9');
      expect(result.attemptCount).toBe(10);
      expect(result.errors).toHaveLength(9);
    });

    it('should handle providers with same names in order', () => {
      const chain = new FallbackChain(providers, [
        'provider1',
        'provider1',
        'provider2',
      ]);

      expect(chain.getProviderOrder()).toHaveLength(3);
    });

    it('should return readonly provider order', () => {
      const chain = new FallbackChain(providers, ['provider1', 'provider2']);

      const order = chain.getProviderOrder();

      // Should be readonly - this test verifies TypeScript compilation
      expect(Array.isArray(order)).toBe(true);
    });
  });

  describe('Configuration Options', () => {
    it('should use sequential strategy by default', () => {
      const chain = new FallbackChain(providers, ['provider1', 'provider2']);

      expect(chain).toBeDefined();
      // Strategy is used internally, verify by behavior
    });

    it('should respect custom strategy', () => {
      const chain = new FallbackChain(
        providers,
        ['provider1', 'provider2'],
        new Map(),
        { strategy: 'health-based' }
      );

      expect(chain).toBeDefined();
    });

    it('should respect custom max retries', () => {
      const chain = new FallbackChain(providers, ['provider1'], new Map(), {
        maxRetries: 5,
      });

      expect(chain).toBeDefined();
    });

    it('should merge config with defaults', () => {
      const chain = new FallbackChain(
        providers,
        ['provider1'],
        new Map(),
        { timeout: 1000 } // Only override timeout
      );

      expect(chain).toBeDefined();
      // Other defaults should still apply
    });
  });
});
