/**
 * Response cache with semantic matching
 * Part of Q2 2025 Adaptive Intelligence - Phase 5
 */

import { SemanticMatcher } from './semantic-matcher.js';
import type { CacheConfig, CacheEntry, CacheStats } from './types.js';

/**
 * Message for caching
 */
export interface CacheMessage {
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Response cache with intelligent matching
 */
export class ResponseCache {
  private cache: Map<string, CacheEntry>;
  private config: CacheConfig;
  private matcher: SemanticMatcher;
  private stats: CacheStats;

  constructor(config: CacheConfig) {
    this.cache = new Map();
    this.config = config;
    this.matcher = new SemanticMatcher();
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalEntries: 0,
      costSaved: 0,
      latencySaved: 0,
    };
  }

  /**
   * Get cached response
   */
  async get(message: CacheMessage, personaId: string): Promise<any | null> {
    if (!this.config.enabled) {
      return null;
    }

    const key = this.computeKey(message, personaId);

    // Try exact match
    const exact = this.cache.get(key);
    if (exact && this.isValid(exact)) {
      this.recordHit(exact);
      return exact.response;
    }

    // Try semantic similarity search
    const similar = await this.findSimilar(message, personaId);
    if (similar && this.isValid(similar)) {
      this.recordHit(similar);
      return similar.response;
    }

    this.recordMiss();
    return null;
  }

  /**
   * Store response in cache
   */
  set(
    message: CacheMessage,
    response: any,
    metadata: {
      personaId: string;
      providerId: string;
      modelId: string;
      cost: number;
      latency: number;
      confidence: number;
    }
  ): void {
    if (!this.config.enabled) {
      return;
    }

    const key = this.computeKey(message, metadata.personaId);

    const entry: CacheEntry = {
      key,
      message: {
        content: message.content,
        metadata: message.metadata,
      },
      response,
      timestamp: Date.now(),
      hits: 0,
      metadata,
    };

    this.cache.set(key, entry);
    this.stats.totalEntries = this.cache.size;

    // Evict if over limit
    if (this.cache.size > this.config.maxEntries) {
      this.evict();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalEntries: 0,
      costSaved: 0,
      latencySaved: 0,
    };
  }

  /**
   * Export cache data
   */
  export(): CacheEntry[] {
    return Array.from(this.cache.values());
  }

  /**
   * Import cache data
   */
  import(entries: CacheEntry[]): void {
    this.cache.clear();
    for (const entry of entries) {
      this.cache.set(entry.key, entry);
    }
    this.stats.totalEntries = this.cache.size;
  }

  /**
   * Compute cache key
   */
  private computeKey(message: CacheMessage, personaId: string): string {
    const content = JSON.stringify({
      content: message.content,
      personaId,
      metadata: message.metadata || {},
    });

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return hash.toString(36);
  }

  /**
   * Find semantically similar entry
   */
  private async findSimilar(
    message: CacheMessage,
    personaId: string
  ): Promise<CacheEntry | null> {
    let bestMatch: CacheEntry | null = null;
    let bestScore = 0;

    for (const entry of this.cache.values()) {
      // Only match within same persona
      if (entry.metadata.personaId !== personaId) {
        continue;
      }

      const similarity = this.matcher.computeSimilarity(
        {
          content: message.content,
          metadata: { personaId, ...message.metadata },
        },
        {
          content: entry.message.content,
          metadata: {
            personaId: entry.metadata.personaId,
            ...entry.message.metadata,
          },
        }
      );

      if (
        similarity >= this.config.similarityThreshold &&
        similarity > bestScore
      ) {
        bestScore = similarity;
        bestMatch = entry;
      }
    }

    return bestMatch;
  }

  /**
   * Check if entry is still valid (not expired)
   */
  private isValid(entry: CacheEntry): boolean {
    const age = Date.now() - entry.timestamp;
    return age < this.config.ttl;
  }

  /**
   * Evict entries based on policy
   */
  private evict(): void {
    switch (this.config.evictionPolicy) {
      case 'lru':
        this.evictLRU();
        break;
      case 'lfu':
        this.evictLFU();
        break;
      case 'ttl':
        this.evictTTL();
        break;
    }
  }

  /**
   * Evict least recently used
   */
  private evictLRU(): void {
    let oldest: CacheEntry | null = null;
    let oldestKey: string | null = null;

    for (const [key, entry] of this.cache) {
      if (!oldest || entry.timestamp < oldest.timestamp) {
        oldest = entry;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.totalEntries = this.cache.size;
    }
  }

  /**
   * Evict least frequently used
   */
  private evictLFU(): void {
    let leastUsed: CacheEntry | null = null;
    let leastUsedKey: string | null = null;

    for (const [key, entry] of this.cache) {
      if (!leastUsed || entry.hits < leastUsed.hits) {
        leastUsed = entry;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
      this.stats.totalEntries = this.cache.size;
    }
  }

  /**
   * Evict expired entries
   */
  private evictTTL(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.config.ttl) {
        this.cache.delete(key);
      }
    }
    this.stats.totalEntries = this.cache.size;
  }

  /**
   * Record cache hit
   */
  private recordHit(entry: CacheEntry): void {
    entry.hits++;
    this.stats.hits++;
    this.stats.hitRate =
      this.stats.hits / (this.stats.hits + this.stats.misses);
    this.stats.costSaved += entry.metadata.cost;
    this.stats.latencySaved += entry.metadata.latency;
  }

  /**
   * Record cache miss
   */
  private recordMiss(): void {
    this.stats.misses++;
    this.stats.hitRate =
      this.stats.hits / (this.stats.hits + this.stats.misses);
  }
}
