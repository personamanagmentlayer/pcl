/**
 * Variant selection for A/B testing
 * Part of Q2 2025 Adaptive Intelligence - Phase 7
 */

import type { Experiment, Variant } from './types.js';

/**
 * Selects variants for experiments using deterministic hashing
 */
export class VariantSelector {
  /**
   * Assign variant to user/session
   */
  assignVariant(
    experiment: Experiment,
    sessionId: string,
    userId?: string
  ): Variant {
    // Use userId if available for consistent assignment across sessions
    const hashInput = userId || sessionId;

    // Deterministic hash
    const hash = this.hashString(hashInput + experiment.id);

    // Convert to 0-1 range
    const r = (hash % 10000) / 10000;

    // Select variant based on allocation
    let cumulative = 0;
    for (let i = 0; i < experiment.variants.length; i++) {
      cumulative += experiment.allocation[i];
      if (r < cumulative) {
        return experiment.variants[i];
      }
    }

    // Fallback to last variant
    return experiment.variants[experiment.variants.length - 1];
  }

  /**
   * Simple hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Validate experiment allocation
   */
  validateAllocation(allocation: number[]): boolean {
    const sum = allocation.reduce((a, b) => a + b, 0);
    return Math.abs(sum - 1.0) < 0.001; // Allow small floating point errors
  }
}
