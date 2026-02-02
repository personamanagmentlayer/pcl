/**
 * Dynamic weight adaptation for team members
 * Part of Q2 2025 Adaptive Intelligence - Phase 3
 */

import { OutcomeTracker } from './outcome-tracker.js';
import type {
  AdaptiveWeightConfig,
  MemberPerformance,
  WeightAdjustmentEvent,
} from './types.js';

/**
 * Adapts team member weights based on performance
 */
export class WeightAdapter {
  private config: AdaptiveWeightConfig;
  private outcomeTracker: OutcomeTracker;
  private adjustmentCount: Map<string, number>;
  private adjustmentHistory: WeightAdjustmentEvent[];

  constructor(config: AdaptiveWeightConfig, tracker: OutcomeTracker) {
    this.config = config;
    this.outcomeTracker = tracker;
    this.adjustmentCount = new Map();
    this.adjustmentHistory = [];
  }

  /**
   * Check if weights should be adjusted
   */
  shouldAdjust(teamId: string): boolean {
    if (!this.config.enabled) return false;

    const count = this.adjustmentCount.get(teamId) || 0;
    return count >= this.config.adaptationInterval;
  }

  /**
   * Adjust weights based on performance
   */
  adjustWeights(
    teamId: string,
    currentWeights: Map<string, number>
  ): Map<string, number> {
    const newWeights = new Map(currentWeights);

    // Get performance for all members
    const performances = this.outcomeTracker.getAllMemberPerformances(teamId);

    // Compute target weights
    for (const [personaId, currentWeight] of currentWeights) {
      const performance = performances.get(personaId);

      if (!performance || performance.totalResponses === 0) {
        // No performance data, keep current weight
        continue;
      }

      const targetWeight = this.computeTargetWeight(performance);

      // Gradual adjustment using learning rate
      const adjustment =
        (targetWeight - currentWeight) * this.config.learningRate;
      const newWeight = this.clamp(
        currentWeight + adjustment,
        this.config.minWeight,
        this.config.maxWeight
      );

      newWeights.set(personaId, newWeight);
    }

    // Normalize weights to sum to member count
    const sum = Array.from(newWeights.values()).reduce((a, b) => a + b, 0);
    const memberCount = newWeights.size;
    const scale = memberCount / sum;

    const normalizedWeights = new Map<string, number>();
    for (const [personaId, weight] of newWeights) {
      normalizedWeights.set(personaId, weight * scale);
    }

    // Record adjustment event
    this.recordAdjustment(teamId, currentWeights, normalizedWeights);

    // Reset adjustment counter
    this.adjustmentCount.set(teamId, 0);

    return normalizedWeights;
  }

  /**
   * Record a merge for tracking
   */
  recordMerge(teamId: string): void {
    const count = this.adjustmentCount.get(teamId) || 0;
    this.adjustmentCount.set(teamId, count + 1);
  }

  /**
   * Get adjustment history for a team
   */
  getAdjustmentHistory(
    teamId: string,
    limit: number = 10
  ): WeightAdjustmentEvent[] {
    return this.adjustmentHistory
      .filter((event) => event.teamId === teamId)
      .slice(-limit);
  }

  /**
   * Compute target weight based on performance signals
   */
  private computeTargetWeight(performance: MemberPerformance): number {
    const { signals } = this.config;

    // Weighted combination of performance signals
    const score =
      performance.avgConfidence * signals.confidence +
      performance.selectionRate * signals.selection +
      performance.avgQuality * signals.quality;

    // Normalize to [0, 1]
    const totalSignalWeight =
      signals.confidence + signals.selection + signals.quality;
    const normalizedScore = score / totalSignalWeight;

    // Convert to weight range [minWeight, maxWeight]
    const weightRange = this.config.maxWeight - this.config.minWeight;
    const targetWeight = this.config.minWeight + normalizedScore * weightRange;

    return this.clamp(
      targetWeight,
      this.config.minWeight,
      this.config.maxWeight
    );
  }

  /**
   * Clamp value to range
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Record weight adjustment event
   */
  private recordAdjustment(
    teamId: string,
    oldWeights: Map<string, number>,
    newWeights: Map<string, number>
  ): void {
    // Compute differences
    const changes: string[] = [];
    for (const [personaId, newWeight] of newWeights) {
      const oldWeight = oldWeights.get(personaId) || 1.0;
      const diff = newWeight - oldWeight;
      if (Math.abs(diff) > 0.01) {
        changes.push(
          `${personaId}: ${oldWeight.toFixed(2)} → ${newWeight.toFixed(2)}`
        );
      }
    }

    const event: WeightAdjustmentEvent = {
      teamId,
      timestamp: Date.now(),
      oldWeights: new Map(oldWeights),
      newWeights: new Map(newWeights),
      reason:
        changes.length > 0 ? changes.join(', ') : 'No significant changes',
    };

    this.adjustmentHistory.push(event);

    // Keep only recent history
    if (this.adjustmentHistory.length > 100) {
      this.adjustmentHistory = this.adjustmentHistory.slice(-100);
    }
  }

  /**
   * Clear adjustment tracking
   */
  clear(teamId?: string): void {
    if (teamId) {
      this.adjustmentCount.delete(teamId);
      this.adjustmentHistory = this.adjustmentHistory.filter(
        (event) => event.teamId !== teamId
      );
    } else {
      this.adjustmentCount.clear();
      this.adjustmentHistory = [];
    }
  }

  /**
   * Export adapter state
   */
  export(): {
    adjustmentCount: Map<string, number>;
    adjustmentHistory: WeightAdjustmentEvent[];
  } {
    return {
      adjustmentCount: new Map(this.adjustmentCount),
      adjustmentHistory: [...this.adjustmentHistory],
    };
  }

  /**
   * Import adapter state
   */
  import(data: {
    adjustmentCount: Map<string, number>;
    adjustmentHistory: WeightAdjustmentEvent[];
  }): void {
    this.adjustmentCount = new Map(data.adjustmentCount);
    this.adjustmentHistory = [...data.adjustmentHistory];
  }
}
