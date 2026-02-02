/**
 * Tests for Concurrency Queue
 * Managing parallel operations with concurrency control
 */

import { ConcurrencyQueue, limit, batchProcess } from '../../src/utils/queue';

// Helper to create delay promise
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper to create task that resolves after delay
function delayedTask<T>(value: T, ms: number): () => Promise<T> {
  return async () => {
    await delay(ms);
    return value;
  };
}

// Helper to create task that rejects
function failingTask(message: string, ms = 0): () => Promise<never> {
  return async () => {
    if (ms > 0) await delay(ms);
    throw new Error(message);
  };
}

describe('ConcurrencyQueue', () => {
  describe('initialization', () => {
    it('should create queue with default options', () => {
      const queue = new ConcurrencyQueue();
      const stats = queue.getStats();

      expect(stats.concurrency).toBe(3);
      expect(stats.running).toBe(0);
      expect(stats.pending).toBe(0);
    });

    it('should create queue with custom concurrency', () => {
      const queue = new ConcurrencyQueue({ concurrency: 5 });
      const stats = queue.getStats();

      expect(stats.concurrency).toBe(5);
    });

    it('should create queue with custom timeout', () => {
      const queue = new ConcurrencyQueue({ timeout: 5000 });

      expect(queue).toBeDefined();
    });

    it('should create queue with both custom options', () => {
      const queue = new ConcurrencyQueue({ concurrency: 10, timeout: 10000 });
      const stats = queue.getStats();

      expect(stats.concurrency).toBe(10);
    });
  });

  describe('add()', () => {
    it('should execute single task', async () => {
      const queue = new ConcurrencyQueue();
      const result = await queue.add(async () => 42);

      expect(result).toBe(42);
    });

    it('should execute task that returns string', async () => {
      const queue = new ConcurrencyQueue();
      const result = await queue.add(async () => 'hello');

      expect(result).toBe('hello');
    });

    it('should execute task that returns object', async () => {
      const queue = new ConcurrencyQueue();
      const result = await queue.add(async () => ({ key: 'value' }));

      expect(result).toEqual({ key: 'value' });
    });

    it('should execute delayed task', async () => {
      const queue = new ConcurrencyQueue();
      const result = await queue.add(delayedTask('result', 10));

      expect(result).toBe('result');
    });

    it('should handle task that throws error', async () => {
      const queue = new ConcurrencyQueue();

      await expect(queue.add(failingTask('test error'))).rejects.toThrow(
        'test error'
      );
    });

    it('should handle task that throws non-Error', async () => {
      const queue = new ConcurrencyQueue();

      await expect(
        queue.add(async () => {
          throw 'string error';
        })
      ).rejects.toThrow('string error');
    });

    it('should timeout slow tasks', async () => {
      const queue = new ConcurrencyQueue({ timeout: 50 });

      await expect(queue.add(delayedTask('slow', 100))).rejects.toThrow(
        /timed out after 50ms/
      );
    });

    it('should complete fast tasks within timeout', async () => {
      const queue = new ConcurrencyQueue({ timeout: 100 });
      const result = await queue.add(delayedTask('fast', 10));

      expect(result).toBe('fast');
    });
  });

  describe('concurrency control', () => {
    it('should limit concurrent executions', async () => {
      const queue = new ConcurrencyQueue({ concurrency: 2 });
      let running = 0;
      let maxRunning = 0;

      const task = async () => {
        running++;
        maxRunning = Math.max(maxRunning, running);
        await delay(50);
        running--;
        return running;
      };

      // Queue 5 tasks
      const promises = [
        queue.add(task),
        queue.add(task),
        queue.add(task),
        queue.add(task),
        queue.add(task),
      ];

      await Promise.all(promises);

      expect(maxRunning).toBeLessThanOrEqual(2);
    });

    it('should queue tasks beyond concurrency limit', async () => {
      const queue = new ConcurrencyQueue({ concurrency: 1 });

      queue.add(delayedTask(1, 50));
      queue.add(delayedTask(2, 50));
      queue.add(delayedTask(3, 50));

      await delay(10); // Let first task start

      const stats = queue.getStats();
      expect(stats.running).toBe(1);
      expect(stats.pending).toBe(2);
    });

    it('should process queued tasks after running tasks complete', async () => {
      const queue = new ConcurrencyQueue({ concurrency: 1 });

      const results = await Promise.all([
        queue.add(delayedTask('a', 10)),
        queue.add(delayedTask('b', 10)),
        queue.add(delayedTask('c', 10)),
      ]);

      expect(results).toEqual(['a', 'b', 'c']);
    });

    it('should handle concurrency of 1', async () => {
      const queue = new ConcurrencyQueue({ concurrency: 1 });
      const order: number[] = [];

      await Promise.all([
        queue.add(async () => {
          order.push(1);
          await delay(10);
        }),
        queue.add(async () => {
          order.push(2);
          await delay(10);
        }),
        queue.add(async () => {
          order.push(3);
        }),
      ]);

      expect(order).toEqual([1, 2, 3]);
    });

    it('should handle high concurrency', async () => {
      const queue = new ConcurrencyQueue({ concurrency: 100 });

      const results = await Promise.all(
        Array.from({ length: 50 }, (_, i) => queue.add(async () => i))
      );

      expect(results).toHaveLength(50);
    });
  });

  describe('addAll()', () => {
    it('should execute multiple tasks', async () => {
      const queue = new ConcurrencyQueue();

      const results = await queue.addAll([
        async () => 1,
        async () => 2,
        async () => 3,
      ]);

      expect(results).toEqual([1, 2, 3]);
    });

    it('should execute empty array of tasks', async () => {
      const queue = new ConcurrencyQueue();
      const results = await queue.addAll([]);

      expect(results).toEqual([]);
    });

    it('should handle mix of fast and slow tasks', async () => {
      const queue = new ConcurrencyQueue({ concurrency: 3 });

      const results = await queue.addAll([
        delayedTask('fast', 10),
        delayedTask('slow', 50),
        delayedTask('fast2', 10),
      ]);

      expect(results).toHaveLength(3);
      expect(results).toContain('fast');
      expect(results).toContain('slow');
    });

    it('should reject all if one task fails', async () => {
      const queue = new ConcurrencyQueue();

      await expect(
        queue.addAll([async () => 1, failingTask('error'), async () => 3])
      ).rejects.toThrow('error');
    });

    it('should handle large batch', async () => {
      const queue = new ConcurrencyQueue({ concurrency: 10 });

      const results = await queue.addAll(
        Array.from({ length: 100 }, (_, i) => async () => i)
      );

      expect(results).toHaveLength(100);
      expect(results[0]).toBe(0);
      expect(results[99]).toBe(99);
    });
  });

  describe('getStats()', () => {
    it('should return initial stats', () => {
      const queue = new ConcurrencyQueue();
      const stats = queue.getStats();

      expect(stats.running).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.total).toBe(0);
      expect(stats.concurrency).toBe(3);
    });

    it('should show running tasks', async () => {
      const queue = new ConcurrencyQueue({ concurrency: 2 });

      queue.add(delayedTask(1, 100));
      queue.add(delayedTask(2, 100));

      await delay(10);

      const stats = queue.getStats();
      expect(stats.running).toBe(2);
    });

    it('should show pending tasks', async () => {
      const queue = new ConcurrencyQueue({ concurrency: 1 });

      queue.add(delayedTask(1, 50));
      queue.add(delayedTask(2, 50));
      queue.add(delayedTask(3, 50));

      await delay(10);

      const stats = queue.getStats();
      expect(stats.running).toBe(1);
      expect(stats.pending).toBe(2);
      expect(stats.total).toBe(3);
    });

    it('should update stats as tasks complete', async () => {
      const queue = new ConcurrencyQueue({ concurrency: 2 });

      const promise = queue.add(delayedTask(1, 20));

      await delay(5);
      const before = queue.getStats();

      await promise;
      const after = queue.getStats();

      expect(before.running).toBe(1);
      expect(after.running).toBe(0);
    });
  });

  describe('clear()', () => {
    it('should clear pending tasks', async () => {
      const queue = new ConcurrencyQueue({ concurrency: 1 });

      queue.add(delayedTask(1, 100));
      const promise2 = queue.add(delayedTask(2, 10));
      const promise3 = queue.add(delayedTask(3, 10));

      await delay(10);

      queue.clear();

      await expect(promise2).rejects.toThrow('Queue cleared');
      await expect(promise3).rejects.toThrow('Queue cleared');

      const stats = queue.getStats();
      expect(stats.pending).toBe(0);
    });

    it('should not affect running tasks', async () => {
      const queue = new ConcurrencyQueue({ concurrency: 1 });

      const promise1 = queue.add(delayedTask('running', 50));
      queue.add(delayedTask('pending', 10));

      await delay(10);

      queue.clear();

      const result = await promise1;
      expect(result).toBe('running');
    });

    it('should handle clear on empty queue', () => {
      const queue = new ConcurrencyQueue();

      expect(() => queue.clear()).not.toThrow();

      const stats = queue.getStats();
      expect(stats.pending).toBe(0);
    });
  });

  describe('drain()', () => {
    it('should wait for all tasks to complete', async () => {
      const queue = new ConcurrencyQueue({ concurrency: 2 });

      queue.add(delayedTask(1, 50));
      queue.add(delayedTask(2, 50));
      queue.add(delayedTask(3, 50));

      await queue.drain();

      const stats = queue.getStats();
      expect(stats.running).toBe(0);
      expect(stats.pending).toBe(0);
    });

    it('should resolve immediately if queue is empty', async () => {
      const queue = new ConcurrencyQueue();

      await queue.drain();

      const stats = queue.getStats();
      expect(stats.total).toBe(0);
    });

    it('should wait for running tasks', async () => {
      const queue = new ConcurrencyQueue();
      let completed = false;

      queue.add(async () => {
        await delay(50);
        completed = true;
      });

      await queue.drain();

      expect(completed).toBe(true);
    });

    it('should handle drain after clear', async () => {
      const queue = new ConcurrencyQueue({ concurrency: 1 });

      queue.add(delayedTask(1, 50));
      queue.add(delayedTask(2, 10));

      await delay(10);
      queue.clear();

      await queue.drain();

      const stats = queue.getStats();
      expect(stats.total).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle task errors without breaking queue', async () => {
      const queue = new ConcurrencyQueue();

      await expect(queue.add(failingTask('error 1'))).rejects.toThrow(
        'error 1'
      );

      const result = await queue.add(async () => 'success');
      expect(result).toBe('success');
    });

    it('should continue processing after timeout', async () => {
      const queue = new ConcurrencyQueue({ concurrency: 1, timeout: 30 });

      await expect(queue.add(delayedTask(1, 50))).rejects.toThrow(/timed out/);

      const result = await queue.add(async () => 'next');
      expect(result).toBe('next');
    });

    it('should handle multiple errors', async () => {
      const queue = new ConcurrencyQueue();

      const promises = [
        queue.add(failingTask('error 1')),
        queue.add(failingTask('error 2')),
        queue.add(async () => 'success'),
      ];

      const results = await Promise.allSettled(promises);

      expect(results[0].status).toBe('rejected');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    });
  });

  describe('task ordering', () => {
    it('should process tasks in FIFO order', async () => {
      const queue = new ConcurrencyQueue({ concurrency: 1 });
      const order: number[] = [];

      await Promise.all([
        queue.add(async () => order.push(1)),
        queue.add(async () => order.push(2)),
        queue.add(async () => order.push(3)),
      ]);

      expect(order).toEqual([1, 2, 3]);
    });

    it('should maintain order with delays', async () => {
      const queue = new ConcurrencyQueue({ concurrency: 1 });
      const order: string[] = [];

      await Promise.all([
        queue.add(async () => {
          await delay(20);
          order.push('a');
        }),
        queue.add(async () => {
          await delay(10);
          order.push('b');
        }),
        queue.add(async () => {
          order.push('c');
        }),
      ]);

      expect(order).toEqual(['a', 'b', 'c']);
    });
  });
});

describe('limit()', () => {
  it('should create limited concurrency wrapper', async () => {
    const limited = limit(2);
    const result = await limited(async () => 42);

    expect(result).toBe(42);
  });

  it('should limit concurrent executions', async () => {
    const limited = limit(1);
    let running = 0;
    let maxRunning = 0;

    const task = async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await delay(20);
      running--;
    };

    await Promise.all([limited(task), limited(task), limited(task)]);

    expect(maxRunning).toBe(1);
  });

  it('should handle errors', async () => {
    const limited = limit(2);

    await expect(limited(failingTask('error'))).rejects.toThrow('error');
  });

  it('should work with different return types', async () => {
    const limited = limit(3);

    const str = await limited(async () => 'string');
    const num = await limited(async () => 123);
    const obj = await limited(async () => ({ key: 'value' }));

    expect(str).toBe('string');
    expect(num).toBe(123);
    expect(obj).toEqual({ key: 'value' });
  });
});

describe('batchProcess()', () => {
  it('should process array of items', async () => {
    const results = await batchProcess([1, 2, 3], async (item) => item * 2);

    expect(results).toEqual([2, 4, 6]);
  });

  it('should process empty array', async () => {
    const results = await batchProcess([], async (item) => item);

    expect(results).toEqual([]);
  });

  it('should pass index to function', async () => {
    const results = await batchProcess(
      ['a', 'b', 'c'],
      async (item, index) => `${item}-${index}`
    );

    expect(results).toEqual(['a-0', 'b-1', 'c-2']);
  });

  it('should respect concurrency limit', async () => {
    let running = 0;
    let maxRunning = 0;

    await batchProcess(
      [1, 2, 3, 4, 5],
      async (item) => {
        running++;
        maxRunning = Math.max(maxRunning, running);
        await delay(20);
        running--;
        return item;
      },
      { concurrency: 2 }
    );

    expect(maxRunning).toBeLessThanOrEqual(2);
  });

  it('should handle errors in batch', async () => {
    await expect(
      batchProcess([1, 2, 3], async (item) => {
        if (item === 2) throw new Error('error at 2');
        return item;
      })
    ).rejects.toThrow('error at 2');
  });

  it('should process large batches', async () => {
    const items = Array.from({ length: 100 }, (_, i) => i);

    const results = await batchProcess(items, async (item) => item * 2, {
      concurrency: 10,
    });

    expect(results).toHaveLength(100);
    expect(results[0]).toBe(0);
    expect(results[99]).toBe(198);
  });

  it('should work with different types', async () => {
    const results = await batchProcess(
      [{ value: 1 }, { value: 2 }],
      async (item) => item.value * 10
    );

    expect(results).toEqual([10, 20]);
  });

  it('should handle async operations', async () => {
    const results = await batchProcess(
      [10, 20, 30],
      async (item) => {
        await delay(5);
        return item + 1;
      },
      { concurrency: 2 }
    );

    expect(results).toEqual([11, 21, 31]);
  });

  it('should respect timeout option', async () => {
    await expect(
      batchProcess(
        [1, 2],
        async (item) => {
          await delay(100);
          return item;
        },
        { timeout: 50 }
      )
    ).rejects.toThrow(/timed out/);
  });
});
