/**
 * Mock Cache for Registry Tests
 */

import { Ok, Err, type Result } from '../../../src/types';
import type { ICache, CacheStats } from '../../../src/registry/interfaces';

export class MockCache implements ICache {
  private store: Map<string, { value: any; expires: number }> = new Map();
  private hits: number = 0;
  private misses: number = 0;
  private shouldFail: boolean = false;

  async get<T>(key: string): Promise<Result<T | null>> {
    if (this.shouldFail) {
      return Err({
        code: 'CACHE_ERROR',
        message: 'Mock cache failure',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return Ok(null);
    }

    if (Date.now() > entry.expires) {
      this.store.delete(key);
      this.misses++;
      return Ok(null);
    }

    this.hits++;
    return Ok(entry.value as T);
  }

  async set<T>(key: string, value: T, ttl: number): Promise<Result<void>> {
    if (this.shouldFail) {
      return Err({
        code: 'CACHE_ERROR',
        message: 'Mock cache failure',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    const expires = Date.now() + ttl * 1000;
    this.store.set(key, { value, expires });
    return Ok(undefined);
  }

  async delete(key: string): Promise<Result<void>> {
    if (this.shouldFail) {
      return Err({
        code: 'CACHE_ERROR',
        message: 'Mock cache failure',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    this.store.delete(key);
    return Ok(undefined);
  }

  async invalidate(pattern: string): Promise<Result<number>> {
    if (this.shouldFail) {
      return Err({
        code: 'CACHE_ERROR',
        message: 'Mock cache failure',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    // Convert glob pattern to regex
    const regexPattern = pattern.replaceAll('*', '.*').replaceAll('?', '.');
    const regex = new RegExp(`^${regexPattern}$`);

    let deleted = 0;
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        deleted++;
      }
    }

    return Ok(deleted);
  }

  async clear(): Promise<Result<void>> {
    if (this.shouldFail) {
      return Err({
        code: 'CACHE_ERROR',
        message: 'Mock cache failure',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    this.store.clear();
    this.hits = 0;
    this.misses = 0;
    return Ok(undefined);
  }

  async stats(): Promise<Result<CacheStats>> {
    if (this.shouldFail) {
      return Err({
        code: 'CACHE_ERROR',
        message: 'Mock cache failure',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    const total = this.hits + this.misses;
    return Ok({
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      sets: 0,
      deletes: 0,
      errors: 0,
      avgLatency: 0,
      hitRate: total > 0 ? this.hits / total : 0,
    });
  }

  setShouldFail(fail: boolean): void {
    this.shouldFail = fail;
  }

  // Helper methods for testing
  size(): number {
    return this.store.size;
  }

  has(key: string): boolean {
    return this.store.has(key);
  }
}
