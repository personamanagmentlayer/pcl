/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Stream Utilities
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Async stream composition operators for workflow data processing
 *
 * @packageDocumentation
 * @module @pcl/runtime/streams
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type AsyncPredicate<T> = (value: T, index: number) => Promise<boolean> | boolean;
export type AsyncMapper<T, U> = (value: T, index: number) => Promise<U> | U;
export type AsyncReducer<T, U> = (acc: U, value: T, index: number) => Promise<U> | U;

// ═══════════════════════════════════════════════════════════════════════════════
//                              STREAM OPERATORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map operator - transform each value in the stream
 */
export async function* map<T, U>(
  source: AsyncIterable<T>,
  mapper: AsyncMapper<T, U>
): AsyncIterableIterator<U> {
  let index = 0;
  for await (const value of source) {
    yield await mapper(value, index++);
  }
}

/**
 * Filter operator - only emit values that pass the predicate
 */
export async function* filter<T>(
  source: AsyncIterable<T>,
  predicate: AsyncPredicate<T>
): AsyncIterableIterator<T> {
  let index = 0;
  for await (const value of source) {
    if (await predicate(value, index++)) {
      yield value;
    }
  }
}

/**
 * Take operator - emit only the first n values
 */
export async function* take<T>(
  source: AsyncIterable<T>,
  count: number
): AsyncIterableIterator<T> {
  let taken = 0;
  for await (const value of source) {
    if (taken >= count) break;
    yield value;
    taken++;
  }
}

/**
 * Skip operator - skip the first n values
 */
export async function* skip<T>(
  source: AsyncIterable<T>,
  count: number
): AsyncIterableIterator<T> {
  let skipped = 0;
  for await (const value of source) {
    if (skipped < count) {
      skipped++;
      continue;
    }
    yield value;
  }
}

/**
 * Debounce operator - emit value only after delay with no new values
 */
export async function* debounce<T>(
  source: AsyncIterable<T>,
  delayMs: number
): AsyncIterableIterator<T> {
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingValue: T | null = null;

  const iterator = source[Symbol.asyncIterator]();

  while (true) {
    const result = await iterator.next();
    if (result.done) {
      // Emit pending value if any
      if (pendingValue !== null) {
        yield pendingValue;
      }
      break;
    }

    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Store value and set new timeout
    pendingValue = result.value;

    await new Promise<void>((resolve) => {
      timeoutId = setTimeout(() => {
        resolve();
      }, delayMs);
    });

    // Emit value after delay
    if (pendingValue !== null) {
      yield pendingValue;
      pendingValue = null;
    }
  }
}

/**
 * Throttle operator - emit value at most once per time period
 */
export async function* throttle<T>(
  source: AsyncIterable<T>,
  periodMs: number
): AsyncIterableIterator<T> {
  let lastEmitTime = 0;

  for await (const value of source) {
    const now = Date.now();
    if (now - lastEmitTime >= periodMs) {
      yield value;
      lastEmitTime = now;
    }
  }
}

/**
 * Merge operator - combine multiple streams into one
 */
export async function* merge<T>(
  ...sources: AsyncIterable<T>[]
): AsyncIterableIterator<T> {
  const iterators = sources.map((source) => source[Symbol.asyncIterator]());
  const pending = new Set(iterators);

  while (pending.size > 0) {
    const promises = Array.from(pending).map(async (iterator) => ({
      iterator,
      result: await iterator.next(),
    }));

    const winner = await Promise.race(promises);

    if (winner.result.done) {
      pending.delete(winner.iterator);
    } else {
      yield winner.result.value;
    }
  }
}

/**
 * Concat operator - concatenate streams sequentially
 */
export async function* concat<T>(
  ...sources: AsyncIterable<T>[]
): AsyncIterableIterator<T> {
  for (const source of sources) {
    yield* source;
  }
}

/**
 * Reduce operator - accumulate values into a single result
 */
export async function reduce<T, U>(
  source: AsyncIterable<T>,
  reducer: AsyncReducer<T, U>,
  initialValue: U
): Promise<U> {
  let acc = initialValue;
  let index = 0;

  for await (const value of source) {
    acc = await reducer(acc, value, index++);
  }

  return acc;
}

/**
 * ToArray operator - collect all values into an array
 */
export async function toArray<T>(source: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const value of source) {
    result.push(value);
  }
  return result;
}

/**
 * Tap operator - perform side effects without modifying the stream
 */
export async function* tap<T>(
  source: AsyncIterable<T>,
  effect: (value: T, index: number) => void | Promise<void>
): AsyncIterableIterator<T> {
  let index = 0;
  for await (const value of source) {
    await effect(value, index++);
    yield value;
  }
}

/**
 * Buffer operator - collect values into buffers of specified size
 */
export async function* buffer<T>(
  source: AsyncIterable<T>,
  size: number
): AsyncIterableIterator<T[]> {
  let batch: T[] = [];

  for await (const value of source) {
    batch.push(value);
    if (batch.length >= size) {
      yield batch;
      batch = [];
    }
  }

  // Emit remaining values
  if (batch.length > 0) {
    yield batch;
  }
}

/**
 * Window operator - create sliding windows of values
 */
export async function* window<T>(
  source: AsyncIterable<T>,
  size: number
): AsyncIterableIterator<T[]> {
  const windowBuffer: T[] = [];

  for await (const value of source) {
    windowBuffer.push(value);
    if (windowBuffer.length > size) {
      windowBuffer.shift();
    }
    if (windowBuffer.length === size) {
      yield [...windowBuffer];
    }
  }
}

/**
 * Distinct operator - emit only unique values
 */
export async function* distinct<T>(
  source: AsyncIterable<T>,
  keySelector?: (value: T) => unknown
): AsyncIterableIterator<T> {
  const seen = new Set<unknown>();

  for await (const value of source) {
    const key = keySelector ? keySelector(value) : value;
    if (!seen.has(key)) {
      seen.add(key);
      yield value;
    }
  }
}

/**
 * Retry operator - retry failed operations
 */
export async function* retry<T>(
  sourceFactory: () => AsyncIterable<T>,
  maxAttempts: number,
  delayMs: number = 1000
): AsyncIterableIterator<T> {
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      const source = sourceFactory();
      yield* source;
      break; // Success, exit retry loop
    } catch (error) {
      attempt++;
      if (attempt >= maxAttempts) {
        throw error;
      }
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              STREAM CONSTRUCTORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a stream from an array
 */
export async function* fromArray<T>(array: T[]): AsyncIterableIterator<T> {
  for (const value of array) {
    yield value;
  }
}

/**
 * Create a stream from a promise
 */
export async function* fromPromise<T>(promise: Promise<T>): AsyncIterableIterator<T> {
  yield await promise;
}

/**
 * Create a stream from an interval
 */
export async function* interval(periodMs: number, count?: number): AsyncIterableIterator<number> {
  let i = 0;
  while (count === undefined || i < count) {
    await new Promise((resolve) => setTimeout(resolve, periodMs));
    yield i++;
  }
}

/**
 * Create an empty stream
 */
export async function* empty<T>(): AsyncIterableIterator<T> {
  // Yields nothing
}

/**
 * Create a stream that emits a single value
 */
export async function* of<T>(value: T): AsyncIterableIterator<T> {
  yield value;
}

/**
 * Create a range stream
 */
export async function* range(start: number, end: number, step: number = 1): AsyncIterableIterator<number> {
  for (let i = start; i < end; i += step) {
    yield i;
  }
}
