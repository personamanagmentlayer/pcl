/**
 * Trend analysis for performance metrics
 * Part of Q2 2025 Adaptive Intelligence implementation
 */

import type {
  TrendAnalysis,
  PerformanceDataPoint,
  TimeSeriesPoint,
} from './types.js';

/**
 * Analyzes trends in performance data over time
 */
export class TrendAnalyzer {
  /**
   * Detect trend in a time series
   */
  static detectTrend(
    metric: string,
    dataPoints: PerformanceDataPoint[],
    minConfidence: number = 0.7
  ): TrendAnalysis | null {
    if (dataPoints.length < 10) {
      // Not enough data for reliable trend detection
      return null;
    }

    // Extract time series
    const timeSeries: TimeSeriesPoint[] = dataPoints.map((dp) => ({
      timestamp: dp.timestamp,
      value: this.extractMetricValue(dp, metric),
    }));

    // Sort by timestamp
    timeSeries.sort((a, b) => a.timestamp - b.timestamp);

    // Compute statistics
    const values = timeSeries.map((p) => p.value);
    const statistics = this.computeStatistics(values);

    // Compute linear regression
    const regression = this.linearRegression(timeSeries);

    // Determine trend direction
    const direction = this.determineTrendDirection(
      regression.slope,
      statistics.stdDev
    );

    // Compute confidence based on R²
    const confidence = Math.min(1, regression.rSquared);

    // Only return trends with sufficient confidence
    if (confidence < minConfidence) {
      return null;
    }

    return {
      metric,
      direction,
      slope: regression.slope,
      confidence,
      period: {
        start: timeSeries[0].timestamp,
        end: timeSeries[timeSeries.length - 1].timestamp,
      },
      statistics,
    };
  }

  /**
   * Extract metric value from data point
   */
  private static extractMetricValue(
    dp: PerformanceDataPoint,
    metric: string
  ): number {
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
  }

  /**
   * Compute basic statistics
   */
  private static computeStatistics(values: number[]): {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
  } {
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];

    // Standard deviation
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const variance =
      squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean,
      median,
      stdDev,
      min: sorted[0],
      max: sorted[sorted.length - 1],
    };
  }

  /**
   * Perform linear regression on time series
   */
  private static linearRegression(timeSeries: TimeSeriesPoint[]): {
    slope: number;
    intercept: number;
    rSquared: number;
  } {
    const n = timeSeries.length;

    // Normalize timestamps to days for more meaningful slope
    const firstTimestamp = timeSeries[0].timestamp;
    const points = timeSeries.map((p) => ({
      x: (p.timestamp - firstTimestamp) / (24 * 60 * 60 * 1000), // Convert to days
      y: p.value,
    }));

    // Compute means
    const meanX = points.reduce((sum, p) => sum + p.x, 0) / n;
    const meanY = points.reduce((sum, p) => sum + p.y, 0) / n;

    // Compute slope and intercept
    let numerator = 0;
    let denominator = 0;

    for (const p of points) {
      numerator += (p.x - meanX) * (p.y - meanY);
      denominator += Math.pow(p.x - meanX, 2);
    }

    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = meanY - slope * meanX;

    // Compute R² (coefficient of determination)
    let ssRes = 0; // Residual sum of squares
    let ssTot = 0; // Total sum of squares

    for (const p of points) {
      const predicted = slope * p.x + intercept;
      ssRes += Math.pow(p.y - predicted, 2);
      ssTot += Math.pow(p.y - meanY, 2);
    }

    const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

    return { slope, intercept, rSquared: Math.max(0, rSquared) };
  }

  /**
   * Determine trend direction based on slope and standard deviation
   */
  private static determineTrendDirection(
    slope: number,
    stdDev: number
  ): 'improving' | 'degrading' | 'stable' {
    // For metrics like latency and cost, negative slope is improving
    // For confidence and quality, positive slope is improving
    // For now, we determine based on absolute slope relative to stdDev

    const threshold = stdDev * 0.1; // 10% of standard deviation

    if (Math.abs(slope) < threshold) {
      return 'stable';
    }

    // Default direction (can be customized per metric)
    return slope < 0 ? 'improving' : 'degrading';
  }

  /**
   * Detect multiple trends across different metrics
   */
  static detectMultipleTrends(
    dataPoints: PerformanceDataPoint[],
    metrics: string[] = ['latency', 'cost', 'confidence']
  ): Map<string, TrendAnalysis> {
    const trends = new Map<string, TrendAnalysis>();

    for (const metric of metrics) {
      const trend = this.detectTrend(metric, dataPoints);
      if (trend) {
        trends.set(metric, trend);
      }
    }

    return trends;
  }

  /**
   * Forecast future values based on trend
   */
  static forecast(
    trend: TrendAnalysis,
    daysAhead: number
  ): {
    timestamp: number;
    predicted: number;
    confidence: number;
  }[] {
    const predictions: {
      timestamp: number;
      predicted: number;
      confidence: number;
    }[] = [];

    const msPerDay = 24 * 60 * 60 * 1000;
    const startTimestamp = trend.period.end;

    for (let day = 1; day <= daysAhead; day++) {
      const timestamp = startTimestamp + day * msPerDay;

      // Simple linear extrapolation
      const predicted = trend.statistics.mean + trend.slope * day;

      // Confidence decreases with time
      const confidence = trend.confidence * Math.exp(-day / 7); // Decay over week

      predictions.push({
        timestamp,
        predicted: Math.max(0, predicted), // Ensure non-negative
        confidence,
      });
    }

    return predictions;
  }
}
