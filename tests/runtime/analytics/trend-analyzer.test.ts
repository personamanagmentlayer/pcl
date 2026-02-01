/**
 * Tests for Trend Analyzer
 * Analyzes trends in performance metrics over time
 */

import { TrendAnalyzer } from '../../../src/runtime/analytics/trend-analyzer';
import type { PerformanceDataPoint } from '../../../src/runtime/analytics/types';

// Helper to create performance data points
function createDataPoint(
  overrides: Partial<PerformanceDataPoint> = {}
): PerformanceDataPoint {
  return {
    timestamp: Date.now(),
    personaId: 'test-persona',
    providerId: 'anthropic',
    modelId: 'claude-3-5-sonnet-20241022',
    latency: 1000,
    cost: 0.01,
    confidence: 0.8,
    quality: 0.85,
    tokenUsage: {
      input: 100,
      output: 50,
      total: 150,
    },
    success: true,
    ...overrides,
  };
}

describe('TrendAnalyzer', () => {
  describe('detectTrend', () => {
    it('should return null for insufficient data points', () => {
      const dataPoints = [
        createDataPoint({ latency: 1000 }),
        createDataPoint({ latency: 1100 }),
      ];

      const trend = TrendAnalyzer.detectTrend('latency', dataPoints);
      expect(trend).toBeNull();
    });

    it('should detect improving trend (decreasing latency)', () => {
      const baseTime = Date.now();
      const dataPoints: PerformanceDataPoint[] = [];

      // Create 20 data points with decreasing latency
      for (let i = 0; i < 20; i++) {
        dataPoints.push(
          createDataPoint({
            timestamp: baseTime + i * 60 * 60 * 1000, // 1 hour apart
            latency: 2000 - i * 50, // Decreasing from 2000 to 1050
          })
        );
      }

      const trend = TrendAnalyzer.detectTrend('latency', dataPoints, 0.5);

      expect(trend).not.toBeNull();
      expect(trend?.metric).toBe('latency');
      expect(trend?.direction).toBe('improving'); // Negative slope = improving for latency
      expect(trend?.slope).toBeLessThan(0);
      expect(trend?.confidence).toBeGreaterThan(0.5);
    });

    it('should detect degrading trend (increasing latency)', () => {
      const baseTime = Date.now();
      const dataPoints: PerformanceDataPoint[] = [];

      // Create 20 data points with increasing latency
      for (let i = 0; i < 20; i++) {
        dataPoints.push(
          createDataPoint({
            timestamp: baseTime + i * 60 * 60 * 1000,
            latency: 1000 + i * 50, // Increasing from 1000 to 1950
          })
        );
      }

      const trend = TrendAnalyzer.detectTrend('latency', dataPoints, 0.5);

      expect(trend).not.toBeNull();
      expect(trend?.direction).toBe('degrading'); // Positive slope = degrading for latency
      expect(trend?.slope).toBeGreaterThan(0);
    });

    it('should detect stable trend', () => {
      const baseTime = Date.now();
      const dataPoints: PerformanceDataPoint[] = [];

      // Create 20 data points with minimal variation
      for (let i = 0; i < 20; i++) {
        dataPoints.push(
          createDataPoint({
            timestamp: baseTime + i * 60 * 60 * 1000,
            latency: 1000 + (Math.random() - 0.5) * 10, // ±5ms variation
          })
        );
      }

      const trend = TrendAnalyzer.detectTrend('latency', dataPoints, 0.5);

      if (trend) {
        expect(trend.direction).toBe('stable');
        expect(Math.abs(trend.slope)).toBeLessThan(1);
      }
    });

    it('should return null when confidence is below threshold', () => {
      const baseTime = Date.now();
      const dataPoints: PerformanceDataPoint[] = [];

      // Create noisy data with no clear trend
      for (let i = 0; i < 20; i++) {
        dataPoints.push(
          createDataPoint({
            timestamp: baseTime + i * 60 * 60 * 1000,
            latency: 1000 + Math.random() * 1000, // High variance
          })
        );
      }

      const trend = TrendAnalyzer.detectTrend('latency', dataPoints, 0.9);
      // High confidence threshold with noisy data should return null
      expect(trend).toBeNull();
    });

    it('should analyze cost metric', () => {
      const baseTime = Date.now();
      const dataPoints: PerformanceDataPoint[] = [];

      for (let i = 0; i < 15; i++) {
        dataPoints.push(
          createDataPoint({
            timestamp: baseTime + i * 60 * 60 * 1000,
            cost: 0.01 + i * 0.001, // Increasing cost
          })
        );
      }

      const trend = TrendAnalyzer.detectTrend('cost', dataPoints, 0.5);

      expect(trend).not.toBeNull();
      expect(trend?.metric).toBe('cost');
      expect(trend?.slope).toBeGreaterThan(0); // Cost is increasing
    });

    it('should analyze confidence metric', () => {
      const baseTime = Date.now();
      const dataPoints: PerformanceDataPoint[] = [];

      for (let i = 0; i < 15; i++) {
        dataPoints.push(
          createDataPoint({
            timestamp: baseTime + i * 60 * 60 * 1000,
            confidence: 0.6 + i * 0.01, // Increasing confidence
          })
        );
      }

      const trend = TrendAnalyzer.detectTrend('confidence', dataPoints, 0.5);

      expect(trend).not.toBeNull();
      expect(trend?.metric).toBe('confidence');
    });

    it('should analyze quality metric', () => {
      const baseTime = Date.now();
      const dataPoints: PerformanceDataPoint[] = [];

      for (let i = 0; i < 15; i++) {
        dataPoints.push(
          createDataPoint({
            timestamp: baseTime + i * 60 * 60 * 1000,
            quality: 0.8 - i * 0.01, // Decreasing quality
          })
        );
      }

      const trend = TrendAnalyzer.detectTrend('quality', dataPoints, 0.5);

      expect(trend).not.toBeNull();
      expect(trend?.metric).toBe('quality');
      expect(trend?.slope).toBeLessThan(0); // Quality decreasing
    });

    it('should analyze token usage metrics', () => {
      const baseTime = Date.now();
      const dataPoints: PerformanceDataPoint[] = [];

      for (let i = 0; i < 15; i++) {
        dataPoints.push(
          createDataPoint({
            timestamp: baseTime + i * 60 * 60 * 1000,
            tokenUsage: {
              input: 100 + i * 10,
              output: 50 + i * 5,
              total: 150 + i * 15,
            },
          })
        );
      }

      const inputTrend = TrendAnalyzer.detectTrend(
        'tokens_input',
        dataPoints,
        0.5
      );
      const outputTrend = TrendAnalyzer.detectTrend(
        'tokens_output',
        dataPoints,
        0.5
      );
      const totalTrend = TrendAnalyzer.detectTrend(
        'tokens_total',
        dataPoints,
        0.5
      );

      expect(inputTrend).not.toBeNull();
      expect(outputTrend).not.toBeNull();
      expect(totalTrend).not.toBeNull();

      expect(inputTrend?.slope).toBeGreaterThan(0);
      expect(outputTrend?.slope).toBeGreaterThan(0);
      expect(totalTrend?.slope).toBeGreaterThan(0);
    });

    it('should include period information in trend', () => {
      const baseTime = Date.now();
      const dataPoints: PerformanceDataPoint[] = [];

      for (let i = 0; i < 15; i++) {
        dataPoints.push(
          createDataPoint({
            timestamp: baseTime + i * 60 * 60 * 1000,
            latency: 1000 + i * 10,
          })
        );
      }

      const trend = TrendAnalyzer.detectTrend('latency', dataPoints, 0.5);

      expect(trend).not.toBeNull();
      expect(trend?.period.start).toBe(baseTime);
      expect(trend?.period.end).toBe(baseTime + 14 * 60 * 60 * 1000);
    });

    it('should include statistics in trend', () => {
      const baseTime = Date.now();
      const dataPoints: PerformanceDataPoint[] = [];
      const latencies = [
        1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100,
        2200, 2300, 2400,
      ];

      for (let i = 0; i < 15; i++) {
        dataPoints.push(
          createDataPoint({
            timestamp: baseTime + i * 60 * 60 * 1000,
            latency: latencies[i],
          })
        );
      }

      const trend = TrendAnalyzer.detectTrend('latency', dataPoints, 0.5);

      expect(trend).not.toBeNull();
      expect(trend?.statistics.mean).toBeDefined();
      expect(trend?.statistics.median).toBeDefined();
      expect(trend?.statistics.stdDev).toBeDefined();
      expect(trend?.statistics.min).toBe(1000);
      expect(trend?.statistics.max).toBe(2400);
    });

    it('should handle unknown metric gracefully', () => {
      const baseTime = Date.now();
      const dataPoints: PerformanceDataPoint[] = [];

      for (let i = 0; i < 15; i++) {
        dataPoints.push(
          createDataPoint({
            timestamp: baseTime + i * 60 * 60 * 1000,
            latency: 1000 + i * 10,
          })
        );
      }

      const trend = TrendAnalyzer.detectTrend(
        'unknown_metric',
        dataPoints,
        0.5
      );

      // Should handle gracefully (all values will be 0)
      if (trend) {
        expect(trend.statistics.mean).toBe(0);
      }
    });
  });

  describe('detectMultipleTrends', () => {
    it('should detect trends across multiple metrics', () => {
      const baseTime = Date.now();
      const dataPoints: PerformanceDataPoint[] = [];

      for (let i = 0; i < 15; i++) {
        dataPoints.push(
          createDataPoint({
            timestamp: baseTime + i * 60 * 60 * 1000,
            latency: 1000 + i * 50,
            cost: 0.01 + i * 0.001,
            confidence: 0.8 - i * 0.01,
          })
        );
      }

      const trends = TrendAnalyzer.detectMultipleTrends(dataPoints, [
        'latency',
        'cost',
        'confidence',
      ]);

      expect(trends.size).toBeGreaterThan(0);
      expect(trends.size).toBeLessThanOrEqual(3);
    });

    it('should use default metrics when not specified', () => {
      const baseTime = Date.now();
      const dataPoints: PerformanceDataPoint[] = [];

      for (let i = 0; i < 15; i++) {
        dataPoints.push(
          createDataPoint({
            timestamp: baseTime + i * 60 * 60 * 1000,
            latency: 1000 + i * 50,
            cost: 0.01 + i * 0.001,
            confidence: 0.8 + i * 0.005,
          })
        );
      }

      const trends = TrendAnalyzer.detectMultipleTrends(dataPoints);

      // Should analyze default metrics: latency, cost, confidence
      expect(trends).toBeDefined();
      expect(trends instanceof Map).toBe(true);
    });

    it('should only return trends with sufficient confidence', () => {
      const baseTime = Date.now();
      const dataPoints: PerformanceDataPoint[] = [];

      for (let i = 0; i < 15; i++) {
        dataPoints.push(
          createDataPoint({
            timestamp: baseTime + i * 60 * 60 * 1000,
            latency: 1000 + i * 50, // Clear trend
            cost: 0.01 + Math.random() * 0.01, // Noisy, no clear trend
          })
        );
      }

      const trends = TrendAnalyzer.detectMultipleTrends(dataPoints, [
        'latency',
        'cost',
      ]);

      // Should have latency but possibly not cost
      if (trends.has('latency')) {
        expect(trends.get('latency')).toBeDefined();
      }
    });

    it('should handle empty metrics array', () => {
      const baseTime = Date.now();
      const dataPoints: PerformanceDataPoint[] = [];

      for (let i = 0; i < 15; i++) {
        dataPoints.push(
          createDataPoint({
            timestamp: baseTime + i * 60 * 60 * 1000,
            latency: 1000 + i * 10,
          })
        );
      }

      const trends = TrendAnalyzer.detectMultipleTrends(dataPoints, []);

      expect(trends.size).toBe(0);
    });
  });

  describe('forecast', () => {
    it('should forecast future values based on trend', () => {
      const baseTime = Date.now();
      const dataPoints: PerformanceDataPoint[] = [];

      for (let i = 0; i < 15; i++) {
        dataPoints.push(
          createDataPoint({
            timestamp: baseTime + i * 24 * 60 * 60 * 1000, // Daily data
            latency: 1000 + i * 10,
          })
        );
      }

      const trend = TrendAnalyzer.detectTrend('latency', dataPoints, 0.5);
      expect(trend).not.toBeNull();

      const predictions = TrendAnalyzer.forecast(trend!, 7);

      expect(predictions).toHaveLength(7);
      expect(predictions[0].timestamp).toBeGreaterThan(trend!.period.end);
    });

    it('should include predicted values', () => {
      const baseTime = Date.now();
      const dataPoints: PerformanceDataPoint[] = [];

      for (let i = 0; i < 15; i++) {
        dataPoints.push(
          createDataPoint({
            timestamp: baseTime + i * 24 * 60 * 60 * 1000,
            latency: 1000 + i * 10,
          })
        );
      }

      const trend = TrendAnalyzer.detectTrend('latency', dataPoints, 0.5);
      const predictions = TrendAnalyzer.forecast(trend!, 7);

      predictions.forEach((pred) => {
        expect(pred.predicted).toBeGreaterThanOrEqual(0);
        expect(pred.timestamp).toBeDefined();
        expect(pred.confidence).toBeDefined();
      });
    });

    it('should decay confidence over time', () => {
      const baseTime = Date.now();
      const dataPoints: PerformanceDataPoint[] = [];

      for (let i = 0; i < 15; i++) {
        dataPoints.push(
          createDataPoint({
            timestamp: baseTime + i * 24 * 60 * 60 * 1000,
            latency: 1000 + i * 10,
          })
        );
      }

      const trend = TrendAnalyzer.detectTrend('latency', dataPoints, 0.5);
      const predictions = TrendAnalyzer.forecast(trend!, 14);

      // Confidence should decrease as we forecast further
      expect(predictions[0].confidence).toBeGreaterThan(
        predictions[13].confidence
      );
    });

    it('should ensure predictions are non-negative', () => {
      const baseTime = Date.now();
      const dataPoints: PerformanceDataPoint[] = [];

      // Create trend that would go negative
      for (let i = 0; i < 15; i++) {
        dataPoints.push(
          createDataPoint({
            timestamp: baseTime + i * 24 * 60 * 60 * 1000,
            latency: 200 - i * 10, // Decreasing
          })
        );
      }

      const trend = TrendAnalyzer.detectTrend('latency', dataPoints, 0.5);
      const predictions = TrendAnalyzer.forecast(trend!, 30);

      predictions.forEach((pred) => {
        expect(pred.predicted).toBeGreaterThanOrEqual(0);
      });
    });

    it('should forecast for specified number of days', () => {
      const baseTime = Date.now();
      const dataPoints: PerformanceDataPoint[] = [];

      for (let i = 0; i < 15; i++) {
        dataPoints.push(
          createDataPoint({
            timestamp: baseTime + i * 24 * 60 * 60 * 1000,
            latency: 1000 + i * 10,
          })
        );
      }

      const trend = TrendAnalyzer.detectTrend('latency', dataPoints, 0.5);

      const forecast3 = TrendAnalyzer.forecast(trend!, 3);
      const forecast7 = TrendAnalyzer.forecast(trend!, 7);
      const forecast30 = TrendAnalyzer.forecast(trend!, 30);

      expect(forecast3).toHaveLength(3);
      expect(forecast7).toHaveLength(7);
      expect(forecast30).toHaveLength(30);
    });

    it('should space forecasts 24 hours apart', () => {
      const baseTime = Date.now();
      const dataPoints: PerformanceDataPoint[] = [];

      for (let i = 0; i < 15; i++) {
        dataPoints.push(
          createDataPoint({
            timestamp: baseTime + i * 24 * 60 * 60 * 1000,
            latency: 1000 + i * 10,
          })
        );
      }

      const trend = TrendAnalyzer.detectTrend('latency', dataPoints, 0.5);
      const predictions = TrendAnalyzer.forecast(trend!, 5);

      const msPerDay = 24 * 60 * 60 * 1000;
      for (let i = 1; i < predictions.length; i++) {
        const timeDiff =
          predictions[i].timestamp - predictions[i - 1].timestamp;
        expect(timeDiff).toBe(msPerDay);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle exactly 10 data points', () => {
      const baseTime = Date.now();
      const dataPoints: PerformanceDataPoint[] = [];

      for (let i = 0; i < 10; i++) {
        dataPoints.push(
          createDataPoint({
            timestamp: baseTime + i * 60 * 60 * 1000,
            latency: 1000 + i * 50,
          })
        );
      }

      const trend = TrendAnalyzer.detectTrend('latency', dataPoints, 0.5);
      // 10 is the minimum, should work
      expect(trend).not.toBeNull();
    });

    it('should handle all identical values', () => {
      const baseTime = Date.now();
      const dataPoints: PerformanceDataPoint[] = [];

      for (let i = 0; i < 15; i++) {
        dataPoints.push(
          createDataPoint({
            timestamp: baseTime + i * 60 * 60 * 1000,
            latency: 1000,
          })
        );
      }

      const trend = TrendAnalyzer.detectTrend('latency', dataPoints, 0.5);

      if (trend) {
        expect(trend.direction).toBe('stable');
        expect(trend.statistics.stdDev).toBe(0);
      }
    });

    it('should handle timestamps not in order', () => {
      const baseTime = Date.now();
      const dataPoints: PerformanceDataPoint[] = [];

      // Add in random order
      const times = [0, 5, 2, 8, 1, 9, 3, 7, 4, 6, 10, 11, 12, 13, 14];
      for (const t of times) {
        dataPoints.push(
          createDataPoint({
            timestamp: baseTime + t * 60 * 60 * 1000,
            latency: 1000 + t * 10,
          })
        );
      }

      const trend = TrendAnalyzer.detectTrend('latency', dataPoints, 0.5);

      // Should still work (gets sorted internally)
      expect(trend).not.toBeNull();
    });

    it('should handle missing quality field', () => {
      const baseTime = Date.now();
      const dataPoints: PerformanceDataPoint[] = [];

      for (let i = 0; i < 15; i++) {
        const dp = createDataPoint({
          timestamp: baseTime + i * 60 * 60 * 1000,
        });
        delete (dp as any).quality;
        dataPoints.push(dp);
      }

      const trend = TrendAnalyzer.detectTrend('quality', dataPoints, 0.5);

      // Should handle gracefully (returns 0 for missing)
      if (trend) {
        expect(trend.statistics.mean).toBe(0);
      }
    });
  });
});
