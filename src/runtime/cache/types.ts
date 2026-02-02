/**
 * Response caching types
 * Part of Q2 2025 Adaptive Intelligence - Phase 5
 */

/**
 * Cache entry
 */
export interface CacheEntry {
  /** Cache key (hash) */
  key: string;

  /** Original message */
  message: {
    content: string;
    metadata?: Record<string, unknown>;
  };

  /** Cached response */
  response: any;

  /** Timestamp when cached */
  timestamp: number;

  /** Number of cache hits */
  hits: number;

  /** Metadata about the cached response */
  metadata: {
    personaId: string;
    providerId: string;
    modelId: string;
    cost: number;
    latency: number;
    confidence: number;
  };
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total cache hits */
  hits: number;

  /** Total cache misses */
  misses: number;

  /** Hit rate (0-1) */
  hitRate: number;

  /** Total entries in cache */
  totalEntries: number;

  /** Total cost saved (USD) */
  costSaved: number;

  /** Total latency saved (ms) */
  latencySaved: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Enable caching */
  enabled: boolean;

  /** Time to live in milliseconds */
  ttl: number;

  /** Maximum number of entries */
  maxEntries: number;

  /** Similarity threshold for semantic matching (0-1) */
  similarityThreshold: number;

  /** Eviction policy */
  evictionPolicy: 'lru' | 'lfu' | 'ttl';
}

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  ttl: 3600000, // 1 hour
  maxEntries: 1000,
  similarityThreshold: 0.95,
  evictionPolicy: 'lru',
};
