/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Context Prioritization
 * Phase 2.3: Context & Memory
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  ContextMessage,
  PrioritizationConfig,
  PrioritizationRule,
} from '../memory/types.js';
import { DEFAULT_PRIORITIZATION_CONFIG } from '../memory/types.js';

/**
 * Context prioritization to focus on relevant information
 * Computes importance scores for messages based on multiple factors
 */
export class ContextPrioritizer {
  private readonly config: PrioritizationConfig;

  constructor(config: Partial<PrioritizationConfig> = {}) {
    this.config = {
      ...DEFAULT_PRIORITIZATION_CONFIG,
      ...config,
    } as PrioritizationConfig;
  }

  /**
   * Compute importance score for a message
   * Returns updated message with computed importance
   */
  computeImportance(message: ContextMessage): ContextMessage {
    if (!this.config.enabled) {
      return message;
    }

    let baseImportance = 0;

    // Recency factor (0-1)
    const recency = this.computeRecency(message);
    baseImportance += recency * this.config.recencyWeight;

    // Role factor (0-1)
    const roleScore = this.computeRoleScore(message);
    baseImportance += roleScore * this.config.roleWeight;

    // Length factor (0-1)
    const lengthScore = this.computeLengthScore(message);
    baseImportance += lengthScore * this.config.lengthWeight;

    // Keyword factor (0-1)
    const keywordScore = this.computeKeywordScore(message);
    baseImportance += keywordScore * this.config.keywordWeight;

    // Normalize to 0-1
    const normalizedImportance = Math.min(1, Math.max(0, baseImportance));

    // Apply rules
    const ruleImportance = this.applyRules(message, normalizedImportance);

    return {
      ...message,
      importance: ruleImportance,
    };
  }

  /**
   * Compute importance for multiple messages
   */
  computeImportances(messages: ContextMessage[]): ContextMessage[] {
    return messages.map((msg) => this.computeImportance(msg));
  }

  /**
   * Sort messages by importance (descending)
   */
  sortByImportance(messages: ContextMessage[]): ContextMessage[] {
    return [...messages].sort((a, b) => b.importance - a.importance);
  }

  /**
   * Get top N most important messages
   */
  getTopImportant(messages: ContextMessage[], count: number): ContextMessage[] {
    return this.sortByImportance(messages).slice(0, count);
  }

  /**
   * Filter messages by minimum importance
   */
  filterByImportance(
    messages: ContextMessage[],
    minImportance: number
  ): ContextMessage[] {
    return messages.filter((msg) => msg.importance >= minImportance);
  }

  /**
   * Add a prioritization rule
   */
  addRule(rule: PrioritizationRule): void {
    this.config.rules.push(rule);
    // Sort rules by priority (highest first)
    this.config.rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove a rule by name
   */
  removeRule(name: string): boolean {
    const index = this.config.rules.findIndex((r) => r.name === name);
    if (index === -1) return false;

    this.config.rules.splice(index, 1);
    return true;
  }

  /**
   * Get all rules
   */
  getRules(): PrioritizationRule[] {
    return [...this.config.rules];
  }

  /**
   * Add keywords
   */
  addKeywords(keywords: string[]): void {
    for (const keyword of keywords) {
      if (!this.config.keywords.includes(keyword)) {
        this.config.keywords.push(keyword);
      }
    }
  }

  /**
   * Remove keywords
   */
  removeKeywords(keywords: string[]): void {
    this.config.keywords = this.config.keywords.filter(
      (k) => !keywords.includes(k)
    );
  }

  /**
   * Get current keywords
   */
  getKeywords(): string[] {
    return [...this.config.keywords];
  }

  /**
   * Compute recency score (0-1)
   * More recent messages get higher scores
   */
  private computeRecency(message: ContextMessage): number {
    const now = Date.now();
    const age = now - message.timestamp;

    // Exponential decay: score = e^(-age / halfLife)
    // Half-life of 30 minutes
    const halfLife = 30 * 60 * 1000;
    const score = Math.exp(-age / halfLife);

    return Math.min(1, score);
  }

  /**
   * Compute role-based score (0-1)
   * System > User > Assistant
   */
  private computeRoleScore(message: ContextMessage): number {
    switch (message.role) {
      case 'system':
        return 1.0;
      case 'user':
        return 0.7;
      case 'assistant':
        return 0.5;
      default:
        return 0.3;
    }
  }

  /**
   * Compute length-based score (0-1)
   * Longer messages are generally more important (up to a point)
   */
  private computeLengthScore(message: ContextMessage): number {
    const tokens = message.tokenCount;

    // Optimal range: 100-500 tokens
    if (tokens < 50) {
      // Very short: lower importance
      return (tokens / 50) * 0.3;
    } else if (tokens <= 100) {
      // Short: medium-low importance
      return 0.3 + ((tokens - 50) / 50) * 0.2;
    } else if (tokens <= 500) {
      // Optimal range: high importance
      return 0.5 + ((tokens - 100) / 400) * 0.5;
    } else {
      // Very long: diminishing returns
      return 1.0 - Math.min(0.3, (tokens - 500) / 1000);
    }
  }

  /**
   * Compute keyword matching score (0-1)
   */
  private computeKeywordScore(message: ContextMessage): number {
    if (this.config.keywords.length === 0) return 0.5; // Neutral if no keywords

    const content = message.content.toLowerCase();
    let matchCount = 0;

    for (const keyword of this.config.keywords) {
      if (content.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }

    // Normalize by number of keywords
    return Math.min(
      1,
      matchCount / Math.max(1, this.config.keywords.length * 0.5)
    );
  }

  /**
   * Apply prioritization rules
   */
  private applyRules(message: ContextMessage, baseImportance: number): number {
    let importance = baseImportance;

    // Apply rules in priority order (highest first)
    for (const rule of this.config.rules) {
      if (rule.condition(message)) {
        importance *= rule.importanceBoost;
      }
    }

    // Clamp to 0-1
    return Math.min(1, Math.max(0, importance));
  }

  /**
   * Analyze importance distribution
   */
  analyzeImportanceDistribution(messages: ContextMessage[]): {
    min: number;
    max: number;
    avg: number;
    median: number;
    p25: number;
    p75: number;
    p90: number;
  } {
    if (messages.length === 0) {
      return { min: 0, max: 0, avg: 0, median: 0, p25: 0, p75: 0, p90: 0 };
    }

    const importances = messages.map((m) => m.importance).sort((a, b) => a - b);

    const percentile = (p: number) => {
      const index = Math.floor(importances.length * p);
      return importances[Math.min(index, importances.length - 1)];
    };

    return {
      min: importances[0],
      max: importances[importances.length - 1],
      avg: importances.reduce((sum, v) => sum + v, 0) / importances.length,
      median: percentile(0.5),
      p25: percentile(0.25),
      p75: percentile(0.75),
      p90: percentile(0.9),
    };
  }

  /**
   * Rebalance importance scores to use full 0-1 range
   */
  rebalanceImportances(messages: ContextMessage[]): ContextMessage[] {
    if (messages.length === 0) return messages;

    const importances = messages.map((m) => m.importance);
    const min = Math.min(...importances);
    const max = Math.max(...importances);

    if (max === min) return messages; // All same importance

    return messages.map((msg) => ({
      ...msg,
      importance: (msg.importance - min) / (max - min),
    }));
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<PrioritizationConfig>): void {
    Object.assign(this.config, updates);

    // Re-sort rules if they were updated
    if (updates.rules) {
      this.config.rules.sort((a, b) => b.priority - a.priority);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<PrioritizationConfig> {
    return { ...this.config };
  }
}
