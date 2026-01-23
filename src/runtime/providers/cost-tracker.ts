/**
 * Provider Cost Tracking
 *
 * Track and calculate costs for provider usage
 */

import type { TokenUsage } from './index';

// ─────────────────────────────────────────────────────────────────────────────
// Pricing Models
// ─────────────────────────────────────────────────────────────────────────────

export interface ModelPricing {
  /** Cost per 1M input tokens (USD) */
  readonly inputCostPer1M: number;

  /** Cost per 1M output tokens (USD) */
  readonly outputCostPer1M: number;

  /** Model identifier */
  readonly modelId: string;

  /** Provider name */
  readonly provider: string;
}

// Common model pricing (as of 2026-01-22)
export const KNOWN_MODEL_PRICING: Record<string, ModelPricing> = {
  // Anthropic Claude
  'claude-3-5-sonnet-20241022': {
    modelId: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
  },
  'claude-3-opus-20240229': {
    modelId: 'claude-3-opus-20240229',
    provider: 'anthropic',
    inputCostPer1M: 15.0,
    outputCostPer1M: 75.0,
  },
  'claude-3-haiku-20240307': {
    modelId: 'claude-3-haiku-20240307',
    provider: 'anthropic',
    inputCostPer1M: 0.25,
    outputCostPer1M: 1.25,
  },

  // OpenAI GPT
  'gpt-4-turbo': {
    modelId: 'gpt-4-turbo',
    provider: 'openai',
    inputCostPer1M: 10.0,
    outputCostPer1M: 30.0,
  },
  'gpt-4': {
    modelId: 'gpt-4',
    provider: 'openai',
    inputCostPer1M: 30.0,
    outputCostPer1M: 60.0,
  },
  'gpt-3.5-turbo': {
    modelId: 'gpt-3.5-turbo',
    provider: 'openai',
    inputCostPer1M: 0.5,
    outputCostPer1M: 1.5,
  },

  // Google Gemini
  'gemini-1.5-pro': {
    modelId: 'gemini-1.5-pro',
    provider: 'google',
    inputCostPer1M: 3.5,
    outputCostPer1M: 10.5,
  },
  'gemini-1.5-flash': {
    modelId: 'gemini-1.5-flash',
    provider: 'google',
    inputCostPer1M: 0.075,
    outputCostPer1M: 0.3,
  },

  // DeepSeek
  'deepseek-chat': {
    modelId: 'deepseek-chat',
    provider: 'deepseek',
    inputCostPer1M: 0.14,
    outputCostPer1M: 0.28,
  },
  'deepseek-coder': {
    modelId: 'deepseek-coder',
    provider: 'deepseek',
    inputCostPer1M: 0.14,
    outputCostPer1M: 0.28,
  },

  // Ollama (local - free)
  'ollama': {
    modelId: 'ollama',
    provider: 'ollama',
    inputCostPer1M: 0,
    outputCostPer1M: 0,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Usage Record
// ─────────────────────────────────────────────────────────────────────────────

export interface UsageRecord {
  readonly timestamp: Date;
  readonly provider: string;
  readonly model: string;
  readonly usage: TokenUsage;
  readonly cost: number;
  readonly metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cost Calculator
// ─────────────────────────────────────────────────────────────────────────────

export class CostCalculator {
  private readonly pricing: Map<string, ModelPricing> = new Map();

  constructor(knownPricing: Record<string, ModelPricing> = KNOWN_MODEL_PRICING) {
    // Load known pricing
    for (const [key, value] of Object.entries(knownPricing)) {
      this.pricing.set(key, value);
    }
  }

  /**
   * Calculate cost for token usage
   */
  calculateCost(usage: TokenUsage, modelId: string): number {
    const pricing = this.pricing.get(modelId);

    if (!pricing) {
      // Unknown model - return 0 or estimate
      return 0;
    }

    const inputCost = (usage.promptTokens / 1_000_000) * pricing.inputCostPer1M;
    const outputCost = (usage.completionTokens / 1_000_000) * pricing.outputCostPer1M;

    return inputCost + outputCost;
  }

  /**
   * Add or update model pricing
   */
  setPricing(modelId: string, pricing: ModelPricing): void {
    this.pricing.set(modelId, pricing);
  }

  /**
   * Get pricing for a model
   */
  getPricing(modelId: string): ModelPricing | undefined {
    return this.pricing.get(modelId);
  }

  /**
   * Get all known pricing
   */
  getAllPricing(): Map<string, ModelPricing> {
    return new Map(this.pricing);
  }

  /**
   * Compare costs between models for given usage
   */
  compareCosts(usage: TokenUsage, modelIds: string[]): Map<string, number> {
    const costs = new Map<string, number>();

    for (const modelId of modelIds) {
      costs.set(modelId, this.calculateCost(usage, modelId));
    }

    return costs;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cost Tracker
// ─────────────────────────────────────────────────────────────────────────────

export class CostTracker {
  private readonly records: UsageRecord[] = [];
  private readonly calculator: CostCalculator;
  private totalCost = 0;

  constructor(calculator?: CostCalculator) {
    this.calculator = calculator || new CostCalculator();
  }

  /**
   * Record a usage event
   */
  record(
    provider: string,
    model: string,
    usage: TokenUsage,
    metadata?: Record<string, unknown>
  ): UsageRecord {
    const cost = this.calculator.calculateCost(usage, model);

    const record: UsageRecord = {
      timestamp: new Date(),
      provider,
      model,
      usage,
      cost,
      metadata,
    };

    this.records.push(record);
    this.totalCost += cost;

    return record;
  }

  /**
   * Get total cost
   */
  getTotalCost(): number {
    return this.totalCost;
  }

  /**
   * Get cost for a specific provider
   */
  getProviderCost(provider: string): number {
    return this.records
      .filter((r) => r.provider === provider)
      .reduce((sum, r) => sum + r.cost, 0);
  }

  /**
   * Get cost for a specific model
   */
  getModelCost(model: string): number {
    return this.records
      .filter((r) => r.model === model)
      .reduce((sum, r) => sum + r.cost, 0);
  }

  /**
   * Get cost for a time period
   */
  getCostForPeriod(start: Date, end: Date): number {
    return this.records
      .filter((r) => r.timestamp >= start && r.timestamp <= end)
      .reduce((sum, r) => sum + r.cost, 0);
  }

  /**
   * Get all usage records
   */
  getRecords(): readonly UsageRecord[] {
    return this.records;
  }

  /**
   * Get usage statistics
   */
  getStats() {
    const totalTokens = this.records.reduce(
      (sum, r) => sum + r.usage.totalTokens,
      0
    );

    const totalPromptTokens = this.records.reduce(
      (sum, r) => sum + r.usage.promptTokens,
      0
    );

    const totalCompletionTokens = this.records.reduce(
      (sum, r) => sum + r.usage.completionTokens,
      0
    );

    // Group by provider
    const byProvider = new Map<string, { cost: number; tokens: number }>();
    for (const record of this.records) {
      const existing = byProvider.get(record.provider) || { cost: 0, tokens: 0 };
      byProvider.set(record.provider, {
        cost: existing.cost + record.cost,
        tokens: existing.tokens + record.usage.totalTokens,
      });
    }

    // Group by model
    const byModel = new Map<string, { cost: number; tokens: number }>();
    for (const record of this.records) {
      const existing = byModel.get(record.model) || { cost: 0, tokens: 0 };
      byModel.set(record.model, {
        cost: existing.cost + record.cost,
        tokens: existing.tokens + record.usage.totalTokens,
      });
    }

    return {
      totalCost: this.totalCost,
      totalTokens,
      totalPromptTokens,
      totalCompletionTokens,
      requestCount: this.records.length,
      byProvider: Object.fromEntries(byProvider),
      byModel: Object.fromEntries(byModel),
      averageCostPerRequest: this.totalCost / this.records.length || 0,
      averageTokensPerRequest: totalTokens / this.records.length || 0,
    };
  }

  /**
   * Reset the tracker
   */
  reset(): void {
    this.records.length = 0;
    this.totalCost = 0;
  }

  /**
   * Export records as JSON
   */
  exportJSON(): string {
    return JSON.stringify(
      {
        records: this.records,
        stats: this.getStats(),
      },
      null,
      2
    );
  }

  /**
   * Export records as CSV
   */
  exportCSV(): string {
    const headers = [
      'timestamp',
      'provider',
      'model',
      'promptTokens',
      'completionTokens',
      'totalTokens',
      'cost',
    ];

    const rows = this.records.map((r) => [
      r.timestamp.toISOString(),
      r.provider,
      r.model,
      r.usage.promptTokens,
      r.usage.completionTokens,
      r.usage.totalTokens,
      r.cost.toFixed(6),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cost Tracker Registry
// ─────────────────────────────────────────────────────────────────────────────

export class CostTrackerRegistry {
  private readonly trackers = new Map<string, CostTracker>();
  private readonly globalTracker: CostTracker;

  constructor() {
    this.globalTracker = new CostTracker();
  }

  /**
   * Get global cost tracker
   */
  getGlobal(): CostTracker {
    return this.globalTracker;
  }

  /**
   * Register a cost tracker for a provider
   */
  register(providerName: string): CostTracker {
    if (this.trackers.has(providerName)) {
      throw new Error(`Cost tracker already exists for provider: ${providerName}`);
    }

    const tracker = new CostTracker();
    this.trackers.set(providerName, tracker);

    return tracker;
  }

  /**
   * Get cost tracker for a provider
   */
  get(providerName: string): CostTracker | undefined {
    return this.trackers.get(providerName);
  }

  /**
   * Get or create cost tracker
   */
  getOrCreate(providerName: string): CostTracker {
    let tracker = this.trackers.get(providerName);

    if (!tracker) {
      tracker = new CostTracker();
      this.trackers.set(providerName, tracker);
    }

    return tracker;
  }

  /**
   * Get aggregated statistics across all trackers
   */
  getAggregatedStats() {
    const stats = this.globalTracker.getStats();
    const providerStats = new Map<string, ReturnType<CostTracker['getStats']>>();

    for (const [name, tracker] of this.trackers.entries()) {
      providerStats.set(name, tracker.getStats());
    }

    return {
      global: stats,
      byProvider: Object.fromEntries(providerStats),
    };
  }

  /**
   * Reset all cost trackers
   */
  resetAll(): void {
    this.globalTracker.reset();

    for (const tracker of this.trackers.values()) {
      tracker.reset();
    }
  }

  /**
   * Clear all cost trackers
   */
  clear(): void {
    this.trackers.clear();
  }
}
