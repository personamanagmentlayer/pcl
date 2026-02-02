/**
 * Provider Rate Limiter
 *
 * Token bucket algorithm for controlling request rates per provider
 */

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiter Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface RateLimiterConfig {
  /** Maximum requests per time window */
  readonly maxRequests: number;

  /** Time window in milliseconds */
  readonly windowMs: number;

  /** Maximum tokens to generate per time window */
  readonly maxTokens?: number;

  /** Whether to queue requests when limit is reached */
  readonly queueRequests: boolean;

  /** Maximum queue size (0 = unlimited) */
  readonly maxQueueSize: number;
}

const DEFAULT_RATE_LIMITER_CONFIG: RateLimiterConfig = {
  maxRequests: 60,
  windowMs: 60000, // 1 minute
  queueRequests: true,
  maxQueueSize: 100,
};

// ─────────────────────────────────────────────────────────────────────────────
// Request Info
// ─────────────────────────────────────────────────────────────────────────────

interface RequestInfo {
  readonly timestamp: number;
  readonly tokens?: number;
}

interface QueuedRequest {
  readonly resolve: () => void;
  readonly reject: (error: Error) => void;
  readonly timestamp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiter (Token Bucket Algorithm)
// ─────────────────────────────────────────────────────────────────────────────

export class RateLimiter {
  private readonly config: RateLimiterConfig;
  private readonly requests: RequestInfo[] = [];
  private readonly queue: QueuedRequest[] = [];
  private tokenCount = 0;
  private processIntervalId?: NodeJS.Timeout;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = { ...DEFAULT_RATE_LIMITER_CONFIG, ...config };

    // Start processing queue
    if (this.config.queueRequests) {
      this.startQueueProcessor();
    }
  }

  /**
   * Acquire permission to make a request
   */
  async acquire(tokens?: number): Promise<void> {
    const now = Date.now();

    // Clean old requests outside time window
    this.cleanOldRequests(now);

    // Check if we can proceed immediately
    if (this.canProceed(now, tokens)) {
      this.recordRequest(now, tokens);
      return;
    }

    // Check if queueing is enabled
    if (!this.config.queueRequests) {
      throw new Error(
        `Rate limit exceeded: ${this.requests.length}/${this.config.maxRequests} requests in ${this.config.windowMs}ms window`
      );
    }

    // Check queue size limit
    if (
      this.config.maxQueueSize > 0 &&
      this.queue.length >= this.config.maxQueueSize
    ) {
      throw new Error(
        `Rate limiter queue full (${this.config.maxQueueSize} requests)`
      );
    }

    // Queue the request
    return new Promise<void>((resolve, reject) => {
      this.queue.push({
        resolve,
        reject,
        timestamp: now,
      });
    });
  }

  /**
   * Try to acquire without waiting
   */
  tryAcquire(tokens?: number): boolean {
    const now = Date.now();

    this.cleanOldRequests(now);

    if (this.canProceed(now, tokens)) {
      this.recordRequest(now, tokens);
      return true;
    }

    return false;
  }

  /**
   * Get current usage statistics
   */
  getStats() {
    const now = Date.now();
    this.cleanOldRequests(now);

    return {
      requestsInWindow: this.requests.length,
      maxRequests: this.config.maxRequests,
      tokensUsed: this.tokenCount,
      maxTokens: this.config.maxTokens,
      queueSize: this.queue.length,
      utilizationPercent:
        (this.requests.length / this.config.maxRequests) * 100,
    };
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.requests.length = 0;
    this.tokenCount = 0;

    // Reject all queued requests
    for (const queued of this.queue) {
      queued.reject(new Error('Rate limiter reset'));
    }
    this.queue.length = 0;
  }

  /**
   * Stop the rate limiter
   */
  stop(): void {
    if (this.processIntervalId) {
      clearInterval(this.processIntervalId);
      this.processIntervalId = undefined;
    }

    // Reject all queued requests
    for (const queued of this.queue) {
      queued.reject(new Error('Rate limiter stopped'));
    }
    this.queue.length = 0;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ───────────────────────────────────────────────────────────────────────────

  private canProceed(now: number, tokens?: number): boolean {
    // Check request count limit
    if (this.requests.length >= this.config.maxRequests) {
      return false;
    }

    // Check token limit if specified
    if (this.config.maxTokens && tokens) {
      if (this.tokenCount + tokens > this.config.maxTokens) {
        return false;
      }
    }

    return true;
  }

  private recordRequest(now: number, tokens?: number): void {
    this.requests.push({
      timestamp: now,
      tokens,
    });

    if (tokens) {
      this.tokenCount += tokens;
    }
  }

  private cleanOldRequests(now: number): void {
    const cutoff = now - this.config.windowMs;

    // Remove requests outside time window
    let i = 0;
    while (i < this.requests.length && this.requests[i].timestamp < cutoff) {
      const removed = this.requests.shift();
      if (removed?.tokens) {
        this.tokenCount -= removed.tokens;
      }
      i++;
    }
  }

  private startQueueProcessor(): void {
    // Process queue every 100ms
    this.processIntervalId = setInterval(() => {
      this.processQueue();
    }, 100);
  }

  private processQueue(): void {
    const now = Date.now();

    this.cleanOldRequests(now);

    // Process as many queued requests as possible
    while (this.queue.length > 0) {
      if (!this.canProceed(now)) {
        break;
      }

      const queued = this.queue.shift();
      if (queued) {
        this.recordRequest(now);
        queued.resolve();
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiter Registry
// ─────────────────────────────────────────────────────────────────────────────

export class RateLimiterRegistry {
  private readonly limiters = new Map<string, RateLimiter>();

  /**
   * Register a rate limiter for a provider
   */
  register(
    providerName: string,
    config?: Partial<RateLimiterConfig>
  ): RateLimiter {
    if (this.limiters.has(providerName)) {
      throw new Error(
        `Rate limiter already exists for provider: ${providerName}`
      );
    }

    const limiter = new RateLimiter(config);
    this.limiters.set(providerName, limiter);

    return limiter;
  }

  /**
   * Unregister a rate limiter
   */
  unregister(providerName: string): boolean {
    const limiter = this.limiters.get(providerName);

    if (limiter) {
      limiter.stop();
      return this.limiters.delete(providerName);
    }

    return false;
  }

  /**
   * Get rate limiter for a provider
   */
  get(providerName: string): RateLimiter | undefined {
    return this.limiters.get(providerName);
  }

  /**
   * Get or create rate limiter
   */
  getOrCreate(
    providerName: string,
    config?: Partial<RateLimiterConfig>
  ): RateLimiter {
    let limiter = this.limiters.get(providerName);

    if (!limiter) {
      limiter = new RateLimiter(config);
      this.limiters.set(providerName, limiter);
    }

    return limiter;
  }

  /**
   * Get all rate limiter stats
   */
  getAllStats(): Map<string, ReturnType<RateLimiter['getStats']>> {
    const stats = new Map<string, ReturnType<RateLimiter['getStats']>>();

    for (const [name, limiter] of this.limiters.entries()) {
      stats.set(name, limiter.getStats());
    }

    return stats;
  }

  /**
   * Alias for getAllStats()
   */
  getStats(): Map<string, ReturnType<RateLimiter['getStats']>> {
    return this.getAllStats();
  }

  /**
   * Reset all rate limiters
   */
  resetAll(): void {
    for (const limiter of this.limiters.values()) {
      limiter.reset();
    }
  }

  /**
   * Stop all rate limiters
   */
  stopAll(): void {
    for (const limiter of this.limiters.values()) {
      limiter.stop();
    }
  }

  /**
   * Clear all rate limiters
   */
  clear(): void {
    this.stopAll();
    this.limiters.clear();
  }

  /**
   * Get number of rate limiters
   */
  get size(): number {
    return this.limiters.size;
  }
}
