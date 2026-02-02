/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL Registry - Redis Cache Implementation
 * Phase 1.2C: Distributed Caching Layer
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { CacheBackend, CacheStats } from '../interfaces';
import { createClient, RedisClientType } from 'redis';

export interface RedisCacheConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  defaultTTL?: number; // seconds
  maxRetries?: number;
  retryDelay?: number; // ms
}

/**
 * Redis-based distributed cache implementation
 * Provides high-performance caching with automatic TTL and pattern-based invalidation
 */
export class RedisCache implements CacheBackend {
  private client: RedisClientType;
  private readonly config: Required<RedisCacheConfig>;
  private stats: CacheStats;
  private isConnected: boolean = false;

  constructor(config: RedisCacheConfig = {}) {
    this.config = {
      url:
        config.url ||
        `redis://${config.host || 'localhost'}:${config.port || 6379}`,
      host: config.host || 'localhost',
      port: config.port || 6379,
      password: config.password || '',
      db: config.db || 0,
      keyPrefix: config.keyPrefix || 'pcl:registry:',
      defaultTTL: config.defaultTTL || 3600, // 1 hour
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 100,
    };

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      avgLatency: 0,
    };

    this.client = createClient({
      url: this.config.url,
      password: this.config.password || undefined,
      database: this.config.db,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > this.config.maxRetries) {
            return new Error('Max retry attempts reached');
          }
          return this.config.retryDelay * retries;
        },
      },
    });

    this.client.on('error', (err) => {
      this.stats.errors++;
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      this.isConnected = false;
    });
  }

  /**
   * Connect to Redis server
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await this.client.connect();
      this.isConnected = true;
    } catch (error) {
      this.stats.errors++;
      throw new Error(
        `Failed to connect to Redis: ${(error as Error).message}`
      );
    }
  }

  /**
   * Disconnect from Redis server
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.client.quit();
      this.isConnected = false;
    } catch (error) {
      this.stats.errors++;
      throw new Error(
        `Failed to disconnect from Redis: ${(error as Error).message}`
      );
    }
  }

  /**
   * Build full cache key with prefix
   */
  private buildKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const start = Date.now();

    try {
      const fullKey = this.buildKey(key);
      const value = await this.client.get(fullKey);

      const latency = Date.now() - start;
      this.updateLatency(latency);

      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return JSON.parse(value) as T;
    } catch (error) {
      this.stats.errors++;
      this.stats.misses++;
      console.error(`Redis get error for key "${key}":`, error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const start = Date.now();

    try {
      const fullKey = this.buildKey(key);
      const serialized = JSON.stringify(value);
      const expirySeconds = ttl || this.config.defaultTTL;

      await this.client.setEx(fullKey, expirySeconds, serialized);

      const latency = Date.now() - start;
      this.updateLatency(latency);
      this.stats.sets++;
    } catch (error) {
      this.stats.errors++;
      console.error(`Redis set error for key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      const fullKey = this.buildKey(key);
      await this.client.del(fullKey);
      this.stats.deletes++;
    } catch (error) {
      this.stats.errors++;
      console.error(`Redis delete error for key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      // Delete all keys with our prefix
      const pattern = `${this.config.keyPrefix}*`;
      const keys = await this.client.keys(pattern);

      if (keys.length > 0) {
        await this.client.del(keys);
      }

      this.stats.deletes += keys.length;
    } catch (error) {
      this.stats.errors++;
      console.error('Redis clear error:', error);
      throw error;
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   * Example: invalidatePattern('artifact:*') to clear all artifact cache
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const fullPattern = this.buildKey(pattern);
      const keys = await this.client.keys(fullPattern);

      if (keys.length > 0) {
        await this.client.del(keys);
      }

      this.stats.deletes += keys.length;
      return keys.length;
    } catch (error) {
      this.stats.errors++;
      console.error(
        `Redis invalidatePattern error for pattern "${pattern}":`,
        error
      );
      throw error;
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key);
      const exists = await this.client.exists(fullKey);
      return exists === 1;
    } catch (error) {
      this.stats.errors++;
      console.error(`Redis has error for key "${key}":`, error);
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(key: string): Promise<number> {
    try {
      const fullKey = this.buildKey(key);
      return await this.client.ttl(fullKey);
    } catch (error) {
      this.stats.errors++;
      console.error(`Redis ttl error for key "${key}":`, error);
      return -1;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      hitRate: this.calculateHitRate(),
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
    this.stats.avgLatency =
      (this.stats.avgLatency * (total - 1) + latency) / total;
  }

  /**
   * Get keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      const fullPattern = this.buildKey(pattern);
      const keys = await this.client.keys(fullPattern);

      // Remove key prefix from results
      return keys.map((key) => key.substring(this.config.keyPrefix.length));
    } catch (error) {
      this.stats.errors++;
      console.error(`Redis keys error for pattern "${pattern}":`, error);
      return [];
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmCache(
    loader: () => Promise<Map<string, unknown>>
  ): Promise<number> {
    try {
      const data = await loader();
      let count = 0;

      for (const [key, value] of data.entries()) {
        await this.set(key, value);
        count++;
      }

      return count;
    } catch (error) {
      this.stats.errors++;
      console.error('Cache warming error:', error);
      throw error;
    }
  }

  /**
   * Get cache size (number of keys with our prefix)
   */
  async size(): Promise<number> {
    try {
      const pattern = `${this.config.keyPrefix}*`;
      const keys = await this.client.keys(pattern);
      return keys.length;
    } catch (error) {
      this.stats.errors++;
      console.error('Redis size error:', error);
      return 0;
    }
  }

  /**
   * Check if connected to Redis
   */
  isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Get multiple values at once (pipeline)
   */
  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    const start = Date.now();
    const result = new Map<string, T>();

    try {
      const fullKeys = keys.map((k) => this.buildKey(k));
      const values = await this.client.mGet(fullKeys);

      const latency = Date.now() - start;
      this.updateLatency(latency);

      for (let i = 0; i < keys.length; i++) {
        const value = values[i];
        if (value !== null) {
          result.set(keys[i], JSON.parse(value) as T);
          this.stats.hits++;
        } else {
          this.stats.misses++;
        }
      }

      return result;
    } catch (error) {
      this.stats.errors++;
      console.error('Redis mget error:', error);
      return result;
    }
  }

  /**
   * Set multiple values at once (pipeline)
   */
  async mset<T>(entries: Map<string, T>, ttl?: number): Promise<void> {
    const start = Date.now();

    try {
      const pipeline = this.client.multi();
      const expirySeconds = ttl || this.config.defaultTTL;

      for (const [key, value] of entries.entries()) {
        const fullKey = this.buildKey(key);
        const serialized = JSON.stringify(value);
        pipeline.setEx(fullKey, expirySeconds, serialized);
      }

      await pipeline.exec();

      const latency = Date.now() - start;
      this.updateLatency(latency);
      this.stats.sets += entries.size;
    } catch (error) {
      this.stats.errors++;
      console.error('Redis mset error:', error);
      throw error;
    }
  }
}
