/**
 * Provider Fallback Chain System
 *
 * Automatic failover between providers for reliability
 */

import type {
  AIProvider,
  GenerationRequest,
  GenerationResponse,
  GenerationChunk,
} from './index';
import type { ProviderHealthMonitor } from './health';

// ─────────────────────────────────────────────────────────────────────────────
// Fallback Strategy
// ─────────────────────────────────────────────────────────────────────────────

export type FallbackStrategy = 'sequential' | 'fastest' | 'health-based';

export interface FallbackConfig {
  /** Strategy for selecting fallback provider */
  readonly strategy: FallbackStrategy;

  /** Maximum retry attempts per provider */
  readonly maxRetries: number;

  /** Timeout for each provider attempt (ms) */
  readonly timeout: number;

  /** Whether to skip unhealthy providers */
  readonly skipUnhealthy: boolean;
}

const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
  strategy: 'sequential',
  maxRetries: 1,
  timeout: 30000, // 30 seconds
  skipUnhealthy: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// Fallback Result
// ─────────────────────────────────────────────────────────────────────────────

export interface FallbackResult<T> {
  readonly result: T;
  readonly provider: string;
  readonly attemptCount: number;
  readonly errors: Array<{ provider: string; error: Error }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback Chain
// ─────────────────────────────────────────────────────────────────────────────

export class FallbackChain {
  private readonly providers: Map<string, AIProvider>;
  private readonly healthMonitors: Map<string, ProviderHealthMonitor>;
  private readonly providerOrder: string[];
  private readonly config: FallbackConfig;

  constructor(
    providers: Map<string, AIProvider>,
    providerOrder: string[],
    healthMonitors: Map<string, ProviderHealthMonitor> = new Map(),
    config: Partial<FallbackConfig> = {}
  ) {
    this.providers = providers;
    this.providerOrder = providerOrder;
    this.healthMonitors = healthMonitors;
    this.config = { ...DEFAULT_FALLBACK_CONFIG, ...config };

    // Validate all providers exist
    for (const name of providerOrder) {
      if (!providers.has(name)) {
        throw new Error(`Provider '${name}' not found in registry`);
      }
    }
  }

  /**
   * Generate response with automatic fallback
   */
  async generateResponse(
    request: GenerationRequest
  ): Promise<FallbackResult<GenerationResponse>> {
    const errors: Array<{ provider: string; error: Error }> = [];
    const availableProviders = this.getAvailableProviders();

    if (availableProviders.length === 0) {
      throw new Error('No available providers in fallback chain');
    }

    for (let i = 0; i < availableProviders.length; i++) {
      const providerName = availableProviders[i];
      const provider = this.providers.get(providerName)!;

      try {
        const result = await this.attemptWithTimeout(
          () => provider.generateResponse(request),
          this.config.timeout
        );

        return {
          result,
          provider: providerName,
          attemptCount: i + 1,
          errors,
        };
      } catch (error) {
        errors.push({
          provider: providerName,
          error: error instanceof Error ? error : new Error(String(error)),
        });

        // Continue to next provider in chain
      }
    }

    // All providers failed
    throw new Error(
      `All providers in fallback chain failed. Errors: ${errors
        .map((e) => `${e.provider}: ${e.error.message}`)
        .join('; ')}`
    );
  }

  /**
   * Stream response with automatic fallback
   */
  async *streamResponse(
    request: GenerationRequest
  ): AsyncGenerator<FallbackResult<GenerationChunk>, void, unknown> {
    const errors: Array<{ provider: string; error: Error }> = [];
    const availableProviders = this.getAvailableProviders();

    if (availableProviders.length === 0) {
      throw new Error('No available providers in fallback chain');
    }

    for (let i = 0; i < availableProviders.length; i++) {
      const providerName = availableProviders[i];
      const provider = this.providers.get(providerName)!;

      try {
        const stream = provider.streamResponse(request);
        let chunkCount = 0;

        for await (const chunk of stream) {
          chunkCount++;
          yield {
            result: chunk,
            provider: providerName,
            attemptCount: i + 1,
            errors,
          };
        }

        // Successfully streamed response
        return;
      } catch (error) {
        errors.push({
          provider: providerName,
          error: error instanceof Error ? error : new Error(String(error)),
        });

        // Continue to next provider in chain
      }
    }

    // All providers failed
    throw new Error(
      `All providers in fallback chain failed. Errors: ${errors
        .map((e) => `${e.provider}: ${e.error.message}`)
        .join('; ')}`
    );
  }

  /**
   * Get ordered list of providers
   */
  getProviderOrder(): readonly string[] {
    return this.providerOrder;
  }

  /**
   * Get available providers (filtered by health)
   */
  private getAvailableProviders(): string[] {
    if (!this.config.skipUnhealthy) {
      return [...this.providerOrder];
    }

    return this.providerOrder.filter((name) => {
      const monitor = this.healthMonitors.get(name);
      return !monitor || monitor.isAvailable();
    });
  }

  /**
   * Execute with timeout
   */
  private async attemptWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      ),
    ]);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback Chain Builder
// ─────────────────────────────────────────────────────────────────────────────

export class FallbackChainBuilder {
  private providerOrder: string[] = [];
  private config: {
    strategy?: FallbackStrategy;
    maxRetries?: number;
    timeout?: number;
    skipUnhealthy?: boolean;
  } = {};

  /**
   * Add providers in order
   */
  withProviders(...providers: string[]): this {
    this.providerOrder = providers;
    return this;
  }

  /**
   * Set fallback strategy
   */
  withStrategy(strategy: FallbackStrategy): this {
    this.config.strategy = strategy;
    return this;
  }

  /**
   * Set maximum retries per provider
   */
  withMaxRetries(retries: number): this {
    this.config.maxRetries = retries;
    return this;
  }

  /**
   * Set timeout per provider
   */
  withTimeout(timeout: number): this {
    this.config.timeout = timeout;
    return this;
  }

  /**
   * Set whether to skip unhealthy providers
   */
  withSkipUnhealthy(skip: boolean): this {
    this.config.skipUnhealthy = skip;
    return this;
  }

  /**
   * Build the fallback chain
   */
  build(
    providers: Map<string, AIProvider>,
    healthMonitors?: Map<string, ProviderHealthMonitor>
  ): FallbackChain {
    if (this.providerOrder.length === 0) {
      throw new Error('Fallback chain must have at least one provider');
    }

    return new FallbackChain(
      providers,
      this.providerOrder,
      healthMonitors,
      this.config
    );
  }
}
