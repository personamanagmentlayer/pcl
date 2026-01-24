/**
 * Provider Health Check System
 *
 * Implements circuit breaker pattern for provider reliability
 */

import type { AIProvider } from './index';

// ─────────────────────────────────────────────────────────────────────────────
// Health Status Types
// ─────────────────────────────────────────────────────────────────────────────

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface HealthCheckResult {
  readonly status: HealthStatus;
  readonly timestamp: Date;
  readonly latency?: number;
  readonly error?: string;
  readonly metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Circuit Breaker States
// ─────────────────────────────────────────────────────────────────────────────

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  readonly failureThreshold: number;

  /** Time to wait before attempting recovery (ms) */
  readonly recoveryTimeout: number;

  /** Number of successful requests needed to close circuit */
  readonly successThreshold: number;

  /** Health check interval (ms) */
  readonly checkInterval: number;
}

const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  recoveryTimeout: 30000, // 30 seconds
  successThreshold: 2,
  checkInterval: 300000, // 5 minutes
};

// ─────────────────────────────────────────────────────────────────────────────
// Provider Health Monitor
// ─────────────────────────────────────────────────────────────────────────────

export class ProviderHealthMonitor {
  private readonly provider: AIProvider;
  private readonly config: CircuitBreakerConfig;

  private circuitState: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastCheck: Date = new Date();
  private lastResult: HealthCheckResult;
  private checkIntervalId?: NodeJS.Timeout;
  private recoveryTimeoutId?: NodeJS.Timeout;

  constructor(
    provider: AIProvider,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    this.provider = provider;
    this.config = { ...DEFAULT_CIRCUIT_CONFIG, ...config };

    this.lastResult = {
      status: 'unknown',
      timestamp: new Date(),
    };
  }

  /**
   * Start automatic health checks
   */
  start(): void {
    if (this.checkIntervalId) {
      return; // Already started
    }

    // Initial check
    this.checkHealth().catch(() => {
      // Ignore initial check errors
    });

    // Periodic checks
    this.checkIntervalId = setInterval(() => {
      this.checkHealth().catch(() => {
        // Health checks should not throw
      });
    }, this.config.checkInterval);
  }

  /**
   * Stop automatic health checks
   */
  stop(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = undefined;
    }

    if (this.recoveryTimeoutId) {
      clearTimeout(this.recoveryTimeoutId);
      this.recoveryTimeoutId = undefined;
    }
  }

  /**
   * Manually trigger a health check
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Simple health check: count tokens (lightweight operation)
      const testText = 'Health check';
      const tokens = this.provider.countTokens(testText);

      if (tokens <= 0) {
        throw new Error('Invalid token count returned');
      }

      const latency = Date.now() - startTime;

      // Successful health check
      this.recordSuccess();

      this.lastResult = {
        status: this.determineStatus(latency),
        timestamp: new Date(),
        latency,
      };
    } catch (error) {
      // Failed health check
      this.recordFailure();

      this.lastResult = {
        status: 'unhealthy',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : String(error),
      };
    }

    this.lastCheck = new Date();
    return this.lastResult;
  }

  /**
   * Get current health status
   */
  getStatus(): HealthCheckResult {
    return this.lastResult;
  }

  /**
   * Check if provider is available for use
   */
  isAvailable(): boolean {
    return this.circuitState !== 'open';
  }

  /**
   * Get circuit breaker state
   */
  getCircuitState(): CircuitState {
    return this.circuitState;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      circuitState: this.circuitState,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastCheck: this.lastCheck,
      lastResult: this.lastResult,
    };
  }

  /**
   * Reset circuit breaker (for testing or manual intervention)
   */
  reset(): void {
    this.circuitState = 'closed';
    this.failureCount = 0;
    this.successCount = 0;

    if (this.recoveryTimeoutId) {
      clearTimeout(this.recoveryTimeoutId);
      this.recoveryTimeoutId = undefined;
    }

    this.lastResult = {
      status: 'unknown',
      timestamp: new Date(),
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Record a successful request (for external use)
   */
  recordSuccess(): void {
    if (this.circuitState === 'half-open') {
      this.successCount++;

      if (this.successCount >= this.config.successThreshold) {
        // Close the circuit - provider is healthy again
        this.circuitState = 'closed';
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else if (this.circuitState === 'closed') {
      // Reset failure count on success
      this.failureCount = 0;
    }
  }

  /**
   * Record a failed request (for external use)
   */
  recordFailure(error?: Error): void {
    if (this.circuitState === 'closed') {
      this.failureCount++;

      if (this.failureCount >= this.config.failureThreshold) {
        // Open the circuit - provider is unhealthy
        this.openCircuit();
      }
    } else if (this.circuitState === 'half-open') {
      // Failed during recovery, reopen circuit
      this.openCircuit();
    }
  }

  private openCircuit(): void {
    this.circuitState = 'open';
    this.successCount = 0;

    // Schedule recovery attempt
    this.recoveryTimeoutId = setTimeout(() => {
      this.circuitState = 'half-open';
      this.successCount = 0;

      // Attempt health check to test recovery
      this.checkHealth().catch(() => {
        // If health check fails, circuit will reopen
      });
    }, this.config.recoveryTimeout);
  }

  private determineStatus(latency: number): HealthStatus {
    // Healthy: < 1000ms
    // Degraded: 1000-5000ms
    // Unhealthy: > 5000ms or error

    if (latency < 1000) {
      return 'healthy';
    } else if (latency < 5000) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Health Monitor Registry
// ─────────────────────────────────────────────────────────────────────────────

export class HealthMonitorRegistry {
  private readonly monitors = new Map<string, ProviderHealthMonitor>();

  /**
   * Register a health monitor for a provider
   */
  register(
    providerName: string,
    provider: AIProvider,
    config?: Partial<CircuitBreakerConfig>
  ): ProviderHealthMonitor {
    if (this.monitors.has(providerName)) {
      throw new Error(
        `Health monitor already exists for provider: ${providerName}`
      );
    }

    const monitor = new ProviderHealthMonitor(provider, config);
    this.monitors.set(providerName, monitor);

    return monitor;
  }

  /**
   * Unregister a health monitor
   */
  unregister(providerName: string): boolean {
    const monitor = this.monitors.get(providerName);

    if (monitor) {
      monitor.stop();
      return this.monitors.delete(providerName);
    }

    return false;
  }

  /**
   * Get health monitor for a provider
   */
  get(providerName: string): ProviderHealthMonitor | undefined {
    return this.monitors.get(providerName);
  }

  /**
   * Get the monitors map (for internal use)
   */
  getMonitorsMap(): Map<string, ProviderHealthMonitor> {
    return this.monitors;
  }

  /**
   * Start all health monitors
   */
  startAll(): void {
    for (const monitor of this.monitors.values()) {
      monitor.start();
    }
  }

  /**
   * Stop all health monitors
   */
  stopAll(): void {
    for (const monitor of this.monitors.values()) {
      monitor.stop();
    }
  }

  /**
   * Get health status for all providers
   */
  getAllStatus(): Map<string, HealthCheckResult> {
    const statuses = new Map<string, HealthCheckResult>();

    for (const [name, monitor] of this.monitors.entries()) {
      statuses.set(name, monitor.getStatus());
    }

    return statuses;
  }

  /**
   * Get list of healthy providers
   */
  getHealthyProviders(): string[] {
    const healthy: string[] = [];

    for (const [name, monitor] of this.monitors.entries()) {
      if (monitor.isAvailable() && monitor.getStatus().status === 'healthy') {
        healthy.push(name);
      }
    }

    return healthy;
  }

  /**
   * Start monitoring all providers
   */
  startMonitoring(intervalMs?: number): void {
    // Note: intervalMs parameter is ignored - each monitor uses its configured interval
    for (const monitor of this.monitors.values()) {
      monitor.start();
    }
  }

  /**
   * Stop monitoring all providers
   */
  stopMonitoring(): void {
    this.stopAll();
  }

  /**
   * Get health status for all providers
   */
  getStatus(): Map<string, HealthCheckResult> {
    return this.getAllStatus();
  }

  /**
   * Clear all monitors
   */
  clear(): void {
    this.stopAll();
    this.monitors.clear();
  }

  /**
   * Get number of monitored providers
   */
  get size(): number {
    return this.monitors.size;
  }
}
