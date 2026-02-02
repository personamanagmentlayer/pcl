/**
 * Comprehensive test suite for Version Service
 * Tests version creation, retrieval, updates, semver operations, and error handling
 */

import {
  createVersion,
  getVersionById,
  getArtifactVersion,
  listArtifactVersions,
  updateVersion,
  deleteVersion,
  trackVersionDownload,
  getLatestVersion,
  compareVersionDetails,
} from '../../../src/http/services/version.service';
import type {
  CreateVersionInput,
  UpdateVersionInput,
  VersionMetadata,
} from '../../../src/http/schemas/version.schema';

// ============================================================================
// Test Data Helpers
// ============================================================================

function createTestMetadata(
  overrides?: Partial<VersionMetadata>
): VersionMetadata {
  return {
    breaking: false,
    deprecated: false,
    changelog: 'Initial release',
    ...overrides,
  };
}

function createTestVersionInput(
  overrides?: Partial<CreateVersionInput>
): CreateVersionInput {
  return {
    version: '1.0.0',
    source: 'persona TestPersona { name: "Test" }',
    published: true,
    metadata: createTestMetadata(),
    ...overrides,
  };
}

const TEST_USER_ID = 'user_test_456';

// Generate unique artifact ID for each test to avoid version conflicts
let testCounter = 0;
function getUniqueArtifactId(): string {
  return `artifact_test_${Date.now()}_${testCounter++}`;
}

// ============================================================================
// Version Creation Tests
// ============================================================================

describe('Version Creation', () => {
  describe('createVersion', () => {
    it('should create a new version successfully', async () => {
      const input = createTestVersionInput();
      const result = await createVersion(
        getUniqueArtifactId(),
        input,
        TEST_USER_ID
      );

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^version_/);
      expect(result.artifactId).toMatch(/^artifact_test_/);
      expect(result.version).toBe('1.0.0');
      expect(result.source).toBe(input.source);
      expect(result.published).toBe(true);
      expect(result.downloads).toBe(0);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should create unpublished version', async () => {
      const input = createTestVersionInput({
        version: '1.0.1',
        published: false,
      });
      const result = await createVersion(
        getUniqueArtifactId(),
        input,
        TEST_USER_ID
      );

      expect(result.published).toBe(false);
    });

    it('should create version with metadata', async () => {
      const metadata = createTestMetadata({
        breaking: true,
        deprecated: false,
        changelog: 'Breaking changes in API',
        deprecationMessage: undefined,
      });
      const input = createTestVersionInput({
        version: '2.0.0',
        metadata,
      });
      const result = await createVersion(
        getUniqueArtifactId(),
        input,
        TEST_USER_ID
      );

      expect(result.metadata.breaking).toBe(true);
      expect(result.metadata.changelog).toBe('Breaking changes in API');
    });

    it('should create version with deprecation info', async () => {
      const metadata = createTestMetadata({
        deprecated: true,
        deprecationMessage: 'Use version 3.0.0 instead',
      });
      const input = createTestVersionInput({
        version: '2.0.1',
        metadata,
      });
      const result = await createVersion(
        getUniqueArtifactId(),
        input,
        TEST_USER_ID
      );

      expect(result.metadata.deprecated).toBe(true);
      expect(result.metadata.deprecationMessage).toBe(
        'Use version 3.0.0 instead'
      );
    });

    it('should initialize downloads to 0', async () => {
      const input = createTestVersionInput({ version: '1.0.2' });
      const result = await createVersion(
        getUniqueArtifactId(),
        input,
        TEST_USER_ID
      );

      expect(result.downloads).toBe(0);
    });

    it('should set timestamps correctly', async () => {
      const before = new Date();
      const input = createTestVersionInput({ version: '1.0.3' });
      const result = await createVersion(
        getUniqueArtifactId(),
        input,
        TEST_USER_ID
      );
      const after = new Date();

      const createdAt = new Date(result.createdAt);
      const updatedAt = new Date(result.updatedAt);

      expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(updatedAt.getTime()).toBe(createdAt.getTime());
    });
  });

  describe('createVersion - duplicate prevention', () => {
    it('should prevent duplicate versions', async () => {
      const artifactId = 'artifact_duplicate_test';
      const input = createTestVersionInput({ version: '1.0.0' });

      await createVersion(artifactId, input, TEST_USER_ID);

      await expect(
        createVersion(artifactId, input, TEST_USER_ID)
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'VERSION_EXISTS',
      });
    });

    it('should allow same version for different artifacts', async () => {
      const input = createTestVersionInput({ version: '1.0.0' });

      const result1 = await createVersion('artifact_a', input, TEST_USER_ID);
      const result2 = await createVersion('artifact_b', input, TEST_USER_ID);

      expect(result1.artifactId).toBe('artifact_a');
      expect(result2.artifactId).toBe('artifact_b');
      expect(result1.version).toBe(result2.version);
    });
  });

  describe('createVersion - semver validation', () => {
    it('should enforce newer version requirement', async () => {
      const artifactId = 'artifact_semver_test';

      await createVersion(
        artifactId,
        createTestVersionInput({ version: '2.0.0' }),
        TEST_USER_ID
      );

      await expect(
        createVersion(
          artifactId,
          createTestVersionInput({ version: '1.0.0' }),
          TEST_USER_ID
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_VERSION',
      });
    });

    it('should allow incrementing major version', async () => {
      const artifactId = 'artifact_major_test';

      await createVersion(
        artifactId,
        createTestVersionInput({ version: '1.5.3' }),
        TEST_USER_ID
      );

      const result = await createVersion(
        artifactId,
        createTestVersionInput({ version: '2.0.0' }),
        TEST_USER_ID
      );

      expect(result.version).toBe('2.0.0');
    });

    it('should allow incrementing minor version', async () => {
      const artifactId = 'artifact_minor_test';

      await createVersion(
        artifactId,
        createTestVersionInput({ version: '1.0.0' }),
        TEST_USER_ID
      );

      const result = await createVersion(
        artifactId,
        createTestVersionInput({ version: '1.1.0' }),
        TEST_USER_ID
      );

      expect(result.version).toBe('1.1.0');
    });

    it('should allow incrementing patch version', async () => {
      const artifactId = 'artifact_patch_test';

      await createVersion(
        artifactId,
        createTestVersionInput({ version: '1.0.0' }),
        TEST_USER_ID
      );

      const result = await createVersion(
        artifactId,
        createTestVersionInput({ version: '1.0.1' }),
        TEST_USER_ID
      );

      expect(result.version).toBe('1.0.1');
    });

    it('should reject equal version', async () => {
      const artifactId = 'artifact_equal_test';

      await createVersion(
        artifactId,
        createTestVersionInput({ version: '1.0.0' }),
        TEST_USER_ID
      );

      await expect(
        createVersion(
          artifactId,
          createTestVersionInput({ version: '1.0.0' }),
          TEST_USER_ID
        )
      ).rejects.toThrow();
    });
  });
});

// ============================================================================
// Version Retrieval Tests
// ============================================================================

describe('Version Retrieval', () => {
  describe('getVersionById', () => {
    it('should retrieve version by ID', async () => {
      const created = await createVersion(
        'artifact_retrieve',
        createTestVersionInput({ version: '1.0.0' }),
        TEST_USER_ID
      );

      const retrieved = await getVersionById(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should throw error for non-existent version ID', async () => {
      await expect(getVersionById('version_nonexistent')).rejects.toMatchObject(
        {
          statusCode: 404,
          code: 'VERSION_NOT_FOUND',
        }
      );
    });
  });

  describe('getArtifactVersion', () => {
    it('should retrieve specific version by version string', async () => {
      const artifactId = 'artifact_specific';
      await createVersion(
        artifactId,
        createTestVersionInput({ version: '1.0.0' }),
        TEST_USER_ID
      );
      await createVersion(
        artifactId,
        createTestVersionInput({ version: '2.0.0' }),
        TEST_USER_ID
      );

      const result = await getArtifactVersion(artifactId, '1.0.0');

      expect(result.version).toBe('1.0.0');
      expect(result.artifactId).toBe(artifactId);
    });

    it('should retrieve latest published version with "latest" keyword', async () => {
      const artifactId = 'artifact_latest';
      await createVersion(
        artifactId,
        createTestVersionInput({ version: '1.0.0', published: true }),
        TEST_USER_ID
      );
      const latest = await createVersion(
        artifactId,
        createTestVersionInput({ version: '2.0.0', published: true }),
        TEST_USER_ID
      );

      const result = await getArtifactVersion(artifactId, 'latest');

      expect(result.version).toBe('2.0.0');
      expect(result.id).toBe(latest.id);
    });

    it('should skip unpublished versions when fetching latest', async () => {
      const artifactId = 'artifact_latest_published';
      await createVersion(
        artifactId,
        createTestVersionInput({ version: '1.0.0', published: true }),
        TEST_USER_ID
      );
      await createVersion(
        artifactId,
        createTestVersionInput({ version: '2.0.0', published: false }),
        TEST_USER_ID
      );

      const result = await getArtifactVersion(artifactId, 'latest');

      expect(result.version).toBe('1.0.0');
    });

    it('should throw error for non-existent version string', async () => {
      await expect(
        getArtifactVersion('artifact_missing', '9.9.9')
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'VERSION_NOT_FOUND',
      });
    });

    it('should throw error when no published versions exist', async () => {
      const artifactId = 'artifact_no_published';
      await createVersion(
        artifactId,
        createTestVersionInput({ version: '1.0.0', published: false }),
        TEST_USER_ID
      );

      await expect(
        getArtifactVersion(artifactId, 'latest')
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'VERSION_NOT_FOUND',
      });
    });
  });

  describe('getLatestVersion', () => {
    it('should get latest published version by default', async () => {
      const artifactId = 'artifact_get_latest';
      await createVersion(
        artifactId,
        createTestVersionInput({ version: '1.0.0', published: true }),
        TEST_USER_ID
      );
      await createVersion(
        artifactId,
        createTestVersionInput({ version: '1.1.0', published: true }),
        TEST_USER_ID
      );

      const result = await getLatestVersion(artifactId);

      expect(result.version).toBe('1.1.0');
    });

    it('should include unpublished when publishedOnly is false', async () => {
      const artifactId = 'artifact_latest_unpub';
      await createVersion(
        artifactId,
        createTestVersionInput({ version: '1.0.0', published: true }),
        TEST_USER_ID
      );
      await createVersion(
        artifactId,
        createTestVersionInput({ version: '2.0.0', published: false }),
        TEST_USER_ID
      );

      const result = await getLatestVersion(artifactId, false);

      expect(result.version).toBe('2.0.0');
    });

    it('should throw error when no versions exist', async () => {
      await expect(getLatestVersion('artifact_empty')).rejects.toMatchObject({
        statusCode: 404,
        code: 'VERSION_NOT_FOUND',
      });
    });
  });

  describe('listArtifactVersions', () => {
    it('should list all versions of an artifact', async () => {
      const artifactId = 'artifact_list';
      await createVersion(
        artifactId,
        createTestVersionInput({ version: '1.0.0' }),
        TEST_USER_ID
      );
      await createVersion(
        artifactId,
        createTestVersionInput({ version: '1.1.0' }),
        TEST_USER_ID
      );
      await createVersion(
        artifactId,
        createTestVersionInput({ version: '2.0.0' }),
        TEST_USER_ID
      );

      const result = await listArtifactVersions(artifactId);

      expect(result.total).toBe(3);
      expect(result.versions).toHaveLength(3);
    });

    it('should return versions sorted by semver (newest first)', async () => {
      const artifactId = 'artifact_sorted';
      await createVersion(
        artifactId,
        createTestVersionInput({ version: '1.0.0' }),
        TEST_USER_ID
      );
      await createVersion(
        artifactId,
        createTestVersionInput({ version: '1.5.0' }),
        TEST_USER_ID
      );
      await createVersion(
        artifactId,
        createTestVersionInput({ version: '2.0.0' }),
        TEST_USER_ID
      );

      const result = await listArtifactVersions(artifactId);

      expect(result.versions[0].version).toBe('2.0.0');
      expect(result.versions[1].version).toBe('1.5.0');
      expect(result.versions[2].version).toBe('1.0.0');
    });

    it('should return empty list for artifact with no versions', async () => {
      const result = await listArtifactVersions('artifact_no_versions');

      expect(result.total).toBe(0);
      expect(result.versions).toHaveLength(0);
    });

    it('should include both published and unpublished versions', async () => {
      const artifactId = 'artifact_mixed';
      await createVersion(
        artifactId,
        createTestVersionInput({ version: '1.0.0', published: true }),
        TEST_USER_ID
      );
      await createVersion(
        artifactId,
        createTestVersionInput({ version: '2.0.0', published: false }),
        TEST_USER_ID
      );

      const result = await listArtifactVersions(artifactId);

      expect(result.total).toBe(2);
    });
  });
});

// ============================================================================
// Version Update Tests
// ============================================================================

describe('Version Update', () => {
  describe('updateVersion', () => {
    it('should update version source', async () => {
      const created = await createVersion(
        'artifact_update',
        createTestVersionInput({ version: '1.0.0' }),
        TEST_USER_ID
      );

      const newSource = 'persona UpdatedPersona { name: "Updated" }';
      const updated = await updateVersion(
        created.id,
        { source: newSource },
        TEST_USER_ID
      );

      expect(updated.source).toBe(newSource);
      expect(updated.version).toBe(created.version);
    });

    it('should update published status', async () => {
      const created = await createVersion(
        'artifact_pub_update',
        createTestVersionInput({ version: '1.0.0', published: false }),
        TEST_USER_ID
      );

      const updated = await updateVersion(
        created.id,
        { published: true },
        TEST_USER_ID
      );

      expect(updated.published).toBe(true);
    });

    it('should update metadata', async () => {
      const created = await createVersion(
        'artifact_meta_update',
        createTestVersionInput({ version: '1.0.0' }),
        TEST_USER_ID
      );

      const updated = await updateVersion(
        created.id,
        {
          metadata: {
            breaking: true,
            changelog: 'Updated changelog',
          },
        },
        TEST_USER_ID
      );

      expect(updated.metadata.breaking).toBe(true);
      expect(updated.metadata.changelog).toBe('Updated changelog');
    });

    it('should merge metadata with existing', async () => {
      const created = await createVersion(
        'artifact_meta_merge',
        createTestVersionInput({
          version: '1.0.0',
          metadata: createTestMetadata({
            breaking: false,
            deprecated: false,
            changelog: 'Original',
          }),
        }),
        TEST_USER_ID
      );

      const updated = await updateVersion(
        created.id,
        {
          metadata: { breaking: true },
        },
        TEST_USER_ID
      );

      expect(updated.metadata.breaking).toBe(true);
      expect(updated.metadata.deprecated).toBe(false);
      expect(updated.metadata.changelog).toBe('Original');
    });

    it('should update timestamp', async () => {
      const created = await createVersion(
        'artifact_timestamp',
        createTestVersionInput({ version: '1.0.0' }),
        TEST_USER_ID
      );

      // Small delay to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await updateVersion(
        created.id,
        { source: 'new source' },
        TEST_USER_ID
      );

      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(
        new Date(created.updatedAt).getTime()
      );
    });

    it('should throw error for non-existent version', async () => {
      await expect(
        updateVersion('version_nonexistent', { published: true }, TEST_USER_ID)
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'VERSION_NOT_FOUND',
      });
    });
  });
});

// ============================================================================
// Version Deletion Tests
// ============================================================================

describe('Version Deletion', () => {
  describe('deleteVersion', () => {
    it('should delete version', async () => {
      const created = await createVersion(
        'artifact_delete',
        createTestVersionInput({ version: '1.0.0' }),
        TEST_USER_ID
      );

      await deleteVersion(created.id, TEST_USER_ID);

      await expect(getVersionById(created.id)).rejects.toMatchObject({
        statusCode: 404,
        code: 'VERSION_NOT_FOUND',
      });
    });

    it('should remove version from artifact listing', async () => {
      const artifactId = 'artifact_delete_list';
      const v1 = await createVersion(
        artifactId,
        createTestVersionInput({ version: '1.0.0' }),
        TEST_USER_ID
      );
      await createVersion(
        artifactId,
        createTestVersionInput({ version: '2.0.0' }),
        TEST_USER_ID
      );

      await deleteVersion(v1.id, TEST_USER_ID);

      const list = await listArtifactVersions(artifactId);
      expect(list.total).toBe(1);
      expect(list.versions[0].version).toBe('2.0.0');
    });

    it('should throw error for non-existent version', async () => {
      await expect(
        deleteVersion('version_nonexistent', TEST_USER_ID)
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'VERSION_NOT_FOUND',
      });
    });
  });
});

// ============================================================================
// Download Tracking Tests
// ============================================================================

describe('Download Tracking', () => {
  describe('trackVersionDownload', () => {
    it('should increment download count', async () => {
      const created = await createVersion(
        'artifact_download',
        createTestVersionInput({ version: '1.0.0' }),
        TEST_USER_ID
      );

      expect(created.downloads).toBe(0);

      await trackVersionDownload(created.id);
      const after1 = await getVersionById(created.id);
      expect(after1.downloads).toBe(1);

      await trackVersionDownload(created.id);
      const after2 = await getVersionById(created.id);
      expect(after2.downloads).toBe(2);
    });

    it('should track multiple downloads', async () => {
      const created = await createVersion(
        'artifact_multi_download',
        createTestVersionInput({ version: '1.0.0' }),
        TEST_USER_ID
      );

      for (let i = 0; i < 5; i++) {
        await trackVersionDownload(created.id);
      }

      const result = await getVersionById(created.id);
      expect(result.downloads).toBe(5);
    });

    it('should throw error for non-existent version', async () => {
      await expect(
        trackVersionDownload('version_nonexistent')
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'VERSION_NOT_FOUND',
      });
    });
  });
});

// ============================================================================
// Semver Comparison Tests
// ============================================================================

describe('Semver Comparison', () => {
  describe('compareVersionDetails', () => {
    it('should identify major version bump', () => {
      const result = compareVersionDetails('2.0.0', '1.0.0');

      expect(result.isNewer).toBe(true);
      expect(result.isMajor).toBe(true);
      expect(result.isMinor).toBe(false);
      expect(result.isPatch).toBe(false);
      expect(result.diff.major).toBe(1);
      expect(result.diff.minor).toBe(0);
      expect(result.diff.patch).toBe(0);
    });

    it('should identify minor version bump', () => {
      const result = compareVersionDetails('1.2.0', '1.1.0');

      expect(result.isNewer).toBe(true);
      expect(result.isMajor).toBe(false);
      expect(result.isMinor).toBe(true);
      expect(result.isPatch).toBe(false);
      expect(result.diff.major).toBe(0);
      expect(result.diff.minor).toBe(1);
      expect(result.diff.patch).toBe(0);
    });

    it('should identify patch version bump', () => {
      const result = compareVersionDetails('1.0.3', '1.0.2');

      expect(result.isNewer).toBe(true);
      expect(result.isMajor).toBe(false);
      expect(result.isMinor).toBe(false);
      expect(result.isPatch).toBe(true);
      expect(result.diff.major).toBe(0);
      expect(result.diff.minor).toBe(0);
      expect(result.diff.patch).toBe(1);
    });

    it('should identify equal versions', () => {
      const result = compareVersionDetails('1.0.0', '1.0.0');

      expect(result.isNewer).toBe(false);
      expect(result.isMajor).toBe(false);
      expect(result.isMinor).toBe(false);
      expect(result.isPatch).toBe(false);
      expect(result.diff.major).toBe(0);
      expect(result.diff.minor).toBe(0);
      expect(result.diff.patch).toBe(0);
    });

    it('should identify older version', () => {
      const result = compareVersionDetails('1.0.0', '2.0.0');

      expect(result.isNewer).toBe(false);
      expect(result.isMajor).toBe(false);
      expect(result.isMinor).toBe(false);
      expect(result.isPatch).toBe(false);
      expect(result.diff.major).toBe(-1);
    });

    it('should handle multi-digit version numbers', () => {
      const result = compareVersionDetails('10.15.23', '10.15.22');

      expect(result.isNewer).toBe(true);
      expect(result.isPatch).toBe(true);
      expect(result.diff.patch).toBe(1);
    });

    it('should handle complex version jumps', () => {
      const result = compareVersionDetails('3.5.7', '1.2.3');

      expect(result.isNewer).toBe(true);
      expect(result.isMajor).toBe(true);
      expect(result.diff.major).toBe(2);
      expect(result.diff.minor).toBe(3);
      expect(result.diff.patch).toBe(4);
    });
  });
});

// ============================================================================
// Edge Cases and Boundary Conditions
// ============================================================================

describe('Edge Cases', () => {
  it('should handle artifact with single version', async () => {
    const artifactId = 'artifact_single';
    await createVersion(
      artifactId,
      createTestVersionInput({ version: '1.0.0' }),
      TEST_USER_ID
    );

    const list = await listArtifactVersions(artifactId);
    const latest = await getLatestVersion(artifactId);

    expect(list.total).toBe(1);
    expect(latest.version).toBe('1.0.0');
  });

  it('should handle version 0.0.1', async () => {
    const result = await createVersion(
      'artifact_zero',
      createTestVersionInput({ version: '0.0.1' }),
      TEST_USER_ID
    );

    expect(result.version).toBe('0.0.1');
  });

  it('should handle large version numbers', async () => {
    const result = await createVersion(
      'artifact_large',
      createTestVersionInput({ version: '999.999.999' }),
      TEST_USER_ID
    );

    expect(result.version).toBe('999.999.999');
  });

  it('should handle minimal source code', async () => {
    const result = await createVersion(
      'artifact_minimal',
      createTestVersionInput({
        version: '1.0.0',
        source: 'minimal123', // 10 characters minimum
      }),
      TEST_USER_ID
    );

    expect(result.source).toBe('minimal123');
  });

  it('should handle empty metadata', async () => {
    const result = await createVersion(
      'artifact_empty_meta',
      createTestVersionInput({
        version: '1.0.0',
        metadata: {
          breaking: false,
          deprecated: false,
        },
      }),
      TEST_USER_ID
    );

    expect(result.metadata.breaking).toBe(false);
    expect(result.metadata.deprecated).toBe(false);
  });

  it('should handle concurrent version updates', async () => {
    const created = await createVersion(
      'artifact_concurrent',
      createTestVersionInput({ version: '1.0.0' }),
      TEST_USER_ID
    );

    // Simulate concurrent updates
    const [update1, update2] = await Promise.all([
      updateVersion(created.id, { published: true }, TEST_USER_ID),
      updateVersion(created.id, { published: false }, TEST_USER_ID),
    ]);

    // Last write wins
    const final = await getVersionById(created.id);
    expect(final.published).toBeDefined();
  });
});
