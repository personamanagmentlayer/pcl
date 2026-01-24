/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL Registry - Memory Cache Implementation
 * Phase 1.2C: In-Process LRU Cache
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { CacheBackend, CacheStats } from '../interfaces';

export interface MemoryCacheConfig {
  maxSize?: number;
  defaultTTL?: number; // milliseconds
  cleanupInterval?: number; // milliseconds
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  lastAccessed: number;
}

/**
 * In-memory LRU cache with TTL support
 * Thread-safe for single-process use
 */
export class MemoryCache implements CacheBackend {
  private readonly cache: Map<string, CacheEntry<unknown>>;
  private readonly config: Required<MemoryCacheConfig>;
  private stats: CacheStats;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: MemoryCacheConfig = {}) {
    this.config = {
      maxSize: config.maxSize || 1000,
      defaultTTL: config.defaultTTL || 3600000, // 1 hour in ms
      cleanupInterval: config.cleanupInterval || 60000, // 1 minute
    };

    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      avgLatency: 0,
      evictions: 0,
    };

    // Start cleanup timer
    this.startCleanup();
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.removeExpired();
    }, this.config.cleanupInterval);

    // Don't prevent Node.js from exiting
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop cleanup timer
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Remove expired entries
   */
  private removeExpired(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt > 0 && entry.expiresAt <= now) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.stats.deletes += removed;
    }

    return removed;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      this.cache.delete(oldestKey);
      this.stats.evictions = (this.stats.evictions || 0) + 1;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const start = Date.now();

    try {
      const entry = this.cache.get(key) as CacheEntry<T> | undefined;

      if (!entry) {
        this.stats.misses++;
        this.updateLatency(Date.now() - start);
        return null;
      }

      // Check if expired
      const now = Date.now();
      if (entry.expiresAt > 0 && entry.expiresAt <= now) {
        this.cache.delete(key);
        this.stats.misses++;
        this.stats.deletes++;
        this.updateLatency(Date.now() - start);
        return null;
      }

      // Update last accessed time (LRU)
      entry.lastAccessed = now;

      this.stats.hits++;
      this.updateLatency(Date.now() - start);
      return entry.value;
    } catch (error) {
      this.stats.errors++;
      this.stats.misses++;
      console.error(`Memory cache get error for key "${key}":`, error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const start = Date.now();

    try {
      // Evict if at max size and key doesn't exist
      if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
        this.evictLRU();
      }

      const now = Date.now();
      const ttlMs = ttl ? ttl * 1000 : this.config.defaultTTL;
      const expiresAt = ttlMs > 0 ? now + ttlMs : 0; // 0 means no expiry

      this.cache.set(key, {
        value,
        expiresAt,
        lastAccessed: now,
      });

      this.stats.sets++;
      this.updateLatency(Date.now() - start);
    } catch (error) {
      this.stats.errors++;
      console.error(`Memory cache set error for key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      const deleted = this.cache.delete(key);
      if (deleted) {
        this.stats.deletes++;
      }
    } catch (error) {
      this.stats.errors++;
      console.error(`Memory cache delete error for key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      const size = this.cache.size;
      this.cache.clear();
      this.stats.deletes += size;
    } catch (error) {
      this.stats.errors++;
      console.error('Memory cache clear error:', error);
      throw error;
    }
  }

  /**
   * Check if key exists in cache (and not expired)
   */
  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    const now = Date.now();
    if (entry.expiresAt > 0 && entry.expiresAt <= now) {
      this.cache.delete(key);
      this.stats.deletes++;
      return false;
    }

    return true;
  }

  /**
   * Get remaining TTL for a key (in seconds)
   */
  async ttl(key: string): Promise<number> {
    const entry = this.cache.get(key);
    if (!entry) return -2; // Key doesn't exist

    if (entry.expiresAt === 0) return -1; // No expiry

    const now = Date.now();
    const remaining = entry.expiresAt - now;

    if (remaining <= 0) {
      this.cache.delete(key);
      this.stats.deletes++;
      return -2;
    }

    return Math.ceil(remaining / 1000); // Convert to seconds
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      hitRate: this.calculateHitRate(),
      size: this.cache.size,
      maxSize: this.config.maxSize,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      avgLatency: 0,
      evictions: 0,
    };
  }

  /**
   * Calculate cache hit rate
   */
  private calculateHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    if (total === 0) return 0;
    return (this.stats.hits / total) * 100;
  }

  /**
   * Update average latency
   */
  private updateLatency(latency: number): void {
    const total = this.stats.hits + this.stats.misses + this.stats.sets;
    if (total === 0) {
      this.stats.avgLatency = latency;
    } else {
      this.stats.avgLatency =
        (this.stats.avgLatency * (total - 1) + latency) / total;
    }
  }

  /**
   * Get cache size (number of entries)
   */
  async size(): Promise<number> {
    return this.cache.size;
  }

  /**
   * Get keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    const regex = this.patternToRegex(pattern);
    const matchingKeys: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        matchingKeys.push(key);
      }
    }

    return matchingKeys;
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const keys = await this.keys(pattern);
    let count = 0;

    for (const key of keys) {
      await this.delete(key);
      count++;
    }

    return count;
  }

  /**
   * Convert glob pattern to regex
   */
  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      .replace(/\*/g, '.*') // * matches any characters
      .replace(/\?/g, '.'); // ? matches single character

    return new RegExp(`^${escaped}$`);
  }

  /**
   * Get multiple values at once
   */
  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();

    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== null) {
        result.set(key, value);
      }
    }

    return result;
  }

  /**
   * Set multiple values at once
   */
  async mset<T>(entries: Map<string, T>, ttl?: number): Promise<void> {
    for (const [key, value] of entries.entries()) {
      await this.set(key, value, ttl);
    }
  }

  /**
   * Get all keys in cache
   */
  getAllKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get memory usage estimate (bytes)
   */
  getMemoryUsage(): number {
    let bytes = 0;

    for (const [key, entry] of this.cache.entries()) {
      bytes += key.length * 2; // Approx 2 bytes per char
      bytes += JSON.stringify(entry.value).length * 2;
      bytes += 24; // expiresAt + lastAccessed (8 bytes each) + overhead
    }

    return bytes;
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    this.stopCleanup();
    this.cache.clear();
    this.resetStats();
  }
}
