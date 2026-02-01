// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - Analytics Store Tests
// Comprehensive tests for analytics data storage and querying
// ═══════════════════════════════════════════════════════════════════════════════

import { AnalyticsStore } from '../../../src/runtime/analytics/analytics-store';
import type {
  PerformanceDataPoint,
  AnalyticsConfig,
} from '../../../src/runtime/analytics/types';

describe('AnalyticsStore', () => {
  let store: AnalyticsStore;
  let config: AnalyticsConfig;

  const createDataPoint = (
    overrides?: Partial<PerformanceDataPoint>
  ): PerformanceDataPoint => ({
    timestamp: Date.now(),
    personaId: 'test-persona',
    providerId: 'anthropic',
    modelId: 'claude-3-5-sonnet',
    latency: 100,
    cost: 0.001,
    tokenUsage: {
      input: 50,
      output: 100,
    },
    confidence: 0.9,
    context: {
      messageType: 'code',
    },
    ...overrides,
  });

  beforeEach(() => {
    config = {
      enabled: true,
      retention: 30, // 30 days
      maxDataPoints: 1000,
    };
    store = new AnalyticsStore(config);
  });

  describe('initialization', () => {
    it('should initialize with config', () => {
      expect(store).toBeDefined();
      expect(store.size()).toBe(0);
    });

    it('should use default max data points', () => {
      const customStore = new AnalyticsStore({ enabled: true, retention: 0 });
      expect(customStore).toBeDefined();
    });
  });

  describe('append', () => {
    it('should append data point when enabled', () => {
      const dataPoint = createDataPoint();
      store.append(dataPoint);

      expect(store.size()).toBe(1);
    });

    it('should not append when disabled', () => {
      const disabledStore = new AnalyticsStore({
        enabled: false,
        retention: 0,
      });
      const dataPoint = createDataPoint();

      disabledStore.append(dataPoint);

      expect(disabledStore.size()).toBe(0);
    });

    it('should append multiple data points', () => {
      for (let i = 0; i < 10; i++) {
        store.append(createDataPoint());
      }

      expect(store.size()).toBe(10);
    });

    it('should evict old data when max limit exceeded', () => {
      const smallStore = new AnalyticsStore({
        enabled: true,
        retention: 0,
        maxDataPoints: 100,
      });

      // Add 150 data points
      for (let i = 0; i < 150; i++) {
        smallStore.append(createDataPoint());
      }

      // Should evict 10% (15 points), leaving 135, but then add more
      // Eventually should stabilize around max
      expect(smallStore.size()).toBeLessThanOrEqual(100);
    });

    it('should enforce retention policy', () => {
      const shortRetentionStore = new AnalyticsStore({
        enabled: true,
        retention: 1, // 1 day
        maxDataPoints: 1000,
      });

      // Add old data point (2 days ago)
      const oldTimestamp = Date.now() - 2 * 24 * 60 * 60 * 1000;
      shortRetentionStore.append(createDataPoint({ timestamp: oldTimestamp }));

      // Add recent data point
      shortRetentionStore.append(createDataPoint());

      // Old data should be evicted due to retention policy
      expect(shortRetentionStore.size()).toBe(1);
    });

    it('should not evict when retention is 0', () => {
      const noRetentionStore = new AnalyticsStore({
        enabled: true,
        retention: 0,
        maxDataPoints: 1000,
      });

      // Add very old data point
      const oldTimestamp = Date.now() - 365 * 24 * 60 * 60 * 1000;
      noRetentionStore.append(createDataPoint({ timestamp: oldTimestamp }));
      noRetentionStore.append(createDataPoint());

      expect(noRetentionStore.size()).toBe(2);
    });
  });

  describe('query', () => {
    beforeEach(() => {
      // Add test data
      store.append(
        createDataPoint({
          personaId: 'persona-1',
          providerId: 'anthropic',
          modelId: 'claude-3-5-sonnet',
        })
      );
      store.append(
        createDataPoint({
          personaId: 'persona-2',
          providerId: 'openai',
          modelId: 'gpt-4',
        })
      );
      store.append(
        createDataPoint({
          personaId: 'persona-1',
          providerId: 'anthropic',
          modelId: 'claude-3-opus',
        })
      );
    });

    it('should return all data points with empty query', () => {
      const results = store.query({});
      expect(results).toHaveLength(3);
    });

    it('should filter by personaId', () => {
      const results = store.query({ personaId: 'persona-1' });
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.personaId === 'persona-1')).toBe(true);
    });

    it('should filter by providerId', () => {
      const results = store.query({ providerId: 'anthropic' });
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.providerId === 'anthropic')).toBe(true);
    });

    it('should filter by modelId', () => {
      const results = store.query({ modelId: 'gpt-4' });
      expect(results).toHaveLength(1);
      expect(results[0].modelId).toBe('gpt-4');
    });

    it('should filter by time range', () => {
      const now = Date.now();
      const oneHourAgo = now - 3600000;

      store.clear();
      store.append(createDataPoint({ timestamp: oneHourAgo }));
      store.append(createDataPoint({ timestamp: now }));

      const results = store.query({
        timeRange: {
          start: oneHourAgo - 1000,
          end: oneHourAgo + 1000,
        },
      });

      expect(results).toHaveLength(1);
    });

    it('should apply multiple filters', () => {
      const results = store.query({
        personaId: 'persona-1',
        providerId: 'anthropic',
      });

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.personaId === 'persona-1')).toBe(true);
      expect(results.every((r) => r.providerId === 'anthropic')).toBe(true);
    });

    it('should apply limit', () => {
      const results = store.query({ limit: 2 });
      expect(results).toHaveLength(2);
    });

    it('should apply offset', () => {
      const results = store.query({ offset: 1 });
      expect(results).toHaveLength(2);
    });

    it('should apply offset and limit together', () => {
      const results = store.query({ offset: 1, limit: 1 });
      expect(results).toHaveLength(1);
    });

    it('should return empty array when no matches', () => {
      const results = store.query({ personaId: 'non-existent' });
      expect(results).toHaveLength(0);
    });
  });

  describe('aggregate', () => {
    beforeEach(() => {
      store.append(
        createDataPoint({ latency: 100, cost: 0.001, confidence: 0.9 })
      );
      store.append(
        createDataPoint({ latency: 200, cost: 0.002, confidence: 0.8 })
      );
      store.append(
        createDataPoint({ latency: 150, cost: 0.0015, confidence: 0.85 })
      );
    });

    it('should compute average by default', () => {
      const results = store.aggregate({
        metrics: ['latency'],
      });

      expect(results).toHaveLength(1);
      expect(results[0].metric).toBe('latency');
      expect(results[0].value).toBe(150); // (100 + 200 + 150) / 3
      expect(results[0].count).toBe(3);
    });

    it('should compute sum aggregation', () => {
      const results = store.aggregate({
        metrics: ['cost'],
        aggregation: 'sum',
      });

      expect(results[0].value).toBeCloseTo(0.0045);
    });

    it('should compute min aggregation', () => {
      const results = store.aggregate({
        metrics: ['latency'],
        aggregation: 'min',
      });

      expect(results[0].value).toBe(100);
    });

    it('should compute max aggregation', () => {
      const results = store.aggregate({
        metrics: ['latency'],
        aggregation: 'max',
      });

      expect(results[0].value).toBe(200);
    });

    it('should compute p50 percentile', () => {
      const results = store.aggregate({
        metrics: ['latency'],
        aggregation: 'p50',
      });

      expect(results[0].value).toBe(150);
    });

    it('should compute p95 percentile', () => {
      const results = store.aggregate({
        metrics: ['latency'],
        aggregation: 'p95',
      });

      expect(results[0].value).toBeGreaterThanOrEqual(150);
    });

    it('should compute p99 percentile', () => {
      const results = store.aggregate({
        metrics: ['latency'],
        aggregation: 'p99',
      });

      expect(results[0].value).toBeGreaterThanOrEqual(150);
    });

    it('should handle multiple metrics', () => {
      const results = store.aggregate({
        metrics: ['latency', 'cost', 'confidence'],
      });

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.metric)).toEqual([
        'latency',
        'cost',
        'confidence',
      ]);
    });

    it('should default to latency, cost, confidence metrics', () => {
      const results = store.aggregate({});

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.metric)).toContain('latency');
      expect(results.map((r) => r.metric)).toContain('cost');
      expect(results.map((r) => r.metric)).toContain('confidence');
    });

    it('should include time range in results', () => {
      const results = store.aggregate({
        metrics: ['latency'],
      });

      expect(results[0].timeRange).toBeDefined();
      expect(results[0].timeRange.start).toBeGreaterThan(0);
      expect(results[0].timeRange.end).toBeGreaterThanOrEqual(
        results[0].timeRange.start
      );
    });

    it('should return empty array when no data points', () => {
      store.clear();
      const results = store.aggregate({
        metrics: ['latency'],
      });

      expect(results).toHaveLength(0);
    });

    it('should handle token metrics', () => {
      const results = store.aggregate({
        metrics: ['tokens_input', 'tokens_output', 'tokens_total'],
      });

      expect(results).toHaveLength(3);
      expect(results[0].value).toBe(50); // Average input tokens
      expect(results[1].value).toBe(100); // Average output tokens
      expect(results[2].value).toBe(150); // Average total tokens
    });

    it('should handle quality metric', () => {
      store.clear();
      store.append(createDataPoint({ quality: 0.9 }));
      store.append(createDataPoint({ quality: 0.8 }));

      const results = store.aggregate({
        metrics: ['quality'],
      });

      expect(results[0].value).toBeCloseTo(0.85);
    });

    it('should handle unknown metric gracefully', () => {
      const results = store.aggregate({
        metrics: ['unknown_metric'],
      });

      expect(results[0].value).toBe(0);
    });
  });

  describe('getTimeSeries', () => {
    it('should generate time series data', () => {
      const now = Date.now();
      const oneHourAgo = now - 3600000;
      const twoHoursAgo = now - 7200000;

      store.append(createDataPoint({ timestamp: twoHoursAgo, latency: 100 }));
      store.append(createDataPoint({ timestamp: oneHourAgo, latency: 150 }));
      store.append(createDataPoint({ timestamp: now, latency: 200 }));

      const series = store.getTimeSeries(
        { metrics: ['latency'] },
        3600000 // 1 hour interval
      );

      expect(series.metric).toBe('latency');
      expect(series.interval).toBe(3600000);
      expect(series.points.length).toBeGreaterThan(0);
      expect(series.points[0].timestamp).toBeDefined();
      expect(series.points[0].value).toBeDefined();
    });

    it('should sort points by timestamp', () => {
      const now = Date.now();
      store.append(createDataPoint({ timestamp: now, latency: 200 }));
      store.append(createDataPoint({ timestamp: now - 3600000, latency: 100 }));

      const series = store.getTimeSeries({ metrics: ['latency'] }, 3600000);

      expect(series.points[0].timestamp).toBeLessThan(
        series.points[series.points.length - 1].timestamp
      );
    });

    it('should apply aggregation to bucketed data', () => {
      const now = Date.now();
      const bucket1 = Math.floor(now / 3600000) * 3600000;

      // Add multiple points in same bucket
      store.append(createDataPoint({ timestamp: bucket1, latency: 100 }));
      store.append(
        createDataPoint({ timestamp: bucket1 + 1000, latency: 200 })
      );

      const series = store.getTimeSeries(
        { metrics: ['latency'], aggregation: 'avg' },
        3600000
      );

      // Should average the two values in the bucket
      const point = series.points.find((p) => p.timestamp === bucket1);
      expect(point?.value).toBe(150);
    });

    it('should handle different aggregations', () => {
      const now = Date.now();
      const bucket = Math.floor(now / 3600000) * 3600000;

      store.append(createDataPoint({ timestamp: bucket, latency: 100 }));
      store.append(createDataPoint({ timestamp: bucket + 1000, latency: 200 }));

      const seriesMax = store.getTimeSeries(
        { metrics: ['latency'], aggregation: 'max' },
        3600000
      );

      const point = seriesMax.points.find((p) => p.timestamp === bucket);
      expect(point?.value).toBe(200);
    });

    it('should return empty series when no data', () => {
      const series = store.getTimeSeries({ metrics: ['latency'] }, 3600000);

      expect(series.points).toHaveLength(0);
      expect(series.timeRange.start).toBe(0);
      expect(series.timeRange.end).toBe(0);
    });

    it('should use default metric and aggregation', () => {
      store.append(createDataPoint({ latency: 100 }));

      const series = store.getTimeSeries({}, 3600000);

      expect(series.metric).toBe('latency');
      expect(series.points).toHaveLength(1);
    });

    it('should include time range', () => {
      const now = Date.now();
      store.append(createDataPoint({ timestamp: now - 3600000 }));
      store.append(createDataPoint({ timestamp: now }));

      const series = store.getTimeSeries({ metrics: ['latency'] }, 3600000);

      expect(series.timeRange.start).toBeLessThan(series.timeRange.end);
    });
  });

  describe('size', () => {
    it('should return 0 when empty', () => {
      expect(store.size()).toBe(0);
    });

    it('should return correct count', () => {
      store.append(createDataPoint());
      store.append(createDataPoint());
      store.append(createDataPoint());

      expect(store.size()).toBe(3);
    });
  });

  describe('clear', () => {
    it('should remove all data points', () => {
      store.append(createDataPoint());
      store.append(createDataPoint());

      store.clear();

      expect(store.size()).toBe(0);
    });

    it('should allow appending after clear', () => {
      store.append(createDataPoint());
      store.clear();
      store.append(createDataPoint());

      expect(store.size()).toBe(1);
    });
  });

  describe('export and import', () => {
    it('should export all data points', () => {
      store.append(createDataPoint({ personaId: 'persona-1' }));
      store.append(createDataPoint({ personaId: 'persona-2' }));

      const exported = store.export();

      expect(exported).toHaveLength(2);
      expect(exported[0].personaId).toBe('persona-1');
      expect(exported[1].personaId).toBe('persona-2');
    });

    it('should export a copy not a reference', () => {
      store.append(createDataPoint());
      const exported = store.export();

      exported.push(createDataPoint());

      expect(store.size()).toBe(1);
      expect(exported).toHaveLength(2);
    });

    it('should import data points', () => {
      const dataPoints = [
        createDataPoint({ personaId: 'persona-1' }),
        createDataPoint({ personaId: 'persona-2' }),
      ];

      store.import(dataPoints);

      expect(store.size()).toBe(2);
    });

    it('should replace existing data on import', () => {
      store.append(createDataPoint({ personaId: 'old' }));

      const dataPoints = [createDataPoint({ personaId: 'new' })];
      store.import(dataPoints);

      expect(store.size()).toBe(1);
      expect(store.query({})[0].personaId).toBe('new');
    });

    it('should enforce retention on import', () => {
      const shortRetentionStore = new AnalyticsStore({
        enabled: true,
        retention: 1,
        maxDataPoints: 1000,
      });

      const oldTimestamp = Date.now() - 2 * 24 * 60 * 60 * 1000;
      const dataPoints = [
        createDataPoint({ timestamp: oldTimestamp }),
        createDataPoint({ timestamp: Date.now() }),
      ];

      shortRetentionStore.import(dataPoints);

      expect(shortRetentionStore.size()).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty aggregation', () => {
      const results = store.aggregate({
        metrics: ['latency'],
        aggregation: 'avg',
      });

      expect(results).toHaveLength(0);
    });

    it('should handle single data point aggregation', () => {
      store.append(createDataPoint({ latency: 100 }));

      const results = store.aggregate({
        metrics: ['latency'],
        aggregation: 'p99',
      });

      expect(results[0].value).toBe(100);
    });

    it('should handle very large number of data points', () => {
      for (let i = 0; i < 10000; i++) {
        store.append(createDataPoint({ latency: i }));
      }

      const results = store.aggregate({
        metrics: ['latency'],
        aggregation: 'avg',
      });

      expect(results[0].count).toBeGreaterThan(0);
    });

    it('should handle zero values in metrics', () => {
      store.append(createDataPoint({ latency: 0, cost: 0, confidence: 0 }));

      const results = store.aggregate({
        metrics: ['latency', 'cost', 'confidence'],
      });

      results.forEach((result) => {
        expect(result.value).toBe(0);
      });
    });

    it('should handle undefined aggregation gracefully', () => {
      store.append(createDataPoint({ latency: 100 }));

      const results = store.aggregate({
        metrics: ['latency'],
        aggregation: 'unknown' as any,
      });

      expect(results[0].value).toBe(0);
    });
  });
});
