/**
 * Analytics data storage with in-memory and optional persistent backends
 * Part of Q2 2025 Adaptive Intelligence implementation
 */

import type {
  AnalyticsConfig,
  PerformanceDataPoint,
  AnalyticsQuery,
  AnalyticsResult,
  TimeSeriesData,
  TimeSeriesPoint,
} from './types.js';

/**
 * In-memory analytics data store with automatic retention management
 */
export class AnalyticsStore {
  private dataPoints: PerformanceDataPoint[] = [];
  private config: AnalyticsConfig;
  private readonly maxDataPoints: number;

  constructor(config: AnalyticsConfig) {
    this.config = config;
    this.maxDataPoints = config.maxDataPoints || 100000; // Default 100K points
  }

  /**
   * Append a new data point to the store
   */
  append(dataPoint: PerformanceDataPoint): void {
    if (!this.config.enabled) {
      return;
    }

    this.dataPoints.push(dataPoint);

    // Enforce size limit
    if (this.dataPoints.length > this.maxDataPoints) {
      this.evictOldData();
    }

    // Check retention policy
    this.enforceRetention();
  }

  /**
   * Query data points based on filters
   */
  query(query: AnalyticsQuery): PerformanceDataPoint[] {
    let filtered = this.dataPoints;

    // Filter by persona ID
    if (query.personaId) {
      filtered = filtered.filter((dp) => dp.personaId === query.personaId);
    }

    // Filter by provider ID
    if (query.providerId) {
      filtered = filtered.filter((dp) => dp.providerId === query.providerId);
    }

    // Filter by model ID
    if (query.modelId) {
      filtered = filtered.filter((dp) => dp.modelId === query.modelId);
    }

    // Filter by time range
    if (query.timeRange) {
      filtered = filtered.filter(
        (dp) =>
          dp.timestamp >= query.timeRange!.start &&
          dp.timestamp <= query.timeRange!.end
      );
    }

    // Apply offset and limit
    const offset = query.offset || 0;
    const limit = query.limit || filtered.length;

    return filtered.slice(offset, offset + limit);
  }

  /**
   * Aggregate data based on query
   */
  aggregate(query: AnalyticsQuery): AnalyticsResult[] {
    const dataPoints = this.query(query);

    if (dataPoints.length === 0) {
      return [];
    }

    const metrics = query.metrics || ['latency', 'cost', 'confidence'];
    const aggregation = query.aggregation || 'avg';

    return metrics.map((metric) => {
      const values = this.extractMetricValues(dataPoints, metric);
      const value = this.computeAggregation(values, aggregation);

      return {
        metric,
        value,
        count: dataPoints.length,
        timeRange: {
          start: Math.min(...dataPoints.map((dp) => dp.timestamp)),
          end: Math.max(...dataPoints.map((dp) => dp.timestamp)),
        },
      };
    });
  }

  /**
   * Get time-series data for a metric
   */
  getTimeSeries(
    query: AnalyticsQuery,
    interval: number = 3600000
  ): TimeSeriesData {
    const dataPoints = this.query(query);

    if (dataPoints.length === 0) {
      return {
        metric: query.metrics?.[0] || 'latency',
        points: [],
        interval,
        timeRange: { start: 0, end: 0 },
      };
    }

    const metric = query.metrics?.[0] || 'latency';
    const aggregation = query.aggregation || 'avg';

    // Group data points by time interval
    const buckets = new Map<number, PerformanceDataPoint[]>();

    for (const dp of dataPoints) {
      const bucketKey = Math.floor(dp.timestamp / interval) * interval;
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(dp);
    }

    // Compute aggregated values for each bucket
    const points: TimeSeriesPoint[] = Array.from(buckets.entries())
      .map(([timestamp, points]) => {
        const values = this.extractMetricValues(points, metric);
        const value = this.computeAggregation(values, aggregation);
        return { timestamp, value };
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    return {
      metric,
      points,
      interval,
      timeRange: {
        start: Math.min(...dataPoints.map((dp) => dp.timestamp)),
        end: Math.max(...dataPoints.map((dp) => dp.timestamp)),
      },
    };
  }

  /**
   * Get total number of data points stored
   */
  size(): number {
    return this.dataPoints.length;
  }

  /**
   * Clear all data points
   */
  clear(): void {
    this.dataPoints = [];
  }

  /**
   * Export all data points (for persistence)
   */
  export(): PerformanceDataPoint[] {
    return [...this.dataPoints];
  }

  /**
   * Import data points (from persistence)
   */
  import(dataPoints: PerformanceDataPoint[]): void {
    this.dataPoints = dataPoints;
    this.enforceRetention();
  }

  /**
   * Extract metric values from data points
   */
  private extractMetricValues(
    dataPoints: PerformanceDataPoint[],
    metric: string
  ): number[] {
    return dataPoints.map((dp) => {
      switch (metric) {
        case 'latency':
          return dp.latency;
        case 'cost':
          return dp.cost;
        case 'confidence':
          return dp.confidence;
        case 'quality':
          return dp.quality || 0;
        case 'tokens_input':
          return dp.tokenUsage.input;
        case 'tokens_output':
          return dp.tokenUsage.output;
        case 'tokens_total':
          return dp.tokenUsage.input + dp.tokenUsage.output;
        default:
          return 0;
      }
    });
  }

  /**
   * Compute aggregation function on values
   */
  private computeAggregation(values: number[], aggregation: string): number {
    if (values.length === 0) return 0;

    switch (aggregation) {
      case 'avg':
        return values.reduce((sum, v) => sum + v, 0) / values.length;
      case 'sum':
        return values.reduce((sum, v) => sum + v, 0);
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'p50':
        return this.percentile(values, 0.5);
      case 'p95':
        return this.percentile(values, 0.95);
      case 'p99':
        return this.percentile(values, 0.99);
      default:
        return 0;
    }
  }

  /**
   * Compute percentile of values
   */
  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Evict oldest data points when size limit is reached
   */
  private evictOldData(): void {
    // Remove oldest 10% of data points
    const toRemove = Math.floor(this.dataPoints.length * 0.1);
    this.dataPoints = this.dataPoints.slice(toRemove);
  }

  /**
   * Enforce retention policy by removing old data
   */
  private enforceRetention(): void {
    if (this.config.retention === 0) return; // No retention limit

    const retentionMs = this.config.retention * 24 * 60 * 60 * 1000; // Convert days to ms
    const cutoff = Date.now() - retentionMs;

    this.dataPoints = this.dataPoints.filter((dp) => dp.timestamp >= cutoff);
  }
}
