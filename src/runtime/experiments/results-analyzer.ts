/**
 * Results analysis for experiments
 * Part of Q2 2025 Adaptive Intelligence - Phase 7
 */

import type {
  Experiment,
  ExperimentResult,
  ExperimentAnalysis,
  ExperimentConfig,
} from './types.js';

/**
 * Analyzes experiment results for statistical significance
 */
export class ResultsAnalyzer {
  private readonly config: ExperimentConfig;

  constructor(config: ExperimentConfig) {
    this.config = config;
  }

  /**
   * Analyze experiment results
   */
  analyzeExperiment(
    experiment: Experiment,
    results: ExperimentResult[]
  ): ExperimentAnalysis {
    // Filter to variants with sufficient sample size
    const validResults = results.filter(
      (r) =>
        r.sampleSize >= (experiment.minSampleSize || this.config.minSampleSize)
    );

    if (validResults.length === 0) {
      return {
        winner: null,
        significant: false,
        confidence: 0,
        results: results,
        recommendation: 'Insufficient data - continue collecting samples',
      };
    }

    // Determine primary metric (first in list)
    const primaryMetric = experiment.metrics[0];

    // Sort by primary metric (descending)
    const sorted = [...validResults].sort(
      (a, b) =>
        (b.metrics[primaryMetric] || 0) - (a.metrics[primaryMetric] || 0)
    );

    if (sorted.length < 2) {
      return {
        winner: sorted[0].variantId,
        significant: false,
        confidence: 0,
        results: validResults,
        recommendation: 'Only one variant has sufficient data',
      };
    }

    const winner = sorted[0];
    const runnerUp = sorted[1];

    // Compute confidence (simplified - would use proper statistical tests in production)
    const winnerValue = winner.metrics[primaryMetric] || 0;
    const runnerUpValue = runnerUp.metrics[primaryMetric] || 0;

    // Relative difference
    const relativeDiff =
      Math.abs(winnerValue - runnerUpValue) / Math.max(runnerUpValue, 0.001);

    // Confidence based on relative difference and sample sizes
    const minSampleSize = Math.min(winner.sampleSize, runnerUp.sampleSize);
    const sampleFactor = Math.min(1, minSampleSize / 100);
    const confidence = relativeDiff * sampleFactor;

    // Statistical significance check
    const significant = confidence > this.config.significanceThreshold;

    // Generate recommendation
    let recommendation: string;
    if (significant) {
      recommendation = `${winner.variantId} is statistically significant winner for ${primaryMetric}`;
    } else if (validResults.every((r) => r.sampleSize < 100)) {
      recommendation =
        'Continue collecting samples to reach statistical significance';
    } else {
      recommendation = 'No clear winner - variants perform similarly';
    }

    return {
      winner: winner.variantId,
      significant,
      confidence,
      results: validResults,
      recommendation,
    };
  }

  /**
   * Compare two variants
   */
  compareVariants(
    result1: ExperimentResult,
    result2: ExperimentResult,
    metric: string
  ): {
    winner: string;
    difference: number;
    percentDifference: number;
  } {
    const value1 = result1.metrics[metric] || 0;
    const value2 = result2.metrics[metric] || 0;

    const difference = value1 - value2;
    const percentDifference = (difference / Math.max(value2, 0.001)) * 100;

    return {
      winner: value1 > value2 ? result1.variantId : result2.variantId,
      difference,
      percentDifference,
    };
  }

  /**
   * Compute summary statistics
   */
  computeSummary(
    results: ExperimentResult[],
    metric: string
  ): {
    mean: number;
    min: number;
    max: number;
    stdDev: number;
  } {
    const values = results.map((r) => r.metrics[metric] || 0);

    if (values.length === 0) {
      return { mean: 0, min: 0, max: 0, stdDev: 0 };
    }

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const variance =
      squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, min, max, stdDev };
  }
}
