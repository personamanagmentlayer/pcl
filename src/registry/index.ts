/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Registry Module - Public API
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * @packageDocumentation
 * @module @pcl/registry
 * @version 2.0.0
 */

// Core interfaces
export * from './interfaces';

// Error classes
export * from './errors';

// Registry Manager (High-level API)
export { RegistryManager } from './manager';
export type { RegistryManagerConfig } from './manager';

// Backends
export { MemoryBackend } from './backends/memory';
export { JSONFileBackend } from './backends/json-file';
export type { JSONFileConfig } from './backends/json-file';
export { PostgreSQLBackend } from './backends/postgresql';
export type { PostgreSQLConfig } from './backends/postgresql';
export { SQLiteBackend } from './backends/sqlite';
export type { SQLiteConfig } from './backends/sqlite';

// Legacy exports (for backwards compatibility)
export { FileBackend } from './file-backend';

// Phase 1.2C: Caching Layer
export { RedisCache } from './cache/redis-cache';
export type { RedisCacheConfig } from './cache/redis-cache';
export { MemoryCache } from './cache/memory-cache';
export type { MemoryCacheConfig } from './cache/memory-cache';
export { MultiLayerCache } from './cache/multi-layer-cache';
export type { MultiLayerCacheConfig } from './cache/multi-layer-cache';

// Phase 1.2C: Search
export { ElasticsearchBackend } from './search/elasticsearch';
export type { ElasticsearchConfig, SearchAnalytics } from './search/elasticsearch';

// Phase 1.2C: Versioning
export { SemverManager } from './version/semver-manager';
export type {
  VersionInfo,
  VersionHistory,
  VersionRollback,
  VersionConstraint,
} from './version/semver-manager';
