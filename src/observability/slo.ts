/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * SLO & Error Budget Tracking
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Service Level Objectives (SLO) and error budget management
 * Based on Google SRE practices
 *
 * @packageDocumentation
 * @module @pcl/observability/slo
 * @version 1.0.0
 * @see https://sre.google/sre-book/service-level-objectives/
 */

// ═══════════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type SLOTarget = number; // 0.0 to 1.0 (e.g., 0.999 = 99.9%)

export interface SLOConfig {
  /** SLO name */
  readonly name: string;
  /** Target success rate (0.0 to 1.0) */
  readonly target: SLOTarget;
  /** Time window for error budget (in seconds) */
  readonly windowSeconds: number;
  /** Description of what this SLO measures */
  readonly description?: string;
}

export interface SLOStatus {
  readonly name: string;
  readonly target: SLOTarget;
  readonly current: number; // Current success rate
  readonly errorBudget: {
    readonly total: number; // Total allowed errors
    readonly consumed: number; // Errors consumed so far
    readonly remaining: number; // Remaining error budget
    readonly consumedPercent: number; // Percentage of budget consumed
  };
  readonly window: {
    readonly seconds: number;
    readonly startTime: Date;
    readonly endTime: Date;
  };
  readonly metrics: {
    readonly totalRequests: number;
    readonly successfulRequests: number;
    readonly failedRequests: number;
  };
  readonly healthy: boolean; // True if within error budget
}

export interface SLORecord {
  readonly timestamp: Date;
  readonly success: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              SLO TRACKER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SLO tracker with rolling window error budget calculation
 */
export class SLOTracker {
  private readonly config: SLOConfig;
  private records: SLORecord[] = [];
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: SLOConfig) {
    this.config = config;
    this.startCleanup();
  }

  /**
   * Record a request result
   */
  record(success: boolean): void {
    this.records.push({
      timestamp: new Date(),
      success,
    });
  }

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    this.record(true);
  }

  /**
   * Record a failed request
   */
  recordFailure(): void {
    this.record(false);
  }

  /**
   * Get current SLO status
   */
  getStatus(): SLOStatus {
    const now = new Date();
    const windowStart = new Date(
      now.getTime() - this.config.windowSeconds * 1000
    );

    // Filter records within window
    const windowRecords = this.records.filter(
      (r) => r.timestamp >= windowStart
    );

    const totalRequests = windowRecords.length;
    const successfulRequests = windowRecords.filter((r) => r.success).length;
    const failedRequests = totalRequests - successfulRequests;

    // Calculate current success rate
    const current =
      totalRequests > 0 ? successfulRequests / totalRequests : 1.0;

    // Calculate error budget
    const totalAllowedErrors = Math.floor(
      totalRequests * (1 - this.config.target)
    );
    const consumedErrors = failedRequests;
    const remainingErrors = Math.max(0, totalAllowedErrors - consumedErrors);
    const consumedPercent =
      totalAllowedErrors > 0 ? (consumedErrors / totalAllowedErrors) * 100 : 0;

    return {
      name: this.config.name,
      target: this.config.target,
      current,
      errorBudget: {
        total: totalAllowedErrors,
        consumed: consumedErrors,
        remaining: remainingErrors,
        consumedPercent,
      },
      window: {
        seconds: this.config.windowSeconds,
        startTime: windowStart,
        endTime: now,
      },
      metrics: {
        totalRequests,
        successfulRequests,
        failedRequests,
      },
      healthy:
        current >= this.config.target && consumedErrors <= totalAllowedErrors,
    };
  }

  /**
   * Check if currently within SLO target
   */
  isHealthy(): boolean {
    return this.getStatus().healthy;
  }

  /**
   * Get error budget remaining percentage
   */
  getErrorBudgetRemaining(): number {
    const status = this.getStatus();
    return status.errorBudget.total > 0
      ? (status.errorBudget.remaining / status.errorBudget.total) * 100
      : 100;
  }

  /**
   * Reset all records
   */
  reset(): void {
    this.records = [];
  }

  /**
   * Cleanup old records outside the window
   */
  private cleanup(): void {
    const now = new Date();
    const windowStart = new Date(
      now.getTime() - this.config.windowSeconds * 1000
    );

    this.records = this.records.filter((r) => r.timestamp >= windowStart);
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    // Cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Stop cleanup and destroy tracker
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.records = [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              SLO REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Registry for managing multiple SLOs
 */
export class SLORegistry {
  private trackers: Map<string, SLOTracker> = new Map();

  /**
   * Register a new SLO
   */
  register(config: SLOConfig): SLOTracker {
    const tracker = new SLOTracker(config);
    this.trackers.set(config.name, tracker);
    return tracker;
  }

  /**
   * Get an SLO tracker by name
   */
  get(name: string): SLOTracker | undefined {
    return this.trackers.get(name);
  }

  /**
   * Get all SLO trackers
   */
  getAll(): Map<string, SLOTracker> {
    return this.trackers;
  }

  /**
   * Get status of all SLOs
   */
  getAllStatuses(): Record<string, SLOStatus> {
    const statuses: Record<string, SLOStatus> = {};
    for (const [name, tracker] of this.trackers) {
      statuses[name] = tracker.getStatus();
    }
    return statuses;
  }

  /**
   * Check if all SLOs are healthy
   */
  isHealthy(): boolean {
    for (const tracker of this.trackers.values()) {
      if (!tracker.isHealthy()) {
        return false;
      }
    }
    return true;
  }

  /**
   * Unregister an SLO
   */
  unregister(name: string): boolean {
    const tracker = this.trackers.get(name);
    if (tracker) {
      tracker.destroy();
      return this.trackers.delete(name);
    }
    return false;
  }

  /**
   * Clear all SLOs
   */
  clear(): void {
    for (const tracker of this.trackers.values()) {
      tracker.destroy();
    }
    this.trackers.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              DEFAULT REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

let defaultRegistry: SLORegistry | null = null;

/**
 * Get the default SLO registry instance
 */
export function getSLORegistry(): SLORegistry {
  if (!defaultRegistry) {
    defaultRegistry = new SLORegistry();
  }
  return defaultRegistry;
}

/**
 * Set the default SLO registry instance
 */
export function setSLORegistry(registry: SLORegistry): void {
  defaultRegistry = registry;
}

/**
 * Create a new SLO registry
 */
export function createSLORegistry(): SLORegistry {
  return new SLORegistry();
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              PREDEFINED SLOs
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Common SLO configurations
 */
export const CommonSLOs = {
  /** 99.9% availability (allows 0.1% errors) */
  HIGH_AVAILABILITY: {
    name: 'high-availability',
    target: 0.999,
    windowSeconds: 30 * 24 * 60 * 60, // 30 days
    description: '99.9% availability over 30 days',
  },

  /** 99.5% availability (allows 0.5% errors) */
  STANDARD_AVAILABILITY: {
    name: 'standard-availability',
    target: 0.995,
    windowSeconds: 30 * 24 * 60 * 60, // 30 days
    description: '99.5% availability over 30 days',
  },

  /** 99% availability (allows 1% errors) */
  BASIC_AVAILABILITY: {
    name: 'basic-availability',
    target: 0.99,
    windowSeconds: 30 * 24 * 60 * 60, // 30 days
    description: '99% availability over 30 days',
  },

  /** 95% success rate for AI operations (allows 5% failures) */
  AI_OPERATION_SUCCESS: {
    name: 'ai-operation-success',
    target: 0.95,
    windowSeconds: 24 * 60 * 60, // 24 hours
    description: '95% AI operation success rate over 24 hours',
  },
} as const;
