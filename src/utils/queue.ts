/**
 * @fileoverview Concurrency queue for managing parallel operations
 * Prevents API errors due to too many concurrent requests
 */

export interface QueueOptions {
  /** Maximum number of concurrent operations (default: 3) */
  concurrency?: number;
  /** Timeout for each operation in ms (default: 30000) */
  timeout?: number;
}

export interface QueueTask<T> {
  /** Unique task identifier */
  id: string;
  /** The async function to execute */
  fn: () => Promise<T>;
  /** Promise resolve callback */
  resolve: (value: T) => void;
  /** Promise reject callback */
  reject: (error: Error) => void;
  /** Timestamp when task was added */
  addedAt: number;
}

export class ConcurrencyQueue {
  private readonly concurrency: number;
  private readonly timeout: number;
  private pending: QueueTask<any>[] = [];
  private running = 0;
  private taskCounter = 0;

  constructor(options: QueueOptions = {}) {
    this.concurrency = options.concurrency ?? 3;
    this.timeout = options.timeout ?? 30000;
  }

  /**
   * Add a task to the queue
   * @param fn Async function to execute
   * @returns Promise that resolves with the function result
   */
  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const task: QueueTask<T> = {
        id: `task-${++this.taskCounter}`,
        fn,
        resolve,
        reject,
        addedAt: Date.now(),
      };

      this.pending.push(task);
      this.process();
    });
  }

  /**
   * Add multiple tasks and wait for all to complete
   * @param fns Array of async functions to execute
   * @returns Promise that resolves with array of results
   */
  async addAll<T>(fns: (() => Promise<T>)[]): Promise<T[]> {
    return Promise.all(fns.map((fn) => this.add(fn)));
  }

  /**
   * Process queued tasks respecting concurrency limit
   */
  private async process(): Promise<void> {
    if (this.running >= this.concurrency || this.pending.length === 0) {
      return;
    }

    this.running++;
    const task = this.pending.shift()!;

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(`Task ${task.id} timed out after ${this.timeout}ms`)
          );
        }, this.timeout);
      });

      // Race between task completion and timeout
      const result = await Promise.race([task.fn(), timeoutPromise]);
      task.resolve(result);
    } catch (error) {
      task.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.running--;
      // Process next task
      this.process();
    }
  }

  /**
   * Get current queue statistics
   */
  getStats() {
    return {
      running: this.running,
      pending: this.pending.length,
      concurrency: this.concurrency,
      total: this.running + this.pending.length,
    };
  }

  /**
   * Clear all pending tasks
   */
  clear(): void {
    this.pending.forEach((task) => {
      task.reject(new Error('Queue cleared'));
    });
    this.pending = [];
  }

  /**
   * Wait for all running tasks to complete
   */
  async drain(): Promise<void> {
    while (this.running > 0 || this.pending.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

/**
 * Create a limited concurrency function wrapper
 * @param concurrency Maximum number of concurrent executions
 * @returns Function that limits concurrency
 */
export function limit(concurrency: number) {
  const queue = new ConcurrencyQueue({ concurrency });

  return <T>(fn: () => Promise<T>): Promise<T> => {
    return queue.add(fn);
  };
}

/**
 * Batch process items with concurrency control
 * @param items Items to process
 * @param fn Function to apply to each item
 * @param options Queue options
 * @returns Array of results
 */
export async function batchProcess<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  options: QueueOptions = {}
): Promise<R[]> {
  const queue = new ConcurrencyQueue(options);
  return queue.addAll(items.map((item, index) => () => fn(item, index)));
}
