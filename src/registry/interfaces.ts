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
  /** Matched artifact */
  artifact: Artifact;
  /** Relevance score (0-1) */
  score: number;
  /** Highlighted snippets */
  highlights?: Record<string, string[]>;
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
 * Cache interface
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
  /** Hit rate (hits / total) */
  hitRate: number;
  /** Total entries */
  entries: number;
  /** Total memory usage (bytes) */
  memoryUsage?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              SEARCH ENGINE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Search engine interface
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
