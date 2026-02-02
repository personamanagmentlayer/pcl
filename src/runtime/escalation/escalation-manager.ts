/**
 * Escalation manager for adaptive quality improvement
 * Part of Q2 2025 Adaptive Intelligence - Phase 6
 */

import type {
  EscalationConfig,
  EscalationResponse,
  EscalationContext,
  EscalationDecision,
  EscalationRule,
} from './types.js';

/**
 * Manages escalation decisions based on response quality
 */
export class EscalationManager {
  private config: EscalationConfig;
  private retryCount: Map<string, number>;
  private escalationHistory: Array<{
    requestId: string;
    timestamp: number;
    rule: string;
    action: string;
    success: boolean;
  }>;

  constructor(config: EscalationConfig) {
    this.config = config;
    this.retryCount = new Map();
    this.escalationHistory = [];
  }

  /**
   * Check if response should be escalated
   */
  shouldEscalate(
    response: EscalationResponse,
    context: EscalationContext
  ): EscalationDecision {
    if (!this.config.enabled) {
      return { escalate: false };
    }

    // Check global retry limit
    const retries = this.retryCount.get(context.requestId) || 0;
    if (retries >= this.config.globalMaxRetries) {
      return { escalate: false, reason: 'global max retries reached' };
    }

    // Sort rules by priority (higher first)
    const sortedRules = [...this.config.rules].sort(
      (a, b) => (b.priority || 0) - (a.priority || 0)
    );

    // Check each rule
    for (const rule of sortedRules) {
      if (rule.condition(response, context)) {
        // Check rule-specific retry limit
        if (rule.maxRetries !== undefined && retries >= rule.maxRetries) {
          continue; // Skip this rule, max retries reached
        }

        return {
          escalate: true,
          action: rule.action,
          target: rule.target,
          reason: rule.name,
          rule: rule.name,
        };
      }
    }

    return { escalate: false };
  }

  /**
   * Record escalation attempt
   */
  recordEscalation(requestId: string, rule: string, action: string): void {
    const count = this.retryCount.get(requestId) || 0;
    this.retryCount.set(requestId, count + 1);

    this.escalationHistory.push({
      requestId,
      timestamp: Date.now(),
      rule,
      action,
      success: false, // Will be updated later
    });

    // Keep only recent history
    if (this.escalationHistory.length > 1000) {
      this.escalationHistory = this.escalationHistory.slice(-1000);
    }
  }

  /**
   * Record escalation outcome
   */
  recordOutcome(requestId: string, success: boolean): void {
    // Find last escalation for this request
    for (let i = this.escalationHistory.length - 1; i >= 0; i--) {
      if (this.escalationHistory[i].requestId === requestId) {
        this.escalationHistory[i].success = success;
        break;
      }
    }
  }

  /**
   * Reset retry count for a request
   */
  reset(requestId: string): void {
    this.retryCount.delete(requestId);
  }

  /**
   * Get escalation statistics
   */
  getStats(): {
    totalEscalations: number;
    successRate: number;
    byRule: Record<string, { count: number; successRate: number }>;
  } {
    const total = this.escalationHistory.length;

    if (total === 0) {
      return {
        totalEscalations: 0,
        successRate: 0,
        byRule: {},
      };
    }

    const successful = this.escalationHistory.filter((e) => e.success).length;
    const successRate = successful / total;

    // Group by rule
    const byRule: Record<string, { count: number; successRate: number }> = {};

    for (const entry of this.escalationHistory) {
      if (!byRule[entry.rule]) {
        byRule[entry.rule] = { count: 0, successRate: 0 };
      }
      byRule[entry.rule].count++;
    }

    // Compute success rate per rule
    for (const rule of Object.keys(byRule)) {
      const ruleEntries = this.escalationHistory.filter((e) => e.rule === rule);
      const ruleSuccessful = ruleEntries.filter((e) => e.success).length;
      byRule[rule].successRate = ruleSuccessful / ruleEntries.length;
    }

    return {
      totalEscalations: total,
      successRate,
      byRule,
    };
  }

  /**
   * Add custom rule
   */
  addRule(rule: EscalationRule): void {
    this.config.rules.push(rule);
  }

  /**
   * Remove rule by name
   */
  removeRule(name: string): void {
    this.config.rules = this.config.rules.filter((r) => r.name !== name);
  }

  /**
   * Clear all rules
   */
  clearRules(): void {
    this.config.rules = [];
  }

  /**
   * Get current retry count
   */
  getRetryCount(requestId: string): number {
    return this.retryCount.get(requestId) || 0;
  }

  /**
   * Clear retry count
   */
  clearRetryCount(): void {
    this.retryCount.clear();
  }

  /**
   * Clear escalation history
   */
  clearHistory(): void {
    this.escalationHistory = [];
  }
}
