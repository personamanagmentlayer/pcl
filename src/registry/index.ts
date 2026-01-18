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
