/**
 * Merge outcome tracking for weight adaptation
 * Part of Q2 2025 Adaptive Intelligence - Phase 3
 */

import type { MergeOutcome, MemberPerformance } from './types.js';

/**
 * Tracks merge outcomes for performance analysis
 */
export class OutcomeTracker {
  private outcomes: Map<string, MergeOutcome[]>;
  private readonly maxOutcomesPerTeam: number = 1000;

  constructor() {
    this.outcomes = new Map();
  }

  /**
   * Record a merge outcome
   */
  recordOutcome(outcome: MergeOutcome): void {
    if (!this.outcomes.has(outcome.teamId)) {
      this.outcomes.set(outcome.teamId, []);
    }

    const teamOutcomes = this.outcomes.get(outcome.teamId)!;
    teamOutcomes.push(outcome);

    // Keep only recent outcomes
    if (teamOutcomes.length > this.maxOutcomesPerTeam) {
      this.outcomes.set(
        outcome.teamId,
        teamOutcomes.slice(-this.maxOutcomesPerTeam)
      );
    }
  }

  /**
   * Get history of outcomes for a team
   */
  getHistory(teamId: string, limit: number = 100): MergeOutcome[] {
    const outcomes = this.outcomes.get(teamId) || [];
    return outcomes.slice(-limit);
  }

  /**
   * Analyze performance of a specific member
   */
  analyzeMemberPerformance(
    teamId: string,
    personaId: string
  ): MemberPerformance {
    const history = this.getHistory(teamId);
    const memberOutcomes = history.filter((o) =>
      o.memberResponses.some((r) => r.personaId === personaId)
    );

    if (memberOutcomes.length === 0) {
      return {
        totalResponses: 0,
        avgConfidence: 0.5,
        selectionRate: 0,
        avgQuality: 0.5,
      };
    }

    return {
      totalResponses: memberOutcomes.length,
      avgConfidence: this.avgConfidence(memberOutcomes, personaId),
      selectionRate: this.selectionRate(memberOutcomes, personaId),
      avgQuality: this.avgQuality(memberOutcomes, personaId),
      trend: this.detectTrend(memberOutcomes, personaId),
    };
  }

  /**
   * Get all member performances for a team
   */
  getAllMemberPerformances(teamId: string): Map<string, MemberPerformance> {
    const history = this.getHistory(teamId);
    const performances = new Map<string, MemberPerformance>();

    // Get unique member IDs
    const memberIds = new Set<string>();
    for (const outcome of history) {
      for (const response of outcome.memberResponses) {
        memberIds.add(response.personaId);
      }
    }

    // Analyze each member
    for (const memberId of memberIds) {
      performances.set(
        memberId,
        this.analyzeMemberPerformance(teamId, memberId)
      );
    }

    return performances;
  }

  /**
   * Clear outcomes for a team
   */
  clear(teamId?: string): void {
    if (teamId) {
      this.outcomes.delete(teamId);
    } else {
      this.outcomes.clear();
    }
  }

  /**
   * Export outcome data
   */
  export(): Map<string, MergeOutcome[]> {
    return new Map(this.outcomes);
  }

  /**
   * Import outcome data
   */
  import(data: Map<string, MergeOutcome[]>): void {
    this.outcomes = new Map(data);
  }

  /**
   * Compute average confidence for a member
   */
  private avgConfidence(outcomes: MergeOutcome[], personaId: string): number {
    const confidences = outcomes
      .flatMap((o) => o.memberResponses)
      .filter((r) => r.personaId === personaId)
      .map((r) => r.confidence);

    if (confidences.length === 0) return 0.5;

    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }

  /**
   * Compute selection rate (how often this member was chosen)
   */
  private selectionRate(outcomes: MergeOutcome[], personaId: string): number {
    const withFeedback = outcomes.filter((o) => o.feedback?.selected);

    if (withFeedback.length === 0) {
      // If no explicit selection feedback, use confidence as proxy
      const memberOutcomes = outcomes.filter((o) =>
        o.memberResponses.some((r) => r.personaId === personaId)
      );

      if (memberOutcomes.length === 0) return 0;

      // Count how often this member had highest confidence
      let highestCount = 0;
      for (const outcome of memberOutcomes) {
        const memberResponse = outcome.memberResponses.find(
          (r) => r.personaId === personaId
        );
        if (!memberResponse) continue;

        const isHighest = outcome.memberResponses.every(
          (r) =>
            r.personaId === personaId ||
            r.confidence <= memberResponse.confidence
        );

        if (isHighest) highestCount++;
      }

      return highestCount / memberOutcomes.length;
    }

    const selected = withFeedback.filter(
      (o) => o.feedback!.selected === personaId
    ).length;
    return selected / withFeedback.length;
  }

  /**
   * Compute average quality from user feedback
   */
  private avgQuality(outcomes: MergeOutcome[], personaId: string): number {
    const qualities = outcomes
      .filter((o) => o.feedback?.quality !== undefined)
      .filter((o) => o.memberResponses.some((r) => r.personaId === personaId))
      .map((o) => o.feedback!.quality!);

    if (qualities.length === 0) return 0.5; // Neutral default

    return qualities.reduce((sum, q) => sum + q, 0) / qualities.length;
  }

  /**
   * Detect performance trend
   */
  private detectTrend(
    outcomes: MergeOutcome[],
    personaId: string
  ): 'improving' | 'stable' | 'degrading' | undefined {
    if (outcomes.length < 20) return undefined; // Not enough data

    // Split into first half and second half
    const mid = Math.floor(outcomes.length / 2);
    const firstHalf = outcomes.slice(0, mid);
    const secondHalf = outcomes.slice(mid);

    // Compare average confidence
    const firstAvg = this.avgConfidence(firstHalf, personaId);
    const secondAvg = this.avgConfidence(secondHalf, personaId);

    const diff = secondAvg - firstAvg;

    if (diff > 0.05) return 'improving';
    if (diff < -0.05) return 'degrading';
    return 'stable';
  }
}
