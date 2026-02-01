/**
 * Cost Tracker Unit Tests
 *
 * Comprehensive tests to increase coverage from 77.61% to 85%+
 * Uses Zod for schema validation and type-safe testing
 */

import { z } from 'zod';
import {
  CostCalculator,
  CostTracker,
  CostTrackerRegistry,
  KNOWN_MODEL_PRICING,
  type ModelPricing,
  type UsageRecord,
} from '../../../src/runtime/providers/cost-tracker';
import type { TokenUsage } from '../../../src/runtime/providers';

// Zod schemas for validation
const TokenUsageSchema = z.object({
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
});

const UsageRecordSchema = z.object({
  timestamp: z.date(),
  provider: z.string(),
  model: z.string(),
  usage: TokenUsageSchema,
  cost: z.number().nonnegative(),
  metadata: z.record(z.unknown()).optional(),
});

describe('CostCalculator', () => {
  let calculator: CostCalculator;

  beforeEach(() => {
    calculator = new CostCalculator();
  });

  describe('Cost Calculation', () => {
    it('should calculate cost for known model', () => {
      const usage: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const cost = calculator.calculateCost(
        usage,
        'claude-3-5-sonnet-20241022'
      );

      // Claude Sonnet: $3/1M input + $15/1M output
      // (1000/1M * $3) + (500/1M * $15) = $0.003 + $0.0075 = $0.0105
      expect(cost).toBeCloseTo(0.0105, 6);
    });

    it('should return 0 for unknown model', () => {
      const usage: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const cost = calculator.calculateCost(usage, 'unknown-model');

      expect(cost).toBe(0);
    });

    it('should calculate cost for GPT-4', () => {
      const usage: TokenUsage = {
        promptTokens: 10000,
        completionTokens: 2000,
        totalTokens: 12000,
      };

      const cost = calculator.calculateCost(usage, 'gpt-4');

      // GPT-4: $30/1M input + $60/1M output
      // (10000/1M * $30) + (2000/1M * $60) = $0.30 + $0.12 = $0.42
      expect(cost).toBeCloseTo(0.42, 6);
    });

    it('should calculate cost for cheap models', () => {
      const usage: TokenUsage = {
        promptTokens: 100000,
        completionTokens: 50000,
        totalTokens: 150000,
      };

      const cost = calculator.calculateCost(usage, 'claude-3-haiku-20240307');

      // Haiku: $0.25/1M input + $1.25/1M output
      // (100000/1M * $0.25) + (50000/1M * $1.25) = $0.025 + $0.0625 = $0.0875
      expect(cost).toBeCloseTo(0.0875, 6);
    });

    it('should handle zero tokens', () => {
      const usage: TokenUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };

      const cost = calculator.calculateCost(usage, 'gpt-4');

      expect(cost).toBe(0);
    });

    it('should handle only input tokens', () => {
      const usage: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 0,
        totalTokens: 1000,
      };

      const cost = calculator.calculateCost(usage, 'gpt-3.5-turbo');

      // GPT-3.5: $0.5/1M input
      expect(cost).toBeCloseTo(0.0005, 6);
    });

    it('should handle only output tokens', () => {
      const usage: TokenUsage = {
        promptTokens: 0,
        completionTokens: 1000,
        totalTokens: 1000,
      };

      const cost = calculator.calculateCost(usage, 'gpt-3.5-turbo');

      // GPT-3.5: $1.5/1M output
      expect(cost).toBeCloseTo(0.0015, 6);
    });
  });

  describe('Pricing Management', () => {
    it('should get pricing for known model', () => {
      const pricing = calculator.getPricing('claude-3-5-sonnet-20241022');

      expect(pricing).toBeDefined();
      expect(pricing?.modelId).toBe('claude-3-5-sonnet-20241022');
      expect(pricing?.provider).toBe('anthropic');
      expect(pricing?.inputCostPer1M).toBe(3.0);
      expect(pricing?.outputCostPer1M).toBe(15.0);
    });

    it('should return undefined for unknown model', () => {
      const pricing = calculator.getPricing('unknown-model');

      expect(pricing).toBeUndefined();
    });

    it('should set custom pricing', () => {
      const customPricing: ModelPricing = {
        modelId: 'custom-model',
        provider: 'custom',
        inputCostPer1M: 5.0,
        outputCostPer1M: 10.0,
      };

      calculator.setPricing('custom-model', customPricing);

      const retrieved = calculator.getPricing('custom-model');
      expect(retrieved).toEqual(customPricing);
    });

    it('should override existing pricing', () => {
      const newPricing: ModelPricing = {
        modelId: 'gpt-4',
        provider: 'openai',
        inputCostPer1M: 25.0,
        outputCostPer1M: 50.0,
      };

      calculator.setPricing('gpt-4', newPricing);

      const retrieved = calculator.getPricing('gpt-4');
      expect(retrieved?.inputCostPer1M).toBe(25.0);
    });

    it('should get all pricing', () => {
      const allPricing = calculator.getAllPricing();

      expect(allPricing.size).toBeGreaterThan(0);
      expect(allPricing.has('claude-3-5-sonnet-20241022')).toBe(true);
      expect(allPricing.has('gpt-4')).toBe(true);
    });
  });

  describe('Cost Comparison', () => {
    it('should compare costs between models', () => {
      const usage: TokenUsage = {
        promptTokens: 10000,
        completionTokens: 5000,
        totalTokens: 15000,
      };

      const costs = calculator.compareCosts(usage, [
        'claude-3-5-sonnet-20241022',
        'gpt-4',
        'claude-3-haiku-20240307',
      ]);

      expect(costs.size).toBe(3);
      expect(costs.get('claude-3-haiku-20240307')).toBeLessThan(
        costs.get('claude-3-5-sonnet-20241022')!
      );
      expect(costs.get('claude-3-5-sonnet-20241022')).toBeLessThan(
        costs.get('gpt-4')!
      );
    });

    it('should handle empty model list', () => {
      const usage: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const costs = calculator.compareCosts(usage, []);

      expect(costs.size).toBe(0);
    });

    it('should include unknown models in comparison with zero cost', () => {
      const usage: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const costs = calculator.compareCosts(usage, ['gpt-4', 'unknown-model']);

      expect(costs.get('unknown-model')).toBe(0);
      expect(costs.get('gpt-4')).toBeGreaterThan(0);
    });
  });

  describe('Known Pricing Constants', () => {
    it('should have pricing for all major providers', () => {
      expect(KNOWN_MODEL_PRICING['claude-3-5-sonnet-20241022']).toBeDefined();
      expect(KNOWN_MODEL_PRICING['gpt-4']).toBeDefined();
      expect(KNOWN_MODEL_PRICING['gemini-1.5-pro']).toBeDefined();
      expect(KNOWN_MODEL_PRICING['deepseek-chat']).toBeDefined();
    });

    it('should have ollama with zero cost', () => {
      expect(KNOWN_MODEL_PRICING.ollama.inputCostPer1M).toBe(0);
      expect(KNOWN_MODEL_PRICING.ollama.outputCostPer1M).toBe(0);
    });
  });
});

describe('CostTracker', () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = new CostTracker();
  });

  describe('Recording Usage', () => {
    it('should record usage and calculate cost', () => {
      const usage: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const record = tracker.record(
        'anthropic',
        'claude-3-5-sonnet-20241022',
        usage
      );

      // Validate with Zod
      const validated = UsageRecordSchema.parse(record);
      expect(validated.provider).toBe('anthropic');
      expect(validated.model).toBe('claude-3-5-sonnet-20241022');
      expect(validated.cost).toBeGreaterThan(0);
    });

    it('should record usage with metadata', () => {
      const usage: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const metadata = { requestId: '123', userId: 'user-1' };

      const record = tracker.record('openai', 'gpt-4', usage, metadata);

      expect(record.metadata).toEqual(metadata);
    });

    it('should accumulate total cost', () => {
      const usage: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      tracker.record('anthropic', 'claude-3-5-sonnet-20241022', usage);
      tracker.record('openai', 'gpt-4', usage);

      const totalCost = tracker.getTotalCost();
      expect(totalCost).toBeGreaterThan(0);
    });
  });

  describe('Cost Queries', () => {
    beforeEach(() => {
      const usage: TokenUsage = {
        promptTokens: 10000,
        completionTokens: 5000,
        totalTokens: 15000,
      };

      tracker.record('anthropic', 'claude-3-5-sonnet-20241022', usage);
      tracker.record('anthropic', 'claude-3-haiku-20240307', usage);
      tracker.record('openai', 'gpt-4', usage);
    });

    it('should get cost by provider', () => {
      const anthropicCost = tracker.getProviderCost('anthropic');
      const openaiCost = tracker.getProviderCost('openai');

      expect(anthropicCost).toBeGreaterThan(0);
      expect(openaiCost).toBeGreaterThan(0);
    });

    it('should get cost by model', () => {
      const gpt4Cost = tracker.getModelCost('gpt-4');
      const haikuCost = tracker.getModelCost('claude-3-haiku-20240307');

      expect(gpt4Cost).toBeGreaterThan(0);
      expect(haikuCost).toBeGreaterThan(0);
      expect(gpt4Cost).toBeGreaterThan(haikuCost);
    });

    it('should return 0 for non-existent provider', () => {
      const cost = tracker.getProviderCost('non-existent');
      expect(cost).toBe(0);
    });

    it('should return 0 for non-existent model', () => {
      const cost = tracker.getModelCost('non-existent');
      expect(cost).toBe(0);
    });
  });

  describe('Time-based Queries', () => {
    it('should get cost for time period', () => {
      const start = new Date('2026-01-01');
      const end = new Date('2026-12-31');

      const usage: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      tracker.record('anthropic', 'claude-3-5-sonnet-20241022', usage);

      const cost = tracker.getCostForPeriod(start, end);
      expect(cost).toBeGreaterThan(0);
    });

    it('should return 0 for empty time period', () => {
      const start = new Date('2020-01-01');
      const end = new Date('2020-12-31');

      const cost = tracker.getCostForPeriod(start, end);
      expect(cost).toBe(0);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      const usage1: TokenUsage = {
        promptTokens: 10000,
        completionTokens: 5000,
        totalTokens: 15000,
      };

      const usage2: TokenUsage = {
        promptTokens: 20000,
        completionTokens: 10000,
        totalTokens: 30000,
      };

      tracker.record('anthropic', 'claude-3-5-sonnet-20241022', usage1);
      tracker.record('openai', 'gpt-4', usage2);
    });

    it('should calculate comprehensive statistics', () => {
      const stats = tracker.getStats();

      expect(stats.totalCost).toBeGreaterThan(0);
      expect(stats.totalTokens).toBe(45000);
      expect(stats.totalPromptTokens).toBe(30000);
      expect(stats.totalCompletionTokens).toBe(15000);
      expect(stats.requestCount).toBe(2);
    });

    it('should group statistics by provider', () => {
      const stats = tracker.getStats();

      expect(stats.byProvider.anthropic).toBeDefined();
      expect(stats.byProvider.openai).toBeDefined();
      expect(stats.byProvider.anthropic.cost).toBeGreaterThan(0);
    });

    it('should group statistics by model', () => {
      const stats = tracker.getStats();

      expect(stats.byModel['claude-3-5-sonnet-20241022']).toBeDefined();
      expect(stats.byModel['gpt-4']).toBeDefined();
      expect(stats.byModel['gpt-4'].requests).toBe(1);
    });

    it('should calculate averages', () => {
      const stats = tracker.getStats();

      expect(stats.averageCostPerRequest).toBeGreaterThan(0);
      expect(stats.averageTokensPerRequest).toBe(22500);
    });

    it('should handle empty tracker', () => {
      const emptyTracker = new CostTracker();
      const stats = emptyTracker.getStats();

      expect(stats.totalCost).toBe(0);
      expect(stats.requestCount).toBe(0);
      expect(stats.averageCostPerRequest).toBe(0);
    });
  });

  describe('Data Export', () => {
    beforeEach(() => {
      const usage: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      tracker.record('anthropic', 'claude-3-5-sonnet-20241022', usage);
    });

    it('should export as JSON', () => {
      const json = tracker.exportJSON();

      expect(() => JSON.parse(json)).not.toThrow();

      const parsed = JSON.parse(json);
      expect(parsed.records).toBeDefined();
      expect(parsed.stats).toBeDefined();
    });

    it('should export as CSV', () => {
      const csv = tracker.exportCSV();

      expect(csv).toContain('timestamp');
      expect(csv).toContain('provider');
      expect(csv).toContain('model');
      expect(csv).toContain('anthropic');
      expect(csv).toContain('claude-3-5-sonnet-20241022');
    });

    it('should include headers in CSV', () => {
      const csv = tracker.exportCSV();
      const lines = csv.split('\n');

      expect(lines[0]).toContain('timestamp,provider,model');
    });
  });

  describe('Reset', () => {
    it('should reset tracker', () => {
      const usage: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      tracker.record('anthropic', 'claude-3-5-sonnet-20241022', usage);

      expect(tracker.getTotalCost()).toBeGreaterThan(0);

      tracker.reset();

      expect(tracker.getTotalCost()).toBe(0);
      expect(tracker.getRecords().length).toBe(0);
    });
  });
});

describe('CostTrackerRegistry', () => {
  let registry: CostTrackerRegistry;

  beforeEach(() => {
    registry = new CostTrackerRegistry();
  });

  describe('Tracker Management', () => {
    it('should get global tracker', () => {
      const global = registry.getGlobal();

      expect(global).toBeInstanceOf(CostTracker);
    });

    it('should register new tracker', () => {
      const tracker = registry.register('my-provider');

      expect(tracker).toBeInstanceOf(CostTracker);
    });

    it('should throw when registering duplicate', () => {
      registry.register('my-provider');

      expect(() => registry.register('my-provider')).toThrow(/already exists/);
    });

    it('should get registered tracker', () => {
      registry.register('my-provider');

      const tracker = registry.get('my-provider');

      expect(tracker).toBeInstanceOf(CostTracker);
    });

    it('should return undefined for non-existent tracker', () => {
      const tracker = registry.get('non-existent');

      expect(tracker).toBeUndefined();
    });

    it('should get or create tracker', () => {
      const tracker1 = registry.getOrCreate('my-provider');
      const tracker2 = registry.getOrCreate('my-provider');

      expect(tracker1).toBe(tracker2);
    });
  });

  describe('Aggregated Statistics', () => {
    beforeEach(() => {
      const usage: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const tracker1 = registry.getOrCreate('anthropic');
      const tracker2 = registry.getOrCreate('openai');

      tracker1.record('anthropic', 'claude-3-5-sonnet-20241022', usage);
      tracker2.record('openai', 'gpt-4', usage);
    });

    it('should get aggregated stats', () => {
      const stats = registry.getAggregatedStats();

      expect(stats.global).toBeDefined();
      expect(stats.byProvider).toBeDefined();
      expect(stats.byProvider.anthropic).toBeDefined();
      expect(stats.byProvider.openai).toBeDefined();
    });

    it('should calculate provider cost', () => {
      const cost = registry.getProviderCost('anthropic');

      expect(cost).toBeGreaterThan(0);
    });

    it('should return 0 for non-existent provider cost', () => {
      const cost = registry.getProviderCost('non-existent');

      expect(cost).toBe(0);
    });

    it('should calculate model cost across providers', () => {
      const cost = registry.getModelCost('claude-3-5-sonnet-20241022');

      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('Export', () => {
    it('should export as CSV', () => {
      const csv = registry.exportCSV();

      expect(csv).toContain('Provider,Model,Requests,Tokens,Cost');
    });

    it('should export as JSON', () => {
      const json = registry.exportJSON();

      expect(() => JSON.parse(json)).not.toThrow();
    });
  });

  describe('Reset', () => {
    it('should reset all trackers', () => {
      const usage: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const tracker1 = registry.getOrCreate('anthropic');
      tracker1.record('anthropic', 'claude-3-5-sonnet-20241022', usage);

      registry.resetAll();

      expect(tracker1.getTotalCost()).toBe(0);
    });

    it('should reset global tracker', () => {
      const usage: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const global = registry.getGlobal();
      global.record('anthropic', 'claude-3-5-sonnet-20241022', usage);

      registry.reset();

      expect(global.getTotalCost()).toBe(0);
    });
  });
});
