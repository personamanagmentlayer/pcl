/**
 * Analytics types for performance tracking and trend analysis
 * Part of Q2 2025 Adaptive Intelligence implementation
 */

/**
 * Single performance data point captured during execution
 */
export interface PerformanceDataPoint {
  /** Timestamp when this data point was recorded */
  timestamp: number;

  /** ID of the persona that processed this request */
  personaId: string;

  /** ID of the provider used (e.g., 'anthropic', 'openai') */
  providerId: string;

  /** Specific model ID used (e.g., 'claude-3-5-sonnet-20241022') */
  modelId: string;

  /** Latency in milliseconds */
  latency: number;

  /** Cost in USD */
  cost: number;

  /** Token usage details */
  tokenUsage: {
    input: number;
    output: number;
  };

  /** Confidence score (0-1) */
  confidence: number;

  /** Optional user feedback quality score (0-1) */
  quality?: number;

  /** Execution context */
  context: {
    /** Type of message (code, analysis, creative, general) */
    messageType: string;

    /** Optional complexity score (0-1) */
    complexity?: number;

    /** Optional additional metadata */
    metadata?: Record<string, unknown>;
  };
}

/**
 * Query parameters for retrieving analytics data
 */
export interface AnalyticsQuery {
  /** Filter by persona ID */
  personaId?: string;

  /** Filter by provider ID */
  providerId?: string;

  /** Filter by model ID */
  modelId?: string;

  /** Filter by time range */
  timeRange?: {
    start: number;
    end: number;
  };

  /** Metrics to retrieve */
  metrics?: string[];

  /** Aggregation function to apply */
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'p50' | 'p95' | 'p99';

  /** Maximum number of results to return */
  limit?: number;

  /** Offset for pagination */
  offset?: number;
}

/**
 * Aggregated analytics result
 */
export interface AnalyticsResult {
  /** Metric name */
  metric: string;

  /** Aggregated value */
  value: number;

  /** Number of data points included */
  count: number;

  /** Time range covered */
  timeRange: {
    start: number;
    end: number;
  };
}

/**
 * Trend analysis result
 */
export interface TrendAnalysis {
  /** Metric being analyzed */
  metric: string;

  /** Trend direction */
  direction: 'improving' | 'degrading' | 'stable';

  /** Trend slope (rate of change per day) */
  slope: number;

  /** Confidence in trend detection (0-1) */
  confidence: number;

  /** Time period analyzed */
  period: {
    start: number;
    end: number;
  };

  /** Statistical details */
  statistics: {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
  };
}

/**
 * Configuration for analytics storage
 */
export interface AnalyticsConfig {
  /** Enable analytics collection */
  enabled: boolean;

  /** Retention period in days */
  retention: number;

  /** Storage backend */
  storage: 'memory' | 'disk' | 'database';

  /** Maximum data points to store in memory */
  maxDataPoints?: number;

  /** Enable automatic data aggregation for old data */
  autoAggregate?: boolean;

  /** Aggregation interval in days */
  aggregationInterval?: number;
}

/**
 * Performance statistics summary
 */
export interface PerformanceStats {
  /** Total number of executions */
  totalExecutions: number;

  /** Average latency in milliseconds */
  avgLatency: number;

  /** Total cost in USD */
  totalCost: number;

  /** Average cost per execution */
  avgCost: number;

  /** Total tokens used */
  totalTokens: {
    input: number;
    output: number;
    total: number;
  };

  /** Average confidence score */
  avgConfidence: number;

  /** Time range covered */
  timeRange: {
    start: number;
    end: number;
  };

  /** Breakdown by provider */
  byProvider: Record<string, ProviderStats>;

  /** Breakdown by persona */
  byPersona: Record<string, PersonaStats>;
}

/**
 * Provider-specific statistics
 */
export interface ProviderStats {
  /** Provider ID */
  providerId: string;

  /** Number of requests */
  requestCount: number;

  /** Average latency */
  avgLatency: number;

  /** Total cost */
  totalCost: number;

  /** Average confidence */
  avgConfidence: number;

  /** Error rate (0-1) */
  errorRate: number;
}

/**
 * Persona-specific statistics
 */
export interface PersonaStats {
  /** Persona ID */
  personaId: string;

  /** Number of messages processed */
  messageCount: number;

  /** Average latency */
  avgLatency: number;

  /** Total cost */
  totalCost: number;

  /** Average confidence */
  avgConfidence: number;

  /** Average quality (if feedback available) */
  avgQuality?: number;
}

/**
 * Time-series data point for visualization
 */
export interface TimeSeriesPoint {
  /** Timestamp */
  timestamp: number;

  /** Metric value */
  value: number;

  /** Optional label */
  label?: string;
}

/**
 * Time-series data set
 */
export interface TimeSeriesData {
  /** Metric name */
  metric: string;

  /** Data points */
  points: TimeSeriesPoint[];

  /** Aggregation interval in milliseconds */
  interval: number;

  /** Time range */
  timeRange: {
    start: number;
    end: number;
  };
}
