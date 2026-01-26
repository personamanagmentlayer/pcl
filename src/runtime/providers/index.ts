// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - Provider System
// Multi-LLM provider abstraction for AI persona execution
// ═══════════════════════════════════════════════════════════════════════════════

import type { Message } from '../index';
import { CostTracker, CostTrackerRegistry } from './cost-tracker';
import { FallbackChain, FallbackChainBuilder } from './fallback';
import { HealthMonitorRegistry, ProviderHealthMonitor } from './health';
import {
  RateLimiter,
  RateLimiterRegistry,
  type RateLimiterConfig,
} from './rate-limiter';

// ─────────────────────────────────────────────────────────────────────────────
// Provider Capabilities
// ─────────────────────────────────────────────────────────────────────────────

export interface ProviderCapabilities {
  /** Provider supports streaming responses */
  readonly streaming: boolean;

  /** Provider supports tool/function calling */
  readonly toolCalling: boolean;

  /** Provider supports vision/image inputs */
  readonly vision: boolean;

  /** Maximum tokens the provider can generate */
  readonly maxTokens: number;

  /** Maximum context window size in tokens */
  readonly maxContextWindow: number;

  /** Supported models */
  readonly models: readonly string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definition
// ─────────────────────────────────────────────────────────────────────────────

export interface Tool {
  /** Unique tool identifier */
  readonly name: string;

  /** Human-readable description */
  readonly description: string;

  /** JSON schema for tool parameters */
  readonly parameters: {
    readonly type: 'object';
    readonly properties: Record<string, unknown>;
    readonly required?: readonly string[];
  };
}

export interface ToolCall {
  /** Tool that was called */
  readonly name: string;

  /** Arguments passed to the tool */
  readonly arguments: Record<string, unknown>;

  /** Unique ID for this tool call */
  readonly id: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generation Request/Response
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerationRequest {
  /** The main prompt/user message */
  readonly prompt: string;

  /** System prompt (persona instructions) */
  readonly systemPrompt?: string;

  /** Conversation history */
  readonly history?: readonly Message[];

  /** Temperature for randomness (0.0-1.0) */
  readonly temperature?: number;

  /** Maximum tokens to generate */
  readonly maxTokens?: number;

  /** Available tools for function calling */
  readonly tools?: readonly Tool[];

  /** Stop sequences to end generation */
  readonly stopSequences?: readonly string[];

  /** Model to use (provider-specific) */
  readonly model?: string;

  /** Top-p nucleus sampling */
  readonly topP?: number;

  /** Frequency penalty */
  readonly frequencyPenalty?: number;

  /** Presence penalty */
  readonly presencePenalty?: number;
}

export type FinishReason =
  | 'stop'
  | 'length'
  | 'tool_use'
  | 'error'
  | 'cancelled';

export interface TokenUsage {
  /** Tokens in the prompt */
  readonly promptTokens: number;

  /** Tokens in the completion */
  readonly completionTokens: number;

  /** Total tokens used */
  readonly totalTokens: number;
}

export interface GenerationResponse {
  /** Generated content */
  readonly content: string;

  /** Why generation finished */
  readonly finishReason: FinishReason;

  /** Token usage statistics */
  readonly usage: TokenUsage;

  /** Tool calls requested by the model */
  readonly toolCalls?: readonly ToolCall[];

  /** Provider-specific metadata */
  readonly metadata?: Record<string, unknown>;
}

export interface GenerationChunk {
  /** Content delta for this chunk */
  readonly content: string;

  /** Whether this is the final chunk */
  readonly done: boolean;

  /** Finish reason if done */
  readonly finishReason?: FinishReason;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Provider Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface AIProvider {
  /** Provider name (e.g., 'anthropic', 'openai', 'mock') */
  readonly name: string;

  /** Provider capabilities */
  readonly capabilities: ProviderCapabilities;

  /**
   * Generate a complete response
   */
  generateResponse(request: GenerationRequest): Promise<GenerationResponse>;

  /**
   * Stream response chunks as they're generated
   */
  streamResponse(request: GenerationRequest): AsyncIterable<GenerationChunk>;

  /**
   * Count tokens in a string (approximate)
   */
  countTokens(text: string): number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider Registry
// ─────────────────────────────────────────────────────────────────────────────

export class ProviderRegistry {
  private readonly providers = new Map<string, AIProvider>();
  private defaultProvider: string | null = null;

  // Registry enhancements
  private readonly healthMonitors = new HealthMonitorRegistry();
  private readonly rateLimiters = new RateLimiterRegistry();
  private readonly costTrackers = new CostTrackerRegistry();

  /**
   * Register a provider with automatic health monitoring and rate limiting
   */
  register(
    provider: AIProvider,
    config?: { rateLimiter?: Partial<RateLimiterConfig> }
  ): void {
    // If provider already exists, clean up old resources
    if (this.providers.has(provider.name)) {
      this.healthMonitors.unregister(provider.name);
      this.rateLimiters.unregister(provider.name);
    }

    this.providers.set(provider.name, provider);

    // Set first provider as default
    this.defaultProvider ??= provider.name;

    // Automatically create health monitor
    this.healthMonitors.register(provider.name, provider);

    // Automatically create rate limiter with new config
    this.rateLimiters.register(provider.name, config?.rateLimiter);

    // Automatically create cost tracker (reuse if exists)
    this.costTrackers.getOrCreate(provider.name);
  }

  /**
   * Unregister a provider and clean up resources
   */
  unregister(name: string): boolean {
    const result = this.providers.delete(name);

    // Clear default if it was the unregistered provider
    if (this.defaultProvider === name) {
      this.defaultProvider = this.providers.keys().next().value || null;
    }

    // Clean up health monitor
    this.healthMonitors.unregister(name);

    return result;
  }

  /**
   * Get a provider by name
   */
  get(name: string): AIProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get the default provider
   */
  getDefault(): AIProvider {
    if (
      this.defaultProvider === null ||
      !this.providers.has(this.defaultProvider)
    ) {
      throw new Error('No default provider available');
    }

    return this.providers.get(this.defaultProvider)!;
  }

  /**
   * Set the default provider
   */
  setDefault(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider '${name}' not registered`);
    }

    this.defaultProvider = name;
  }

  /**
   * Get all registered provider names
   */
  list(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is registered
   */
  has(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Get number of registered providers
   */
  get size(): number {
    return this.providers.size;
  }

  /**
   * Clear all providers and reset all registries
   */
  clear(): void {
    this.providers.clear();
    this.defaultProvider = null;

    // Clear all enhancement registries
    this.healthMonitors.clear();
    this.rateLimiters.clear();
    this.costTrackers.clear();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Health Monitoring
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Get health monitor for a provider
   */
  getHealthMonitor(name: string): ProviderHealthMonitor | undefined {
    return this.healthMonitors.get(name);
  }

  /**
   * Check if a provider is healthy and available
   */
  isProviderHealthy(name: string): boolean {
    const monitor = this.healthMonitors.get(name);
    return monitor?.isAvailable() ?? false;
  }

  /**
   * Get health status for all providers
   */
  getHealthStatus() {
    return this.healthMonitors.getStatus();
  }

  /**
   * Start health monitoring for all providers
   */
  startHealthMonitoring(intervalMs = 300_000): void {
    this.healthMonitors.startMonitoring(intervalMs);
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    this.healthMonitors.stopMonitoring();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Rate Limiting
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Get rate limiter for a provider
   */
  getRateLimiter(name: string): RateLimiter | undefined {
    return this.rateLimiters.get(name);
  }

  /**
   * Get rate limit statistics for a provider
   */
  getRateLimitStats(name: string) {
    const limiter = this.rateLimiters.get(name);
    return limiter?.getStats();
  }

  /**
   * Get rate limit statistics for all providers
   */
  getAllRateLimitStats() {
    return this.rateLimiters.getStats();
  }

  /**
   * Reset rate limiter for a provider
   */
  resetRateLimiter(name: string): void {
    const limiter = this.rateLimiters.get(name);
    limiter?.reset();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Cost Tracking
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Get cost tracker for a provider
   */
  getCostTracker(name: string): CostTracker | undefined {
    return this.costTrackers.get(name);
  }

  /**
   * Get global cost tracker
   */
  getGlobalCostTracker(): CostTracker {
    return this.costTrackers.getGlobal();
  }

  /**
   * Get cost statistics for a provider
   */
  getProviderCost(name: string): number {
    const tracker = this.costTrackers.get(name);
    return tracker?.getTotalCost() ?? 0;
  }

  /**
   * Get aggregated cost statistics
   */
  getCostStats() {
    return this.costTrackers.getAggregatedStats();
  }

  /**
   * Reset cost tracking for all providers
   */
  resetCostTracking(): void {
    this.costTrackers.resetAll();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Fallback Chains
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Create a fallback chain builder
   */
  createFallbackChain(): FallbackChainBuilder {
    return new FallbackChainBuilder();
  }

  /**
   * Build a fallback chain with health-aware provider selection
   */
  buildFallbackChain(builder: FallbackChainBuilder): FallbackChain {
    return builder.build(this.providers, this.healthMonitors.getMonitorsMap());
  }

  /**
   * Create a simple sequential fallback chain
   */
  createSequentialFallback(...providerNames: string[]): FallbackChain {
    return this.createFallbackChain()
      .withProviders(...providerNames)
      .withStrategy('sequential')
      .build(this.providers, this.healthMonitors.getMonitorsMap());
  }

  /**
   * Create a health-based fallback chain (tries healthiest providers first)
   */
  createHealthBasedFallback(...providerNames: string[]): FallbackChain {
    return this.createFallbackChain()
      .withProviders(...providerNames)
      .withStrategy('health-based')
      .build(this.providers, this.healthMonitors.getMonitorsMap());
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Enhanced Provider Operations
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Generate response with rate limiting and cost tracking
   */
  async generateWithTracking(
    providerName: string,
    request: GenerationRequest
  ): Promise<GenerationResponse> {
    const provider = this.get(providerName);
    if (!provider) {
      throw new Error(`Provider '${providerName}' not found`);
    }

    // Check health
    if (!this.isProviderHealthy(providerName)) {
      throw new Error(`Provider '${providerName}' is unhealthy`);
    }

    // Rate limiting
    const rateLimiter = this.getRateLimiter(providerName);
    if (rateLimiter) {
      await rateLimiter.acquire();
    }

    try {
      // Generate response
      const response = await provider.generateResponse(request);

      // Track cost
      const costTracker = this.getCostTracker(providerName);
      const globalTracker = this.getGlobalCostTracker();
      const model = request.model || 'default';

      if (costTracker) {
        costTracker.record(providerName, model, response.usage);
      }
      globalTracker.record(providerName, model, response.usage);

      return response;
    } catch (error) {
      // Record health failure
      const monitor = this.getHealthMonitor(providerName);
      monitor?.recordFailure(error as Error);

      throw error;
    }
  }

  /**
   * Get available (healthy) providers
   */
  getAvailableProviders(): string[] {
    return this.list().filter((name) => this.isProviderHealthy(name));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Registry Instance
// ─────────────────────────────────────────────────────────────────────────────

export const providers = new ProviderRegistry();

// ─────────────────────────────────────────────────────────────────────────────
// Provider Implementations
// ─────────────────────────────────────────────────────────────────────────────

// Legacy providers (kept for backwards compatibility)
export { MockProvider } from './mock';
export type { MockProviderConfig } from './mock';

// DEPRECATED: Old provider implementations
// Use the new integrated providers instead (see integrated-providers.ts)
export { AnthropicProvider } from './anthropic';
export { AzureOpenAIProvider } from './azure';
export { BedrockProvider } from './bedrock';
export { DeepSeekProvider } from './deepseek';
export { GeminiProvider } from './gemini';
export { OllamaProvider } from './ollama';
export { OpenAIProvider } from './openai';

export type { AnthropicProviderConfig } from './anthropic';
export type { AzureOpenAIProviderConfig } from './azure';
export type { BedrockProviderConfig } from './bedrock';
export type { DeepSeekProviderConfig } from './deepseek';
export type { GeminiProviderConfig } from './gemini';
export type { OllamaProviderConfig } from './ollama';
export type { OpenAIProviderConfig } from './openai';

// ─────────────────────────────────────────────────────────────────────────────
// New Integrated Provider System (8 Providers)
// ─────────────────────────────────────────────────────────────────────────────

export {
  getDefaultProvider,
  getProvider as getRuntimeProvider,
  listProviders as listRuntimeProviders,
  registerAllProviders,
  registerAnthropicProvider,
  registerCohereProvider,
  registerDeepSeekProvider,
  registerGoogleProvider,
  registerGroqProvider,
  registerMistralProvider,
  registerOllamaProvider,
  registerOpenAIProvider,
  setDefaultProvider,
  type RuntimeProviderConfig,
} from './integrated-providers';
export { createProviderAdapter } from './provider-adapter';

// ─────────────────────────────────────────────────────────────────────────────
// Registry Enhancements
// ─────────────────────────────────────────────────────────────────────────────

// Health Monitoring
export {
  HealthMonitorRegistry,
  ProviderHealthMonitor,
  type HealthCheckResult,
  type HealthStatus,
} from './health';

// Fallback Chains
export {
  FallbackChain,
  FallbackChainBuilder,
  type FallbackConfig,
  type FallbackResult,
  type FallbackStrategy,
} from './fallback';

// Rate Limiting
export {
  RateLimiter,
  RateLimiterRegistry,
  type RateLimiterConfig,
} from './rate-limiter';

// Cost Tracking
export {
  CostCalculator,
  CostTracker,
  CostTrackerRegistry,
  KNOWN_MODEL_PRICING,
  type ModelPricing,
  type UsageRecord,
} from './cost-tracker';
