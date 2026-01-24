/**
 * Confidence scoring engine
 * Part of Q2 2025 Adaptive Intelligence - Phase 2
 */

import { SignalExtractor } from './signals.js';
import { ConfidenceCalibrator } from './calibration.js';
import type {
  ConfidenceConfig,
  ConfidenceSignals,
  ExecutionContext,
  ScoredResponse,
  DEFAULT_CONFIDENCE_WEIGHTS,
} from './types.js';
import type { PerformanceDataPoint } from '../analytics/types.js';

/**
 * Computes confidence scores for responses
 */
export class ConfidenceScorer {
  private config: ConfidenceConfig;
  private calibrator: ConfidenceCalibrator;

  constructor(config: ConfidenceConfig) {
    this.config = config;
    this.calibrator = new ConfidenceCalibrator();
  }

  /**
   * Compute confidence score for a response
   */
  computeConfidence(
    response: ScoredResponse,
    context: ExecutionContext,
    history: PerformanceDataPoint[]
  ): number {
    if (!this.config.enabled) {
      return 0.8; // Default static confidence
    }

    // Extract quality signals
    const signals = SignalExtractor.extractSignals(response, context, history);

    // Combine signals with weights
    const rawConfidence = this.combineSignals(signals);

    // Apply calibration if enabled
    if (this.config.calibration) {
      return this.calibrator.calibrate(rawConfidence, context);
    }

    return rawConfidence;
  }

  /**
   * Record actual outcome for calibration
   */
  recordOutcome(personaId: string, predicted: number, actual: number): void {
    if (this.config.calibration) {
      this.calibrator.recordOutcome(personaId, predicted, actual);
    }
  }

  /**
   * Get calibration statistics
   */
  getCalibrationStats(personaId: string): {
    dataPoints: number;
    avgError: number;
    calibrationQuality: number;
  } {
    return this.calibrator.getCalibrationStats(personaId);
  }

  /**
   * Combine signals using weighted average
   */
  private combineSignals(signals: ConfidenceSignals): number {
    const weights = this.config.weights;

    let score = 0;
    let totalWeight = 0;

    // Provider confidence
    if (signals.providerConfidence !== undefined) {
      score += signals.providerConfidence * weights.providerConfidence;
      totalWeight += weights.providerConfidence;
    }

    // Response length
    score += signals.responseLength * weights.structureQuality * 0.3;
    totalWeight += weights.structureQuality * 0.3;

    // Structure quality
    score += signals.structureQuality * weights.structureQuality * 0.7;
    totalWeight += weights.structureQuality * 0.7;

    // Coherence
    score += signals.coherenceScore * weights.coherenceScore;
    totalWeight += weights.coherenceScore;

    // Provider reliability
    score += signals.providerReliability * weights.providerReliability;
    totalWeight += weights.providerReliability;

    // Similar task performance
    score += signals.similarTaskPerformance * weights.similarTaskPerformance;
    totalWeight += weights.similarTaskPerformance;

    // Token efficiency
    score += signals.tokenEfficiency * weights.tokenEfficiency;
    totalWeight += weights.tokenEfficiency;

    // Latency score
    score += signals.latencyScore * weights.latencyScore;
    totalWeight += weights.latencyScore;

    // Cost score
    score += signals.costScore * weights.costScore;
    totalWeight += weights.costScore;

    // Message complexity (inverse: higher complexity = lower initial confidence)
    score += (1 - signals.messageComplexity) * weights.messageComplexity;
    totalWeight += weights.messageComplexity;

    // Domain match
    score += signals.domainMatch * weights.domainMatch;
    totalWeight += weights.domainMatch;

    // Normalize by total weight
    const finalScore = totalWeight > 0 ? score / totalWeight : 0.5;

    return Math.max(0, Math.min(1, finalScore));
  }

  /**
   * Clear calibration data
   */
  clearCalibration(personaId?: string): void {
    this.calibrator.clear(personaId);
  }

  /**
   * Export calibration data
   */
  exportCalibration() {
    return this.calibrator.export();
  }

  /**
   * Import calibration data
   */
  importCalibration(data: any): void {
    this.calibrator.import(data);
  }
}
