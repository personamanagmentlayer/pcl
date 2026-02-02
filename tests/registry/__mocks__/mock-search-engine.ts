/**
 * Mock Search Engine for Registry Tests
 */

import { Ok, Err, type Result } from '../../../src/types';
import type {
  Artifact,
  ISearchEngine,
  SearchCriteria,
  SearchResult,
} from '../../../src/registry/interfaces';

export class MockSearchEngine implements ISearchEngine {
  private index: Map<string, Artifact> = new Map();
  private shouldFail: boolean = false;

  async index(artifact: Artifact): Promise<Result<void>> {
    if (this.shouldFail) {
      return Err({
        code: 'SEARCH_ERROR',
        message: 'Mock search engine failure',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    this.index.set(artifact.id, artifact);
    return Ok(undefined);
  }

  async indexBulk(artifacts: Artifact[]): Promise<Result<number>> {
    if (this.shouldFail) {
      return Err({
        code: 'SEARCH_ERROR',
        message: 'Mock search engine failure',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    for (const artifact of artifacts) {
      this.index.set(artifact.id, artifact);
    }

    return Ok(artifacts.length);
  }

  async remove(id: string): Promise<Result<void>> {
    if (this.shouldFail) {
      return Err({
        code: 'SEARCH_ERROR',
        message: 'Mock search engine failure',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    this.index.delete(id);
    return Ok(undefined);
  }

  async search(criteria: SearchCriteria): Promise<Result<SearchResult[]>> {
    if (this.shouldFail) {
      return Err({
        code: 'SEARCH_ERROR',
        message: 'Mock search engine failure',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    const query = criteria.query.toLowerCase();
    const results: SearchResult[] = [];

    for (const artifact of this.index.values()) {
      // Apply filters
      if (criteria.filter) {
        if (criteria.filter.type) {
          const types = Array.isArray(criteria.filter.type)
            ? criteria.filter.type
            : [criteria.filter.type];
          if (!types.includes(artifact.type)) {
            continue;
          }
        }

        if (criteria.filter.published !== undefined) {
          if (artifact.published !== criteria.filter.published) {
            continue;
          }
        }
      }

      // Simple text search
      const matchesName = artifact.metadata.name.toLowerCase().includes(query);
      const matchesDescription =
        artifact.metadata.description?.toLowerCase().includes(query) || false;
      const matchesTags = artifact.metadata.tags.some((tag) =>
        tag.toLowerCase().includes(query)
      );

      if (matchesName || matchesDescription || matchesTags) {
        results.push({
          artifact,
          score: matchesName ? 1.0 : matchesTags ? 0.8 : 0.6,
          highlights: {},
        });
      }
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

  async update(artifact: Artifact): Promise<Result<void>> {
    if (this.shouldFail) {
      return Err({
        code: 'SEARCH_ERROR',
        message: 'Mock search engine failure',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    this.index.set(artifact.id, artifact);
    return Ok(undefined);
  }

  async clear(): Promise<Result<void>> {
    if (this.shouldFail) {
      return Err({
        code: 'SEARCH_ERROR',
        message: 'Mock search engine failure',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    this.index.clear();
    return Ok(undefined);
  }

  setShouldFail(fail: boolean): void {
    this.shouldFail = fail;
  }

  // Helper methods for testing
  size(): number {
    return this.index.size;
  }
}
