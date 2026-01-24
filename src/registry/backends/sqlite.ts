/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * SQLite Backend Implementation (Phase 1.2B)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * File-based SQLite backend with FTS5 full-text search and WAL mode.
 * Perfect for local development, embedded applications, and single-server deployments.
 *
 * @packageDocumentation
 * @module @pcl/registry/backends/sqlite
 * @version 2.0.0
 */

import { randomUUID } from 'node:crypto';
import type { Result } from '../../types';
import { Err, Ok } from '../../types';
import type {
  Artifact,
  ArtifactType,
  IBackend,
  Query,
  Transaction,
  Version,
} from '../interfaces';

// ═══════════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SQLite connection configuration
 */
export interface SQLiteConfig {
  /** Database file path (use ':memory:' for in-memory database) */
  filename: string;
  /** Enable WAL mode for better concurrency (default: true) */
  wal?: boolean;
  /** Timeout for busy handler in milliseconds (default: 5000) */
  timeout?: number;
  /** Enable verbose logging (default: false) */
  verbose?: boolean;
}

/**
 * Database row representation of Artifact
 */
interface ArtifactRow {
  id: string;
  type: string;
  name: string;
  slug: string | null;
  description: string | null;
  version: string;
  author: string | null;
  author_email: string | null;
  organization: string | null;
  license: string | null;
  repository: string | null;
  homepage: string | null;
  custom: string; // JSON string
  source: string;
  downloads: number;
  stars: number;
  views: number;
  last_accessed: string | null;
  created_at: string;
  updated_at: string;
  published: number; // Boolean (0 or 1)
  deleted: number; // Boolean (0 or 1)
  tags?: string; // Comma-separated
  skills?: string; // Comma-separated
  keywords?: string; // Comma-separated
}

/**
 * SQLite database interface (compatible with better-sqlite3)
 */
interface SQLiteDatabase {
  prepare(sql: string): SQLiteStatement;
  exec(sql: string): void;
  close(): void;
  pragma(pragma: string, value?: unknown): unknown;
  transaction<T>(fn: () => T): () => T;
}

/**
 * SQLite statement interface
 */
interface SQLiteStatement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number };
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
  pluck(toggle?: boolean): this;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              SQLITE TRANSACTION
// ═══════════════════════════════════════════════════════════════════════════════

class SQLiteTransaction implements Transaction {
  public readonly id: string;
  private committed = false;
  private rolledBack = false;

  constructor(
    private readonly db: SQLiteDatabase,
    private readonly rollbackFn: () => void
  ) {
    this.id = randomUUID();
  }

  async commit(): Promise<Result<void>> {
    if (this.committed) {
      return Err({
        code: 'TRANSACTION_ERROR',
        message: `Transaction ${this.id} already committed`,
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    if (this.rolledBack) {
      return Err({
        code: 'TRANSACTION_ERROR',
        message: `Transaction ${this.id} already rolled back`,
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    try {
      this.db.exec('COMMIT');
      this.committed = true;
      return Ok(undefined);
    } catch (error: any) {
      return Err({
        code: 'TRANSACTION_ERROR',
        message: `Failed to commit transaction: ${error.message}`,
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }
  }

  async rollback(): Promise<Result<void>> {
    if (this.committed) {
      return Err({
        code: 'TRANSACTION_ERROR',
        message: `Transaction ${this.id} already committed`,
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    if (this.rolledBack) {
      return Err({
        code: 'TRANSACTION_ERROR',
        message: `Transaction ${this.id} already rolled back`,
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    try {
      this.rollbackFn();
      this.rolledBack = true;
      return Ok(undefined);
    } catch (error: any) {
      return Err({
        code: 'TRANSACTION_ERROR',
        message: `Failed to rollback transaction: ${error.message}`,
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              SQLITE BACKEND
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SQLite registry backend
 *
 * Features:
 * - File-based storage with optional in-memory mode
 * - WAL mode for better concurrency
 * - FTS5 full-text search
 * - Automatic triggers for updated_at and version snapshots
 * - ACID transactions
 * - Optimized indexes for fast queries
 */
export class SQLiteBackend implements IBackend {
  private db: SQLiteDatabase | null = null;
  private connected = false;

  // Prepared statements (cached for performance)
  private stmts: {
    insertArtifact?: SQLiteStatement;
    insertTag?: SQLiteStatement;
    insertSkill?: SQLiteStatement;
    insertKeyword?: SQLiteStatement;
    selectArtifactById?: SQLiteStatement;
    updateArtifact?: SQLiteStatement;
    softDeleteArtifact?: SQLiteStatement;
    hardDeleteArtifact?: SQLiteStatement;
  } = {};

  constructor(private readonly config: SQLiteConfig) {}

  // ═══════════════════════════════════════════════════════════════════════════
  //                              CONNECTION
  // ═══════════════════════════════════════════════════════════════════════════

  async connect(): Promise<Result<void>> {
    if (this.connected && this.db) {
      return Ok(undefined);
    }

    try {
      // Lazy-load better-sqlite3 to avoid requiring it as a dependency
      // @ts-expect-error - better-sqlite3 is an optional dependency
      const Database = (await import('better-sqlite3')).default;

      this.db = new Database(this.config.filename, {
        verbose: this.config.verbose ? console.log : undefined,
        timeout: this.config.timeout || 5000,
      }) as unknown as SQLiteDatabase;

      // Enable WAL mode for better concurrency
      if (this.config.wal !== false) {
        this.db.pragma('journal_mode = WAL');
      }

      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');

      // Set synchronous mode to NORMAL for better performance
      this.db.pragma('synchronous = NORMAL');

      // Prepare frequently-used statements
      this.prepareStatements();

      this.connected = true;
      return Ok(undefined);
    } catch (error: any) {
      return Err({
        code: 'CONNECTION_ERROR',
        message: `Failed to connect to SQLite: ${error.message}`,
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }
  }

  async disconnect(): Promise<Result<void>> {
    if (!this.connected || !this.db) {
      return Ok(undefined);
    }

    try {
      this.db.close();
      this.db = null;
      this.stmts = {};
      this.connected = false;
      return Ok(undefined);
    } catch (error: any) {
      return Err({
        code: 'CONNECTION_ERROR',
        message: `Failed to disconnect from SQLite: ${error.message}`,
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                              CRUD OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async create(
    artifact: Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Result<Artifact>> {
    if (!this.db) {
      return Err({
        code: 'CONNECTION_ERROR',
        message: 'Backend not connected',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    try {
      const id = randomUUID();

      // Insert artifact
      this.stmts.insertArtifact!.run(
        id,
        artifact.type,
        artifact.metadata.name,
        artifact.metadata.slug || null,
        artifact.metadata.description || null,
        artifact.metadata.version,
        artifact.metadata.author || null,
        artifact.metadata.authorEmail || null,
        artifact.metadata.organization || null,
        artifact.metadata.license || null,
        artifact.metadata.repository || null,
        artifact.metadata.homepage || null,
        JSON.stringify(artifact.metadata.custom || {}),
        artifact.source,
        artifact.stats.downloads,
        artifact.stats.stars,
        artifact.stats.views,
        artifact.published ? 1 : 0,
        artifact.deleted ? 1 : 0
      );

      // Insert tags
      if (artifact.metadata.tags && artifact.metadata.tags.length > 0) {
        for (const tag of artifact.metadata.tags) {
          this.stmts.insertTag!.run(id, tag);
        }
      }

      // Insert skills
      if (artifact.metadata.skills && artifact.metadata.skills.length > 0) {
        for (const skill of artifact.metadata.skills) {
          this.stmts.insertSkill!.run(id, skill);
        }
      }

      // Insert keywords
      if (artifact.metadata.keywords && artifact.metadata.keywords.length > 0) {
        for (const keyword of artifact.metadata.keywords) {
          this.stmts.insertKeyword!.run(id, keyword);
        }
      }

      // Read back the created artifact
      return this.read(id) as Promise<Result<Artifact>>;
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return Err({
          code: 'DUPLICATE',
          message: `Artifact with slug "${artifact.metadata.slug}" already exists`,
          span: {
            start: { line: 0, column: 0, offset: 0 },
            end: { line: 0, column: 0, offset: 0 },
          },
        });
      }

      return Err({
        code: 'REGISTRY_ERROR',
        message: `Failed to create artifact: ${error.message}`,
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }
  }

  async read(id: string): Promise<Result<Artifact | null>> {
    if (!this.db) {
      return Err({
        code: 'CONNECTION_ERROR',
        message: 'Backend not connected',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    try {
      const row = this.stmts.selectArtifactById!.get(id) as
        | ArtifactRow
        | undefined;

      if (!row) {
        return Ok(null);
      }

      return Ok(this.rowToArtifact(row));
    } catch (error: any) {
      return Err({
        code: 'REGISTRY_ERROR',
        message: `Failed to read artifact: ${error.message}`,
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }
  }

  async update(
    id: string,
    updates: Partial<Artifact>
  ): Promise<Result<Artifact>> {
    if (!this.db) {
      return Err({
        code: 'CONNECTION_ERROR',
        message: 'Backend not connected',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    try {
      // Check if artifact exists
      const existing = await this.read(id);
      if (!existing.ok || !existing.value) {
        return Err({
          code: 'NOT_FOUND',
          message: `Artifact with ID "${id}" not found`,
          span: {
            start: { line: 0, column: 0, offset: 0 },
            end: { line: 0, column: 0, offset: 0 },
          },
        });
      }

      // Build UPDATE query dynamically
      const fields: string[] = [];
      const values: unknown[] = [];

      if (updates.metadata) {
        if (updates.metadata.name !== undefined) {
          fields.push('name = ?');
          values.push(updates.metadata.name);
        }
        if (updates.metadata.description !== undefined) {
          fields.push('description = ?');
          values.push(updates.metadata.description);
        }
        // Add other metadata fields as needed...
      }

      if (updates.source !== undefined) {
        fields.push('source = ?');
        values.push(updates.source);
      }

      if (updates.published !== undefined) {
        fields.push('published = ?');
        values.push(updates.published ? 1 : 0);
      }

      if (fields.length > 0) {
        values.push(id);
        const sql = `UPDATE artifacts SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`;
        this.db.prepare(sql).run(...values);
      }

      // Re-read the updated artifact
      return this.read(id) as Promise<Result<Artifact>>;
    } catch (error: any) {
      return Err({
        code: 'REGISTRY_ERROR',
        message: `Failed to update artifact: ${error.message}`,
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }
  }

  async delete(id: string): Promise<Result<boolean>> {
    if (!this.db) {
      return Err({
        code: 'CONNECTION_ERROR',
        message: 'Backend not connected',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    try {
      const result = this.stmts.softDeleteArtifact!.run(id);
      return Ok(result.changes > 0);
    } catch (error: any) {
      return Err({
        code: 'REGISTRY_ERROR',
        message: `Failed to delete artifact: ${error.message}`,
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }
  }

  async purge(id: string): Promise<Result<boolean>> {
    if (!this.db) {
      return Err({
        code: 'CONNECTION_ERROR',
        message: 'Backend not connected',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    try {
      const result = this.stmts.hardDeleteArtifact!.run(id);
      return Ok(result.changes > 0);
    } catch (error: any) {
      return Err({
        code: 'REGISTRY_ERROR',
        message: `Failed to purge artifact: ${error.message}`,
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                              QUERY OPERATIONS (stub)
  // ═══════════════════════════════════════════════════════════════════════════

  async find(query: Query): Promise<Result<Artifact[]>> {
    // TODO: Implement query builder with FTS5 support
    return Ok([]);
  }

  async count(query: Query): Promise<Result<number>> {
    // TODO: Implement count
    return Ok(0);
  }

  async findOne(query: Query): Promise<Result<Artifact | null>> {
    // TODO: Implement findOne
    return Ok(null);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                              VERSION OPERATIONS (stub)
  // ═══════════════════════════════════════════════════════════════════════════

  async createVersion(
    version: Omit<Version, 'createdAt'>
  ): Promise<Result<Version>> {
    // TODO: Implement
    return Err({
      code: 'NOT_IMPLEMENTED',
      message: 'Not implemented',
      span: {
        start: { line: 0, column: 0, offset: 0 },
        end: { line: 0, column: 0, offset: 0 },
      },
    });
  }

  async listVersions(artifactId: string): Promise<Result<Version[]>> {
    // TODO: Implement
    return Ok([]);
  }

  async getVersion(
    artifactId: string,
    version: string
  ): Promise<Result<Version | null>> {
    // TODO: Implement
    return Ok(null);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                              TRANSACTION OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async beginTransaction(): Promise<Result<Transaction>> {
    if (!this.db) {
      return Err({
        code: 'CONNECTION_ERROR',
        message: 'Backend not connected',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    try {
      this.db.exec('BEGIN IMMEDIATE');
      const rollbackFn = this.db.transaction(() => {
        this.db!.exec('ROLLBACK');
      });
      const transaction = new SQLiteTransaction(this.db, rollbackFn);
      return Ok(transaction);
    } catch (error: any) {
      return Err({
        code: 'TRANSACTION_ERROR',
        message: `Failed to begin transaction: ${error.message}`,
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                              HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private prepareStatements(): void {
    if (!this.db) return;

    this.stmts.insertArtifact = this.db.prepare(`
      INSERT INTO artifacts (
        id, type, name, slug, description, version, author, author_email,
        organization, license, repository, homepage, custom, source,
        downloads, stars, views, published, deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.stmts.insertTag = this.db.prepare(`
      INSERT INTO tags (artifact_id, tag) VALUES (?, ?)
    `);

    this.stmts.insertSkill = this.db.prepare(`
      INSERT INTO skills (artifact_id, skill) VALUES (?, ?)
    `);

    this.stmts.insertKeyword = this.db.prepare(`
      INSERT INTO keywords (artifact_id, keyword) VALUES (?, ?)
    `);

    this.stmts.selectArtifactById = this.db.prepare(`
      SELECT * FROM artifacts_full WHERE id = ?
    `);

    this.stmts.softDeleteArtifact = this.db.prepare(`
      UPDATE artifacts SET deleted = 1, updated_at = datetime('now') WHERE id = ? AND deleted = 0
    `);

    this.stmts.hardDeleteArtifact = this.db.prepare(`
      DELETE FROM artifacts WHERE id = ?
    `);
  }

  private rowToArtifact(row: ArtifactRow): Artifact {
    return {
      id: row.id,
      type: row.type as ArtifactType,
      metadata: {
        name: row.name,
        slug: row.slug || undefined,
        description: row.description || undefined,
        version: row.version,
        author: row.author || undefined,
        authorEmail: row.author_email || undefined,
        organization: row.organization || undefined,
        license: row.license || undefined,
        repository: row.repository || undefined,
        homepage: row.homepage || undefined,
        tags: row.tags ? row.tags.split(',').filter(Boolean) : [],
        skills: row.skills ? row.skills.split(',').filter(Boolean) : undefined,
        keywords: row.keywords
          ? row.keywords.split(',').filter(Boolean)
          : undefined,
        custom: JSON.parse(row.custom) as Record<string, unknown>,
      },
      source: row.source,
      stats: {
        downloads: row.downloads,
        stars: row.stars,
        views: row.views,
        lastAccessed: row.last_accessed
          ? new Date(row.last_accessed)
          : undefined,
      },
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      published: row.published === 1,
      deleted: row.deleted === 1,
    };
  }
}
