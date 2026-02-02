/**
 * A/B testing framework types
 * Part of Q2 2025 Adaptive Intelligence - Phase 7
 */

/**
 * Experiment variant
 */
export interface Variant {
  /** Variant ID */
  id: string;

  /** Variant name */
  name: string;

  /** Variant-specific configuration */
  config: Record<string, any>;
}

/**
 * Experiment definition
 */
export interface Experiment {
  /** Experiment ID */
  id: string;

  /** Experiment name */
  name: string;

  /** Description */
  description: string;

  /** Variants to test */
  variants: Variant[];

  /** Traffic allocation per variant (must sum to 1) */
  allocation: number[];

  /** Metrics to track */
  metrics: string[];

  /** Start time */
  startTime: number;

  /** End time (optional) */
  endTime?: number;

  /** Experiment status */
  status: 'draft' | 'running' | 'completed' | 'paused';

  /** Minimum sample size per variant */
  minSampleSize?: number;
}

/**
 * Variant assignment
 */
export interface Assignment {
  /** Experiment ID */
  experimentId: string;

  /** Assigned variant ID */
  variantId: string;

  /** User ID (if available) */
  userId?: string;

  /** Session ID */
  sessionId: string;

  /** Timestamp */
  timestamp: number;
}

/**
 * Experiment result for a variant
 */
export interface ExperimentResult {
  /** Experiment ID */
  experimentId: string;

  /** Variant ID */
  variantId: string;

  /** Metric values (running averages) */
  metrics: Record<string, number>;

  /** Sample size */
  sampleSize: number;

  /** Timestamp of last update */
  lastUpdated: number;
}

/**
 * Experiment analysis
 */
export interface ExperimentAnalysis {
  /** Winning variant ID (if any) */
  winner: string | null;

  /** Is result statistically significant? */
  significant: boolean;

  /** Confidence level (0-1) */
  confidence: number;

  /** All variant results */
  results: ExperimentResult[];

  /** Recommendation */
  recommendation?: string;
}

/**
 * Experiment configuration
 */
export interface ExperimentConfig {
  /** Enable experiments */
  enabled: boolean;

  /** Allowed experiment IDs (for safety) */
  allowedExperiments: string[];

  /** Minimum sample size for analysis */
  minSampleSize: number;

  /** Significance threshold */
  significanceThreshold: number;
}

/**
 * Default experiment configuration
 */
export const DEFAULT_EXPERIMENT_CONFIG: ExperimentConfig = {
  enabled: true,
  allowedExperiments: [],
  minSampleSize: 30,
  significanceThreshold: 0.05,
};
