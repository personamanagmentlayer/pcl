/**
 * Version Service
 */

import { APIException } from '../middleware/error-handler.js';
import type {
  CreateVersionInput,
  UpdateVersionInput,
  VersionResponse,
  ListVersionsResponse,
  VersionMetadata,
  VersionComparison,
} from '../schemas/version.schema.js';

/**
 * In-memory version store (temporary - will be replaced with database)
 */
interface Version {
  id: string;
  artifactId: string;
  version: string;
  source: string;
  metadata: VersionMetadata;
  published: boolean;
  downloads: number;
  createdAt: Date;
  updatedAt: Date;
}

class VersionStore {
  private versions: Map<string, Version> = new Map();
  private artifactVersions: Map<string, Set<string>> = new Map(); // artifactId -> Set<versionId>
  private versionIndex: Map<string, string> = new Map(); // artifactId:version -> versionId

  async create(version: Version): Promise<Version> {
    this.versions.set(version.id, version);

    // Update artifact versions index
    if (!this.artifactVersions.has(version.artifactId)) {
      this.artifactVersions.set(version.artifactId, new Set());
    }
    this.artifactVersions.get(version.artifactId)!.add(version.id);

    // Update version index
    const key = `${version.artifactId}:${version.version}`;
    this.versionIndex.set(key, version.id);

    return version;
  }

  async findById(id: string): Promise<Version | null> {
    return this.versions.get(id) || null;
  }

  async findByArtifactAndVersion(
    artifactId: string,
    version: string
  ): Promise<Version | null> {
    const key = `${artifactId}:${version}`;
    const id = this.versionIndex.get(key);
    return id ? this.versions.get(id) || null : null;
  }

  async listByArtifact(artifactId: string): Promise<Version[]> {
    const versionIds = this.artifactVersions.get(artifactId);
    if (!versionIds) return [];

    const versions = Array.from(versionIds)
      .map((id) => this.versions.get(id))
      .filter((v): v is Version => v !== undefined);

    // Sort by semver (newest first)
    return versions.sort((a, b) => compareVersions(b.version, a.version));
  }

  async update(id: string, updates: Partial<Version>): Promise<Version | null> {
    const version = this.versions.get(id);
    if (!version) return null;

    const updated = { ...version, ...updates, updatedAt: new Date() };
    this.versions.set(id, updated);

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const version = this.versions.get(id);
    if (!version) return false;

    this.versions.delete(id);

    // Clean up indices
    const artifactVersions = this.artifactVersions.get(version.artifactId);
    if (artifactVersions) {
      artifactVersions.delete(id);
    }

    const key = `${version.artifactId}:${version.version}`;
    this.versionIndex.delete(key);

    return true;
  }

  async getLatestVersion(
    artifactId: string,
    publishedOnly: boolean = true
  ): Promise<Version | null> {
    const versions = await this.listByArtifact(artifactId);

    const filtered = publishedOnly
      ? versions.filter((v) => v.published)
      : versions;

    return filtered.length > 0 ? filtered[0] : null;
  }

  async incrementDownloads(id: string): Promise<void> {
    const version = this.versions.get(id);
    if (version) {
      version.downloads++;
    }
  }
}

const versionStore = new VersionStore();

/**
 * Generate unique version ID
 */
function generateVersionId(): string {
  return `version_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Parse semver string into components
 */
function parseSemver(version: string): {
  major: number;
  minor: number;
  patch: number;
} {
  const parts = version.split('.').map((p) => parseInt(p, 10));
  return {
    major: parts[0],
    minor: parts[1],
    patch: parts[2],
  };
}

/**
 * Compare two semver versions
 * Returns: positive if v1 > v2, negative if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);

  if (p1.major !== p2.major) return p1.major - p2.major;
  if (p1.minor !== p2.minor) return p1.minor - p2.minor;
  return p1.patch - p2.patch;
}

/**
 * Compare version with another and get detailed comparison
 */
export function compareVersionDetails(
  newVersion: string,
  oldVersion: string
): VersionComparison {
  const newParts = parseSemver(newVersion);
  const oldParts = parseSemver(oldVersion);

  const majorDiff = newParts.major - oldParts.major;
  const minorDiff = newParts.minor - oldParts.minor;
  const patchDiff = newParts.patch - oldParts.patch;

  return {
    isNewer: compareVersions(newVersion, oldVersion) > 0,
    isMajor: majorDiff > 0,
    isMinor: majorDiff === 0 && minorDiff > 0,
    isPatch: majorDiff === 0 && minorDiff === 0 && patchDiff > 0,
    diff: {
      major: majorDiff,
      minor: minorDiff,
      patch: patchDiff,
    },
  };
}

/**
 * Convert Version to VersionResponse
 */
function toVersionResponse(version: Version): VersionResponse {
  return {
    id: version.id,
    artifactId: version.artifactId,
    version: version.version,
    source: version.source,
    metadata: version.metadata,
    published: version.published,
    downloads: version.downloads,
    createdAt: version.createdAt.toISOString(),
    updatedAt: version.updatedAt.toISOString(),
  };
}

/**
 * Create a new version
 */
export async function createVersion(
  artifactId: string,
  input: CreateVersionInput,
  userId: string
): Promise<VersionResponse> {
  // Check if version already exists for this artifact
  const existing = await versionStore.findByArtifactAndVersion(
    artifactId,
    input.version
  );
  if (existing) {
    throw new APIException(
      409,
      'VERSION_EXISTS',
      `Version ${input.version} already exists for this artifact`
    );
  }

  // Get latest version to validate semver progression
  const latest = await versionStore.getLatestVersion(artifactId, false);
  if (latest) {
    const comparison = compareVersionDetails(input.version, latest.version);
    if (!comparison.isNewer) {
      throw new APIException(
        400,
        'INVALID_VERSION',
        `Version ${input.version} must be newer than the latest version ${latest.version}`
      );
    }
  }

  // Create version
  const version: Version = {
    id: generateVersionId(),
    artifactId,
    version: input.version,
    source: input.source,
    metadata: input.metadata || {
      breaking: false,
      deprecated: false,
    },
    published: input.published,
    downloads: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await versionStore.create(version);

  return toVersionResponse(version);
}

/**
 * Get version by ID
 */
export async function getVersionById(
  versionId: string
): Promise<VersionResponse> {
  const version = await versionStore.findById(versionId);
  if (!version) {
    throw new APIException(404, 'VERSION_NOT_FOUND', 'Version not found');
  }

  return toVersionResponse(version);
}

/**
 * Get specific version of an artifact
 */
export async function getArtifactVersion(
  artifactId: string,
  versionString: string
): Promise<VersionResponse> {
  // Handle "latest" keyword
  if (versionString === 'latest') {
    const latest = await versionStore.getLatestVersion(artifactId, true);
    if (!latest) {
      throw new APIException(
        404,
        'VERSION_NOT_FOUND',
        'No published versions found'
      );
    }
    return toVersionResponse(latest);
  }

  // Get specific version
  const version = await versionStore.findByArtifactAndVersion(
    artifactId,
    versionString
  );
  if (!version) {
    throw new APIException(
      404,
      'VERSION_NOT_FOUND',
      `Version ${versionString} not found`
    );
  }

  return toVersionResponse(version);
}

/**
 * List all versions of an artifact
 */
export async function listArtifactVersions(
  artifactId: string
): Promise<ListVersionsResponse> {
  const versions = await versionStore.listByArtifact(artifactId);

  return {
    versions: versions.map(toVersionResponse),
    total: versions.length,
  };
}

/**
 * Update version
 */
export async function updateVersion(
  versionId: string,
  input: UpdateVersionInput,
  userId: string
): Promise<VersionResponse> {
  const version = await versionStore.findById(versionId);
  if (!version) {
    throw new APIException(404, 'VERSION_NOT_FOUND', 'Version not found');
  }

  // Update version
  const updates: Partial<Version> = {};
  if (input.source !== undefined) {
    updates.source = input.source;
  }
  if (input.metadata) {
    updates.metadata = { ...version.metadata, ...input.metadata };
  }
  if (input.published !== undefined) {
    updates.published = input.published;
  }

  const updated = await versionStore.update(versionId, updates);
  if (!updated) {
    throw new APIException(500, 'UPDATE_FAILED', 'Failed to update version');
  }

  return toVersionResponse(updated);
}

/**
 * Delete version
 */
export async function deleteVersion(
  versionId: string,
  userId: string
): Promise<void> {
  const version = await versionStore.findById(versionId);
  if (!version) {
    throw new APIException(404, 'VERSION_NOT_FOUND', 'Version not found');
  }

  await versionStore.delete(versionId);
}

/**
 * Track version download
 */
export async function trackVersionDownload(versionId: string): Promise<void> {
  const version = await versionStore.findById(versionId);
  if (!version) {
    throw new APIException(404, 'VERSION_NOT_FOUND', 'Version not found');
  }

  await versionStore.incrementDownloads(versionId);
}

/**
 * Get latest version of an artifact
 */
export async function getLatestVersion(
  artifactId: string,
  publishedOnly: boolean = true
): Promise<VersionResponse> {
  const latest = await versionStore.getLatestVersion(artifactId, publishedOnly);
  if (!latest) {
    throw new APIException(
      404,
      'VERSION_NOT_FOUND',
      publishedOnly ? 'No published versions found' : 'No versions found'
    );
  }

  return toVersionResponse(latest);
}
