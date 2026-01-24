/**
 * Artifact Service
 */

import { APIException } from '../middleware/error-handler.js';
import type {
  ArtifactMetadata,
  ArtifactResponse,
  ArtifactStats,
  ArtifactType,
  CreateArtifactInput,
  ListArtifactsQuery,
  ListArtifactsResponse,
  UpdateArtifactInput,
} from '../schemas/artifact.schema.js';

/**
 * In-memory artifact store (temporary - will be replaced with database)
 */
interface Artifact {
  id: string;
  type: ArtifactType;
  metadata: ArtifactMetadata;
  source: string;
  stats: ArtifactStats;
  published: boolean;
  authorId: string;
  authorUsername: string;
  createdAt: Date;
  updatedAt: Date;
}

class ArtifactStore {
  private artifacts: Map<string, Artifact> = new Map();
  private slugIndex: Map<string, string> = new Map(); // slug -> id
  private authorIndex: Map<string, Set<string>> = new Map(); // authorId -> Set<id>
  private typeIndex: Map<ArtifactType, Set<string>> = new Map(); // type -> Set<id>
  private stars: Map<string, Set<string>> = new Map(); // artifactId -> Set<userId>

  async create(artifact: Artifact): Promise<Artifact> {
    this.artifacts.set(artifact.id, artifact);

    // Update indices
    if (artifact.metadata.slug) {
      this.slugIndex.set(artifact.metadata.slug, artifact.id);
    }

    if (!this.authorIndex.has(artifact.authorId)) {
      this.authorIndex.set(artifact.authorId, new Set());
    }
    this.authorIndex.get(artifact.authorId)!.add(artifact.id);

    if (!this.typeIndex.has(artifact.type)) {
      this.typeIndex.set(artifact.type, new Set());
    }
    this.typeIndex.get(artifact.type)!.add(artifact.id);

    return artifact;
  }

  async findById(id: string): Promise<Artifact | null> {
    return this.artifacts.get(id) || null;
  }

  async findBySlug(slug: string): Promise<Artifact | null> {
    const id = this.slugIndex.get(slug);
    return id ? this.artifacts.get(id) || null : null;
  }

  async update(
    id: string,
    updates: Partial<Artifact>
  ): Promise<Artifact | null> {
    const artifact = this.artifacts.get(id);
    if (!artifact) return null;

    const updated = { ...artifact, ...updates, updatedAt: new Date() };
    this.artifacts.set(id, updated);

    // Update slug index if changed
    if (
      updates.metadata?.slug &&
      updates.metadata.slug !== artifact.metadata.slug
    ) {
      if (artifact.metadata.slug) {
        this.slugIndex.delete(artifact.metadata.slug);
      }
      this.slugIndex.set(updates.metadata.slug, id);
    }

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const artifact = this.artifacts.get(id);
    if (!artifact) return false;

    this.artifacts.delete(id);

    // Clean up indices
    if (artifact.metadata.slug) {
      this.slugIndex.delete(artifact.metadata.slug);
    }

    const authorArtifacts = this.authorIndex.get(artifact.authorId);
    if (authorArtifacts) {
      authorArtifacts.delete(id);
    }

    const typeArtifacts = this.typeIndex.get(artifact.type);
    if (typeArtifacts) {
      typeArtifacts.delete(id);
    }

    this.stars.delete(id);

    return true;
  }

  async list(
    query: ListArtifactsQuery
  ): Promise<{ artifacts: Artifact[]; total: number }> {
    let artifacts = Array.from(this.artifacts.values());

    // Filter by type
    if (query.type) {
      artifacts = artifacts.filter((a) => a.type === query.type);
    }

    // Filter by published
    if (query.published !== undefined) {
      artifacts = artifacts.filter((a) => a.published === query.published);
    }

    // Filter by author
    if (query.author) {
      artifacts = artifacts.filter((a) => a.authorUsername === query.author);
    }

    // Filter by tags
    if (query.tags) {
      const tags = query.tags.split(',').map((t) => t.trim().toLowerCase());
      artifacts = artifacts.filter((a) =>
        tags.some((tag) =>
          a.metadata.tags.map((t) => t.toLowerCase()).includes(tag)
        )
      );
    }

    // Search
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      artifacts = artifacts.filter(
        (a) =>
          a.metadata.name.toLowerCase().includes(searchLower) ||
          a.metadata.description.toLowerCase().includes(searchLower) ||
          a.metadata.tags.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }

    const total = artifacts.length;

    // Sort
    if (query.sort) {
      const [field, order] = query.sort.split(':') as [string, 'asc' | 'desc'];
      artifacts.sort((a, b) => {
        let aVal: any;
        let bVal: any;

        if (field === 'createdAt' || field === 'updatedAt') {
          aVal = a[field as 'createdAt' | 'updatedAt'].getTime();
          bVal = b[field as 'createdAt' | 'updatedAt'].getTime();
        } else if (field === 'downloads' || field === 'stars') {
          aVal = a.stats[field];
          bVal = b.stats[field];
        } else {
          return 0;
        }

        return order === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    // Paginate
    const limit = query.limit ? parseInt(query.limit as any, 10) : 20;
    const offset = query.offset ? parseInt(query.offset as any, 10) : 0;
    artifacts = artifacts.slice(offset, offset + limit);

    return { artifacts, total };
  }

  async star(artifactId: string, userId: string): Promise<boolean> {
    if (!this.stars.has(artifactId)) {
      this.stars.set(artifactId, new Set());
    }
    const stars = this.stars.get(artifactId)!;
    const wasStarred = stars.has(userId);
    stars.add(userId);

    // Update artifact stats
    const artifact = this.artifacts.get(artifactId);
    if (artifact && !wasStarred) {
      artifact.stats.stars++;
    }

    return !wasStarred;
  }

  async unstar(artifactId: string, userId: string): Promise<boolean> {
    const stars = this.stars.get(artifactId);
    if (!stars) return false;

    const wasStarred = stars.has(userId);
    stars.delete(userId);

    // Update artifact stats
    const artifact = this.artifacts.get(artifactId);
    if (artifact && wasStarred) {
      artifact.stats.stars = Math.max(0, artifact.stats.stars - 1);
    }

    return wasStarred;
  }

  async isStarred(artifactId: string, userId: string): Promise<boolean> {
    const stars = this.stars.get(artifactId);
    return stars ? stars.has(userId) : false;
  }

  async incrementDownloads(artifactId: string): Promise<void> {
    const artifact = this.artifacts.get(artifactId);
    if (artifact) {
      artifact.stats.downloads++;
    }
  }

  async incrementViews(artifactId: string): Promise<void> {
    const artifact = this.artifacts.get(artifactId);
    if (artifact) {
      artifact.stats.views++;
    }
  }
}

const artifactStore = new ArtifactStore();

/**
 * Generate unique artifact ID
 */
function generateArtifactId(): string {
  return `artifact_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Generate slug from name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);
}

/**
 * Convert Artifact to ArtifactResponse
 */
function toArtifactResponse(artifact: Artifact): ArtifactResponse {
  return {
    id: artifact.id,
    type: artifact.type,
    metadata: artifact.metadata,
    source: artifact.source,
    stats: artifact.stats,
    published: artifact.published,
    authorId: artifact.authorId,
    authorUsername: artifact.authorUsername,
    createdAt: artifact.createdAt.toISOString(),
    updatedAt: artifact.updatedAt.toISOString(),
  };
}

/**
 * Create a new artifact
 */
export async function createArtifact(
  input: CreateArtifactInput,
  userId: string,
  username: string
): Promise<ArtifactResponse> {
  // Generate slug if not provided
  const slug = input.metadata.slug || generateSlug(input.metadata.name);

  // Check if slug already exists
  const existing = await artifactStore.findBySlug(slug);
  if (existing) {
    throw new APIException(
      409,
      'SLUG_TAKEN',
      `Artifact with slug "${slug}" already exists`
    );
  }

  // Create artifact
  const artifact: Artifact = {
    id: generateArtifactId(),
    type: input.type,
    metadata: {
      ...input.metadata,
      slug,
    },
    source: input.source,
    stats: {
      downloads: 0,
      stars: 0,
      views: 0,
    },
    published: input.published,
    authorId: userId,
    authorUsername: username,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await artifactStore.create(artifact);

  return toArtifactResponse(artifact);
}

/**
 * Get artifact by ID
 */
export async function getArtifactById(
  id: string,
  userId?: string
): Promise<ArtifactResponse> {
  const artifact = await artifactStore.findById(id);
  if (!artifact) {
    throw new APIException(404, 'ARTIFACT_NOT_FOUND', 'Artifact not found');
  }

  // Increment views
  await artifactStore.incrementViews(id);

  return toArtifactResponse(artifact);
}

/**
 * Update artifact
 */
export async function updateArtifact(
  id: string,
  input: UpdateArtifactInput,
  userId: string
): Promise<ArtifactResponse> {
  const artifact = await artifactStore.findById(id);
  if (!artifact) {
    throw new APIException(404, 'ARTIFACT_NOT_FOUND', 'Artifact not found');
  }

  // Check ownership
  if (artifact.authorId !== userId) {
    throw new APIException(
      403,
      'FORBIDDEN',
      'You do not have permission to update this artifact'
    );
  }

  // Check slug uniqueness if changed
  if (input.metadata?.slug && input.metadata.slug !== artifact.metadata.slug) {
    const existing = await artifactStore.findBySlug(input.metadata.slug);
    if (existing) {
      throw new APIException(
        409,
        'SLUG_TAKEN',
        `Artifact with slug "${input.metadata.slug}" already exists`
      );
    }
  }

  // Update artifact
  const updates: Partial<Artifact> = {};
  if (input.metadata) {
    updates.metadata = { ...artifact.metadata, ...input.metadata };
  }
  if (input.source !== undefined) {
    updates.source = input.source;
  }
  if (input.published !== undefined) {
    updates.published = input.published;
  }

  const updated = await artifactStore.update(id, updates);
  if (!updated) {
    throw new APIException(500, 'UPDATE_FAILED', 'Failed to update artifact');
  }

  return toArtifactResponse(updated);
}

/**
 * Delete artifact
 */
export async function deleteArtifact(
  id: string,
  userId: string
): Promise<void> {
  const artifact = await artifactStore.findById(id);
  if (!artifact) {
    throw new APIException(404, 'ARTIFACT_NOT_FOUND', 'Artifact not found');
  }

  // Check ownership
  if (artifact.authorId !== userId) {
    throw new APIException(
      403,
      'FORBIDDEN',
      'You do not have permission to delete this artifact'
    );
  }

  await artifactStore.delete(id);
}

/**
 * List artifacts
 */
export async function listArtifacts(
  query: ListArtifactsQuery
): Promise<ListArtifactsResponse> {
  const { artifacts, total } = await artifactStore.list(query);

  const limit = query.limit ? parseInt(query.limit as any, 10) : 20;
  const offset = query.offset ? parseInt(query.offset as any, 10) : 0;

  return {
    artifacts: artifacts.map(toArtifactResponse),
    pagination: {
      total,
      offset,
      limit,
      hasMore: offset + artifacts.length < total,
    },
  };
}

/**
 * Star an artifact
 */
export async function starArtifact(
  artifactId: string,
  userId: string
): Promise<{ starred: boolean; totalStars: number }> {
  const artifact = await artifactStore.findById(artifactId);
  if (!artifact) {
    throw new APIException(404, 'ARTIFACT_NOT_FOUND', 'Artifact not found');
  }

  await artifactStore.star(artifactId, userId);

  return {
    starred: true,
    totalStars: artifact.stats.stars,
  };
}

/**
 * Unstar an artifact
 */
export async function unstarArtifact(
  artifactId: string,
  userId: string
): Promise<{ starred: boolean; totalStars: number }> {
  const artifact = await artifactStore.findById(artifactId);
  if (!artifact) {
    throw new APIException(404, 'ARTIFACT_NOT_FOUND', 'Artifact not found');
  }

  await artifactStore.unstar(artifactId, userId);

  return {
    starred: false,
    totalStars: artifact.stats.stars,
  };
}

/**
 * Track download
 */
export async function trackDownload(artifactId: string): Promise<void> {
  const artifact = await artifactStore.findById(artifactId);
  if (!artifact) {
    throw new APIException(404, 'ARTIFACT_NOT_FOUND', 'Artifact not found');
  }

  await artifactStore.incrementDownloads(artifactId);
}
