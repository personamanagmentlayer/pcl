/**
 * Tests for Stream Utilities
 * Async stream composition operators
 */

import {
  map,
  filter,
  take,
  skip,
  debounce,
  throttle,
  merge,
  concat,
  reduce,
  toArray,
  tap,
  buffer,
  window,
  distinct,
  retry,
  fromArray,
  fromPromise,
  interval,
  empty,
  of,
  range,
} from '../../src/runtime/streams';

// Helper to create async iterable from array
async function* asyncFrom<T>(arr: T[]): AsyncIterableIterator<T> {
  for (const item of arr) {
    yield item;
  }
}

// Helper to collect stream to array
async function collect<T>(stream: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const item of stream) {
    result.push(item);
  }
  return result;
}

describe('Stream Operators', () => {
  describe('map', () => {
    it('should transform each value', async () => {
      const source = asyncFrom([1, 2, 3]);
      const result = await collect(map(source, (x) => x * 2));

      expect(result).toEqual([2, 4, 6]);
    });

    it('should pass index to mapper', async () => {
      const source = asyncFrom(['a', 'b', 'c']);
      const result = await collect(map(source, (x, i) => `${x}-${i}`));

      expect(result).toEqual(['a-0', 'b-1', 'c-2']);
    });

    it('should handle async mapper', async () => {
      const source = asyncFrom([1, 2, 3]);
      const result = await collect(
        map(source, async (x) => {
          await new Promise((r) => setTimeout(r, 1));
          return x * 3;
        })
      );

      expect(result).toEqual([3, 6, 9]);
    });

    it('should handle empty stream', async () => {
      const source = asyncFrom([]);
      const result = await collect(map(source, (x) => x * 2));

      expect(result).toEqual([]);
    });
  });

  describe('filter', () => {
    it('should filter values by predicate', async () => {
      const source = asyncFrom([1, 2, 3, 4, 5]);
      const result = await collect(filter(source, (x) => x % 2 === 0));

      expect(result).toEqual([2, 4]);
    });

    it('should pass index to predicate', async () => {
      const source = asyncFrom(['a', 'b', 'c', 'd']);
      const result = await collect(filter(source, (x, i) => i % 2 === 0));

      expect(result).toEqual(['a', 'c']);
    });

    it('should handle async predicate', async () => {
      const source = asyncFrom([1, 2, 3]);
      const result = await collect(
        filter(source, async (x) => {
          await new Promise((r) => setTimeout(r, 1));
          return x > 1;
        })
      );

      expect(result).toEqual([2, 3]);
    });

    it('should handle filter that rejects all', async () => {
      const source = asyncFrom([1, 2, 3]);
      const result = await collect(filter(source, () => false));

      expect(result).toEqual([]);
    });
  });

  describe('take', () => {
    it('should take first n values', async () => {
      const source = asyncFrom([1, 2, 3, 4, 5]);
      const result = await collect(take(source, 3));

      expect(result).toEqual([1, 2, 3]);
    });

    it('should handle taking more than available', async () => {
      const source = asyncFrom([1, 2]);
      const result = await collect(take(source, 10));

      expect(result).toEqual([1, 2]);
    });

    it('should handle take(0)', async () => {
      const source = asyncFrom([1, 2, 3]);
      const result = await collect(take(source, 0));

      expect(result).toEqual([]);
    });
  });

  describe('skip', () => {
    it('should skip first n values', async () => {
      const source = asyncFrom([1, 2, 3, 4, 5]);
      const result = await collect(skip(source, 2));

      expect(result).toEqual([3, 4, 5]);
    });

    it('should handle skipping more than available', async () => {
      const source = asyncFrom([1, 2]);
      const result = await collect(skip(source, 10));

      expect(result).toEqual([]);
    });

    it('should handle skip(0)', async () => {
      const source = asyncFrom([1, 2, 3]);
      const result = await collect(skip(source, 0));

      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('throttle', () => {
    it('should throttle values', async () => {
      async function* fastSource() {
        for (let i = 0; i < 5; i++) {
          yield i;
          await new Promise((r) => setTimeout(r, 10));
        }
      }

      const result = await collect(throttle(fastSource(), 30));

      // Should emit first, then throttle middle values
      expect(result.length).toBeLessThan(5);
      expect(result[0]).toBe(0);
    });

    it('should handle slow source', async () => {
      async function* slowSource() {
        for (let i = 0; i < 3; i++) {
          yield i;
          await new Promise((r) => setTimeout(r, 100));
        }
      }

      const result = await collect(throttle(slowSource(), 10));

      expect(result).toEqual([0, 1, 2]);
    });
  });

  describe('concat', () => {
    it('should concatenate multiple streams', async () => {
      const s1 = asyncFrom([1, 2]);
      const s2 = asyncFrom([3, 4]);
      const s3 = asyncFrom([5]);

      const result = await collect(concat(s1, s2, s3));

      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle empty streams', async () => {
      const s1 = asyncFrom([1]);
      const s2 = asyncFrom([]);
      const s3 = asyncFrom([2]);

      const result = await collect(concat(s1, s2, s3));

      expect(result).toEqual([1, 2]);
    });

    it('should handle single stream', async () => {
      const result = await collect(concat(asyncFrom([1, 2, 3])));

      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('reduce', () => {
    it('should reduce stream to single value', async () => {
      const source = asyncFrom([1, 2, 3, 4]);
      const result = await reduce(source, (acc, x) => acc + x, 0);

      expect(result).toBe(10);
    });

    it('should pass index to reducer', async () => {
      const source = asyncFrom([1, 2, 3]);
      const result = await reduce(source, (acc, x, i) => acc + x * i, 0);

      expect(result).toBe(8); // 0 + 1*0 + 2*1 + 3*2 = 8
    });

    it('should handle async reducer', async () => {
      const source = asyncFrom([1, 2, 3]);
      const result = await reduce(
        source,
        async (acc, x) => {
          await new Promise((r) => setTimeout(r, 1));
          return acc + x;
        },
        0
      );

      expect(result).toBe(6);
    });

    it('should handle empty stream', async () => {
      const source = asyncFrom([]);
      const result = await reduce(source, (acc, x) => acc + x, 100);

      expect(result).toBe(100);
    });
  });

  describe('toArray', () => {
    it('should collect stream to array', async () => {
      const source = asyncFrom([1, 2, 3]);
      const result = await toArray(source);

      expect(result).toEqual([1, 2, 3]);
    });

    it('should handle empty stream', async () => {
      const source = asyncFrom([]);
      const result = await toArray(source);

      expect(result).toEqual([]);
    });
  });

  describe('tap', () => {
    it('should perform side effects', async () => {
      const effects: number[] = [];
      const source = asyncFrom([1, 2, 3]);

      const result = await collect(tap(source, (x) => effects.push(x * 2)));

      expect(result).toEqual([1, 2, 3]); // Original values
      expect(effects).toEqual([2, 4, 6]); // Side effects
    });

    it('should pass index to effect', async () => {
      const effects: string[] = [];
      const source = asyncFrom(['a', 'b']);

      await collect(tap(source, (x, i) => effects.push(`${x}-${i}`)));

      expect(effects).toEqual(['a-0', 'b-1']);
    });

    it('should handle async effect', async () => {
      const effects: number[] = [];
      const source = asyncFrom([1, 2]);

      await collect(
        tap(source, async (x) => {
          await new Promise((r) => setTimeout(r, 1));
          effects.push(x);
        })
      );

      expect(effects).toEqual([1, 2]);
    });
  });

  describe('buffer', () => {
    it('should buffer values into groups', async () => {
      const source = asyncFrom([1, 2, 3, 4, 5]);
      const result = await collect(buffer(source, 2));

      expect(result).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should emit remaining values', async () => {
      const source = asyncFrom([1, 2, 3]);
      const result = await collect(buffer(source, 2));

      expect(result).toEqual([[1, 2], [3]]);
    });

    it('should handle buffer size of 1', async () => {
      const source = asyncFrom([1, 2, 3]);
      const result = await collect(buffer(source, 1));

      expect(result).toEqual([[1], [2], [3]]);
    });
  });

  describe('window', () => {
    it('should create sliding windows', async () => {
      const source = asyncFrom([1, 2, 3, 4, 5]);
      const result = await collect(window(source, 3));

      expect(result).toEqual([
        [1, 2, 3],
        [2, 3, 4],
        [3, 4, 5],
      ]);
    });

    it('should handle window size of 1', async () => {
      const source = asyncFrom([1, 2, 3]);
      const result = await collect(window(source, 1));

      expect(result).toEqual([[1], [2], [3]]);
    });

    it('should wait until window is full', async () => {
      const source = asyncFrom([1, 2]);
      const result = await collect(window(source, 3));

      expect(result).toEqual([]);
    });
  });

  describe('distinct', () => {
    it('should emit only unique values', async () => {
      const source = asyncFrom([1, 2, 2, 3, 1, 4]);
      const result = await collect(distinct(source));

      expect(result).toEqual([1, 2, 3, 4]);
    });

    it('should handle key selector', async () => {
      const source = asyncFrom([
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
        { id: 1, name: 'c' },
      ]);

      const result = await collect(distinct(source, (x) => x.id));

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });

    it('should handle all duplicates', async () => {
      const source = asyncFrom([1, 1, 1]);
      const result = await collect(distinct(source));

      expect(result).toEqual([1]);
    });
  });
});

describe('Stream Constructors', () => {
  describe('fromArray', () => {
    it('should create stream from array', async () => {
      const result = await collect(fromArray([1, 2, 3]));

      expect(result).toEqual([1, 2, 3]);
    });

    it('should handle empty array', async () => {
      const result = await collect(fromArray([]));

      expect(result).toEqual([]);
    });
  });

  describe('fromPromise', () => {
    it('should create stream from promise', async () => {
      const promise = Promise.resolve(42);
      const result = await collect(fromPromise(promise));

      expect(result).toEqual([42]);
    });

    it('should handle rejected promise', async () => {
      const promise = Promise.reject(new Error('test error'));

      await expect(collect(fromPromise(promise))).rejects.toThrow('test error');
    });
  });

  describe('interval', () => {
    it('should create interval stream with count', async () => {
      const result = await collect(interval(10, 3));

      expect(result).toEqual([0, 1, 2]);
    });

    it('should create infinite interval when no count', async () => {
      const result: number[] = [];
      const stream = interval(10);

      for await (const value of stream) {
        result.push(value);
        if (value >= 2) break;
      }

      expect(result).toEqual([0, 1, 2]);
    });
  });

  describe('empty', () => {
    it('should create empty stream', async () => {
      const result = await collect(empty());

      expect(result).toEqual([]);
    });
  });

  describe('of', () => {
    it('should create stream with single value', async () => {
      const result = await collect(of(42));

      expect(result).toEqual([42]);
    });

    it('should handle object value', async () => {
      const obj = { key: 'value' };
      const result = await collect(of(obj));

      expect(result).toEqual([obj]);
    });
  });

  describe('range', () => {
    it('should create range stream', async () => {
      const result = await collect(range(0, 5));

      expect(result).toEqual([0, 1, 2, 3, 4]);
    });

    it('should handle custom step', async () => {
      const result = await collect(range(0, 10, 2));

      expect(result).toEqual([0, 2, 4, 6, 8]);
    });

    it('should handle negative range', async () => {
      const result = await collect(range(5, 0, -1));

      expect(result).toEqual([]);
    });

    it('should handle start equals end', async () => {
      const result = await collect(range(5, 5));

      expect(result).toEqual([]);
    });
  });
});

describe('Stream Composition', () => {
  it('should compose map and filter', async () => {
    const source = asyncFrom([1, 2, 3, 4, 5]);

    const result = await collect(
      map(
        filter(source, (x) => x % 2 === 0),
        (x) => x * 2
      )
    );

    expect(result).toEqual([4, 8]);
  });

  it('should compose take and skip', async () => {
    const source = asyncFrom([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    const result = await collect(take(skip(source, 3), 4));

    expect(result).toEqual([4, 5, 6, 7]);
  });

  it('should compose map, filter, and buffer', async () => {
    const source = asyncFrom([1, 2, 3, 4, 5, 6]);

    const result = await collect(
      buffer(
        filter(
          map(source, (x) => x * 2),
          (x) => x > 4
        ),
        2
      )
    );

    expect(result).toEqual([
      [6, 8],
      [10, 12],
    ]);
  });

  it('should compose distinct and map', async () => {
    const source = asyncFrom([1, 2, 2, 3, 1, 4]);

    const result = await collect(map(distinct(source), (x) => x * 10));

    expect(result).toEqual([10, 20, 30, 40]);
  });
});
