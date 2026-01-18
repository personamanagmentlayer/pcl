/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Memory Backend Implementation (Phase 1.2A)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * In-memory registry backend for testing and development.
 * Fast, simple, but data is not persisted.
 *
 * @packageDocumentation
 * @module @pcl/registry/backends/memory
 * @version 2.0.0
 */

import { randomUUID } from 'node:crypto';
import type { Result } from '../../types';
import { Ok, Err } from '../../types';
import type {
  Artifact,
  IBackend,
  Query,
  Transaction,
  Version,
} from '../interfaces';

// ═══════════════════════════════════════════════════════════════════════════════
//                              MEMORY TRANSACTION
// ═══════════════════════════════════════════════════════════════════════════════

class MemoryTransaction implements Transaction {
  public readonly id: string;
  private committed = false;
  private rolledBack = false;
  private readonly snapshot: Map<string, Artifact>;
  private readonly backend: MemoryBackend;

  constructor(backend: MemoryBackend, snapshot: Map<string, Artifact>) {
    this.id = randomUUID();
    this.backend = backend;
    this.snapshot = new Map(snapshot); // Clone the snapshot
  }

  async commit(): Promise<Result<void>> {
    if (this.committed) {
      return Err({
        code: 'TRANSACTION_ERROR',
        message: `Transaction ${this.id} already committed`,
        span: { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } },
      });
    }

    if (this.rolledBack) {
      return Err({
        code: 'TRANSACTION_ERROR',
        message: `Transaction ${this.id} already rolled back`,
        span: { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } },
      });
    }

    this.committed = true;
    return Ok(undefined);
  }

  async rollback(): Promise<Result<void>> {
    if (this.committed) {
      return Err({
        code: 'TRANSACTION_ERROR',
        message: `Transaction ${this.id} already committed`,
        span: { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } },
      });
    }

    if (this.rolledBack) {
      return Err({
        code: 'TRANSACTION_ERROR',
        message: `Transaction ${this.id} already rolled back`,
        span: { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } },
      });
    }

    // Restore snapshot
    this.backend.artifacts = new Map(this.snapshot);
    this.rolledBack = true;
    return Ok(undefined);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              MEMORY BACKEND
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * In-memory registry backend
 */
export class MemoryBackend implements IBackend {
  /** Artifacts storage (HashMap) */
  public artifacts: Map<string, Artifact>;

  /** Versions storage */
  private readonly versions: Map<string, Version[]>;

  /** Connection state */
  private connected: boolean;

  constructor() {
    this.artifacts = new Map();
    this.versions = new Map();
    this.connected = false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                              CONNECTION
  // ═══════════════════════════════════════════════════════════════════════════

  async connect(): Promise<Result<void>> {
    if (this.connected) {
      return Ok(undefined);
    }

    this.connected = true;
    return Ok(undefined);
  }

  async disconnect(): Promise<Result<void>> {
    if (!this.connected) {
      return Ok(undefined);
    }

    this.connected = false;
    return Ok(undefined);
  }

  isConnected(): boolean {
    return this.connected;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                              CRUD OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async create(artifact: Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<Artifact>> {
    if (!this.connected) {
      return Err({
        code: 'CONNECTION_ERROR',
        message: 'Backend not connected',
        span: { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } },
      });
    }

    // Check for duplicate by slug
    if (artifact.metadata.slug) {
      const existing = Array.from(this.artifacts.values()).find(
        (a) => a.metadata.slug === artifact.metadata.slug && !a.deleted
      );
      if (existing) {
        return Err({
          code: 'DUPLICATE',
          message: `Artifact with slug "${artifact.metadata.slug}" already exists`,
          span: { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } },
        });
      }
    }

    const now = new Date();
    const id = randomUUID();

    const newArtifact: Artifact = {
      ...artifact,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.artifacts.set(id, newArtifact);
    return Ok(newArtifact);
  }

  async read(id: string): Promise<Result<Artifact | null>> {
    if (!this.connected) {
      return Err({
        code: 'CONNECTION_ERROR',
        message: 'Backend not connected',
        span: { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } },
      });
    }

    const artifact = this.artifacts.get(id);
    return Ok(artifact || null);
  }

  async update(id: string, updates: Partial<Artifact>): Promise<Result<Artifact>> {
    if (!this.connected) {
      return Err({
        code: 'CONNECTION_ERROR',
        message: 'Backend not connected',
        span: { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } },
      });
    }

    const existing = this.artifacts.get(id);
    if (!existing) {
      return Err({
        code: 'NOT_FOUND',
        message: `Artifact with ID "${id}" not found`,
        span: { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } },
      });
    }

    // Check for duplicate slug if updating
    if (updates.metadata?.slug && updates.metadata.slug !== existing.metadata.slug) {
      const duplicate = Array.from(this.artifacts.values()).find(
        (a) => a.metadata.slug === updates.metadata!.slug && a.id !== id && !a.deleted
      );
      if (duplicate) {
        return Err({
          code: 'DUPLICATE',
          message: `Artifact with slug "${updates.metadata.slug}" already exists`,
          span: { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } },
        });
      }
    }

    const updated: Artifact = {
      ...existing,
      ...updates,
      id, // Preserve ID
      createdAt: existing.createdAt, // Preserve creation date
      updatedAt: new Date(),
      // Deep merge metadata
      metadata: {
        ...existing.metadata,
        ...updates.metadata,
      },
      // Deep merge stats
      stats: {
        ...existing.stats,
        ...updates.stats,
      },
    };

    this.artifacts.set(id, updated);
    return Ok(updated);
  }

  async delete(id: string): Promise<Result<boolean>> {
    if (!this.connected) {
      return Err({
        code: 'CONNECTION_ERROR',
        message: 'Backend not connected',
        span: { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } },
      });
    }

    const artifact = this.artifacts.get(id);
    if (!artifact) {
      return Ok(false);
    }

    // Soft delete
    const deleted: Artifact = {
      ...artifact,
      deleted: true,
      updatedAt: new Date(),
    };

    this.artifacts.set(id, deleted);
    return Ok(true);
  }

  async purge(id: string): Promise<Result<boolean>> {
    if (!this.connected) {
      return Err({
        code: 'CONNECTION_ERROR',
        message: 'Backend not connected',
        span: { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } },
      });
    }

    const existed = this.artifacts.has(id);
    this.artifacts.delete(id);
    this.versions.delete(id);
    return Ok(existed);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                              QUERY OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async find(query: Query): Promise<Result<Artifact[]>> {
    if (!this.connected) {
      return Err({
        code: 'CONNECTION_ERROR',
        message: 'Backend not connected',
        span: { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } },
      });
    }

    let results = Array.from(this.artifacts.values());

    // Apply filters
    if (query.filter) {
      results = this.applyFilters(results, query.filter);
    }

    // Apply sorting
    if (query.sort) {
      results = this.applySorting(results, query.sort);
    }

    // Apply pagination
    if (query.pagination) {
      const { offset, limit } = query.pagination;
      results = results.slice(offset, offset + limit);
    }

    return Ok(results);
  }

  async count(query: Query): Promise<Result<number>> {
    if (!this.connected) {
      return Err({
        code: 'CONNECTION_ERROR',
        message: 'Backend not connected',
        span: { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } },
      });
    }

    let results = Array.from(this.artifacts.values());

    // Apply filters
    if (query.filter) {
      results = this.applyFilters(results, query.filter);
    }

    return Ok(results.length);
  }

  async findOne(query: Query): Promise<Result<Artifact | null>> {
    const result = await this.find({ ...query, pagination: { offset: 0, limit: 1 } });
    if (!result.ok) {
      return Err(result.error);
    }

    return Ok(result.value[0] || null);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                              VERSION OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async createVersion(version: Omit<Version, 'createdAt'>): Promise<Result<Version>> {
    if (!this.connected) {
      return Err({
        code: 'CONNECTION_ERROR',
        message: 'Backend not connected',
        span: { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } },
      });
    }

    // Check if artifact exists
    const artifact = this.artifacts.get(version.artifactId);
    if (!artifact) {
      return Err({
        code: 'NOT_FOUND',
        message: `Artifact with ID "${version.artifactId}" not found`,
        span: { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } },
      });
    }

    // Check for duplicate version
    const existingVersions = this.versions.get(version.artifactId) || [];
    const duplicate = existingVersions.find((v) => v.version === version.version);
    if (duplicate) {
      return Err({
        code: 'DUPLICATE',
        message: `Version "${version.version}" already exists for artifact "${version.artifactId}"`,
        span: { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } },
      });
    }

    const newVersion: Version = {
      ...version,
      createdAt: new Date(),
    };

    existingVersions.push(newVersion);
    this.versions.set(version.artifactId, existingVersions);

    return Ok(newVersion);
  }

  async listVersions(artifactId: string): Promise<Result<Version[]>> {
    if (!this.connected) {
      return Err({
        code: 'CONNECTION_ERROR',
        message: 'Backend not connected',
        span: { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } },
      });
    }

    const versions = this.versions.get(artifactId) || [];
    // Sort by version (descending)
    const sorted = [...versions].sort((a, b) => b.version.localeCompare(a.version));
    return Ok(sorted);
  }

  async getVersion(artifactId: string, version: string): Promise<Result<Version | null>> {
    if (!this.connected) {
      return Err({
        code: 'CONNECTION_ERROR',
        message: 'Backend not connected',
        span: { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } },
      });
    }

    const versions = this.versions.get(artifactId) || [];
    const found = versions.find((v) => v.version === version);
    return Ok(found || null);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                              TRANSACTION OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async beginTransaction(): Promise<Result<Transaction>> {
    if (!this.connected) {
      return Err({
        code: 'CONNECTION_ERROR',
        message: 'Backend not connected',
        span: { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } },
      });
    }

    // Create snapshot of current state
    const snapshot = new Map(this.artifacts);
    const transaction = new MemoryTransaction(this, snapshot);
    return Ok(transaction);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                              HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private applyFilters(artifacts: Artifact[], filter: Query['filter']): Artifact[] {
    if (!filter) return artifacts;

    return artifacts.filter((artifact) => {
      // Type filter
      if (filter.type) {
        const types = Array.isArray(filter.type) ? filter.type : [filter.type];
        if (!types.includes(artifact.type)) {
          return false;
        }
      }

      // Tags filter (OR logic)
      if (filter.tags && filter.tags.length > 0) {
        const hasMatchingTag = filter.tags.some((tag) => artifact.metadata.tags.includes(tag));
        if (!hasMatchingTag) {
          return false;
        }
      }

      // Skills filter (OR logic)
      if (filter.skills && filter.skills.length > 0 && artifact.metadata.skills) {
        const hasMatchingSkill = filter.skills.some((skill) => artifact.metadata.skills!.includes(skill));
        if (!hasMatchingSkill) {
          return false;
        }
      }

      // Author filter
      if (filter.author && artifact.metadata.author !== filter.author) {
        return false;
      }

      // Organization filter
      if (filter.organization && artifact.metadata.organization !== filter.organization) {
        return false;
      }

      // Published filter
      if (filter.published !== undefined && artifact.published !== filter.published) {
        return false;
      }

      // Deleted filter
      if (filter.deleted !== undefined && artifact.deleted !== filter.deleted) {
        return false;
      }

      return true;
    });
  }

  private applySorting(artifacts: Artifact[], sort: Query['sort']): Artifact[] {
    if (!sort) return artifacts;

    const { field, order } = sort;

    return [...artifacts].sort((a, b) => {
      let comparison = 0;

      switch (field) {
        case 'name':
          comparison = a.metadata.name.localeCompare(b.metadata.name);
          break;
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'updatedAt':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
        case 'downloads':
          comparison = a.stats.downloads - b.stats.downloads;
          break;
        case 'stars':
          comparison = a.stats.stars - b.stats.stars;
          break;
        case 'views':
          comparison = a.stats.views - b.stats.views;
          break;
      }

      return order === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Clear all data (for testing)
   */
  async clear(): Promise<Result<void>> {
    this.artifacts.clear();
    this.versions.clear();
    return Ok(undefined);
  }
}
