/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Task Scheduler
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Priority-based task scheduling with concurrency limits
 *
 * @packageDocumentation
 * @module @pcl/runtime/scheduler
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface Task<T = unknown> {
  readonly id: string;
  readonly priority: TaskPriority;
  readonly fn: () => Promise<T>;
  readonly signal?: AbortSignal;
  readonly timeout?: number;
}

export interface ScheduledTask<T = unknown> extends Task<T> {
  readonly resolve: (value: T) => void;
  readonly reject: (error: Error) => void;
  readonly enqueuedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface SchedulerOptions {
  readonly maxConcurrent: number;
  readonly defaultTimeout: number;
  readonly priorityWeights: Record<TaskPriority, number>;
}

export interface SchedulerStats {
  readonly queued: number;
  readonly running: number;
  readonly completed: number;
  readonly failed: number;
  readonly averageWaitTime: number;
  readonly averageExecutionTime: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              SCHEDULER
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_OPTIONS: SchedulerOptions = {
  maxConcurrent: 5,
  defaultTimeout: 30000,
  priorityWeights: {
    urgent: 1000,
    high: 100,
    normal: 10,
    low: 1,
  },
};

/**
 * Priority-based task scheduler with concurrency limits
 */
export class TaskScheduler {
  private readonly options: SchedulerOptions;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly queue: ScheduledTask<any>[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly running = new Set<ScheduledTask<any>>();
  private stats = {
    completed: 0,
    failed: 0,
    totalWaitTime: 0,
    totalExecutionTime: 0,
  };

  constructor(options: Partial<SchedulerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Schedule a task for execution
   */
  schedule<T>(task: Omit<Task<T>, 'id'> & { id?: string }): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const scheduledTask: ScheduledTask<T> = {
        id: task.id ?? generateTaskId(),
        priority: task.priority,
        fn: task.fn,
        signal: task.signal,
        timeout: task.timeout ?? this.options.defaultTimeout,
        resolve: resolve as (value: unknown) => void,
        reject,
        enqueuedAt: new Date(),
      };

      // Add to queue
      this.queue.push(scheduledTask);

      // Sort by priority (higher priority first)
      this.sortQueue();

      // Try to execute
      this.executeNext();
    });
  }

  /**
   * Execute multiple tasks in parallel with priority
   */
  async scheduleAll<T>(
    tasks: Array<Omit<Task<T>, 'id'> & { id?: string }>
  ): Promise<T[]> {
    return Promise.all(tasks.map((task) => this.schedule(task)));
  }

  /**
   * Cancel all pending tasks
   */
  cancelAll(): void {
    for (const task of this.queue) {
      task.reject(new Error('Task cancelled'));
    }
    this.queue.length = 0;
  }

  /**
   * Cancel a specific task by ID
   */
  cancel(taskId: string): boolean {
    const index = this.queue.findIndex((t) => t.id === taskId);
    if (index !== -1) {
      const [task] = this.queue.splice(index, 1);
      task.reject(new Error('Task cancelled'));
      return true;
    }
    return false;
  }

  /**
   * Get scheduler statistics
   */
  getStats(): SchedulerStats {
    const totalTasks = this.stats.completed + this.stats.failed;
    return {
      queued: this.queue.length,
      running: this.running.size,
      completed: this.stats.completed,
      failed: this.stats.failed,
      averageWaitTime:
        totalTasks > 0 ? this.stats.totalWaitTime / totalTasks : 0,
      averageExecutionTime:
        totalTasks > 0 ? this.stats.totalExecutionTime / totalTasks : 0,
    };
  }

  /**
   * Clear all statistics
   */
  resetStats(): void {
    this.stats = {
      completed: 0,
      failed: 0,
      totalWaitTime: 0,
      totalExecutionTime: 0,
    };
  }

  private sortQueue(): void {
    const weights = this.options.priorityWeights;
    this.queue.sort((a, b) => {
      // Higher priority first
      const priorityDiff = weights[b.priority] - weights[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Earlier enqueued first (FIFO within same priority)
      return a.enqueuedAt.getTime() - b.enqueuedAt.getTime();
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async executeTask(task: ScheduledTask<any>): Promise<void> {
    try {
      // Execute with timeout and abort signal
      const result = await this.executeWithTimeout(task);

      // Mark as completed
      task.completedAt = new Date();
      const executionTime =
        task.completedAt.getTime() - task.startedAt!.getTime();
      this.stats.totalExecutionTime += executionTime;
      this.stats.completed++;

      task.resolve(result);
    } catch (error) {
      this.stats.failed++;
      task.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async executeNext(): Promise<void> {
    // Check if we can run more tasks
    if (
      this.running.size >= this.options.maxConcurrent ||
      this.queue.length === 0
    ) {
      return;
    }

    // Get next task
    const task = this.queue.shift();
    if (!task) return;

    // Mark as running
    this.running.add(task);
    task.startedAt = new Date();

    // Calculate wait time
    const waitTime = task.startedAt.getTime() - task.enqueuedAt.getTime();
    this.stats.totalWaitTime += waitTime;

    try {
      await this.executeTask(task);
    } finally {
      // Remove from running
      this.running.delete(task);

      // Try to execute next task
      this.executeNext();
    }
  }

  private async executeWithTimeout<T>(task: ScheduledTask<T>): Promise<T> {
    const timeout = task.timeout ?? this.options.defaultTimeout;

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Task ${task.id} timed out after ${timeout}ms`));
      }, timeout);

      // Clear timeout if task is aborted
      task.signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error(`Task ${task.id} aborted`));
      });
    });

    // Race between task execution and timeout
    return Promise.race([task.fn(), timeoutPromise]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

let taskIdCounter = 0;

function generateTaskId(): string {
  return `task-${Date.now()}-${++taskIdCounter}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new task scheduler
 */
export function createScheduler(
  options?: Partial<SchedulerOptions>
): TaskScheduler {
  return new TaskScheduler(options);
}
