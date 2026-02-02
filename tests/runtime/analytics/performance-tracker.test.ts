/**
 * Performance Tracker Tests
 *
 * Tests for performance tracking and analytics
 * Target: 0% → 60%+ coverage (initial pass)
 */

import { PerformanceTracker } from '../../../src/runtime/analytics/performance-tracker';
import type {
  AnalyticsConfig,
  PerformanceDataPoint,
  AnalyticsQuery,
} from '../../../src/runtime/analytics/types';

describe('PerformanceTracker', () => {
  const defaultConfig: AnalyticsConfig = {
    enabled: true,
    retention: 30, // days
    storage: 'memory',
    maxDataPoints: 10000,
  };

  const createDataPoint = (
    overrides?: Partial<PerformanceDataPoint>
  ): PerformanceDataPoint => ({
    timestamp: Date.now(),
    providerId: 'test-provider',
    modelId: 'test-model',
    personaId: 'test-persona',
    latency: 100,
    confidence: 0.9,
    tokenUsage: {
      input: 100,
      output: 200,
    },
    cost: 0.001,
    context: {
      messageType: 'code',
      complexity: 0.5,
      metadata: {},
    },
    ...overrides,
  });

  describe('Construction', () => {
    it('should create tracker with config', () => {
      const tracker = new PerformanceTracker(defaultConfig);

      expect(tracker).toBeDefined();
    });

    it('should create with custom config', () => {
      const config: AnalyticsConfig = {
        enabled: true,
        retention: 7,
        storage: 'memory',
        maxDataPoints: 5000,
      };

      const tracker = new PerformanceTracker(config);

      expect(tracker).toBeDefined();
    });
  });

  describe('Recording Data Points', () => {
    let tracker: PerformanceTracker;

    beforeEach(() => {
      tracker = new PerformanceTracker(defaultConfig);
    });

    it('should record performance data', () => {
      const dataPoint = createDataPoint();

      tracker.record(dataPoint);

      const results = tracker.query({});

      expect(results.length).toBeGreaterThan(0);
    });

    it('should record multiple data points', () => {
      for (let i = 0; i < 10; i++) {
        tracker.record(createDataPoint({ latency: 100 + i }));
      }

      const results = tracker.query({});

      expect(results.length).toBe(10);
    });

    it('should not record when disabled', () => {
      const disabledTracker = new PerformanceTracker({
        ...defaultConfig,
        enabled: false,
      });

      disabledTracker.record(createDataPoint());

      const results = disabledTracker.query({});

      expect(results.length).toBe(0);
    });

    it('should record different providers', () => {
      tracker.record(createDataPoint({ providerId: 'provider-1' }));
      tracker.record(createDataPoint({ providerId: 'provider-2' }));

      const results = tracker.query({});

      expect(results.length).toBe(2);
    });

    it('should record success and failure', () => {
      tracker.record(createDataPoint({ success: true }));
      tracker.record(createDataPoint({ success: false, error: 'Test error' }));

      const results = tracker.query({});

      expect(results.length).toBe(2);
      expect(results.filter((r) => r.success).length).toBe(1);
      expect(results.filter((r) => !r.success).length).toBe(1);
    });
  });

  describe('Querying Data', () => {
    let tracker: PerformanceTracker;

    beforeEach(() => {
      tracker = new PerformanceTracker(defaultConfig);

      // Add test data
      tracker.record(
        createDataPoint({ providerId: 'provider-1', latency: 100 })
      );
      tracker.record(
        createDataPoint({ providerId: 'provider-2', latency: 200 })
      );
      tracker.record(
        createDataPoint({ providerId: 'provider-1', latency: 150 })
      );
    });

    it('should query all data', () => {
      const results = tracker.query({});

      expect(results.length).toBe(3);
    });

    it('should filter by provider', () => {
      const results = tracker.query({ providerId: 'provider-1' });

      expect(results.length).toBe(2);
      expect(results.every((r) => r.providerId === 'provider-1')).toBe(true);
    });

    it('should filter by persona', () => {
      tracker.record(createDataPoint({ personaId: 'persona-1' }));
      tracker.record(createDataPoint({ personaId: 'persona-2' }));

      const results = tracker.query({ personaId: 'persona-1' });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.personaId === 'persona-1')).toBe(true);
    });

    it('should filter by time range', () => {
      const now = Date.now();
      const start = now - 1000;
      const end = now + 1000;

      const results = tracker.query({ startTime: start, endTime: end });

      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter by model', () => {
      tracker.record(createDataPoint({ modelId: 'model-1' }));
      tracker.record(createDataPoint({ modelId: 'model-2' }));

      const results = tracker.query({ modelId: 'model-1' });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.modelId === 'model-1')).toBe(true);
    });
  });

  describe('Statistics', () => {
    let tracker: PerformanceTracker;

    beforeEach(() => {
      tracker = new PerformanceTracker(defaultConfig);
    });

    it('should get empty stats for no data', () => {
      const stats = tracker.getStats();

      expect(stats).toBeDefined();
      expect(stats.totalExecutions).toBe(0);
    });

    it('should calculate basic stats', () => {
      tracker.record(createDataPoint({ latency: 100, cost: 0.001 }));
      tracker.record(createDataPoint({ latency: 200, cost: 0.002 }));

      const stats = tracker.getStats();

      expect(stats.totalExecutions).toBe(2);
      expect(stats.avgLatency).toBe(150);
      expect(stats.totalCost).toBe(0.003);
    });

    it('should track token usage', () => {
      tracker.record(
        createDataPoint({
          tokenUsage: { input: 100, output: 200, total: 300 },
        })
      );
      tracker.record(
        createDataPoint({
          tokenUsage: { input: 50, output: 100, total: 150 },
        })
      );

      const stats = tracker.getStats();

      expect(stats.totalTokens.input).toBe(150);
      expect(stats.totalTokens.output).toBe(300);
      expect(stats.totalTokens.total).toBe(450);
    });

    it('should calculate provider stats', () => {
      tracker.record(
        createDataPoint({ providerId: 'provider-1', latency: 100 })
      );
      tracker.record(
        createDataPoint({ providerId: 'provider-1', latency: 200 })
      );
      tracker.record(
        createDataPoint({ providerId: 'provider-2', latency: 300 })
      );

      const stats = tracker.getStats();

      expect(stats.byProvider).toBeDefined();
      expect(Object.keys(stats.byProvider).length).toBeGreaterThan(0);
      expect(stats.byProvider['provider-1']).toBeDefined();
      expect(stats.byProvider['provider-1'].requestCount).toBe(2);
    });

    it('should calculate persona stats', () => {
      tracker.record(createDataPoint({ personaId: 'persona-1', latency: 100 }));
      tracker.record(createDataPoint({ personaId: 'persona-2', latency: 200 }));

      const stats = tracker.getStats();

      expect(stats.byPersona).toBeDefined();
      expect(Object.keys(stats.byPersona).length).toBeGreaterThan(0);
      expect(stats.byPersona['persona-1']).toBeDefined();
      expect(stats.byPersona['persona-1'].messageCount).toBe(1);
    });

    it('should filter stats by query', () => {
      tracker.record(
        createDataPoint({ providerId: 'provider-1', latency: 100 })
      );
      tracker.record(
        createDataPoint({ providerId: 'provider-2', latency: 200 })
      );

      const stats = tracker.getStats({ providerId: 'provider-1' });

      expect(stats.totalExecutions).toBe(1);
    });
  });

  describe('Aggregation', () => {
    let tracker: PerformanceTracker;

    beforeEach(() => {
      tracker = new PerformanceTracker(defaultConfig);

      // Add test data
      for (let i = 0; i < 10; i++) {
        tracker.record(createDataPoint({ latency: 100 + i * 10 }));
      }
    });

    it('should aggregate data', () => {
      const results = tracker.aggregate({});

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should aggregate by provider', () => {
      tracker.record(createDataPoint({ providerId: 'provider-1' }));
      tracker.record(createDataPoint({ providerId: 'provider-2' }));

      const results = tracker.aggregate({ providerId: 'provider-1' });

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Time Series', () => {
    let tracker: PerformanceTracker;

    beforeEach(() => {
      tracker = new PerformanceTracker(defaultConfig);
    });

    it('should get time series data', () => {
      const now = Date.now();

      for (let i = 0; i < 5; i++) {
        tracker.record(
          createDataPoint({
            timestamp: now + i * 1000,
            latency: 100 + i,
          })
        );
      }

      const timeSeries = tracker.getTimeSeries({});

      expect(timeSeries).toBeDefined();
      expect(timeSeries.metric).toBeDefined();
      expect(timeSeries.points).toBeDefined();
      expect(timeSeries.interval).toBeDefined();
      expect(timeSeries.timeRange).toBeDefined();
    });

    it('should handle custom intervals', () => {
      const now = Date.now();

      for (let i = 0; i < 10; i++) {
        tracker.record(
          createDataPoint({
            timestamp: now + i * 60000, // 1 minute apart
            latency: 100,
          })
        );
      }

      const timeSeries = tracker.getTimeSeries({}, 300000); // 5 minute intervals

      expect(timeSeries).toBeDefined();
    });
  });

  describe('Trend Analysis', () => {
    let tracker: PerformanceTracker;

    beforeEach(() => {
      tracker = new PerformanceTracker(defaultConfig);
    });

    it('should analyze trends', () => {
      const now = Date.now();

      // Create trending data
      for (let i = 0; i < 20; i++) {
        tracker.record(
          createDataPoint({
            timestamp: now + i * 1000,
            latency: 100 + i * 5, // Increasing latency
          })
        );
      }

      const trends = tracker.analyzeTrends({});

      expect(trends).toBeDefined();
      expect(trends.size).toBeGreaterThan(0);
    });

    it('should analyze specific metrics', () => {
      const now = Date.now();

      for (let i = 0; i < 10; i++) {
        tracker.record(
          createDataPoint({
            timestamp: now + i * 1000,
            latency: 100 + i,
            cost: 0.001 + i * 0.0001,
          })
        );
      }

      const trends = tracker.analyzeTrends({}, ['latency', 'cost']);

      expect(trends).toBeDefined();
    });

    it('should handle no data for trends', () => {
      const trends = tracker.analyzeTrends({});

      expect(trends).toBeDefined();
    });
  });

  describe('Provider and Persona Stats', () => {
    let tracker: PerformanceTracker;

    beforeEach(() => {
      tracker = new PerformanceTracker(defaultConfig);
    });

    it('should get provider stats', () => {
      tracker.record(
        createDataPoint({ providerId: 'provider-1', latency: 100 })
      );
      tracker.record(
        createDataPoint({ providerId: 'provider-1', latency: 200 })
      );

      const stats = tracker.getProviderStats('provider-1');

      expect(stats).toBeDefined();
      expect(stats.providerId).toBe('provider-1');
      expect(stats.requestCount).toBe(2);
      expect(stats.avgLatency).toBe(150);
    });

    it('should get persona stats', () => {
      tracker.record(createDataPoint({ personaId: 'persona-1', latency: 100 }));
      tracker.record(createDataPoint({ personaId: 'persona-1', latency: 200 }));

      const stats = tracker.getPersonaStats('persona-1');

      expect(stats).toBeDefined();
      expect(stats.personaId).toBe('persona-1');
      expect(stats.messageCount).toBe(2);
      expect(stats.avgLatency).toBe(150);
    });

    it('should handle unknown provider', () => {
      const stats = tracker.getProviderStats('unknown');

      expect(stats.requestCount).toBe(0);
      expect(stats.avgLatency).toBe(0);
    });

    it('should handle unknown persona', () => {
      const stats = tracker.getPersonaStats('unknown');

      expect(stats.messageCount).toBe(0);
      expect(stats.avgLatency).toBe(0);
    });
  });
});
