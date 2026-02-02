/**
 * Mock Backend for Registry Tests
 *
 * Simple in-memory backend implementation for testing registry operations
 */

import { Ok, Err, type Result } from '../../../src/types';
import type {
  Artifact,
  IBackend,
  Query,
  Version,
} from '../../../src/registry/interfaces';

export class MockBackend implements IBackend {
  private artifacts: Map<string, Artifact> = new Map();
  private versions: Map<string, Version[]> = new Map();
  private connected: boolean = false;
  private shouldFail: boolean = false;

  async connect(): Promise<Result<void>> {
    this.connected = true;
    return Ok(undefined);
  }

  async disconnect(): Promise<Result<void>> {
    this.connected = false;
    return Ok(undefined);
  }

  isConnected(): boolean {
    return this.connected;
  }

  setShouldFail(fail: boolean): void {
    this.shouldFail = fail;
  }

  async create(
    artifact: Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Result<Artifact>> {
    if (this.shouldFail) {
      return Err({
        code: 'BACKEND_ERROR',
        message: 'Mock backend failure',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    const id = `artifact-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const created: Artifact = {
      ...artifact,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.artifacts.set(id, created);
    return Ok(created);
  }

  async read(id: string): Promise<Result<Artifact | null>> {
    if (this.shouldFail) {
      return Err({
        code: 'BACKEND_ERROR',
        message: 'Mock backend failure',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    const artifact = this.artifacts.get(id);
    return Ok(artifact || null);
  }

  async update(
    id: string,
    updates: Partial<Artifact>
  ): Promise<Result<Artifact>> {
    if (this.shouldFail) {
      return Err({
        code: 'BACKEND_ERROR',
        message: 'Mock backend failure',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    const existing = this.artifacts.get(id);
    if (!existing) {
      return Err({
        code: 'NOT_FOUND',
        message: `Artifact ${id} not found`,
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    const updated: Artifact = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    this.artifacts.set(id, updated);
    return Ok(updated);
  }

  async delete(id: string): Promise<Result<boolean>> {
    if (this.shouldFail) {
      return Err({
        code: 'BACKEND_ERROR',
        message: 'Mock backend failure',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    const artifact = this.artifacts.get(id);
    if (!artifact) {
      return Ok(false);
    }

    artifact.deleted = true;
    this.artifacts.set(id, artifact);
    return Ok(true);
  }

  async purge(id: string): Promise<Result<boolean>> {
    if (this.shouldFail) {
      return Err({
        code: 'BACKEND_ERROR',
        message: 'Mock backend failure',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    const existed = this.artifacts.has(id);
    this.artifacts.delete(id);
    return Ok(existed);
  }

  async find(query: Query): Promise<Result<Artifact[]>> {
    if (this.shouldFail) {
      return Err({
        code: 'BACKEND_ERROR',
        message: 'Mock backend failure',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    let results = Array.from(this.artifacts.values());

    // Apply filters
    if (query.filter) {
      const { filter } = query;

      if (filter.type) {
        const types = Array.isArray(filter.type) ? filter.type : [filter.type];
        results = results.filter((a) => types.includes(a.type));
      }

      if (filter.tags) {
        results = results.filter((a) =>
          filter.tags!.some((tag) => a.metadata.tags.includes(tag))
        );
      }

      if (filter.author) {
        results = results.filter((a) => a.metadata.author === filter.author);
      }

      if (filter.published !== undefined) {
        results = results.filter((a) => a.published === filter.published);
      }

      if (filter.deleted !== undefined) {
        results = results.filter((a) => a.deleted === filter.deleted);
      }
    }

    // Apply sorting
    if (query.sort) {
      const { field, order } = query.sort;
      results.sort((a, b) => {
        let aVal: any;
        let bVal: any;

        if (field === 'name') {
          aVal = a.metadata.name;
          bVal = b.metadata.name;
        } else if (field === 'createdAt' || field === 'updatedAt') {
          aVal = a[field].getTime();
          bVal = b[field].getTime();
        } else {
          aVal = a.stats[field as keyof typeof a.stats];
          bVal = b.stats[field as keyof typeof b.stats];
        }

        if (order === 'asc') {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
      });
    }

    // Apply pagination
    if (query.pagination) {
      const { offset, limit } = query.pagination;
      results = results.slice(offset, offset + limit);
    }

    return Ok(results);
  }

  async count(query: Query): Promise<Result<number>> {
    if (this.shouldFail) {
      return Err({
        code: 'BACKEND_ERROR',
        message: 'Mock backend failure',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    const findResult = await this.find(query);
    if (!findResult.ok) {
      return findResult as Result<number>;
    }

    return Ok(findResult.value.length);
  }

  async findOne(query: Query): Promise<Result<Artifact | null>> {
    if (this.shouldFail) {
      return Err({
        code: 'BACKEND_ERROR',
        message: 'Mock backend failure',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    const findResult = await this.find(query);
    if (!findResult.ok) {
      return Err(findResult.error);
    }

    return Ok(findResult.value[0] || null);
  }

  async createVersion(
    version: Omit<Version, 'createdAt'>
  ): Promise<Result<Version>> {
    if (this.shouldFail) {
      return Err({
        code: 'BACKEND_ERROR',
        message: 'Mock backend failure',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    const created: Version = {
      ...version,
      createdAt: new Date(),
    };

    const versions = this.versions.get(version.artifactId) || [];
    versions.push(created);
    this.versions.set(version.artifactId, versions);

    return Ok(created);
  }

  async listVersions(artifactId: string): Promise<Result<Version[]>> {
    if (this.shouldFail) {
      return Err({
        code: 'BACKEND_ERROR',
        message: 'Mock backend failure',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    const versions = this.versions.get(artifactId) || [];
    return Ok(versions);
  }

  async getVersion(
    artifactId: string,
    version: string
  ): Promise<Result<Version | null>> {
    if (this.shouldFail) {
      return Err({
        code: 'BACKEND_ERROR',
        message: 'Mock backend failure',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    const versions = this.versions.get(artifactId) || [];
    const found = versions.find((v) => v.version === version);
    return Ok(found || null);
  }

  async search(criteria: any): Promise<any> {
    if (this.shouldFail) {
      return Err({
        code: 'BACKEND_ERROR',
        message: 'Mock backend failure',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    const query = criteria.query?.toLowerCase() || '';
    const results: any[] = [];

    for (const artifact of this.artifacts.values()) {
      if (!this.matchesFilter(artifact, criteria.filter)) {
        continue;
      }

      if (query !== '' && !this.matchesQuery(artifact, query)) {
        continue;
      }

      results.push({
        artifact,
        score: this.calculateScore(artifact, query),
        highlights: {},
      });
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    // Apply pagination
    if (criteria.pagination) {
      const { offset, limit } = criteria.pagination;
      return Ok(results.slice(offset, offset + limit));
    }

    return Ok(results);
  }

  private matchesFilter(artifact: Artifact, filter: any): boolean {
    if (!filter) return true;

    if (filter.type) {
      const types = Array.isArray(filter.type) ? filter.type : [filter.type];
      if (!types.includes(artifact.type)) {
        return false;
      }
    }

    if (
      filter.published !== undefined &&
      artifact.published !== filter.published
    ) {
      return false;
    }

    return true;
  }

  private matchesQuery(artifact: Artifact, query: string): boolean {
    const matchesName = artifact.metadata.name.toLowerCase().includes(query);
    const matchesDescription =
      artifact.metadata.description?.toLowerCase().includes(query) || false;
    const matchesTags =
      artifact.metadata.tags?.some((tag: string) =>
        tag.toLowerCase().includes(query)
      ) || false;

    return matchesName || matchesDescription || matchesTags;
  }

  private calculateScore(artifact: Artifact, query: string): number {
    if (query === '') return 1.0;

    const matchesName = artifact.metadata.name.toLowerCase().includes(query);
    if (matchesName) return 1.0;

    const matchesTags = artifact.metadata.tags?.some((tag: string) =>
      tag.toLowerCase().includes(query)
    );
    if (matchesTags) return 0.8;

    return 0.6;
  }

  async get(id: string): Promise<any> {
    return this.read(id);
  }

  // Helper methods for testing
  clear(): void {
    this.artifacts.clear();
    this.versions.clear();
  }

  getAll(): Artifact[] {
    return Array.from(this.artifacts.values());
  }

  size(): number {
    return this.artifacts.size;
  }
}
