/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Enhanced Registry System - Core Interfaces (Phase 1.2A)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Multi-backend registry with advanced search, versioning, security, and caching.
 *
 * @packageDocumentation
 * @module @pcl/registry/interfaces
 * @version 2.0.0
 */

import type { Result } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
//                              ARTIFACT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Artifact type enum
 */
export enum ArtifactType {
  PERSONA = 'persona',
  TEAM = 'team',
  WORKFLOW = 'workflow',
  SKILL = 'skill',
}

/**
 * Artifact metadata
 */
export interface ArtifactMetadata {
  /** Human-readable name */
  name: string;
  /** URL-friendly slug (auto-generated if not provided) */
  slug?: string;
  /** Short description */
  description?: string;
  /** Semantic version (e.g., "1.2.3") */
  version: string;
  /** Author information */
  author?: string;
  /** Author email */
  authorEmail?: string;
  /** Organization name */
  organization?: string;
  /** License (e.g., "MIT", "Apache-2.0") */
  license?: string;
  /** Repository URL */
  repository?: string;
  /** Homepage URL */
  homepage?: string;
  /** Tags for categorization */
  tags: string[];
  /** Skills (for personas) */
  skills?: string[];
  /** Keywords for search */
  keywords?: string[];
  /** Custom metadata */
  custom?: Record<string, unknown>;
}

/**
 * Artifact statistics
 */
export interface ArtifactStats {
  /** Download count */
  downloads: number;
  /** Star count */
  stars: number;
  /** View count */
  views: number;
  /** Last accessed timestamp */
  lastAccessed?: Date;
}

/**
 * Base artifact interface
 */
export interface Artifact {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Artifact type */
  type: ArtifactType;
  /** Metadata */
  metadata: ArtifactMetadata;
  /** PCL source code */
  source: string;
  /** Statistics */
  stats: ArtifactStats;
  /** Created timestamp */
  createdAt: Date;
  /** Updated timestamp */
  updatedAt: Date;
  /** Published flag */
  published: boolean;
  /** Deleted flag (soft delete) */
  deleted: boolean;
}

/**
 * Artifact with dependencies
 */
export interface ArtifactWithDependencies extends Artifact {
  /** Dependency IDs */
  dependencies: string[];
}

/**
 * Version metadata
 */
export interface Version {
  /** Artifact ID */
  artifactId: string;
  /** Semantic version */
  version: string;
  /** PCL source code */
  source: string;
  /** Created timestamp */
  createdAt: Date;
  /** Changelog */
  changelog?: string;
  /** Published flag */
  published: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              QUERY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Query filter
 */
export interface QueryFilter {
  /** Filter by type */
  type?: ArtifactType | ArtifactType[];
  /** Filter by tags (OR logic) */
  tags?: string[];
  /** Filter by skills (OR logic) */
  skills?: string[];
  /** Filter by author */
  author?: string;
  /** Filter by organization */
  organization?: string;
  /** Filter by published status */
  published?: boolean;
  /** Filter by deleted status */
  deleted?: boolean;
  /** Custom field filters */
  custom?: Record<string, unknown>;
}

/**
 * Query sort options
 */
export interface QuerySort {
  /** Sort field */
  field: 'name' | 'createdAt' | 'updatedAt' | 'downloads' | 'stars' | 'views';
  /** Sort order */
  order: 'asc' | 'desc';
}

/**
 * Query pagination
 */
export interface QueryPagination {
  /** Offset (number of items to skip) */
  offset: number;
  /** Limit (max number of items to return) */
  limit: number;
}

/**
 * Complete query object
 */
export interface Query {
  /** Filter criteria */
  filter?: QueryFilter;
  /** Sort options */
  sort?: QuerySort;
  /** Pagination */
  pagination?: QueryPagination;
}

/**
 * Search criteria
 */
export interface SearchCriteria {
  /** Full-text search query */
  query: string;
  /** Fields to search (default: all) */
  fields?: ('name' | 'description' | 'tags' | 'skills' | 'source')[];
  /** Filter criteria */
  filter?: QueryFilter;
  /** Sort options */
  sort?: QuerySort;
  /** Pagination */
  pagination?: QueryPagination;
  /** Fuzzy matching (typo tolerance) */
  fuzzy?: boolean;
  /** Highlighting */
  highlight?: boolean;
}

/**
 * Search result with highlights
 */
export interface SearchResult {
  /** Result ID */
  id?: string;
  /** Matched artifact */
  artifact?: Artifact;
  /** Relevance score (0-1) */
  score: number;
  /** Highlighted snippets */
  highlights?: Record<string, string[]>;
}

/**
 * Search options (Phase 1.2C)
 */
export interface SearchOptions {
  /** Offset for pagination */
  offset?: number;
  /** Limit for pagination */
  limit?: number;
  /** Sort field */
  sortBy?: string;
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
  /** Filter by tags */
  tags?: string[];
  /** Filter by kind/type */
  kind?: string;
  /** Filter by author */
  author?: string;
  /** Enable fuzzy matching */
  fuzzy?: boolean;
  /** Boost popular results */
  boostPopular?: boolean;
  /** Facets to return */
  facets?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              BACKEND INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Transaction context
 */
export interface Transaction {
  /** Transaction ID */
  id: string;
  /** Commit the transaction */
  commit(): Promise<Result<void>>;
  /** Rollback the transaction */
  rollback(): Promise<Result<void>>;
}

/**
 * Backend interface for registry storage
 */
export interface IBackend {
  /**
   * Connect to the backend
   */
  connect(): Promise<Result<void>>;

  /**
   * Disconnect from the backend
   */
  disconnect(): Promise<Result<void>>;

  /**
   * Check if backend is connected
   */
  isConnected(): boolean;

  // ═══════════════════════════════════════════════════════════════════════════
  //                              CRUD OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new artifact
   */
  create(artifact: Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<Artifact>>;

  /**
   * Read an artifact by ID
   */
  read(id: string): Promise<Result<Artifact | null>>;

  /**
   * Update an artifact
   */
  update(id: string, artifact: Partial<Artifact>): Promise<Result<Artifact>>;

  /**
   * Delete an artifact (soft delete)
   */
  delete(id: string): Promise<Result<boolean>>;

  /**
   * Purge an artifact (hard delete)
   */
  purge(id: string): Promise<Result<boolean>>;

  // ═══════════════════════════════════════════════════════════════════════════
  //                              QUERY OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Find artifacts matching a query
   */
  find(query: Query): Promise<Result<Artifact[]>>;

  /**
   * Count artifacts matching a query
   */
  count(query: Query): Promise<Result<number>>;

  /**
   * Find one artifact matching a query
   */
  findOne(query: Query): Promise<Result<Artifact | null>>;

  // ═══════════════════════════════════════════════════════════════════════════
  //                              VERSION OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new version
   */
  createVersion(version: Omit<Version, 'createdAt'>): Promise<Result<Version>>;

  /**
   * Get all versions for an artifact
   */
  listVersions(artifactId: string): Promise<Result<Version[]>>;

  /**
   * Get a specific version
   */
  getVersion(artifactId: string, version: string): Promise<Result<Version | null>>;

  // ═══════════════════════════════════════════════════════════════════════════
  //                              TRANSACTION OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Begin a transaction
   */
  beginTransaction(): Promise<Result<Transaction>>;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              CACHE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cache backend interface (Phase 1.2C)
 */
export interface CacheBackend {
  /**
   * Get a value from cache
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value in cache with optional TTL (in seconds)
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Delete a value from cache
   */
  delete(key: string): Promise<void>;

  /**
   * Check if key exists in cache
   */
  has(key: string): Promise<boolean>;

  /**
   * Get remaining TTL for a key (in seconds)
   * Returns -1 for no expiry, -2 for key not found
   */
  ttl(key: string): Promise<number>;

  /**
   * Clear all cache entries
   */
  clear(): Promise<void>;

  /**
   * Get cache statistics
   */
  getStats(): CacheStats;

  /**
   * Reset statistics
   */
  resetStats(): void;

  /**
   * Get cache size (number of entries)
   */
  size(): Promise<number>;

  /**
   * Get keys matching a pattern
   */
  keys(pattern: string): Promise<string[]>;

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidatePattern(pattern: string): Promise<number>;

  /**
   * Get multiple values at once
   */
  mget<T>(keys: string[]): Promise<Map<string, T>>;

  /**
   * Set multiple values at once
   */
  mset<T>(entries: Map<string, T>, ttl?: number): Promise<void>;
}

/**
 * Cache interface (legacy, wraps CacheBackend)
 */
export interface ICache {
  /**
   * Get a value from cache
   */
  get<T>(key: string): Promise<Result<T | null>>;

  /**
   * Set a value in cache with optional TTL
   */
  set<T>(key: string, value: T, ttl?: number): Promise<Result<void>>;

  /**
   * Delete a value from cache
   */
  delete(key: string): Promise<Result<void>>;

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidate(pattern: string): Promise<Result<number>>;

  /**
   * Clear all cache entries
   */
  clear(): Promise<Result<void>>;

  /**
   * Get cache statistics
   */
  stats(): Promise<Result<CacheStats>>;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Hit count */
  hits: number;
  /** Miss count */
  misses: number;
  /** Set count */
  sets: number;
  /** Delete count */
  deletes: number;
  /** Error count */
  errors: number;
  /** Average latency (ms) */
  avgLatency: number;
  /** Evictions (LRU) */
  evictions?: number;
  /** Hit rate (hits / total) percentage */
  hitRate?: number;
  /** Total entries */
  size?: number;
  /** Max size */
  maxSize?: number;
  /** Total memory usage (bytes) */
  memoryUsage?: number;
  /** Layer-specific stats */
  layers?: CacheStats[];
  /** L1 hit count */
  l1Hits?: number;
  /** L2 hit count */
  l2Hits?: number;
  /** L3 hit count */
  l3Hits?: number;
  /** L1 hit rate */
  l1HitRate?: number;
  /** L2 hit rate */
  l2HitRate?: number;
  /** L3 hit rate */
  l3HitRate?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              SEARCH ENGINE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Search backend interface (Phase 1.2C)
 */
export interface SearchBackend {
  /**
   * Initialize search backend
   */
  initialize(): Promise<void>;

  /**
   * Index a document
   */
  index(id: string, document: Record<string, unknown>): Promise<void>;

  /**
   * Search documents
   */
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;

  /**
   * Get autocomplete suggestions
   */
  suggest(prefix: string, limit?: number): Promise<string[]>;

  /**
   * Delete document from index
   */
  delete(id: string): Promise<void>;

  /**
   * Clear all indexed documents
   */
  clear(): Promise<void>;
}

/**
 * Search engine interface (legacy)
 */
export interface ISearchEngine {
  /**
   * Index an artifact
   */
  index(artifact: Artifact): Promise<Result<void>>;

  /**
   * Index multiple artifacts
   */
  indexBulk(artifacts: Artifact[]): Promise<Result<number>>;

  /**
   * Remove an artifact from index
   */
  remove(id: string): Promise<Result<void>>;

  /**
   * Search artifacts
   */
  search(criteria: SearchCriteria): Promise<Result<SearchResult[]>>;

  /**
   * Update an artifact in index
   */
  update(artifact: Artifact): Promise<Result<void>>;

  /**
   * Clear all indexed artifacts
   */
  clear(): Promise<Result<void>>;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              REGISTRY INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Registry interface
 */
export interface IRegistry {
  // ═══════════════════════════════════════════════════════════════════════════
  //                              CRUD OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new artifact
   */
  create(artifact: Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<Artifact>>;

  /**
   * Read an artifact by ID
   */
  read(id: string): Promise<Result<Artifact | null>>;

  /**
   * Read an artifact by slug
   */
  readBySlug(slug: string): Promise<Result<Artifact | null>>;

  /**
   * Update an artifact
   */
  update(id: string, artifact: Partial<Artifact>): Promise<Result<Artifact>>;

  /**
   * Delete an artifact
   */
  delete(id: string): Promise<Result<boolean>>;

  // ═══════════════════════════════════════════════════════════════════════════
  //                              QUERY OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Find artifacts matching a query
   */
  find(query: Query): Promise<Result<Artifact[]>>;

  /**
   * Count artifacts matching a query
   */
  count(query: Query): Promise<Result<number>>;

  /**
   * Search artifacts (full-text search)
   */
  search(criteria: SearchCriteria): Promise<Result<SearchResult[]>>;

  // ═══════════════════════════════════════════════════════════════════════════
  //                              VERSION OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * List all versions of an artifact
   */
  listVersions(artifactId: string): Promise<Result<Version[]>>;

  /**
   * Get a specific version
   */
  getVersion(artifactId: string, version: string): Promise<Result<Version | null>>;

  /**
   * Publish a version
   */
  publish(artifactId: string, version: string): Promise<Result<boolean>>;

  // ═══════════════════════════════════════════════════════════════════════════
  //                              UTILITY OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get registry statistics
   */
  stats(): Promise<Result<RegistryStats>>;

  /**
   * Clear cache
   */
  clearCache(): Promise<Result<void>>;
}

/**
 * Registry statistics
 */
export interface RegistryStats {
  /** Total artifacts */
  total: number;
  /** Artifacts by type */
  byType: Record<ArtifactType, number>;
  /** Total downloads */
  totalDownloads: number;
  /** Total stars */
  totalStars: number;
  /** Cache statistics */
  cache?: CacheStats;
}
