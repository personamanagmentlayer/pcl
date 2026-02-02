/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL Registry - Multi-Layer Cache Implementation
 * Phase 1.2C: L1 (Memory) → L2 (Redis) → L3 (Database) Cascade
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { CacheBackend, CacheStats } from '../interfaces';

export interface MultiLayerCacheConfig {
  /** L1 cache (fastest, smallest) */
  l1?: CacheBackend;
  /** L2 cache (medium speed, medium size) */
  l2?: CacheBackend;
  /** L3 cache (slowest, largest) - typically database */
  l3?: CacheBackend;
  /** Whether to populate upper layers on cache miss */
  populateOnMiss?: boolean;
  /** Whether to propagate sets to all layers */
  propagateSets?: boolean;
  /** Whether to propagate deletes to all layers */
  propagateDeletes?: boolean;
}

/**
 * Multi-layer cache with cascading lookups and automatic population
 *
 * Cache hierarchy:
 * - L1: In-memory (MemoryCache) - microsecond access
 * - L2: Distributed (RedisCache) - millisecond access
 * - L3: Database (PostgreSQL/SQLite) - tens of milliseconds
 *
 * Strategy:
 * - Reads: Try L1 → L2 → L3, populate upper layers on miss
 * - Writes: Propagate to all layers (configurable)
 * - Deletes: Invalidate all layers (configurable)
 */
export class MultiLayerCache implements CacheBackend {
  private readonly config: Required<MultiLayerCacheConfig>;
  private readonly layers: CacheBackend[];
  private stats: CacheStats;

  constructor(config: MultiLayerCacheConfig) {
    this.config = {
      l1: config.l1 || null!,
      l2: config.l2 || null!,
      l3: config.l3 || null!,
      populateOnMiss: config.populateOnMiss ?? true,
      propagateSets: config.propagateSets ?? true,
      propagateDeletes: config.propagateDeletes ?? true,
    };

    // Build active layers list (filter out nulls)
    this.layers = [this.config.l1, this.config.l2, this.config.l3].filter(
      (layer): layer is CacheBackend => layer !== null && layer !== undefined
    );

    if (this.layers.length === 0) {
      throw new Error('MultiLayerCache requires at least one cache layer');
    }

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      avgLatency: 0,
      l1Hits: 0,
      l2Hits: 0,
      l3Hits: 0,
    };
  }

  /**
   * Get value with cascading lookup
   * Try L1 → L2 → L3, populate upper layers on miss
   */
  async get<T>(key: string): Promise<T | null> {
    const start = Date.now();

    try {
      // Try each layer in order
      for (let i = 0; i < this.layers.length; i++) {
        const layer = this.layers[i];
        const value = await layer.get<T>(key);

        if (value !== null) {
          // Cache hit - record which layer
          this.stats.hits++;
          this.recordLayerHit(i);
          this.updateLatency(Date.now() - start);

          // Populate upper layers if enabled
          if (this.config.populateOnMiss && i > 0) {
            await this.populateUpperLayers(key, value, i);
          }

          return value;
        }
      }

      // Complete miss across all layers
      this.stats.misses++;
      this.updateLatency(Date.now() - start);
      return null;
    } catch (error) {
      this.stats.errors++;
      console.error(`Multi-layer cache get error for key "${key}":`, error);
      return null;
    }
  }

  /**
   * Set value in cache layers
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const start = Date.now();

    try {
      if (this.config.propagateSets) {
        // Propagate to all layers
        await Promise.all(
          this.layers.map((layer) => layer.set(key, value, ttl))
        );
      } else {
        // Only set in L1 (fastest layer)
        await this.layers[0].set(key, value, ttl);
      }

      this.stats.sets++;
      this.updateLatency(Date.now() - start);
    } catch (error) {
      this.stats.errors++;
      console.error(`Multi-layer cache set error for key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Delete value from cache layers
   */
  async delete(key: string): Promise<void> {
    try {
      if (this.config.propagateDeletes) {
        // Propagate to all layers
        await Promise.all(this.layers.map((layer) => layer.delete(key)));
      } else {
        // Only delete from L1
        await this.layers[0].delete(key);
      }

      this.stats.deletes++;
    } catch (error) {
      this.stats.errors++;
      console.error(`Multi-layer cache delete error for key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Clear all cache layers
   */
  async clear(): Promise<void> {
    try {
      await Promise.all(this.layers.map((layer) => layer.clear()));
      const layerCount = this.layers.length;
      this.stats.deletes += layerCount; // Approximate
    } catch (error) {
      this.stats.errors++;
      console.error('Multi-layer cache clear error:', error);
      throw error;
    }
  }

  /**
   * Check if key exists in any layer
   */
  async has(key: string): Promise<boolean> {
    for (const layer of this.layers) {
      if (await layer.has(key)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get TTL from first layer that has the key
   */
  async ttl(key: string): Promise<number> {
    for (const layer of this.layers) {
      const ttlValue = await layer.ttl(key);
      if (ttlValue !== -2) {
        // Key exists in this layer
        return ttlValue;
      }
    }
    return -2; // Key not found in any layer
  }

  /**
   * Get aggregated statistics from all layers
   */
  getStats(): CacheStats {
    const layerStats = this.layers.map((layer) => layer.getStats());

    return {
      ...this.stats,
      hitRate: this.calculateHitRate(),
      layers: layerStats,
      l1HitRate: ((this.stats.l1Hits || 0) / (this.stats.hits || 1)) * 100,
      l2HitRate: ((this.stats.l2Hits || 0) / (this.stats.hits || 1)) * 100,
      l3HitRate: ((this.stats.l3Hits || 0) / (this.stats.hits || 1)) * 100,
    };
  }

  /**
   * Reset statistics for all layers
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      avgLatency: 0,
      l1Hits: 0,
      l2Hits: 0,
      l3Hits: 0,
    };

    for (const layer of this.layers) {
      layer.resetStats();
    }
  }

  /**
   * Get total size across all layers
   */
  async size(): Promise<number> {
    const sizes = await Promise.all(this.layers.map((layer) => layer.size()));
    // Return size of L1 (most restrictive layer)
    return sizes[0] || 0;
  }

  /**
   * Get keys matching pattern from all layers
   */
  async keys(pattern: string): Promise<string[]> {
    const keySets = await Promise.all(
      this.layers.map((layer) => layer.keys(pattern))
    );

    // Merge and deduplicate keys from all layers
    const allKeys = new Set<string>();
    for (const keys of keySets) {
      for (const key of keys) {
        allKeys.add(key);
      }
    }

    return Array.from(allKeys);
  }

  /**
   * Invalidate pattern across all layers
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const counts = await Promise.all(
      this.layers.map((layer) => layer.invalidatePattern(pattern))
    );

    // Return max count (most comprehensive layer)
    return Math.max(...counts);
  }

  /**
   * Get multiple values with cascading lookup
   */
  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    const missingKeys = new Set(keys);

    // Try each layer in order
    for (const layer of this.layers) {
      if (missingKeys.size === 0) break;

      const layerResults = await layer.mget<T>(Array.from(missingKeys));

      for (const [key, value] of layerResults.entries()) {
        result.set(key, value);
        missingKeys.delete(key);
      }
    }

    return result;
  }

  /**
   * Set multiple values
   */
  async mset<T>(entries: Map<string, T>, ttl?: number): Promise<void> {
    if (this.config.propagateSets) {
      await Promise.all(this.layers.map((layer) => layer.mset(entries, ttl)));
    } else {
      await this.layers[0].mset(entries, ttl);
    }

    this.stats.sets += entries.size;
  }

  /**
   * Populate upper cache layers when value found in lower layer
   */
  private async populateUpperLayers<T>(
    key: string,
    value: T,
    foundAtLayer: number
  ): Promise<void> {
    try {
      // Populate all layers above the one where we found the value
      const promises: Promise<void>[] = [];
      for (let i = 0; i < foundAtLayer; i++) {
        promises.push(this.layers[i].set(key, value));
      }
      await Promise.all(promises);
    } catch (error) {
      // Non-critical error - log but don't throw
      console.warn(
        `Failed to populate upper cache layers for key "${key}":`,
        error
      );
    }
  }

  /**
   * Record cache hit by layer
   */
  private recordLayerHit(layerIndex: number): void {
    if (layerIndex === 0) {
      this.stats.l1Hits = (this.stats.l1Hits || 0) + 1;
    } else if (layerIndex === 1) {
      this.stats.l2Hits = (this.stats.l2Hits || 0) + 1;
    } else if (layerIndex === 2) {
      this.stats.l3Hits = (this.stats.l3Hits || 0) + 1;
    }
  }

  /**
   * Calculate overall hit rate
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
    const total = this.stats.hits + this.stats.misses;
    if (total === 0) {
      this.stats.avgLatency = latency;
    } else {
      this.stats.avgLatency =
        (this.stats.avgLatency * (total - 1) + latency) / total;
    }
  }

  /**
   * Get individual layer references
   */
  getLayer(index: number): CacheBackend | undefined {
    return this.layers[index];
  }

  /**
   * Get number of active layers
   */
  getLayerCount(): number {
    return this.layers.length;
  }
}
