/**
 * Task Scheduler Tests
 *
 * Comprehensive tests for priority-based task scheduling
 * Target: 45.71% → 75%+ coverage
 */

import { z } from 'zod';
import {
  TaskScheduler,
  createScheduler,
  type Task,
  type TaskPriority,
  type SchedulerOptions,
} from '../../src/runtime/scheduler';

// ═══════════════════════════════════════════════════════════════════════════════
//                              SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const SchedulerStatsSchema = z.object({
  queued: z.number().int().nonnegative(),
  running: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  averageWaitTime: z.number().nonnegative(),
  averageExecutionTime: z.number().nonnegative(),
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function createMockTask<T>(
  value: T,
  priority: TaskPriority = 'normal',
  delay = 0
): Omit<Task<T>, 'id'> {
  return {
    priority,
    fn: async () => {
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      return value;
    },
  };
}

function createFailingTask(
  priority: TaskPriority = 'normal',
  error: Error = new Error('Task failed')
): Omit<Task<never>, 'id'> {
  return {
    priority,
    fn: async () => {
      throw error;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('TaskScheduler', () => {
  describe('Construction', () => {
    it('should create scheduler with default options', () => {
      const scheduler = new TaskScheduler();

      expect(scheduler).toBeDefined();
      expect(scheduler.getStats().queued).toBe(0);
    });

    it('should create scheduler with custom options', () => {
      const options: Partial<SchedulerOptions> = {
        maxConcurrent: 10,
        defaultTimeout: 5000,
      };

      const scheduler = new TaskScheduler(options);

      expect(scheduler).toBeDefined();
    });
  });

  describe('schedule - Task Execution', () => {
    let scheduler: TaskScheduler;

    beforeEach(() => {
      scheduler = new TaskScheduler({ maxConcurrent: 2 });
    });

    it('should schedule and execute task', async () => {
      const task = createMockTask(42);

      const result = await scheduler.schedule(task);

      expect(result).toBe(42);
    });

    it('should schedule task with custom ID', async () => {
      const task = { ...createMockTask('test'), id: 'custom-id' };

      const result = await scheduler.schedule(task);

      expect(result).toBe('test');
    });

    it('should execute multiple tasks', async () => {
      const task1 = createMockTask(1);
      const task2 = createMockTask(2);

      const [result1, result2] = await Promise.all([
        scheduler.schedule(task1),
        scheduler.schedule(task2),
      ]);

      expect(result1).toBe(1);
      expect(result2).toBe(2);
    });

    it('should respect concurrency limit', async () => {
      scheduler = new TaskScheduler({ maxConcurrent: 1 });

      const results: number[] = [];
      const task1 = {
        priority: 'normal' as TaskPriority,
        fn: async () => {
          results.push(1);
          await new Promise((resolve) => setTimeout(resolve, 50));
          return 1;
        },
      };
      const task2 = {
        priority: 'normal' as TaskPriority,
        fn: async () => {
          results.push(2);
          await new Promise((resolve) => setTimeout(resolve, 10));
          return 2;
        },
      };

      const promises = [scheduler.schedule(task1), scheduler.schedule(task2)];

      await Promise.all(promises);

      // Task 1 should start first (scheduled first)
      expect(results[0]).toBe(1);
    });
  });

  describe('Priority Scheduling', () => {
    let scheduler: TaskScheduler;

    beforeEach(() => {
      scheduler = new TaskScheduler({ maxConcurrent: 1 });
    });

    it('should execute urgent tasks first', async () => {
      const executed: string[] = [];

      // Block the scheduler
      const blocker = {
        priority: 'low' as TaskPriority,
        fn: async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          executed.push('blocker');
          return 0;
        },
      };

      const taskLow = {
        priority: 'low' as TaskPriority,
        fn: async () => {
          executed.push('low');
          return 1;
        },
      };

      const taskUrgent = {
        priority: 'urgent' as TaskPriority,
        fn: async () => {
          executed.push('urgent');
          return 2;
        },
      };

      const taskNormal = {
        priority: 'normal' as TaskPriority,
        fn: async () => {
          executed.push('normal');
          return 3;
        },
      };

      const promises = [
        scheduler.schedule(blocker),
        scheduler.schedule(taskLow),
        scheduler.schedule(taskUrgent),
        scheduler.schedule(taskNormal),
      ];

      await Promise.all(promises);

      // After blocker, urgent should execute first
      expect(executed).toEqual(['blocker', 'urgent', 'normal', 'low']);
    });

    it('should use FIFO within same priority', async () => {
      const executed: number[] = [];

      // Block first
      const blocker = {
        priority: 'normal' as TaskPriority,
        fn: async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return 0;
        },
      };

      const promises = [scheduler.schedule(blocker)];

      // Add tasks with same priority
      for (let i = 1; i <= 3; i++) {
        promises.push(
          scheduler.schedule({
            priority: 'normal',
            fn: async () => {
              executed.push(i);
              return i;
            },
          })
        );
      }

      await Promise.all(promises);

      expect(executed).toEqual([1, 2, 3]);
    });
  });

  describe('scheduleAll - Batch Scheduling', () => {
    let scheduler: TaskScheduler;

    beforeEach(() => {
      scheduler = new TaskScheduler({ maxConcurrent: 3 });
    });

    it('should schedule multiple tasks', async () => {
      const tasks = [createMockTask(1), createMockTask(2), createMockTask(3)];

      const results = await scheduler.scheduleAll(tasks);

      expect(results).toEqual([1, 2, 3]);
    });

    it('should handle empty array', async () => {
      const results = await scheduler.scheduleAll([]);

      expect(results).toEqual([]);
    });
  });

  describe('cancel - Task Cancellation', () => {
    let scheduler: TaskScheduler;

    beforeEach(() => {
      scheduler = new TaskScheduler({ maxConcurrent: 1 });
    });

    it('should cancel pending task', async () => {
      // Block scheduler
      const blocker = createMockTask(0, 'normal', 100);
      scheduler.schedule(blocker);

      // Add task to cancel
      const task = { ...createMockTask(42, 'normal', 10), id: 'cancel-me' };
      const promise = scheduler.schedule(task);

      // Cancel before it executes
      const cancelled = scheduler.cancel('cancel-me');

      expect(cancelled).toBe(true);
      await expect(promise).rejects.toThrow('Task cancelled');
    });

    it('should return false for non-existent task', () => {
      const cancelled = scheduler.cancel('non-existent');

      expect(cancelled).toBe(false);
    });

    it('should not cancel running task', async () => {
      const task = { ...createMockTask(42, 'normal', 50), id: 'running-task' };
      const promise = scheduler.schedule(task);

      // Wait for task to start
      await new Promise((resolve) => setTimeout(resolve, 10));

      const cancelled = scheduler.cancel('running-task');

      expect(cancelled).toBe(false);
      await expect(promise).resolves.toBe(42);
    });
  });

  describe('cancelAll - Cancel All Tasks', () => {
    let scheduler: TaskScheduler;

    beforeEach(() => {
      scheduler = new TaskScheduler({ maxConcurrent: 1 });
    });

    it('should cancel all pending tasks', async () => {
      // Block scheduler (catch if cancelled)
      const blocker = createMockTask(0, 'normal', 100);
      scheduler.schedule(blocker).catch(() => {});

      // Add tasks
      const promises = [
        scheduler.schedule(createMockTask(1)),
        scheduler.schedule(createMockTask(2)),
        scheduler.schedule(createMockTask(3)),
      ];

      scheduler.cancelAll();

      for (const promise of promises) {
        await expect(promise).rejects.toThrow('Task cancelled');
      }
    });

    it('should clear queue', async () => {
      // Block scheduler
      const blocker = createMockTask(0, 'normal', 100);
      scheduler.schedule(blocker).catch(() => {
        // Ignore blocker cancellation
      });

      // Add tasks (catch rejections)
      const p1 = scheduler.schedule(createMockTask(1)).catch(() => {});
      const p2 = scheduler.schedule(createMockTask(2)).catch(() => {});

      scheduler.cancelAll();

      const stats = scheduler.getStats();
      expect(stats.queued).toBe(0);

      // Wait for promises to settle
      await Promise.all([p1, p2]);
    });
  });

  describe('Timeout Handling', () => {
    let scheduler: TaskScheduler;

    beforeEach(() => {
      scheduler = new TaskScheduler({ defaultTimeout: 50 });
    });

    it('should timeout slow task', async () => {
      const task = createMockTask(42, 'normal', 200);

      await expect(scheduler.schedule(task)).rejects.toThrow('timed out');
    });

    it('should use task-specific timeout', async () => {
      const task = {
        ...createMockTask(42, 'normal', 30),
        timeout: 100,
      };

      await expect(scheduler.schedule(task)).resolves.toBe(42);
    });
  });

  describe('Abort Signal Support', () => {
    let scheduler: TaskScheduler;

    beforeEach(() => {
      scheduler = new TaskScheduler();
    });

    it('should abort task via signal', async () => {
      const controller = new AbortController();

      const task = {
        ...createMockTask(42, 'normal', 100),
        signal: controller.signal,
      };

      const promise = scheduler.schedule(task);

      // Abort after a short delay
      setTimeout(() => controller.abort(), 20);

      await expect(promise).rejects.toThrow('aborted');
    });
  });

  describe('Error Handling', () => {
    let scheduler: TaskScheduler;

    beforeEach(() => {
      scheduler = new TaskScheduler();
    });

    it('should handle task errors', async () => {
      const error = new Error('Task failed');
      const task = createFailingTask('normal', error);

      await expect(scheduler.schedule(task)).rejects.toThrow('Task failed');
    });

    it('should track failed tasks', async () => {
      const task = createFailingTask('normal');

      await expect(scheduler.schedule(task)).rejects.toThrow();

      const stats = scheduler.getStats();
      expect(stats.failed).toBe(1);
    });

    it('should continue after task failure', async () => {
      const task1 = createFailingTask('normal');
      const task2 = createMockTask(42);

      await expect(scheduler.schedule(task1)).rejects.toThrow();
      await expect(scheduler.schedule(task2)).resolves.toBe(42);
    });
  });

  describe('getStats - Statistics', () => {
    let scheduler: TaskScheduler;

    beforeEach(() => {
      scheduler = new TaskScheduler({ maxConcurrent: 2 });
    });

    it('should return valid stats schema', () => {
      const stats = scheduler.getStats();

      const validated = SchedulerStatsSchema.parse(stats);
      expect(validated).toBeDefined();
    });

    it('should track queued tasks', async () => {
      scheduler = new TaskScheduler({ maxConcurrent: 1 });

      // Block scheduler
      scheduler.schedule(createMockTask(0, 'normal', 100));

      // Add to queue
      scheduler.schedule(createMockTask(1));
      scheduler.schedule(createMockTask(2));

      const stats = scheduler.getStats();
      expect(stats.queued).toBe(2);
    });

    it('should track running tasks', async () => {
      const promise = scheduler.schedule(createMockTask(42, 'normal', 50));

      // Wait for task to start
      await new Promise((resolve) => setTimeout(resolve, 10));

      const stats = scheduler.getStats();
      expect(stats.running).toBeGreaterThan(0);

      await promise;
    });

    it('should track completed tasks', async () => {
      await scheduler.schedule(createMockTask(1));
      await scheduler.schedule(createMockTask(2));

      const stats = scheduler.getStats();
      expect(stats.completed).toBe(2);
    });

    it('should track failed tasks', async () => {
      await expect(
        scheduler.schedule(createFailingTask('normal'))
      ).rejects.toThrow();

      const stats = scheduler.getStats();
      expect(stats.failed).toBe(1);
    });

    it('should calculate average wait time', async () => {
      scheduler = new TaskScheduler({ maxConcurrent: 1 });

      // Schedule all at once so they queue
      const promises = [
        scheduler.schedule(createMockTask(0, 'normal', 30)),
        scheduler.schedule(createMockTask(1, 'normal', 10)),
        scheduler.schedule(createMockTask(2, 'normal', 10)),
      ];

      await Promise.all(promises);

      const stats = scheduler.getStats();
      expect(stats.averageWaitTime).toBeGreaterThan(0);
    });

    it('should calculate average execution time', async () => {
      await scheduler.schedule(createMockTask(1, 'normal', 20));
      await scheduler.schedule(createMockTask(2, 'normal', 30));

      const stats = scheduler.getStats();
      expect(stats.averageExecutionTime).toBeGreaterThan(0);
    });

    it('should return 0 averages when no tasks completed', () => {
      const stats = scheduler.getStats();

      expect(stats.averageWaitTime).toBe(0);
      expect(stats.averageExecutionTime).toBe(0);
    });
  });

  describe('resetStats - Statistics Reset', () => {
    let scheduler: TaskScheduler;

    beforeEach(() => {
      scheduler = new TaskScheduler();
    });

    it('should reset statistics', async () => {
      await scheduler.schedule(createMockTask(1));
      await scheduler.schedule(createMockTask(2));

      scheduler.resetStats();

      const stats = scheduler.getStats();
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
    });

    it('should not affect queue', async () => {
      scheduler = new TaskScheduler({ maxConcurrent: 1 });

      // Block
      scheduler.schedule(createMockTask(0, 'normal', 100));

      // Add to queue
      scheduler.schedule(createMockTask(1));

      scheduler.resetStats();

      const stats = scheduler.getStats();
      expect(stats.queued).toBe(1);
    });
  });

  describe('Factory Function', () => {
    it('should create scheduler via factory', () => {
      const scheduler = createScheduler();

      expect(scheduler).toBeInstanceOf(TaskScheduler);
    });

    it('should pass options to factory', () => {
      const scheduler = createScheduler({ maxConcurrent: 10 });

      expect(scheduler).toBeInstanceOf(TaskScheduler);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero delay tasks', async () => {
      const scheduler = new TaskScheduler();
      const task = createMockTask(42, 'normal', 0);

      const result = await scheduler.schedule(task);

      expect(result).toBe(42);
    });

    it('should handle high concurrency', async () => {
      const scheduler = new TaskScheduler({ maxConcurrent: 100 });

      const tasks = Array.from({ length: 50 }, (_, i) =>
        createMockTask(i, 'normal', 10)
      );

      const results = await scheduler.scheduleAll(tasks);

      expect(results).toHaveLength(50);
    });

    it('should handle rapid scheduling', async () => {
      const scheduler = new TaskScheduler({ maxConcurrent: 5 });

      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(scheduler.schedule(createMockTask(i, 'normal', 5)));
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(20);
    });
  });
});
