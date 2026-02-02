/**
 * Confidence scoring types
 * Part of Q2 2025 Adaptive Intelligence - Phase 2
 */

import type { PerformanceDataPoint } from '../analytics/types.js';

/**
 * Quality signals extracted from response and context
 */
export interface ConfidenceSignals {
  /** Provider-reported confidence (if available, e.g., Claude) */
  providerConfidence?: number;

  /** Response length score (normalized) */
  responseLength: number;

  /** Structure quality score (JSON validity, markdown formatting) */
  structureQuality: number;

  /** Coherence score (sentence flow, logical structure) */
  coherenceScore: number;

  /** Provider reliability (historical success rate) */
  providerReliability: number;

  /** Similar task performance score */
  similarTaskPerformance: number;

  /** Token efficiency (output/input ratio) */
  tokenEfficiency: number;

  /** Latency score (faster = higher confidence, within reason) */
  latencyScore: number;

  /** Cost score (lower cost = higher efficiency) */
  costScore: number;

  /** Message complexity (inverse relationship) */
  messageComplexity: number;

  /** Domain match (task matches persona specialty) */
  domainMatch: number;
}

/**
 * Execution context for confidence computation
 */
export interface ExecutionContext {
  /** Unique request ID */
  requestId: string;

  /** Persona ID */
  personaId: string;

  /** Provider ID */
  providerId: string;

  /** Model ID */
  modelId: string;

  /** Message content */
  message: {
    content: string;
    metadata?: Record<string, unknown>;
  };

  /** Execution duration in milliseconds */
  duration: number;

  /** Cost in USD */
  cost: number;

  /** Token usage */
  tokens: {
    input: number;
    output: number;
  };

  /** Message complexity estimate */
  complexity?: number;

  /** Message domain/type */
  domain?: string;
}

/**
 * Response object for confidence scoring
 */
export interface ScoredResponse {
  /** Response content */
  content: string;

  /** Computed confidence score (0-1) */
  confidence: number;

  /** Provider-reported confidence (if available) */
  providerConfidence?: number;

  /** Token usage */
  tokens: {
    input: number;
    output: number;
  };

  /** Cost */
  cost: number;

  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Calibration point for confidence calibration
 */
export interface CalibrationPoint {
  /** Predicted confidence */
  predicted: number;

  /** Actual outcome/quality */
  actual: number;

  /** Timestamp */
  timestamp: number;

  /** Context for this calibration */
  context?: {
    personaId: string;
    providerId: string;
    messageType: string;
  };
}

/**
 * Configuration for confidence scoring
 */
export interface ConfidenceConfig {
  /** Enable confidence scoring */
  enabled: boolean;

  /** Signals to use (empty = all) */
  signals: string[];

  /** Enable calibration */
  calibration: boolean;

  /** Signal weights */
  weights: {
    providerConfidence: number;
    structureQuality: number;
    coherenceScore: number;
    providerReliability: number;
    similarTaskPerformance: number;
    tokenEfficiency: number;
    latencyScore: number;
    costScore: number;
    messageComplexity: number;
    domainMatch: number;
  };
}

/**
 * Default confidence weights
 */
export const DEFAULT_CONFIDENCE_WEIGHTS = {
  providerConfidence: 0.3,
  structureQuality: 0.15,
  coherenceScore: 0.15,
  providerReliability: 0.15,
  similarTaskPerformance: 0.1,
  tokenEfficiency: 0.05,
  latencyScore: 0.05,
  costScore: 0.03,
  messageComplexity: 0.01,
  domainMatch: 0.01,
};
