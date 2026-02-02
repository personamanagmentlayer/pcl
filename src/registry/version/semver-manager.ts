/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL Registry - Semantic Versioning Manager
 * Phase 1.2C: Advanced Version Management with Rollback and Changelog
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import semver from 'semver';

export interface VersionInfo {
  /** Semantic version string */
  version: string;
  /** Publication timestamp */
  published: Date;
  /** Changelog entry */
  changelog?: string;
  /** Whether this is a breaking change */
  breaking?: boolean;
  /** Deprecation notice */
  deprecated?: boolean | string;
  /** Tags (e.g., 'latest', 'beta', 'alpha') */
  tags?: string[];
}

export interface VersionHistory {
  /** All published versions */
  versions: VersionInfo[];
  /** Current latest version */
  latest: string;
  /** Version rollback history */
  rollbacks: VersionRollback[];
}

export interface VersionRollback {
  /** When the rollback occurred */
  timestamp: Date;
  /** Version rolled back from */
  from: string;
  /** Version rolled back to */
  to: string;
  /** Reason for rollback */
  reason: string;
}

export interface VersionConstraint {
  /** Constraint string (e.g., '^1.2.3', '>=2.0.0 <3.0.0') */
  constraint: string;
  /** Parsed range */
  range: semver.Range;
}

/**
 * Semantic versioning manager with advanced version control features
 *
 * Features:
 * - Semantic version validation and parsing
 * - Version comparison and ordering
 * - Version increment (major, minor, patch)
 * - Version constraint checking (^, ~, >=, etc.)
 * - Version rollback with history
 * - Changelog management
 * - Breaking change detection
 * - Version range queries
 */
export class SemverManager {
  private history: Map<string, VersionHistory>;

  constructor() {
    this.history = new Map();
  }

  /**
   * Validate semantic version format
   * Strict validation - version must be in exact semver format (e.g., 1.0.0)
   * Use parse() to coerce partial versions like '1.0' to '1.0.0'
   */
  isValid(version: string): boolean {
    // Use valid() with strict option - no coercion
    const validated = semver.valid(version);
    // Also reject versions with leading 'v'
    return validated !== null && !version.startsWith('v');
  }

  /**
   * Parse and clean version string
   */
  parse(version: string): string | null {
    return semver.valid(semver.coerce(version));
  }

  /**
   * Compare two versions
   * Returns: -1 if v1 < v2, 0 if v1 == v2, 1 if v1 > v2
   */
  compare(v1: string, v2: string): number {
    return semver.compare(v1, v2);
  }

  /**
   * Check if v1 is greater than v2
   */
  gt(v1: string, v2: string): boolean {
    return semver.gt(v1, v2);
  }

  /**
   * Check if v1 is less than v2
   */
  lt(v1: string, v2: string): boolean {
    return semver.lt(v1, v2);
  }

  /**
   * Check if v1 equals v2
   */
  eq(v1: string, v2: string): boolean {
    return semver.eq(v1, v2);
  }

  /**
   * Increment version
   */
  increment(version: string, type: 'major' | 'minor' | 'patch'): string | null {
    return semver.inc(version, type);
  }

  /**
   * Get next major version
   */
  nextMajor(version: string): string | null {
    return semver.inc(version, 'major');
  }

  /**
   * Get next minor version
   */
  nextMinor(version: string): string | null {
    return semver.inc(version, 'minor');
  }

  /**
   * Get next patch version
   */
  nextPatch(version: string): string | null {
    return semver.inc(version, 'patch');
  }

  /**
   * Check if version satisfies constraint
   *
   * Constraint examples:
   * - "1.2.3" - Exact version
   * - "^1.2.3" - Compatible with 1.2.3 (>=1.2.3 <2.0.0)
   * - "~1.2.3" - Approximately 1.2.3 (>=1.2.3 <1.3.0)
   * - ">=1.2.3" - Greater than or equal
   * - "1.2.x" - Any patch version of 1.2
   * - "1.x" - Any minor/patch version of 1
   * - "*" - Any version
   */
  satisfies(version: string, constraint: string): boolean {
    return semver.satisfies(version, constraint);
  }

  /**
   * Parse version constraint into range
   */
  parseConstraint(constraint: string): VersionConstraint | null {
    try {
      const range = new semver.Range(constraint);
      return {
        constraint,
        range,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get maximum satisfying version from list
   */
  maxSatisfying(versions: string[], constraint: string): string | null {
    return semver.maxSatisfying(versions, constraint);
  }

  /**
   * Get minimum satisfying version from list
   */
  minSatisfying(versions: string[], constraint: string): string | null {
    return semver.minSatisfying(versions, constraint);
  }

  /**
   * Sort versions in ascending order
   */
  sort(versions: string[]): string[] {
    return semver.sort([...versions]);
  }

  /**
   * Sort versions in descending order
   */
  rsort(versions: string[]): string[] {
    return semver.rsort([...versions]);
  }

  /**
   * Get major version number
   */
  getMajor(version: string): number {
    return semver.major(version);
  }

  /**
   * Get minor version number
   */
  getMinor(version: string): number {
    return semver.minor(version);
  }

  /**
   * Get patch version number
   */
  getPatch(version: string): number {
    return semver.patch(version);
  }

  /**
   * Check if version is prerelease
   */
  isPrerelease(version: string): boolean {
    return semver.prerelease(version) !== null;
  }

  /**
   * Get prerelease tags
   */
  getPrerelease(version: string): string[] | null {
    const result = semver.prerelease(version);
    return result ? result.map(String) : null;
  }

  /**
   * Register a new version
   */
  registerVersion(
    artifactId: string,
    version: string,
    options: Omit<VersionInfo, 'version' | 'published'> = {}
  ): void {
    if (!this.isValid(version)) {
      throw new Error(`Invalid semantic version: ${version}`);
    }

    let history = this.history.get(artifactId);
    if (!history) {
      history = {
        versions: [],
        latest: version,
        rollbacks: [],
      };
      this.history.set(artifactId, history);
    }

    // Check for duplicate version
    const existing = history.versions.find((v) => v.version === version);
    if (existing) {
      throw new Error(`Version ${version} already exists for ${artifactId}`);
    }

    // Add new version
    const versionInfo: VersionInfo = {
      version,
      published: new Date(),
      ...options,
    };

    history.versions.push(versionInfo);

    // Update latest if this is the newest version
    if (this.gt(version, history.latest)) {
      history.latest = version;
    }

    // Sort versions
    history.versions.sort((a, b) => this.compare(a.version, b.version));
  }

  /**
   * Get version history for an artifact
   */
  getHistory(artifactId: string): VersionHistory | null {
    return this.history.get(artifactId) || null;
  }

  /**
   * Get all versions for an artifact
   */
  getVersions(artifactId: string): string[] {
    const history = this.history.get(artifactId);
    return history ? history.versions.map((v) => v.version) : [];
  }

  /**
   * Get latest version
   */
  getLatest(artifactId: string): string | null {
    const history = this.history.get(artifactId);
    return history?.latest || null;
  }

  /**
   * Get version info
   */
  getVersionInfo(artifactId: string, version: string): VersionInfo | null {
    const history = this.history.get(artifactId);
    return history?.versions.find((v) => v.version === version) || null;
  }

  /**
   * Get changelog for a version
   */
  getChangelog(artifactId: string, version: string): string | null {
    const info = this.getVersionInfo(artifactId, version);
    return info?.changelog || null;
  }

  /**
   * Get all changelogs
   */
  getAllChangelogs(artifactId: string): Map<string, string> {
    const history = this.history.get(artifactId);
    if (!history) return new Map();

    const changelogs = new Map<string, string>();
    for (const version of history.versions) {
      if (version.changelog) {
        changelogs.set(version.version, version.changelog);
      }
    }

    return changelogs;
  }

  /**
   * Rollback to a previous version
   */
  rollback(
    artifactId: string,
    targetVersion: string,
    reason: string = 'Manual rollback'
  ): void {
    const history = this.history.get(artifactId);
    if (!history) {
      throw new Error(`No version history found for ${artifactId}`);
    }

    // Verify target version exists
    const targetInfo = history.versions.find(
      (v) => v.version === targetVersion
    );
    if (!targetInfo) {
      throw new Error(`Version ${targetVersion} not found for ${artifactId}`);
    }

    // Record rollback
    const rollback: VersionRollback = {
      timestamp: new Date(),
      from: history.latest,
      to: targetVersion,
      reason,
    };

    history.rollbacks.push(rollback);
    history.latest = targetVersion;
  }

  /**
   * Get rollback history
   */
  getRollbackHistory(artifactId: string): VersionRollback[] {
    const history = this.history.get(artifactId);
    return history?.rollbacks || [];
  }

  /**
   * Find versions matching constraint
   */
  findVersions(artifactId: string, constraint: string): string[] {
    const versions = this.getVersions(artifactId);
    return versions.filter((v) => this.satisfies(v, constraint));
  }

  /**
   * Get breaking changes since version
   */
  getBreakingChangesSince(
    artifactId: string,
    sinceVersion: string
  ): VersionInfo[] {
    const history = this.history.get(artifactId);
    if (!history) return [];

    return history.versions.filter(
      (v) => v.breaking && this.gt(v.version, sinceVersion)
    );
  }

  /**
   * Check if upgrade would introduce breaking changes
   */
  hasBreakingChanges(
    artifactId: string,
    fromVersion: string,
    toVersion: string
  ): boolean {
    const breakingChanges = this.getBreakingChangesSince(
      artifactId,
      fromVersion
    );
    return breakingChanges.some((v) => this.compare(v.version, toVersion) <= 0);
  }

  /**
   * Get deprecated versions
   */
  getDeprecatedVersions(artifactId: string): VersionInfo[] {
    const history = this.history.get(artifactId);
    if (!history) return [];

    return history.versions.filter((v) => v.deprecated);
  }

  /**
   * Check if version is deprecated
   */
  isDeprecated(artifactId: string, version: string): boolean {
    const info = this.getVersionInfo(artifactId, version);
    return info?.deprecated === true || typeof info?.deprecated === 'string';
  }

  /**
   * Get version diff (changes between two versions)
   */
  diff(v1: string, v2: string): semver.ReleaseType | null {
    return semver.diff(v1, v2);
  }

  /**
   * Clear all version history
   */
  clear(): void {
    this.history.clear();
  }

  /**
   * Clear version history for specific artifact
   */
  clearArtifact(artifactId: string): void {
    this.history.delete(artifactId);
  }

  /**
   * Export version history as JSON
   */
  export(artifactId?: string): Record<string, VersionHistory> {
    if (artifactId) {
      const history = this.history.get(artifactId);
      return history ? { [artifactId]: history } : {};
    }

    return Object.fromEntries(this.history.entries());
  }

  /**
   * Import version history from JSON
   */
  import(data: Record<string, VersionHistory>): void {
    for (const [artifactId, history] of Object.entries(data)) {
      this.history.set(artifactId, history);
    }
  }
}
