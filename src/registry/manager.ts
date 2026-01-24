/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Registry Manager Implementation (Phase 1.2 Final)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * High-level registry API with validation, caching, and dependency management.
 *
 * @packageDocumentation
 * @module @pcl/registry/manager
 * @version 2.0.0
 */

import type { Result } from '../types';
import { Err, Ok } from '../types';
import type {
  Artifact,
  IBackend,
  ICache,
  IRegistry,
  ISearchEngine,
  Query,
  RegistryStats,
  SearchCriteria,
  SearchResult,
  Version,
} from './interfaces';
import { ArtifactType } from './interfaces';

// ═══════════════════════════════════════════════════════════════════════════════
//                              CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Registry manager configuration
 */
export interface RegistryManagerConfig {
  /** Backend for persistence */
  backend: IBackend;
  /** Optional cache for performance */
  cache?: ICache;
  /** Optional search engine for full-text search */
  searchEngine?: ISearchEngine;
  /** Auto-generate slugs if not provided (default: true) */
  autoGenerateSlugs?: boolean;
  /** Validate artifacts before create/update (default: true) */
  validateArtifacts?: boolean;
  /** Cache TTL in seconds (default: 3600) */
  cacheTTL?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              REGISTRY MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Registry Manager - High-level API for artifact management
 *
 * Features:
 * - Automatic slug generation
 * - Validation of metadata and source code
 * - Caching for performance
 * - Dependency resolution
 * - Full-text search integration
 */
export class RegistryManager implements IRegistry {
  private readonly backend: IBackend;
  private readonly cache?: ICache;
  private readonly searchEngine?: ISearchEngine;
  private readonly config: Required<
    Omit<RegistryManagerConfig, 'cache' | 'searchEngine'>
  >;

  constructor(config: RegistryManagerConfig) {
    this.backend = config.backend;
    this.cache = config.cache;
    this.searchEngine = config.searchEngine;
    this.config = {
      backend: config.backend,
      autoGenerateSlugs: config.autoGenerateSlugs ?? true,
      validateArtifacts: config.validateArtifacts ?? true,
      cacheTTL: config.cacheTTL ?? 3600,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                              CRUD OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async create(
    artifact: Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Result<Artifact>> {
    // Validate artifact
    if (this.config.validateArtifacts) {
      const validationResult = this.validateArtifact(artifact);
      if (!validationResult.ok) {
        return validationResult;
      }
    }

    // Auto-generate slug if not provided
    let artifactToCreate = artifact;
    if (this.config.autoGenerateSlugs && !artifact.metadata.slug) {
      const slug = this.generateSlug(artifact.metadata.name);
      artifactToCreate = {
        ...artifact,
        metadata: {
          ...artifact.metadata,
          slug,
        },
      };
    }

    // Create in backend
    const createResult = await this.backend.create(artifactToCreate);
    if (!createResult.ok) {
      return createResult;
    }

    const created = createResult.value;

    // Update cache
    if (this.cache) {
      const cacheKey = `artifact:${created.id}`;
      await this.cache.set(cacheKey, created, this.config.cacheTTL);

      if (created.metadata.slug) {
        const slugCacheKey = `artifact:slug:${created.metadata.slug}`;
        await this.cache.set(slugCacheKey, created, this.config.cacheTTL);
      }
    }

    // Update search index
    if (this.searchEngine) {
      await this.searchEngine.index(created);
    }

    return Ok(created);
  }

  async read(id: string): Promise<Result<Artifact | null>> {
    // Check cache first
    if (this.cache) {
      const cacheKey = `artifact:${id}`;
      const cachedResult = await this.cache.get<Artifact>(cacheKey);

      if (cachedResult.ok && cachedResult.value) {
        return Ok(cachedResult.value);
      }
    }

    // Fetch from backend
    const readResult = await this.backend.read(id);
    if (!readResult.ok || !readResult.value) {
      return readResult;
    }

    const artifact = readResult.value;

    // Update cache
    if (this.cache) {
      const cacheKey = `artifact:${id}`;
      await this.cache.set(cacheKey, artifact, this.config.cacheTTL);
    }

    return Ok(artifact);
  }

  async readBySlug(slug: string): Promise<Result<Artifact | null>> {
    // Check cache first
    if (this.cache) {
      const slugCacheKey = `artifact:slug:${slug}`;
      const cachedResult = await this.cache.get<Artifact>(slugCacheKey);

      if (cachedResult.ok && cachedResult.value) {
        return Ok(cachedResult.value);
      }
    }

    // Query backend
    const findResult = await this.backend.findOne({
      filter: { deleted: false },
    });

    if (!findResult.ok) {
      return findResult;
    }

    // Simple linear search for slug (backend should implement efficient slug lookup)
    const allResult = await this.backend.find({
      filter: { deleted: false },
    });

    if (!allResult.ok) {
      return Err(allResult.error);
    }

    const artifact = allResult.value.find((a) => a.metadata.slug === slug);

    if (!artifact) {
      return Ok(null);
    }

    // Update cache
    if (this.cache) {
      const slugCacheKey = `artifact:slug:${slug}`;
      await this.cache.set(slugCacheKey, artifact, this.config.cacheTTL);
    }

    return Ok(artifact);
  }

  async update(
    id: string,
    updates: Partial<Artifact>
  ): Promise<Result<Artifact>> {
    // Validate updates
    if (this.config.validateArtifacts && updates.metadata) {
      const validationResult = this.validateMetadata(updates.metadata);
      if (!validationResult.ok) {
        return validationResult as Result<Artifact>;
      }
    }

    // Update in backend
    const updateResult = await this.backend.update(id, updates);
    if (!updateResult.ok) {
      return updateResult;
    }

    const updated = updateResult.value;

    // Invalidate cache
    if (this.cache) {
      const cacheKey = `artifact:${id}`;
      await this.cache.delete(cacheKey);

      if (updated.metadata.slug) {
        const slugCacheKey = `artifact:slug:${updated.metadata.slug}`;
        await this.cache.delete(slugCacheKey);
      }

      // Invalidate list caches
      await this.cache.invalidate('artifacts:list:*');
    }

    // Update search index
    if (this.searchEngine) {
      await this.searchEngine.update(updated);
    }

    return Ok(updated);
  }

  async delete(id: string): Promise<Result<boolean>> {
    const deleteResult = await this.backend.delete(id);

    if (deleteResult.ok && deleteResult.value) {
      // Invalidate cache
      if (this.cache) {
        const cacheKey = `artifact:${id}`;
        await this.cache.delete(cacheKey);
        await this.cache.invalidate('artifacts:*');
      }

      // Remove from search index
      if (this.searchEngine) {
        await this.searchEngine.remove(id);
      }
    }

    return deleteResult;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                              QUERY OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async find(query: Query): Promise<Result<Artifact[]>> {
    // Check cache for common queries
    if (this.cache && this.isCachableQuery(query)) {
      const cacheKey = this.getQueryCacheKey(query);
      const cachedResult = await this.cache.get<Artifact[]>(cacheKey);

      if (cachedResult.ok && cachedResult.value) {
        return Ok(cachedResult.value);
      }
    }

    // Fetch from backend
    const findResult = await this.backend.find(query);

    if (findResult.ok && this.cache && this.isCachableQuery(query)) {
      const cacheKey = this.getQueryCacheKey(query);
      await this.cache.set(cacheKey, findResult.value, this.config.cacheTTL);
    }

    return findResult;
  }

  async count(query: Query): Promise<Result<number>> {
    return this.backend.count(query);
  }

  async search(criteria: SearchCriteria): Promise<Result<SearchResult[]>> {
    // Use search engine if available
    if (this.searchEngine) {
      return this.searchEngine.search(criteria);
    }

    // Fallback to basic text matching in backend
    const findResult = await this.backend.find({
      filter: criteria.filter,
      sort: criteria.sort,
      pagination: criteria.pagination,
    });

    if (!findResult.ok) {
      return Err(findResult.error);
    }

    // Simple text search fallback
    const query = criteria.query.toLowerCase();
    const filtered = findResult.value.filter((artifact) => {
      return (
        artifact.metadata.name.toLowerCase().includes(query) ||
        artifact.metadata.description?.toLowerCase().includes(query) ||
        artifact.metadata.tags.some((tag) =>
          tag.toLowerCase().includes(query)
        ) ||
        artifact.metadata.skills?.some((skill) =>
          skill.toLowerCase().includes(query)
        )
      );
    });

    // Convert to search results
    const results: SearchResult[] = filtered.map((artifact) => ({
      artifact,
      score: 1.0, // No scoring in fallback
      highlights: undefined,
    }));

    return Ok(results);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                              VERSION OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async listVersions(artifactId: string): Promise<Result<Version[]>> {
    return this.backend.listVersions(artifactId);
  }

  async getVersion(
    artifactId: string,
    version: string
  ): Promise<Result<Version | null>> {
    return this.backend.getVersion(artifactId, version);
  }

  async publish(artifactId: string, version: string): Promise<Result<boolean>> {
    // Get the artifact
    const readResult = await this.read(artifactId);
    if (!readResult.ok || !readResult.value) {
      return Err({
        code: 'NOT_FOUND',
        message: `Artifact with ID "${artifactId}" not found`,
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    // Update published flag
    const updateResult = await this.update(artifactId, { published: true });
    return Ok(updateResult.ok);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                              UTILITY OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async stats(): Promise<Result<RegistryStats>> {
    const totalResult = await this.count({});
    if (!totalResult.ok) {
      return Err(totalResult.error);
    }

    // Count by type
    const byType: Record<ArtifactType, number> = {
      persona: 0,
      team: 0,
      workflow: 0,
      skill: 0,
    };

    for (const type of Object.values(ArtifactType)) {
      const countResult = await this.count({ filter: { type } });
      if (countResult.ok) {
        byType[type] = countResult.value;
      }
    }

    // Calculate total stats
    const allResult = await this.find({});
    if (!allResult.ok) {
      return Err(allResult.error);
    }

    const totalDownloads = allResult.value.reduce(
      (sum, a) => sum + a.stats.downloads,
      0
    );
    const totalStars = allResult.value.reduce(
      (sum, a) => sum + a.stats.stars,
      0
    );

    // Get cache stats if available
    let cacheStats = undefined;
    if (this.cache) {
      const cacheStatsResult = await this.cache.stats();
      if (cacheStatsResult.ok) {
        cacheStats = cacheStatsResult.value;
      }
    }

    return Ok({
      total: totalResult.value,
      byType,
      totalDownloads,
      totalStars,
      cache: cacheStats,
    });
  }

  async clearCache(): Promise<Result<void>> {
    if (this.cache) {
      return this.cache.clear();
    }
    return Ok(undefined);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                              HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate URL-friendly slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove non-word chars
      .replace(/[\s_-]+/g, '-') // Replace spaces, underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Validate artifact before creation
   */
  private validateArtifact(
    artifact: Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>
  ): Result<void> {
    // Validate metadata
    const metadataResult = this.validateMetadata(artifact.metadata);
    if (!metadataResult.ok) {
      return metadataResult;
    }

    // Validate source is not empty
    if (!artifact.source || artifact.source.trim().length === 0) {
      return Err({
        code: 'VALIDATION_ERROR',
        message: 'Source code cannot be empty',
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
      });
    }

    return Ok(undefined);
  }

  /**
   * Validate artifact metadata
   */
  private validateMetadata(
    metadata: Partial<Artifact['metadata']>
  ): Result<void> {
    // Validate name
    if (metadata.name !== undefined) {
      if (!metadata.name || metadata.name.trim().length === 0) {
        return Err({
          code: 'VALIDATION_ERROR',
          message: 'Artifact name cannot be empty',
          span: {
            start: { line: 0, column: 0, offset: 0 },
            end: { line: 0, column: 0, offset: 0 },
          },
        });
      }

      if (metadata.name.length > 255) {
        return Err({
          code: 'VALIDATION_ERROR',
          message: 'Artifact name cannot exceed 255 characters',
          span: {
            start: { line: 0, column: 0, offset: 0 },
            end: { line: 0, column: 0, offset: 0 },
          },
        });
      }
    }

    // Validate version format (semantic versioning)
    if (metadata.version !== undefined) {
      const semverRegex = /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/;
      if (!semverRegex.test(metadata.version)) {
        return Err({
          code: 'VALIDATION_ERROR',
          message: `Invalid version format: "${metadata.version}". Expected semantic version (e.g., "1.2.3")`,
          span: {
            start: { line: 0, column: 0, offset: 0 },
            end: { line: 0, column: 0, offset: 0 },
          },
        });
      }
    }

    // Validate slug format (URL-friendly)
    if (metadata.slug !== undefined) {
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(metadata.slug)) {
        return Err({
          code: 'VALIDATION_ERROR',
          message: `Invalid slug format: "${metadata.slug}". Use lowercase letters, numbers, and hyphens only`,
          span: {
            start: { line: 0, column: 0, offset: 0 },
            end: { line: 0, column: 0, offset: 0 },
          },
        });
      }
    }

    // Validate email format
    if (metadata.authorEmail !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(metadata.authorEmail)) {
        return Err({
          code: 'VALIDATION_ERROR',
          message: `Invalid email format: "${metadata.authorEmail}"`,
          span: {
            start: { line: 0, column: 0, offset: 0 },
            end: { line: 0, column: 0, offset: 0 },
          },
        });
      }
    }

    // Validate tags (no duplicates, max 20)
    if (metadata.tags !== undefined) {
      if (metadata.tags.length > 20) {
        return Err({
          code: 'VALIDATION_ERROR',
          message: 'Cannot have more than 20 tags',
          span: {
            start: { line: 0, column: 0, offset: 0 },
            end: { line: 0, column: 0, offset: 0 },
          },
        });
      }

      const uniqueTags = new Set(metadata.tags);
      if (uniqueTags.size !== metadata.tags.length) {
        return Err({
          code: 'VALIDATION_ERROR',
          message: 'Tags must be unique',
          span: {
            start: { line: 0, column: 0, offset: 0 },
            end: { line: 0, column: 0, offset: 0 },
          },
        });
      }
    }

    return Ok(undefined);
  }

  /**
   * Check if query can be cached
   */
  private isCachableQuery(query: Query): boolean {
    // Only cache simple queries without complex filters
    return (
      query.filter !== undefined &&
      query.pagination !== undefined &&
      Object.keys(query.filter).length <= 3
    );
  }

  /**
   * Generate cache key for query
   */
  private getQueryCacheKey(query: Query): string {
    const parts: string[] = ['artifacts', 'list'];

    if (query.filter) {
      if (query.filter.type) {
        const types = Array.isArray(query.filter.type)
          ? query.filter.type
          : [query.filter.type];
        parts.push(`type:${types.join(',')}`);
      }
      if (query.filter.tags) {
        parts.push(`tags:${query.filter.tags.join(',')}`);
      }
      if (query.filter.author) {
        parts.push(`author:${query.filter.author}`);
      }
    }

    if (query.pagination) {
      parts.push(`offset:${query.pagination.offset}`);
      parts.push(`limit:${query.pagination.limit}`);
    }

    return parts.join(':');
  }
}
