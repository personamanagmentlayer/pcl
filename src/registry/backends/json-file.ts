/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * JSON File Backend Implementation
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Simple file-based backend that persists registry data to a JSON file.
 * Perfect for local development without database dependencies.
 *
 * @packageDocumentation
 * @module @pcl/registry/backends/json-file
 * @version 1.0.0
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Result } from '../../types';
import { Ok, Err } from '../../types';
import type {
  Artifact,
  ArtifactType,
  IBackend,
  Query,
  Transaction,
  Version,
} from '../interfaces';
import { NotFoundError, DuplicateError } from '../errors';

// ═══════════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface JSONFileConfig {
  /** Path to JSON file */
  filePath: string;
  /** Pretty-print JSON (easier to read, larger file size) */
  pretty?: boolean;
  /** Auto-save on every change (true) or manual save (false) */
  autoSave?: boolean;
}

interface RegistryData {
  artifacts: Record<string, Artifact>;
  versions: Record<string, Version[]>;
  lastModified: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * JSON file-based backend
 *
 * Stores all registry data in a single JSON file. Simple, portable,
 * and requires no external dependencies.
 */
export class JSONFileBackend implements IBackend {
  private config: JSONFileConfig;
  private data: RegistryData;
  private connected: boolean = false;

  isConnected(): boolean {
    return this.connected;
  }

  constructor(config: JSONFileConfig) {
    this.config = {
      pretty: true,
      autoSave: true,
      ...config,
    };

    this.data = {
      artifacts: {},
      versions: {},
      lastModified: new Date().toISOString(),
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  //                              CONNECTION
  // ═════════════════════════════════════════════════════════════════════════════

  async connect(): Promise<Result<void>> {
    try {
      // Ensure directory exists
      const dir = dirname(this.config.filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      // Load existing data if file exists
      if (existsSync(this.config.filePath)) {
        const content = readFileSync(this.config.filePath, 'utf-8');
        const rawData = JSON.parse(content);

        // Convert date strings back to Date objects
        this.data = this.deserialize(rawData);
      } else {
        // Create new file with empty data
        this.save();
      }

      this.connected = true;
      return Ok(undefined);
    } catch (error) {
      return Err({
        code: 'CONNECTION_ERROR',
        message: `Failed to connect to JSON file: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  async disconnect(): Promise<Result<void>> {
    if (this.connected) {
      // Final save on disconnect
      this.save();
      this.connected = false;
    }
    return Ok(undefined);
  }

  async migrate(): Promise<Result<void>> {
    // No migrations needed for JSON file backend
    return Ok(undefined);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  //                              CRUD OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  async create(
    artifact: Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Result<Artifact>> {
    const id = randomUUID();
    const now = new Date();

    const newArtifact: Artifact = {
      ...artifact,
      id,
      createdAt: now,
      updatedAt: now,
      stats: {
        downloads: 0,
        stars: 0,
        views: 0,
      },
    };

    // Check for duplicate slug
    if (artifact.metadata.slug) {
      const existing = Object.values(this.data.artifacts).find(
        (a) => a.metadata.slug === artifact.metadata.slug && !a.deleted
      );
      if (existing) {
        return Err({
          code: 'DUPLICATE_ERROR',
          message: `Artifact with slug "${artifact.metadata.slug}" already exists`,
        });
      }
    }

    this.data.artifacts[id] = newArtifact;
    this.data.lastModified = now.toISOString();

    if (this.config.autoSave) {
      this.save();
    }

    return Ok(newArtifact);
  }

  async read(id: string): Promise<Result<Artifact | null>> {
    const artifact = this.data.artifacts[id];
    return Ok(artifact || null);
  }

  async update(
    id: string,
    updates: Partial<Artifact>
  ): Promise<Result<Artifact>> {
    const artifact = this.data.artifacts[id];
    if (!artifact) {
      return Err({
        code: 'NOT_FOUND',
        message: `Artifact not found: ${id}`,
      });
    }

    const now = new Date();
    const updated: Artifact = {
      ...artifact,
      ...updates,
      id, // Preserve ID
      createdAt: artifact.createdAt, // Preserve creation time
      updatedAt: now,
    };

    this.data.artifacts[id] = updated;
    this.data.lastModified = now.toISOString();

    if (this.config.autoSave) {
      this.save();
    }

    return Ok(updated);
  }

  async delete(id: string): Promise<Result<boolean>> {
    const artifact = this.data.artifacts[id];
    if (!artifact) {
      return Err({
        code: 'NOT_FOUND',
        message: `Artifact not found: ${id}`,
      });
    }

    // Soft delete
    const now = new Date();
    artifact.deleted = true;
    artifact.updatedAt = now;
    this.data.lastModified = now.toISOString();

    if (this.config.autoSave) {
      this.save();
    }

    return Ok(true);
  }

  async purge(id: string): Promise<Result<boolean>> {
    if (!this.data.artifacts[id]) {
      return Err({
        code: 'NOT_FOUND',
        message: `Artifact not found: ${id}`,
      });
    }

    delete this.data.artifacts[id];
    delete this.data.versions[id];
    this.data.lastModified = new Date().toISOString();

    if (this.config.autoSave) {
      this.save();
    }

    return Ok(true);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  //                              QUERY OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  async find(query: Query): Promise<Result<Artifact[]>> {
    let results = Object.values(this.data.artifacts);

    // Apply filters
    if (query.filter) {
      if (query.filter.type) {
        results = results.filter((a) => a.type === query.filter!.type);
      }

      if (query.filter.tags && query.filter.tags.length > 0) {
        results = results.filter((a) =>
          query.filter!.tags!.some((tag: string) =>
            a.metadata.tags.includes(tag)
          )
        );
      }

      if (query.filter.author) {
        results = results.filter(
          (a) => a.metadata.author === query.filter!.author
        );
      }

      if (query.filter.published !== undefined) {
        results = results.filter(
          (a) => a.published === query.filter!.published
        );
      }

      if (query.filter.deleted !== undefined) {
        results = results.filter((a) => a.deleted === query.filter!.deleted);
      }
    }

    // Note: Text search would be implemented separately through SearchCriteria
    // Query interface doesn't have a text field

    // Sort
    if (query.sort) {
      const { field, order } = query.sort;
      results.sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (field) {
          case 'name':
            aVal = a.metadata.name;
            bVal = b.metadata.name;
            break;
          case 'createdAt':
            aVal = a.createdAt;
            bVal = b.createdAt;
            break;
          case 'updatedAt':
            aVal = a.updatedAt;
            bVal = b.updatedAt;
            break;
          case 'downloads':
            aVal = a.stats.downloads;
            bVal = b.stats.downloads;
            break;
          case 'stars':
            aVal = a.stats.stars;
            bVal = b.stats.stars;
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return order === 'asc' ? -1 : 1;
        if (aVal > bVal) return order === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Pagination
    if (query.pagination) {
      const { offset, limit } = query.pagination;
      results = results.slice(offset, offset + limit);
    }

    return Ok(results);
  }

  async findOne(query: Query): Promise<Result<Artifact | null>> {
    const result = await this.find({
      ...query,
      pagination: { offset: 0, limit: 1 },
    });
    if (!result.ok) {
      return Err(result.error);
    }
    return Ok(result.value[0] || null);
  }

  async count(query: Query): Promise<Result<number>> {
    const result = await this.find({ ...query, pagination: undefined });
    if (!result.ok) {
      return Err(result.error);
    }
    return Ok(result.value.length);
  }

  async exists(id: string): Promise<Result<boolean>> {
    return Ok(!!this.data.artifacts[id]);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  //                              VERSION OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  async createVersion(
    version: Omit<Version, 'createdAt'>
  ): Promise<Result<Version>> {
    const now = new Date();
    const newVersion: Version = {
      ...version,
      createdAt: now,
    };

    if (!this.data.versions[version.artifactId]) {
      this.data.versions[version.artifactId] = [];
    }

    this.data.versions[version.artifactId].push(newVersion);
    this.data.lastModified = now.toISOString();

    if (this.config.autoSave) {
      this.save();
    }

    return Ok(newVersion);
  }

  async listVersions(artifactId: string): Promise<Result<Version[]>> {
    const versions = this.data.versions[artifactId] || [];
    return Ok(
      [...versions].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      )
    );
  }

  async getVersion(
    artifactId: string,
    version: string
  ): Promise<Result<Version | null>> {
    const versions = this.data.versions[artifactId] || [];
    const found = versions.find((v) => v.version === version);
    return Ok(found || null);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  //                              TRANSACTION OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  async beginTransaction(): Promise<Result<Transaction>> {
    // Simple snapshot-based transactions
    const snapshot = JSON.parse(JSON.stringify(this.data));
    const transactionId = randomUUID();

    return Ok({
      id: transactionId,
      commit: async () => {
        if (this.config.autoSave) {
          this.save();
        }
        return Ok(undefined);
      },
      rollback: async () => {
        this.data = snapshot;
        return Ok(undefined);
      },
    });
  }

  // ═════════════════════════════════════════════════════════════════════════════
  //                              HELPER METHODS
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Deserialize data from JSON, converting date strings to Date objects
   */
  private deserialize(rawData: any): RegistryData {
    const data: RegistryData = {
      artifacts: {},
      versions: {},
      lastModified: rawData.lastModified || new Date().toISOString(),
    };

    // Convert artifact dates
    for (const [id, artifact] of Object.entries(rawData.artifacts || {})) {
      const a = artifact as any;
      data.artifacts[id] = {
        ...a,
        createdAt: new Date(a.createdAt),
        updatedAt: new Date(a.updatedAt),
        published: a.published ?? false,
        deleted: a.deleted ?? false,
        stats: {
          ...a.stats,
          lastAccessed: a.stats?.lastAccessed
            ? new Date(a.stats.lastAccessed)
            : undefined,
        },
      };
    }

    // Convert version dates
    for (const [artifactId, versions] of Object.entries(
      rawData.versions || {}
    )) {
      data.versions[artifactId] = (versions as any[]).map((v: any) => ({
        ...v,
        createdAt: new Date(v.createdAt),
      }));
    }

    return data;
  }

  /**
   * Manually save data to file
   */
  private save(): void {
    const json = this.config.pretty
      ? JSON.stringify(this.data, null, 2)
      : JSON.stringify(this.data);

    writeFileSync(this.config.filePath, json, 'utf-8');
  }

  /**
   * Manually trigger a save (useful when autoSave is false)
   */
  async flush(): Promise<Result<void>> {
    try {
      this.save();
      return Ok(undefined);
    } catch (error) {
      return Err({
        code: 'IO_ERROR',
        message: `Failed to save data: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Get file size in bytes
   */
  getFileSize(): number {
    if (!existsSync(this.config.filePath)) {
      return 0;
    }
    const stats = require('fs').statSync(this.config.filePath);
    return stats.size;
  }

  /**
   * Get number of artifacts
   */
  getArtifactCount(): number {
    return Object.keys(this.data.artifacts).length;
  }
}
