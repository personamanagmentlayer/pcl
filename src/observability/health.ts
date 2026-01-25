/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Health Aggregator
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Health check aggregation for component monitoring
 *
 * @packageDocumentation
 * @module @pcl/observability/health
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ComponentHealth {
  readonly status: HealthStatus;
  readonly message?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface OverallHealth {
  readonly status: HealthStatus;
  readonly timestamp: string;
  readonly uptime: number;
  readonly version: string;
  readonly components: Record<string, ComponentHealth>;
}

export type HealthCheck = () => Promise<ComponentHealth> | ComponentHealth;

// ═══════════════════════════════════════════════════════════════════════════════
//                              HEALTH AGGREGATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Aggregates health checks from multiple components
 */
export class HealthAggregator {
  private checks: Map<string, HealthCheck> = new Map();
  private readonly startTime: number = Date.now();

  /**
   * Register a health check for a component
   */
  registerCheck(component: string, check: HealthCheck): void {
    this.checks.set(component, check);
  }

  /**
   * Unregister a health check
   */
  unregisterCheck(component: string): boolean {
    return this.checks.delete(component);
  }

  /**
   * Check health of a specific component
   */
  async checkComponent(component: string): Promise<ComponentHealth | null> {
    const check = this.checks.get(component);
    if (!check) {
      return null;
    }

    try {
      return await Promise.resolve(check());
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Check health of all components
   */
  async checkAll(): Promise<OverallHealth> {
    const components: Record<string, ComponentHealth> = {};

    // Run all health checks in parallel
    const checkPromises = Array.from(this.checks.entries()).map(
      async ([name, check]) => {
        try {
          const result = await Promise.resolve(check());
          components[name] = result;
        } catch (error) {
          components[name] = {
            status: 'unhealthy',
            message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      }
    );

    await Promise.all(checkPromises);

    // Determine overall status
    const status = this.determineOverallStatus(components);

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: process.env.npm_package_version || '1.0.0',
      components,
    };
  }

  /**
   * Get readiness status (all components must be healthy)
   */
  async isReady(): Promise<boolean> {
    const health = await this.checkAll();
    return health.status === 'healthy';
  }

  /**
   * Get liveness status (at least some components are healthy)
   */
  async isAlive(): Promise<boolean> {
    const health = await this.checkAll();
    return health.status !== 'unhealthy';
  }

  /**
   * Determine overall health status based on component statuses
   */
  private determineOverallStatus(
    components: Record<string, ComponentHealth>
  ): HealthStatus {
    const statuses = Object.values(components).map((c) => c.status);

    // If any component is unhealthy, overall is unhealthy
    if (statuses.some((s) => s === 'unhealthy')) {
      return 'unhealthy';
    }

    // If any component is degraded, overall is degraded
    if (statuses.some((s) => s === 'degraded')) {
      return 'degraded';
    }

    // All components are healthy
    return 'healthy';
  }

  /**
   * Get list of registered components
   */
  getComponents(): string[] {
    return Array.from(this.checks.keys());
  }

  /**
   * Clear all health checks
   */
  clear(): void {
    this.checks.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              DEFAULT AGGREGATOR
// ═══════════════════════════════════════════════════════════════════════════════

let defaultAggregator: HealthAggregator | null = null;

/**
 * Get the default health aggregator instance
 */
export function getHealthAggregator(): HealthAggregator {
  if (!defaultAggregator) {
    defaultAggregator = new HealthAggregator();
  }
  return defaultAggregator;
}

/**
 * Set the default health aggregator instance
 */
export function setHealthAggregator(aggregator: HealthAggregator): void {
  defaultAggregator = aggregator;
}

/**
 * Create a new health aggregator
 */
export function createHealthAggregator(): HealthAggregator {
  return new HealthAggregator();
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              BUILT-IN CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Basic runtime health check
 */
export function runtimeHealthCheck(): ComponentHealth {
  const memUsage = process.memoryUsage();
  const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

  return {
    status: heapUsedPercent > 90 ? 'degraded' : 'healthy',
    metadata: {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      heapUsedPercent: Math.round(heapUsedPercent),
      rss: memUsage.rss,
      external: memUsage.external,
    },
  };
}

/**
 * Event loop lag health check
 */
export async function eventLoopHealthCheck(): Promise<ComponentHealth> {
  const start = Date.now();
  await new Promise((resolve) => setImmediate(resolve));
  const lag = Date.now() - start;

  // Determine status based on lag thresholds
  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (lag > 500) {
    status = 'unhealthy';
  } else if (lag > 100) {
    status = 'degraded';
  } else {
    status = 'healthy';
  }

  return {
    status,
    metadata: {
      lagMs: lag,
    },
  };
}
