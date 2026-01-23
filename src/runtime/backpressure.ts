/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Backpressure Control
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Flow control mechanisms for async pipelines to prevent overwhelming downstream consumers
 *
 * @packageDocumentation
 * @module @pcl/runtime/backpressure
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BackpressureOptions {
  readonly highWaterMark: number;
  readonly lowWaterMark: number;
  readonly strategy: 'pause' | 'drop' | 'buffer';
  readonly maxBufferSize?: number;
}

export interface BackpressureStats {
  readonly buffered: number;
  readonly dropped: number;
  readonly paused: boolean;
  readonly highWaterMarkReached: number;
  readonly lowWaterMarkReached: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              BACKPRESSURE CONTROLLER
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_OPTIONS: BackpressureOptions = {
  highWaterMark: 100,
  lowWaterMark: 25,
  strategy: 'buffer',
  maxBufferSize: 1000,
};

/**
 * Backpressure controller for async streams
 */
export class BackpressureController<T> {
  private readonly options: BackpressureOptions;
  private buffer: T[] = [];
  private paused = false;
  private stats = {
    dropped: 0,
    highWaterMarkReached: 0,
    lowWaterMarkReached: 0,
  };
  private pauseResolvers: Array<() => void> = [];

  constructor(options: Partial<BackpressureOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Push a value into the stream
   * Returns false if backpressure should be applied
   */
  push(value: T): boolean {
    // Check buffer size
    if (this.buffer.length >= this.options.highWaterMark) {
      this.stats.highWaterMarkReached++;

      switch (this.options.strategy) {
        case 'drop':
          // Drop oldest value
          this.buffer.shift();
          this.stats.dropped++;
          this.buffer.push(value);
          return false;

        case 'buffer':
          // Check max buffer size
          if (
            this.options.maxBufferSize &&
            this.buffer.length >= this.options.maxBufferSize
          ) {
            // Drop oldest to make room
            this.buffer.shift();
            this.stats.dropped++;
          }
          this.buffer.push(value);
          this.paused = true;
          return false;

        case 'pause':
          // Don't add to buffer, signal backpressure
          this.paused = true;
          return false;
      }
    }

    // Buffer has space
    this.buffer.push(value);

    // Check if we've fallen below low water mark
    if (this.paused && this.buffer.length <= this.options.lowWaterMark) {
      this.stats.lowWaterMarkReached++;
      this.resume();
    }

    return true;
  }

  /**
   * Pull a value from the stream
   */
  async pull(): Promise<T | null> {
    // Wait if paused
    if (this.paused && this.buffer.length === 0) {
      await this.waitForResume();
    }

    // Get value from buffer
    const value = this.buffer.shift();

    // Check if we should resume
    if (this.paused && this.buffer.length <= this.options.lowWaterMark) {
      this.stats.lowWaterMarkReached++;
      this.resume();
    }

    return value ?? null;
  }

  /**
   * Check if backpressure is active
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Get current buffer size
   */
  size(): number {
    return this.buffer.length;
  }

  /**
   * Get backpressure statistics
   */
  getStats(): BackpressureStats {
    return {
      buffered: this.buffer.length,
      dropped: this.stats.dropped,
      paused: this.paused,
      highWaterMarkReached: this.stats.highWaterMarkReached,
      lowWaterMarkReached: this.stats.lowWaterMarkReached,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      dropped: 0,
      highWaterMarkReached: 0,
      lowWaterMarkReached: 0,
    };
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.buffer = [];
    this.resume();
  }

  private resume(): void {
    if (!this.paused) return;

    this.paused = false;

    // Resolve all waiting pulls
    for (const resolve of this.pauseResolvers) {
      resolve();
    }
    this.pauseResolvers = [];
  }

  private waitForResume(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.pauseResolvers.push(resolve);
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              BACKPRESSURE STREAM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Apply backpressure control to an async stream
 */
export async function* withBackpressure<T>(
  source: AsyncIterable<T>,
  options: Partial<BackpressureOptions> = {}
): AsyncIterableIterator<T> {
  const controller = new BackpressureController<T>(options);

  // Start consuming source in background
  const sourcePromise = (async () => {
    try {
      for await (const value of source) {
        // Push to controller (may apply backpressure)
        while (!controller.push(value)) {
          // Wait a bit before retrying if paused
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
    } catch (error) {
      console.error('Backpressure source error:', error);
    }
  })();

  // Yield values from controller
  while (true) {
    const value = await controller.pull();
    if (value === null) {
      // Check if source is done
      const sourceState = await Promise.race([
        sourcePromise.then(() => 'done'),
        Promise.resolve('running'),
      ]);

      if (sourceState === 'done' && controller.size() === 0) {
        break;
      }

      // Wait a bit and try again
      await new Promise((resolve) => setTimeout(resolve, 10));
      continue;
    }

    yield value;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              RATE LIMITER
// ═══════════════════════════════════════════════════════════════════════════════

export interface RateLimitOptions {
  readonly requestsPerSecond: number;
  readonly burstSize?: number;
}

/**
 * Token bucket rate limiter
 */
export class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private lastRefill: number;

  constructor(options: RateLimitOptions) {
    this.maxTokens = options.burstSize ?? options.requestsPerSecond;
    this.tokens = this.maxTokens;
    this.refillRate = options.requestsPerSecond / 1000; // tokens per millisecond
    this.lastRefill = Date.now();
  }

  /**
   * Acquire a token, waiting if necessary
   */
  async acquire(count: number = 1): Promise<void> {
    while (true) {
      this.refill();

      if (this.tokens >= count) {
        this.tokens -= count;
        return;
      }

      // Calculate wait time
      const tokensNeeded = count - this.tokens;
      const waitMs = tokensNeeded / this.refillRate;

      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  /**
   * Try to acquire a token without waiting
   */
  tryAcquire(count: number = 1): boolean {
    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }

    return false;
  }

  /**
   * Get current token count
   */
  available(): number {
    this.refill();
    return this.tokens;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

/**
 * Apply rate limiting to an async stream
 */
export async function* withRateLimit<T>(
  source: AsyncIterable<T>,
  options: RateLimitOptions
): AsyncIterableIterator<T> {
  const limiter = new RateLimiter(options);

  for await (const value of source) {
    await limiter.acquire();
    yield value;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a backpressure controller
 */
export function createBackpressureController<T>(
  options?: Partial<BackpressureOptions>
): BackpressureController<T> {
  return new BackpressureController<T>(options);
}

/**
 * Create a rate limiter
 */
export function createRateLimiter(options: RateLimitOptions): RateLimiter {
  return new RateLimiter(options);
}
