/**
 * Performance tracking and analytics for adaptive intelligence
 * Part of Q2 2025 Adaptive Intelligence implementation
 */

import { AnalyticsStore } from './analytics-store.js';
import { TrendAnalyzer } from './trend-analyzer.js';
import type {
  AnalyticsConfig,
  PerformanceDataPoint,
  AnalyticsQuery,
  AnalyticsResult,
  TrendAnalysis,
  TimeSeriesData,
  PerformanceStats,
  ProviderStats,
  PersonaStats,
} from './types.js';

/**
 * Main performance tracker that collects and analyzes execution data
 */
export class PerformanceTracker {
  private store: AnalyticsStore;
  private config: AnalyticsConfig;

  constructor(config: AnalyticsConfig) {
    this.config = config;
    this.store = new AnalyticsStore(config);
  }

  /**
   * Record a performance data point
   */
  record(data: PerformanceDataPoint): void {
    if (!this.config.enabled) {
      return;
    }

    this.store.append(data);
  }

  /**
   * Query performance data
   */
  query(query: AnalyticsQuery): PerformanceDataPoint[] {
    return this.store.query(query);
  }

  /**
   * Aggregate data based on query
   */
  aggregate(query: AnalyticsQuery): AnalyticsResult[] {
    return this.store.aggregate(query);
  }

  /**
   * Get time-series data for visualization
   */
  getTimeSeries(
    query: AnalyticsQuery,
    intervalMs: number = 3600000
  ): TimeSeriesData {
    return this.store.getTimeSeries(query, intervalMs);
  }

  /**
   * Analyze trends in performance metrics
   */
  analyzeTrends(
    query: AnalyticsQuery,
    metrics?: string[]
  ): Map<string, TrendAnalysis> {
    const dataPoints = this.store.query(query);
    const metricsToAnalyze = metrics || ['latency', 'cost', 'confidence'];

    return TrendAnalyzer.detectMultipleTrends(dataPoints, metricsToAnalyze);
  }

  /**
   * Get comprehensive performance statistics
   */
  getStats(query: AnalyticsQuery = {}): PerformanceStats {
    const dataPoints = this.store.query(query);

    if (dataPoints.length === 0) {
      return this.emptyStats();
    }

    // Overall statistics
    const totalExecutions = dataPoints.length;
    const avgLatency =
      dataPoints.reduce((sum, dp) => sum + dp.latency, 0) / totalExecutions;
    const totalCost = dataPoints.reduce((sum, dp) => sum + dp.cost, 0);
    const avgCost = totalCost / totalExecutions;

    const totalTokensInput = dataPoints.reduce(
      (sum, dp) => sum + dp.tokenUsage.input,
      0
    );
    const totalTokensOutput = dataPoints.reduce(
      (sum, dp) => sum + dp.tokenUsage.output,
      0
    );

    const avgConfidence =
      dataPoints.reduce((sum, dp) => sum + dp.confidence, 0) / totalExecutions;

    // By provider
    const byProvider = this.computeProviderStats(dataPoints);

    // By persona
    const byPersona = this.computePersonaStats(dataPoints);

    return {
      totalExecutions,
      avgLatency,
      totalCost,
      avgCost,
      totalTokens: {
        input: totalTokensInput,
        output: totalTokensOutput,
        total: totalTokensInput + totalTokensOutput,
      },
      avgConfidence,
      timeRange: {
        start: Math.min(...dataPoints.map((dp) => dp.timestamp)),
        end: Math.max(...dataPoints.map((dp) => dp.timestamp)),
      },
      byProvider,
      byPersona,
    };
  }

  /**
   * Get provider-specific statistics
   */
  getProviderStats(
    providerId: string,
    timeRange?: { start: number; end: number }
  ): ProviderStats {
    const dataPoints = this.store.query({ providerId, timeRange });

    if (dataPoints.length === 0) {
      return {
        providerId,
        requestCount: 0,
        avgLatency: 0,
        totalCost: 0,
        avgConfidence: 0,
        errorRate: 0,
      };
    }

    return {
      providerId,
      requestCount: dataPoints.length,
      avgLatency:
        dataPoints.reduce((sum, dp) => sum + dp.latency, 0) / dataPoints.length,
      totalCost: dataPoints.reduce((sum, dp) => sum + dp.cost, 0),
      avgConfidence:
        dataPoints.reduce((sum, dp) => sum + dp.confidence, 0) /
        dataPoints.length,
      errorRate: 0, // TODO: Track errors
    };
  }

  /**
   * Get persona-specific statistics
   */
  getPersonaStats(
    personaId: string,
    timeRange?: { start: number; end: number }
  ): PersonaStats {
    const dataPoints = this.store.query({ personaId, timeRange });

    if (dataPoints.length === 0) {
      return {
        personaId,
        messageCount: 0,
        avgLatency: 0,
        totalCost: 0,
        avgConfidence: 0,
      };
    }

    const qualityDataPoints = dataPoints.filter(
      (dp) => dp.quality !== undefined
    );

    return {
      personaId,
      messageCount: dataPoints.length,
      avgLatency:
        dataPoints.reduce((sum, dp) => sum + dp.latency, 0) / dataPoints.length,
      totalCost: dataPoints.reduce((sum, dp) => sum + dp.cost, 0),
      avgConfidence:
        dataPoints.reduce((sum, dp) => sum + dp.confidence, 0) /
        dataPoints.length,
      avgQuality:
        qualityDataPoints.length > 0
          ? qualityDataPoints.reduce((sum, dp) => sum + dp.quality!, 0) /
            qualityDataPoints.length
          : undefined,
    };
  }

  /**
   * Clear all stored data
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get total number of data points stored
   */
  size(): number {
    return this.store.size();
  }

  /**
   * Export data for persistence
   */
  export(): PerformanceDataPoint[] {
    return this.store.export();
  }

  /**
   * Import data from persistence
   */
  import(dataPoints: PerformanceDataPoint[]): void {
    this.store.import(dataPoints);
  }

  /**
   * Compute provider statistics from data points
   */
  private computeProviderStats(
    dataPoints: PerformanceDataPoint[]
  ): Record<string, ProviderStats> {
    const stats: Record<string, ProviderStats> = {};

    // Group by provider
    const byProvider = new Map<string, PerformanceDataPoint[]>();
    for (const dp of dataPoints) {
      if (!byProvider.has(dp.providerId)) {
        byProvider.set(dp.providerId, []);
      }
      byProvider.get(dp.providerId)!.push(dp);
    }

    // Compute stats for each provider
    for (const [providerId, points] of byProvider) {
      stats[providerId] = {
        providerId,
        requestCount: points.length,
        avgLatency:
          points.reduce((sum, p) => sum + p.latency, 0) / points.length,
        totalCost: points.reduce((sum, p) => sum + p.cost, 0),
        avgConfidence:
          points.reduce((sum, p) => sum + p.confidence, 0) / points.length,
        errorRate: 0, // TODO: Track errors
      };
    }

    return stats;
  }

  /**
   * Compute persona statistics from data points
   */
  private computePersonaStats(
    dataPoints: PerformanceDataPoint[]
  ): Record<string, PersonaStats> {
    const stats: Record<string, PersonaStats> = {};

    // Group by persona
    const byPersona = new Map<string, PerformanceDataPoint[]>();
    for (const dp of dataPoints) {
      if (!byPersona.has(dp.personaId)) {
        byPersona.set(dp.personaId, []);
      }
      byPersona.get(dp.personaId)!.push(dp);
    }

    // Compute stats for each persona
    for (const [personaId, points] of byPersona) {
      const qualityPoints = points.filter((p) => p.quality !== undefined);

      stats[personaId] = {
        personaId,
        messageCount: points.length,
        avgLatency:
          points.reduce((sum, p) => sum + p.latency, 0) / points.length,
        totalCost: points.reduce((sum, p) => sum + p.cost, 0),
        avgConfidence:
          points.reduce((sum, p) => sum + p.confidence, 0) / points.length,
        avgQuality:
          qualityPoints.length > 0
            ? qualityPoints.reduce((sum, p) => sum + p.quality!, 0) /
              qualityPoints.length
            : undefined,
      };
    }

    return stats;
  }

  /**
   * Return empty statistics object
   */
  private emptyStats(): PerformanceStats {
    return {
      totalExecutions: 0,
      avgLatency: 0,
      totalCost: 0,
      avgCost: 0,
      totalTokens: {
        input: 0,
        output: 0,
        total: 0,
      },
      avgConfidence: 0,
      timeRange: {
        start: Date.now(),
        end: Date.now(),
      },
      byProvider: {},
      byPersona: {},
    };
  }
}
