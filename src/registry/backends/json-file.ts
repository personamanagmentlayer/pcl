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
import {
  randomUUID,
  createCipheriv,
  createDecipheriv,
  scryptSync,
} from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import type { Result } from '../../types';
import { Ok, Err } from '../../types';
import type {
  Artifact,
  ArtifactType,
  IBackend,
  Query,
  Transaction,
  Version,
  SearchCriteria,
  SearchResult,
} from '../interfaces';

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
  /** Enable compression (requires gzip) */
  compress?: boolean;
  /** Enable encryption (requires encryption key) */
  encrypt?: boolean;
  /** Encryption key (required if encrypt is true) */
  encryptionKey?: string;
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
      compress: false,
      encrypt: false,
      ...config,
    };

    // Validate encryption config
    if (this.config.encrypt && !this.config.encryptionKey) {
      throw new Error('Encryption key is required when encryption is enabled');
    }

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
        let content: string;

        if (this.config.encrypt || this.config.compress) {
          // Read as buffer for encrypted/compressed data
          let buffer: Buffer = readFileSync(this.config.filePath);

          // Decrypt if needed
          if (this.config.encrypt) {
            buffer = Buffer.from(this.decrypt(buffer));
          }

          // Decompress if needed
          if (this.config.compress) {
            buffer = Buffer.from(gunzipSync(buffer));
          }

          content = buffer.toString('utf-8');
        } else {
          content = readFileSync(this.config.filePath, 'utf-8');
        }

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

  /**
   * Search artifacts using text search
   */
  async search(criteria: SearchCriteria): Promise<Result<SearchResult[]>> {
    let results = Object.values(this.data.artifacts);

    // Apply filters first
    if (criteria.filter) {
      const filterQuery: Query = { filter: criteria.filter };
      const filtered = await this.find(filterQuery);
      if (!filtered.ok) {
        return Err(filtered.error);
      }
      results = filtered.value;
    }

    // Perform text search
    const searchQuery = criteria.query.toLowerCase();
    const searchFields = criteria.fields || [
      'name',
      'description',
      'tags',
      'skills',
      'source',
    ];

    const scoredResults: SearchResult[] = results
      .map((artifact) => {
        let score = 0;
        const highlights: Record<string, string[]> = {};

        // Search in each field
        for (const field of searchFields) {
          let fieldValue = '';
          let fieldContent = '';

          switch (field) {
            case 'name':
              fieldValue = artifact.metadata.name.toLowerCase();
              fieldContent = artifact.metadata.name;
              break;
            case 'description':
              fieldValue = (artifact.metadata.description || '').toLowerCase();
              fieldContent = artifact.metadata.description || '';
              break;
            case 'tags':
              fieldValue = artifact.metadata.tags.join(' ').toLowerCase();
              fieldContent = artifact.metadata.tags.join(', ');
              break;
            case 'skills':
              fieldValue = (artifact.metadata.skills || [])
                .join(' ')
                .toLowerCase();
              fieldContent = (artifact.metadata.skills || []).join(', ');
              break;
            case 'source':
              fieldValue = artifact.source.toLowerCase();
              fieldContent = artifact.source;
              break;
          }

          // Calculate score based on matches
          if (criteria.fuzzy) {
            // Fuzzy matching - check if words are similar
            const queryWords = searchQuery.split(/\s+/);
            const fieldWords = fieldValue.split(/\s+/);

            for (const qWord of queryWords) {
              for (const fWord of fieldWords) {
                if (this.fuzzyMatch(qWord, fWord)) {
                  score +=
                    field === 'name' ? 10 : field === 'description' ? 5 : 2;

                  // Highlight match
                  if (criteria.highlight) {
                    if (!highlights[field]) highlights[field] = [];
                    const start = Math.max(
                      0,
                      fieldContent.toLowerCase().indexOf(fWord) - 20
                    );
                    const end = Math.min(
                      fieldContent.length,
                      fieldContent.toLowerCase().indexOf(fWord) +
                        fWord.length +
                        20
                    );
                    highlights[field].push(
                      '...' + fieldContent.slice(start, end) + '...'
                    );
                  }
                }
              }
            }
          } else {
            // Exact matching
            if (fieldValue.includes(searchQuery)) {
              score += field === 'name' ? 10 : field === 'description' ? 5 : 2;

              // Highlight match
              if (criteria.highlight) {
                if (!highlights[field]) highlights[field] = [];
                const index = fieldContent.toLowerCase().indexOf(searchQuery);
                const start = Math.max(0, index - 20);
                const end = Math.min(
                  fieldContent.length,
                  index + searchQuery.length + 20
                );
                highlights[field].push(
                  '...' + fieldContent.slice(start, end) + '...'
                );
              }
            }
          }
        }

        return {
          id: artifact.id,
          artifact,
          score: score / 100, // Normalize to 0-1 range
          highlights:
            Object.keys(highlights).length > 0 ? highlights : undefined,
        };
      })
      .filter((result) => result.score > 0);

    // Sort by score descending
    scoredResults.sort((a, b) => b.score - a.score);

    // Apply custom sorting if specified
    if (criteria.sort) {
      const { field, order } = criteria.sort;
      scoredResults.sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (field) {
          case 'name':
            aVal = a.artifact!.metadata.name;
            bVal = b.artifact!.metadata.name;
            break;
          case 'createdAt':
            aVal = a.artifact!.createdAt;
            bVal = b.artifact!.createdAt;
            break;
          case 'updatedAt':
            aVal = a.artifact!.updatedAt;
            bVal = b.artifact!.updatedAt;
            break;
          case 'downloads':
            aVal = a.artifact!.stats.downloads;
            bVal = b.artifact!.stats.downloads;
            break;
          case 'stars':
            aVal = a.artifact!.stats.stars;
            bVal = b.artifact!.stats.stars;
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return order === 'asc' ? -1 : 1;
        if (aVal > bVal) return order === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Apply pagination
    if (criteria.pagination) {
      const { offset, limit } = criteria.pagination;
      return Ok(scoredResults.slice(offset, offset + limit));
    }

    return Ok(scoredResults);
  }

  /**
   * Fuzzy string matching using Levenshtein distance
   */
  private fuzzyMatch(str1: string, str2: string, threshold = 0.7): boolean {
    if (str1 === str2) return true;
    if (str1.length < 3 || str2.length < 3) return false;

    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    const similarity = 1 - distance / maxLength;

    return similarity >= threshold;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1)
      .fill(0)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1, // deletion
            dp[i][j - 1] + 1, // insertion
            dp[i - 1][j - 1] + 1 // substitution
          );
        }
      }
    }

    return dp[m][n];
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

    let data: Buffer | string = json;

    // Compress if needed
    if (this.config.compress) {
      data = gzipSync(Buffer.from(json, 'utf-8'));
    }

    // Encrypt if needed
    if (this.config.encrypt) {
      if (typeof data === 'string') {
        data = Buffer.from(data, 'utf-8');
      }
      data = this.encrypt(data);
    }

    writeFileSync(this.config.filePath, data);
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  private encrypt(data: Buffer): Buffer {
    if (!this.config.encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    // Derive key from password using scrypt
    const key = scryptSync(this.config.encryptionKey, 'salt', 32);

    // Generate random IV (16 bytes for AES)
    const iv = Buffer.from(randomUUID().replace(/-/g, '').slice(0, 32), 'hex');

    // Create cipher
    const cipher = createCipheriv('aes-256-gcm', key, iv);

    // Encrypt data
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Combine IV + authTag + encrypted data
    return Buffer.concat([iv, authTag, encrypted]);
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  private decrypt(data: Buffer): Buffer {
    if (!this.config.encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    // Derive key from password using scrypt
    const key = scryptSync(this.config.encryptionKey, 'salt', 32);

    // Extract IV (first 16 bytes)
    const iv = data.subarray(0, 16);

    // Extract auth tag (next 16 bytes)
    const authTag = data.subarray(16, 32);

    // Extract encrypted data (rest)
    const encrypted = data.subarray(32);

    // Create decipher
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt data
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
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

  /**
   * Export registry data to JSON string
   */
  async exportData(options?: {
    includeVersions?: boolean;
    includeDeleted?: boolean;
    pretty?: boolean;
  }): Promise<Result<string>> {
    try {
      const exportData: any = {
        artifacts: {} as Record<string, Artifact>,
        versions: {} as Record<string, Version[]>,
        exportedAt: new Date().toISOString(),
        metadata: {
          totalArtifacts: 0,
          totalVersions: 0,
        },
      };

      // Export artifacts
      for (const [id, artifact] of Object.entries(this.data.artifacts)) {
        // Skip deleted unless explicitly included
        if (artifact.deleted && !options?.includeDeleted) {
          continue;
        }
        exportData.artifacts[id] = artifact;
        exportData.metadata.totalArtifacts++;
      }

      // Export versions if requested
      if (options?.includeVersions) {
        for (const [artifactId, versions] of Object.entries(
          this.data.versions
        )) {
          // Only include versions for exported artifacts
          if (exportData.artifacts[artifactId]) {
            exportData.versions[artifactId] = versions;
            exportData.metadata.totalVersions += versions.length;
          }
        }
      }

      const json = options?.pretty
        ? JSON.stringify(exportData, null, 2)
        : JSON.stringify(exportData);

      return Ok(json);
    } catch (error) {
      return Err({
        code: 'EXPORT_ERROR',
        message: `Failed to export data: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Import registry data from JSON string
   */
  async importData(
    jsonData: string,
    options?: {
      merge?: boolean; // Merge with existing data (true) or replace (false)
      skipDuplicates?: boolean; // Skip duplicates instead of error
    }
  ): Promise<Result<{ imported: number; skipped: number; errors: string[] }>> {
    try {
      const importData = JSON.parse(jsonData);
      const result = {
        imported: 0,
        skipped: 0,
        errors: [] as string[],
      };

      // Validate import data structure
      if (!importData.artifacts) {
        return Err({
          code: 'INVALID_IMPORT',
          message: 'Import data missing artifacts field',
        });
      }

      // Import artifacts
      for (const [id, rawArtifact] of Object.entries(
        importData.artifacts as Record<string, any>
      )) {
        try {
          // Check for existing artifact
          const existing = this.data.artifacts[id];

          if (existing && !options?.merge) {
            if (options?.skipDuplicates) {
              result.skipped++;
              continue;
            } else {
              result.errors.push(`Duplicate artifact: ${id}`);
              continue;
            }
          }

          // Deserialize dates
          const artifact: Artifact = {
            ...rawArtifact,
            createdAt: new Date(rawArtifact.createdAt),
            updatedAt: new Date(rawArtifact.updatedAt),
            stats: {
              ...rawArtifact.stats,
              lastAccessed: rawArtifact.stats?.lastAccessed
                ? new Date(rawArtifact.stats.lastAccessed)
                : undefined,
            },
          };

          this.data.artifacts[id] = artifact;
          result.imported++;
        } catch (error) {
          result.errors.push(
            `Failed to import artifact ${id}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // Import versions if present
      if (importData.versions) {
        for (const [artifactId, rawVersions] of Object.entries(
          importData.versions as Record<string, any[]>
        )) {
          try {
            // Only import versions if artifact was imported
            if (!this.data.artifacts[artifactId]) {
              continue;
            }

            const versions: Version[] = rawVersions.map((v: any) => ({
              ...v,
              createdAt: new Date(v.createdAt),
            }));

            if (options?.merge && this.data.versions[artifactId]) {
              // Merge versions (skip duplicates)
              const existingVersions = this.data.versions[artifactId];
              const existingVersionNumbers = new Set(
                existingVersions.map((v) => v.version)
              );

              for (const version of versions) {
                if (!existingVersionNumbers.has(version.version)) {
                  existingVersions.push(version);
                }
              }
            } else {
              this.data.versions[artifactId] = versions;
            }
          } catch (error) {
            result.errors.push(
              `Failed to import versions for ${artifactId}: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      }

      // Update last modified
      this.data.lastModified = new Date().toISOString();

      // Save if auto-save is enabled
      if (this.config.autoSave) {
        this.save();
      }

      return Ok(result);
    } catch (error) {
      return Err({
        code: 'IMPORT_ERROR',
        message: `Failed to import data: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Export to file
   */
  async exportToFile(
    filePath: string,
    options?: {
      includeVersions?: boolean;
      includeDeleted?: boolean;
      pretty?: boolean;
      compress?: boolean;
    }
  ): Promise<Result<void>> {
    try {
      const exportResult = await this.exportData(options);
      if (!exportResult.ok) {
        return Err(exportResult.error);
      }

      let data: Buffer | string = exportResult.value;

      // Compress if requested
      if (options?.compress) {
        data = gzipSync(Buffer.from(data, 'utf-8'));
      }

      // Ensure directory exists
      const dir = dirname(filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(filePath, data);
      return Ok(undefined);
    } catch (error) {
      return Err({
        code: 'EXPORT_ERROR',
        message: `Failed to export to file: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Import from file
   */
  async importFromFile(
    filePath: string,
    options?: {
      merge?: boolean;
      skipDuplicates?: boolean;
      compressed?: boolean;
    }
  ): Promise<Result<{ imported: number; skipped: number; errors: string[] }>> {
    try {
      if (!existsSync(filePath)) {
        return Err({
          code: 'FILE_NOT_FOUND',
          message: `Import file not found: ${filePath}`,
        });
      }

      let content: string;

      if (options?.compressed) {
        const buffer = readFileSync(filePath);
        const decompressed = gunzipSync(buffer);
        content = decompressed.toString('utf-8');
      } else {
        content = readFileSync(filePath, 'utf-8');
      }

      return await this.importData(content, options);
    } catch (error) {
      return Err({
        code: 'IMPORT_ERROR',
        message: `Failed to import from file: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
}
