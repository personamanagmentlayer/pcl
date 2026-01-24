/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Performance Profiler
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Performance profiling and memory tracking
 *
 * @packageDocumentation
 * @module @pcl/observability/profiler
 * @version 1.0.0
 */

import { performance, PerformanceObserver } from 'perf_hooks';

// ═══════════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface MemorySnapshot {
  readonly heapUsed: number;
  readonly heapTotal: number;
  readonly external: number;
  readonly arrayBuffers: number;
  readonly rss: number;
  readonly timestamp: string;
}

export interface RuntimeStats {
  readonly heapUsed: number;
  readonly heapTotal: number;
  readonly external: number;
  readonly rss: number;
  readonly eventLoopLag: number;
  readonly activeHandles: number;
  readonly activeRequests: number;
  readonly uptime: number;
  readonly cpuUsage: {
    readonly user: number;
    readonly system: number;
  };
}

export interface ProfileData {
  readonly duration: number;
  readonly samples: number;
  readonly timestamp: string;
}

export interface PerformanceMark {
  readonly name: string;
  readonly startTime: number;
  readonly duration?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              PERFORMANCE PROFILER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Performance profiler for CPU and memory tracking
 */
export class PerformanceProfiler {
  private profilingStartTime: number | null = null;
  private performanceMarks: Map<string, PerformanceMark> = new Map();
  private observer: PerformanceObserver | null = null;

  constructor() {
    // Setup performance observer for custom metrics
    this.setupObserver();
  }

  /**
   * Setup performance observer to track custom marks and measures
   */
  private setupObserver(): void {
    this.observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        if (entry.entryType === 'measure') {
          // Store measure data
          this.performanceMarks.set(entry.name, {
            name: entry.name,
            startTime: entry.startTime,
            duration: entry.duration,
          });
        }
      }
    });

    this.observer.observe({ entryTypes: ['measure'] });
  }

  /**
   * Start CPU profiling
   * Note: Node.js built-in profiler requires --inspect flag
   */
  startCPUProfiling(): void {
    this.profilingStartTime = Date.now();
    performance.mark('profile-start');
  }

  /**
   * Stop CPU profiling and return profile data
   */
  stopCPUProfiling(): ProfileData {
    if (!this.profilingStartTime) {
      throw new Error('CPU profiling not started');
    }

    performance.mark('profile-end');
    performance.measure('profile-duration', 'profile-start', 'profile-end');

    const duration = Date.now() - this.profilingStartTime;
    this.profilingStartTime = null;

    return {
      duration,
      samples: 0, // Node.js built-in profiler samples not accessible via perf_hooks
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get current memory snapshot
   */
  getMemorySnapshot(): MemorySnapshot {
    const mem = process.memoryUsage();

    return {
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers,
      rss: mem.rss,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get event loop lag in milliseconds
   */
  async getEventLoopLag(): Promise<number> {
    const start = Date.now();
    await new Promise((resolve) => setImmediate(resolve));
    return Date.now() - start;
  }

  /**
   * Get comprehensive runtime statistics
   */
  async getRuntimeStats(): Promise<RuntimeStats> {
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();
    const eventLoopLag = await this.getEventLoopLag();

    // Internal Node.js APIs - not in TypeScript definitions
    const activeHandles = (process as any)._getActiveHandles
      ? (process as any)._getActiveHandles().length
      : 0;
    const activeRequests = (process as any)._getActiveRequests
      ? (process as any)._getActiveRequests().length
      : 0;

    return {
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      rss: mem.rss,
      eventLoopLag,
      activeHandles,
      activeRequests,
      uptime: process.uptime(),
      cpuUsage: {
        user: cpu.user,
        system: cpu.system,
      },
    };
  }

  /**
   * Mark start of a performance measurement
   */
  mark(name: string): void {
    performance.mark(name);
  }

  /**
   * Measure time between two marks
   */
  measure(name: string, startMark: string, endMark?: string): void {
    if (endMark) {
      performance.measure(name, startMark, endMark);
    } else {
      performance.measure(name, startMark);
    }
  }

  /**
   * Get all performance marks
   */
  getMarks(): PerformanceMark[] {
    return Array.from(this.performanceMarks.values());
  }

  /**
   * Clear all performance marks
   */
  clearMarks(): void {
    this.performanceMarks.clear();
    performance.clearMarks();
    performance.clearMeasures();
  }

  /**
   * Get performance timing for a specific mark
   */
  getMark(name: string): PerformanceMark | undefined {
    return this.performanceMarks.get(name);
  }

  /**
   * Cleanup and stop observer
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.clearMarks();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              DEFAULT PROFILER
// ═══════════════════════════════════════════════════════════════════════════════

let defaultProfiler: PerformanceProfiler | null = null;

/**
 * Get the default profiler instance
 */
export function getProfiler(): PerformanceProfiler {
  if (!defaultProfiler) {
    defaultProfiler = new PerformanceProfiler();
  }
  return defaultProfiler;
}

/**
 * Set the default profiler instance
 */
export function setProfiler(profiler: PerformanceProfiler): void {
  defaultProfiler = profiler;
}

/**
 * Create a new profiler
 */
export function createProfiler(): PerformanceProfiler {
  return new PerformanceProfiler();
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format microseconds to human-readable string
 */
export function formatDuration(microseconds: number): string {
  const milliseconds = microseconds / 1000;

  if (milliseconds < 1) {
    return `${Math.round(microseconds)} μs`;
  } else if (milliseconds < 1000) {
    return `${Math.round(milliseconds * 100) / 100} ms`;
  } else {
    return `${Math.round((milliseconds / 1000) * 100) / 100} s`;
  }
}
