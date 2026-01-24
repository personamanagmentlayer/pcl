/**
 * Learned routing engine
 * Part of Q2 2025 Adaptive Intelligence - Phase 4
 */

import { TaskClassifier } from './task-classifier.js';
import type {
  RoutingConfig,
  RoutingMessage,
  RoutingDecision,
  ProviderScore,
  TaskFeatures,
} from './types.js';
import type { PerformanceDataPoint } from '../analytics/types.js';

/**
 * Simple provider interface for routing
 */
export interface RoutableProvider {
  name: string;
  capabilities: {
    code?: boolean;
    json?: boolean;
    vision?: boolean;
    math?: boolean;
    long_context?: boolean;
    [key: string]: boolean | undefined;
  };
  defaultModel?: string;
}

/**
 * Learned router for optimal provider selection
 */
export class LearnedRouter {
  private config: RoutingConfig;
  private taskClassifier: TaskClassifier;
  private performanceHistory: PerformanceDataPoint[];

  constructor(config: RoutingConfig) {
    this.config = config;
    this.taskClassifier = new TaskClassifier();
    this.performanceHistory = [];
  }

  /**
   * Select optimal provider for a message
   */
  selectProvider(
    message: RoutingMessage,
    personaId: string,
    providers: RoutableProvider[],
    getProviderHealth: (providerId: string) => { state: string }
  ): RoutingDecision {
    // Classify task
    const features = this.taskClassifier.classifyMessage(message);

    // Filter to healthy providers
    const healthyProviders = providers.filter(
      (p) => getProviderHealth(p.name).state === 'closed'
    );

    if (healthyProviders.length === 0) {
      // Fallback to all providers if none healthy
      return this.createFallbackDecision(providers[0], providers.slice(1));
    }

    // Score all providers
    const scores = healthyProviders.map((provider) =>
      this.scoreProvider(provider, features, personaId)
    );

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Build decision
    const primary = scores[0];
    const fallbacks = this.config.fallbackChain
      ? scores.slice(1, 1 + this.config.fallbackCount)
      : [];

    return {
      primary,
      fallbacks,
      reasoning: this.explainDecision(primary, features),
      timestamp: Date.now(),
    };
  }

  /**
   * Update performance history for learning
   */
  updateHistory(dataPoint: PerformanceDataPoint): void {
    this.performanceHistory.push(dataPoint);

    // Keep only recent history (last 10000 points)
    if (this.performanceHistory.length > 10000) {
      this.performanceHistory = this.performanceHistory.slice(-10000);
    }
  }

  /**
   * Score a provider for the given task
   */
  private scoreProvider(
    provider: RoutableProvider,
    features: TaskFeatures,
    personaId: string
  ): ProviderScore {
    const capability = this.scoreCapability(provider, features);
    const performance = this.scorePerformance(
      provider.name,
      features,
      personaId
    );
    const cost = this.scoreCost(provider.name, features);
    const latency = this.scoreLatency(provider.name, features);
    const availability = 1.0; // Already filtered to healthy

    // Weighted combination based on task requirements
    const weights = {
      capability: this.config.weights.capability,
      performance: this.config.weights.performance,
      cost: features.costSensitivity * this.config.weights.cost,
      latency: features.latencySensitivity * this.config.weights.latency,
      availability: this.config.weights.availability,
    };

    const score =
      capability * weights.capability +
      performance * weights.performance +
      cost * weights.cost +
      latency * weights.latency +
      availability * weights.availability;

    return {
      providerId: provider.name,
      modelId: provider.defaultModel || provider.name,
      score,
      factors: { capability, performance, cost, latency, availability },
    };
  }

  /**
   * Score capability match
   */
  private scoreCapability(
    provider: RoutableProvider,
    features: TaskFeatures
  ): number {
    let score = 1.0;

    // Check required capabilities
    for (const required of features.requiredCapabilities) {
      if (!provider.capabilities[required]) {
        return 0; // Cannot handle this task
      }
    }

    // Bonus for domain expertise (hardcoded for now, would be learned)
    if (features.domain === 'code' && provider.name === 'anthropic') {
      score += 0.2;
    }
    if (features.domain === 'creative' && provider.name === 'openai') {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  /**
   * Score historical performance
   */
  private scorePerformance(
    providerId: string,
    features: TaskFeatures,
    personaId: string
  ): number {
    // Filter to this provider and persona
    const providerHistory = this.performanceHistory.filter(
      (dp) => dp.providerId === providerId && dp.personaId === personaId
    );

    if (providerHistory.length === 0) {
      return 0.7; // Neutral default for unknown
    }

    // Filter to similar tasks
    const similarTasks = providerHistory.filter((dp) => {
      const complexityMatch =
        Math.abs((dp.context.complexity || 0.5) - features.complexity) < 0.2;
      const domainMatch = dp.context.messageType === features.domain;

      return complexityMatch && domainMatch;
    });

    if (similarTasks.length === 0) {
      // Use all provider history
      const avgConfidence =
        providerHistory.reduce((sum, dp) => sum + dp.confidence, 0) /
        providerHistory.length;
      return avgConfidence;
    }

    // Average confidence on similar tasks
    const avgConfidence =
      similarTasks.reduce((sum, dp) => sum + dp.confidence, 0) /
      similarTasks.length;

    return avgConfidence;
  }

  /**
   * Score cost efficiency
   */
  private scoreCost(providerId: string, features: TaskFeatures): number {
    const providerHistory = this.performanceHistory.filter(
      (dp) => dp.providerId === providerId
    );

    if (providerHistory.length === 0) {
      return 0.5; // Neutral default
    }

    // Compute average cost
    const avgCost =
      providerHistory.reduce((sum, dp) => sum + dp.cost, 0) /
      providerHistory.length;

    // Normalize cost to score (lower cost = higher score)
    // Assuming typical range: $0.0001 - $0.10 per request
    const normalized = 1 - Math.min(1, avgCost / 0.1);

    return Math.max(0, normalized);
  }

  /**
   * Score latency
   */
  private scoreLatency(providerId: string, features: TaskFeatures): number {
    const providerHistory = this.performanceHistory.filter(
      (dp) => dp.providerId === providerId
    );

    if (providerHistory.length === 0) {
      return 0.5; // Neutral default
    }

    // Compute average latency
    const avgLatency =
      providerHistory.reduce((sum, dp) => sum + dp.latency, 0) /
      providerHistory.length;

    // Normalize latency to score (faster = higher score)
    // Assuming typical range: 100ms - 10s
    const normalized = 1 - Math.min(1, (avgLatency - 100) / 9900);

    return Math.max(0, normalized);
  }

  /**
   * Explain routing decision
   */
  private explainDecision(
    winner: ProviderScore,
    features: TaskFeatures
  ): string {
    const reasons: string[] = [];

    if (winner.factors.capability > 0.8) {
      reasons.push('strong capability match');
    }

    if (winner.factors.performance > 0.7) {
      reasons.push('good historical performance');
    }

    if (winner.factors.cost > 0.7 && features.costSensitivity > 0.5) {
      reasons.push('cost-effective');
    }

    if (winner.factors.latency > 0.7 && features.latencySensitivity > 0.5) {
      reasons.push('low latency');
    }

    if (reasons.length === 0) {
      return 'best overall match';
    }

    return reasons.join(', ');
  }

  /**
   * Create fallback decision
   */
  private createFallbackDecision(
    primary: RoutableProvider,
    fallbacks: RoutableProvider[]
  ): RoutingDecision {
    return {
      primary: {
        providerId: primary.name,
        modelId: primary.defaultModel || primary.name,
        score: 0.5,
        factors: {
          capability: 0.5,
          performance: 0.5,
          cost: 0.5,
          latency: 0.5,
          availability: 0.5,
        },
      },
      fallbacks: fallbacks.slice(0, this.config.fallbackCount).map((p) => ({
        providerId: p.name,
        modelId: p.defaultModel || p.name,
        score: 0.5,
        factors: {
          capability: 0.5,
          performance: 0.5,
          cost: 0.5,
          latency: 0.5,
          availability: 0.5,
        },
      })),
      reasoning: 'fallback: no performance data available',
      timestamp: Date.now(),
    };
  }

  /**
   * Clear performance history
   */
  clearHistory(): void {
    this.performanceHistory = [];
  }

  /**
   * Get history size
   */
  getHistorySize(): number {
    return this.performanceHistory.length;
  }
}
