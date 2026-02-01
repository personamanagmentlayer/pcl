/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Memory Backend Test Suite
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Comprehensive tests for the in-memory registry backend.
 * Tests CRUD operations, transactions, queries, and error handling.
 *
 * @packageDocumentation
 */

import { MemoryBackend } from '../../../src/registry/backends/memory';
import { ArtifactType } from '../../../src/registry/interfaces';

describe('MemoryBackend', () => {
  let backend: MemoryBackend;

  beforeEach(() => {
    backend = new MemoryBackend();
  });

  afterEach(async () => {
    if (backend.isConnected()) {
      await backend.disconnect();
    }
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              CONNECTION
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Connection Management', () => {
    it('should connect successfully', async () => {
      const result = await backend.connect();
      expect(result.ok).toBe(true);
      expect(backend.isConnected()).toBe(true);
    });

    it('should be idempotent when connecting multiple times', async () => {
      await backend.connect();
      const result = await backend.connect();
      expect(result.ok).toBe(true);
      expect(backend.isConnected()).toBe(true);
    });

    it('should disconnect successfully', async () => {
      await backend.connect();
      const result = await backend.disconnect();
      expect(result.ok).toBe(true);
      expect(backend.isConnected()).toBe(false);
    });

    it('should be idempotent when disconnecting multiple times', async () => {
      await backend.connect();
      await backend.disconnect();
      const result = await backend.disconnect();
      expect(result.ok).toBe(true);
      expect(backend.isConnected()).toBe(false);
    });

    it('should not be connected initially', () => {
      expect(backend.isConnected()).toBe(false);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              CREATE OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Create Operations', () => {
    beforeEach(async () => {
      await backend.connect();
    });

    it('should create a new artifact', async () => {
      const artifact = {
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Test Persona',
          slug: 'test-persona',
          version: '1.0.0',
          tags: ['test'],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      };

      const result = await backend.create(artifact);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBeDefined();
        expect(result.value.metadata.name).toBe('Test Persona');
        expect(result.value.createdAt).toBeInstanceOf(Date);
        expect(result.value.updatedAt).toBeInstanceOf(Date);
      }
    });

    it('should reject duplicate slugs', async () => {
      const artifact = {
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Test Persona',
          slug: 'duplicate-slug',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      };

      await backend.create(artifact);
      const result = await backend.create(artifact);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DUPLICATE');
        expect(result.error.message).toContain('duplicate-slug');
      }
    });

    it('should allow duplicate slugs if original is deleted', async () => {
      const artifact = {
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Test Persona',
          slug: 'reusable-slug',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      };

      const created = await backend.create(artifact);
      expect(created.ok).toBe(true);

      if (created.ok) {
        await backend.delete(created.value.id);
        const recreated = await backend.create(artifact);
        expect(recreated.ok).toBe(true);
      }
    });

    it('should fail when not connected', async () => {
      await backend.disconnect();
      const artifact = {
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Test',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      };

      const result = await backend.create(artifact);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('CONNECTION_ERROR');
      }
    });

    it('should create artifacts with different types', async () => {
      const types = [
        ArtifactType.PERSONA,
        ArtifactType.TEAM,
        ArtifactType.WORKFLOW,
        ArtifactType.SKILL,
      ];

      for (const type of types) {
        const artifact = {
          type,
          metadata: {
            name: `Test ${type}`,
            version: '1.0.0',
            tags: [],
          },
          source: `${type} Test {}`,
          stats: { downloads: 0, stars: 0, views: 0 },
          published: false,
          deleted: false,
        };

        const result = await backend.create(artifact);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.type).toBe(type);
        }
      }
    });

    it('should handle artifacts without slugs', async () => {
      const artifact = {
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'No Slug Persona',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      };

      const result = await backend.create(artifact);
      expect(result.ok).toBe(true);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              READ OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Read Operations', () => {
    beforeEach(async () => {
      await backend.connect();
    });

    it('should read an existing artifact', async () => {
      const artifact = {
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Test Persona',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      };

      const created = await backend.create(artifact);
      expect(created.ok).toBe(true);

      if (created.ok) {
        const result = await backend.read(created.value.id);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value?.id).toBe(created.value.id);
          expect(result.value?.metadata.name).toBe('Test Persona');
        }
      }
    });

    it('should return null for non-existent artifact', async () => {
      const result = await backend.read('non-existent-id');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });

    it('should fail when not connected', async () => {
      await backend.disconnect();
      const result = await backend.read('some-id');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('CONNECTION_ERROR');
      }
    });

    it('should read deleted artifacts', async () => {
      const artifact = {
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Deleted Persona',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      };

      const created = await backend.create(artifact);
      expect(created.ok).toBe(true);

      if (created.ok) {
        await backend.delete(created.value.id);
        const result = await backend.read(created.value.id);
        expect(result.ok).toBe(true);
        if (result.ok && result.value) {
          expect(result.value.deleted).toBe(true);
        }
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              UPDATE OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Update Operations', () => {
    beforeEach(async () => {
      await backend.connect();
    });

    it('should update an existing artifact', async () => {
      const artifact = {
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Original Name',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      };

      const created = await backend.create(artifact);
      expect(created.ok).toBe(true);

      if (created.ok) {
        const updates = {
          metadata: {
            name: 'Updated Name',
            version: '1.0.0',
            tags: [],
          },
        };

        const result = await backend.update(created.value.id, updates);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.metadata.name).toBe('Updated Name');
          expect(result.value.updatedAt.getTime()).toBeGreaterThanOrEqual(
            result.value.createdAt.getTime()
          );
        }
      }
    });

    it('should preserve ID and createdAt on update', async () => {
      const artifact = {
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Test',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      };

      const created = await backend.create(artifact);
      expect(created.ok).toBe(true);

      if (created.ok) {
        const originalId = created.value.id;
        const originalCreatedAt = created.value.createdAt;

        const result = await backend.update(originalId, {
          metadata: { name: 'Updated', version: '1.0.0', tags: [] },
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.id).toBe(originalId);
          expect(result.value.createdAt).toEqual(originalCreatedAt);
        }
      }
    });

    it('should fail for non-existent artifact', async () => {
      const result = await backend.update('non-existent-id', {
        metadata: { name: 'Updated', version: '1.0.0', tags: [] },
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('should reject duplicate slug on update', async () => {
      const artifact1 = {
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Artifact 1',
          slug: 'slug-1',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test1 {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      };

      const artifact2 = {
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Artifact 2',
          slug: 'slug-2',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test2 {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      };

      const created1 = await backend.create(artifact1);
      const created2 = await backend.create(artifact2);

      expect(created1.ok && created2.ok).toBe(true);

      if (created1.ok && created2.ok) {
        const result = await backend.update(created2.value.id, {
          metadata: {
            name: 'Artifact 2',
            slug: 'slug-1',
            version: '1.0.0',
            tags: [],
          },
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.code).toBe('DUPLICATE');
        }
      }
    });

    it('should deep merge metadata and stats', async () => {
      const artifact = {
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Test',
          description: 'Original description',
          version: '1.0.0',
          tags: ['tag1'],
        },
        source: 'persona Test {}',
        stats: { downloads: 5, stars: 3, views: 10 },
        published: false,
        deleted: false,
      };

      const created = await backend.create(artifact);
      expect(created.ok).toBe(true);

      if (created.ok) {
        const result = await backend.update(created.value.id, {
          metadata: { tags: ['tag2'] },
          stats: { downloads: 10 },
        } as any);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.metadata.description).toBe(
            'Original description'
          );
          expect(result.value.metadata.tags).toEqual(['tag2']);
          expect(result.value.stats.downloads).toBe(10);
          expect(result.value.stats.stars).toBe(3);
        }
      }
    });

    it('should fail when not connected', async () => {
      await backend.disconnect();
      const result = await backend.update('some-id', {
        metadata: { name: 'Updated', version: '1.0.0', tags: [] },
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('CONNECTION_ERROR');
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              DELETE OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Delete Operations', () => {
    beforeEach(async () => {
      await backend.connect();
    });

    it('should soft delete an artifact', async () => {
      const artifact = {
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'To Delete',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      };

      const created = await backend.create(artifact);
      expect(created.ok).toBe(true);

      if (created.ok) {
        const result = await backend.delete(created.value.id);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBe(true);
        }

        const read = await backend.read(created.value.id);
        expect(read.ok).toBe(true);
        if (read.ok && read.value) {
          expect(read.value.deleted).toBe(true);
        }
      }
    });

    it('should return false for non-existent artifact', async () => {
      const result = await backend.delete('non-existent-id');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(false);
      }
    });

    it('should hard delete (purge) an artifact', async () => {
      const artifact = {
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'To Purge',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      };

      const created = await backend.create(artifact);
      expect(created.ok).toBe(true);

      if (created.ok) {
        const result = await backend.purge(created.value.id);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBe(true);
        }

        const read = await backend.read(created.value.id);
        expect(read.ok).toBe(true);
        if (read.ok) {
          expect(read.value).toBeNull();
        }
      }
    });

    it('should remove versions on purge', async () => {
      const artifact = {
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'With Versions',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      };

      const created = await backend.create(artifact);
      expect(created.ok).toBe(true);

      if (created.ok) {
        await backend.createVersion({
          artifactId: created.value.id,
          version: '1.0.0',
          source: 'persona Test {}',
          published: true,
        });

        await backend.purge(created.value.id);

        const versions = await backend.listVersions(created.value.id);
        expect(versions.ok).toBe(true);
        if (versions.ok) {
          expect(versions.value).toHaveLength(0);
        }
      }
    });

    it('should fail when not connected', async () => {
      await backend.disconnect();
      const result = await backend.delete('some-id');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('CONNECTION_ERROR');
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              QUERY OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Query Operations', () => {
    beforeEach(async () => {
      await backend.connect();

      // Create test data
      const artifacts = [
        {
          type: ArtifactType.PERSONA,
          metadata: {
            name: 'Alpha',
            author: 'Alice',
            version: '1.0.0',
            tags: ['tag1', 'tag2'],
          },
          source: 'persona Alpha {}',
          stats: { downloads: 10, stars: 5, views: 20 },
          published: true,
          deleted: false,
        },
        {
          type: ArtifactType.PERSONA,
          metadata: {
            name: 'Beta',
            author: 'Bob',
            version: '1.0.0',
            tags: ['tag2', 'tag3'],
          },
          source: 'persona Beta {}',
          stats: { downloads: 20, stars: 10, views: 30 },
          published: true,
          deleted: false,
        },
        {
          type: ArtifactType.TEAM,
          metadata: {
            name: 'Gamma',
            author: 'Alice',
            version: '1.0.0',
            tags: ['tag3'],
          },
          source: 'team Gamma {}',
          stats: { downloads: 5, stars: 2, views: 10 },
          published: false,
          deleted: false,
        },
      ];

      for (const artifact of artifacts) {
        await backend.create(artifact);
      }
    });

    it('should find all artifacts', async () => {
      const result = await backend.find({});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(3);
      }
    });

    it('should filter by type', async () => {
      const result = await backend.find({
        filter: { type: ArtifactType.PERSONA },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(2);
        expect(result.value.every((a) => a.type === ArtifactType.PERSONA)).toBe(
          true
        );
      }
    });

    it('should filter by multiple types', async () => {
      const result = await backend.find({
        filter: { type: [ArtifactType.PERSONA, ArtifactType.TEAM] },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(3);
      }
    });

    it('should filter by tags (OR logic)', async () => {
      const result = await backend.find({
        filter: { tags: ['tag1'] },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(1);
        expect(result.value[0].metadata.name).toBe('Alpha');
      }
    });

    it('should filter by author', async () => {
      const result = await backend.find({
        filter: { author: 'Alice' },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(2);
        expect(result.value.every((a) => a.metadata.author === 'Alice')).toBe(
          true
        );
      }
    });

    it('should filter by published status', async () => {
      const result = await backend.find({
        filter: { published: true },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(2);
        expect(result.value.every((a) => a.published)).toBe(true);
      }
    });

    it('should filter by deleted status', async () => {
      const result = await backend.find({
        filter: { deleted: false },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(3);
      }
    });

    it('should sort by name ascending', async () => {
      const result = await backend.find({
        sort: { field: 'name', order: 'asc' },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].metadata.name).toBe('Alpha');
        expect(result.value[1].metadata.name).toBe('Beta');
        expect(result.value[2].metadata.name).toBe('Gamma');
      }
    });

    it('should sort by downloads descending', async () => {
      const result = await backend.find({
        sort: { field: 'downloads', order: 'desc' },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].stats.downloads).toBe(20);
        expect(result.value[1].stats.downloads).toBe(10);
        expect(result.value[2].stats.downloads).toBe(5);
      }
    });

    it('should paginate results', async () => {
      const result = await backend.find({
        pagination: { offset: 1, limit: 1 },
        sort: { field: 'name', order: 'asc' },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(1);
        expect(result.value[0].metadata.name).toBe('Beta');
      }
    });

    it('should count all artifacts', async () => {
      const result = await backend.count({});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(3);
      }
    });

    it('should count filtered artifacts', async () => {
      const result = await backend.count({
        filter: { type: ArtifactType.PERSONA },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(2);
      }
    });

    it('should find one artifact', async () => {
      const result = await backend.findOne({
        filter: { author: 'Bob' },
      });

      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
        expect(result.value.metadata.name).toBe('Beta');
      }
    });

    it('should return null when findOne finds nothing', async () => {
      const result = await backend.findOne({
        filter: { author: 'NonExistent' },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });

    it('should combine filters', async () => {
      const result = await backend.find({
        filter: {
          type: ArtifactType.PERSONA,
          published: true,
          tags: ['tag2'],
        },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(2);
      }
    });

    it('should fail when not connected', async () => {
      await backend.disconnect();
      const result = await backend.find({});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('CONNECTION_ERROR');
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              VERSION OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Version Operations', () => {
    let artifactId: string;

    beforeEach(async () => {
      await backend.connect();

      const artifact = {
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Versioned Persona',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      };

      const created = await backend.create(artifact);
      expect(created.ok).toBe(true);
      if (created.ok) {
        artifactId = created.value.id;
      }
    });

    it('should create a version', async () => {
      const version = {
        artifactId,
        version: '1.0.0',
        source: 'persona Test {}',
        published: true,
      };

      const result = await backend.createVersion(version);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.version).toBe('1.0.0');
        expect(result.value.createdAt).toBeInstanceOf(Date);
      }
    });

    it('should reject duplicate versions', async () => {
      const version = {
        artifactId,
        version: '1.0.0',
        source: 'persona Test {}',
        published: true,
      };

      await backend.createVersion(version);
      const result = await backend.createVersion(version);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DUPLICATE');
      }
    });

    it('should fail for non-existent artifact', async () => {
      const version = {
        artifactId: 'non-existent',
        version: '1.0.0',
        source: 'persona Test {}',
        published: true,
      };

      const result = await backend.createVersion(version);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('should list versions sorted by version descending', async () => {
      const versions = ['1.0.0', '1.1.0', '2.0.0'];
      for (const ver of versions) {
        await backend.createVersion({
          artifactId,
          version: ver,
          source: `persona Test v${ver} {}`,
          published: true,
        });
      }

      const result = await backend.listVersions(artifactId);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(3);
        expect(result.value[0].version).toBe('2.0.0');
        expect(result.value[1].version).toBe('1.1.0');
        expect(result.value[2].version).toBe('1.0.0');
      }
    });

    it('should return empty array for artifact with no versions', async () => {
      const result = await backend.listVersions(artifactId);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });

    it('should get specific version', async () => {
      await backend.createVersion({
        artifactId,
        version: '1.5.0',
        source: 'persona Test v1.5 {}',
        published: true,
      });

      const result = await backend.getVersion(artifactId, '1.5.0');
      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
        expect(result.value.version).toBe('1.5.0');
        expect(result.value.source).toBe('persona Test v1.5 {}');
      }
    });

    it('should return null for non-existent version', async () => {
      const result = await backend.getVersion(artifactId, '9.9.9');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });

    it('should fail when not connected', async () => {
      await backend.disconnect();
      const result = await backend.createVersion({
        artifactId,
        version: '1.0.0',
        source: 'test',
        published: true,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('CONNECTION_ERROR');
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              TRANSACTION OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Transaction Operations', () => {
    beforeEach(async () => {
      await backend.connect();
    });

    it('should begin a transaction', async () => {
      const result = await backend.beginTransaction();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBeDefined();
      }
    });

    it('should commit a transaction', async () => {
      const txResult = await backend.beginTransaction();
      expect(txResult.ok).toBe(true);

      if (txResult.ok) {
        const commitResult = await txResult.value.commit();
        expect(commitResult.ok).toBe(true);
      }
    });

    it('should rollback a transaction', async () => {
      const artifact = {
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Before Transaction',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      };

      await backend.create(artifact);

      const txResult = await backend.beginTransaction();
      expect(txResult.ok).toBe(true);

      if (txResult.ok) {
        await backend.create({
          ...artifact,
          metadata: { ...artifact.metadata, name: 'During Transaction' },
        });

        await txResult.value.rollback();

        const allResult = await backend.find({});
        expect(allResult.ok).toBe(true);
        if (allResult.ok) {
          expect(allResult.value.length).toBe(1);
          expect(allResult.value[0].metadata.name).toBe('Before Transaction');
        }
      }
    });

    it('should prevent double commit', async () => {
      const txResult = await backend.beginTransaction();
      expect(txResult.ok).toBe(true);

      if (txResult.ok) {
        await txResult.value.commit();
        const secondCommit = await txResult.value.commit();

        expect(secondCommit.ok).toBe(false);
        if (!secondCommit.ok) {
          expect(secondCommit.error.code).toBe('TRANSACTION_ERROR');
        }
      }
    });

    it('should prevent double rollback', async () => {
      const txResult = await backend.beginTransaction();
      expect(txResult.ok).toBe(true);

      if (txResult.ok) {
        await txResult.value.rollback();
        const secondRollback = await txResult.value.rollback();

        expect(secondRollback.ok).toBe(false);
        if (!secondRollback.ok) {
          expect(secondRollback.error.code).toBe('TRANSACTION_ERROR');
        }
      }
    });

    it('should prevent commit after rollback', async () => {
      const txResult = await backend.beginTransaction();
      expect(txResult.ok).toBe(true);

      if (txResult.ok) {
        await txResult.value.rollback();
        const commitResult = await txResult.value.commit();

        expect(commitResult.ok).toBe(false);
        if (!commitResult.ok) {
          expect(commitResult.error.code).toBe('TRANSACTION_ERROR');
        }
      }
    });

    it('should prevent rollback after commit', async () => {
      const txResult = await backend.beginTransaction();
      expect(txResult.ok).toBe(true);

      if (txResult.ok) {
        await txResult.value.commit();
        const rollbackResult = await txResult.value.rollback();

        expect(rollbackResult.ok).toBe(false);
        if (!rollbackResult.ok) {
          expect(rollbackResult.error.code).toBe('TRANSACTION_ERROR');
        }
      }
    });

    it('should fail when not connected', async () => {
      await backend.disconnect();
      const result = await backend.beginTransaction();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('CONNECTION_ERROR');
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              CONCURRENT OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Concurrent Operations', () => {
    beforeEach(async () => {
      await backend.connect();
    });

    it('should handle concurrent creates', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        backend.create({
          type: ArtifactType.PERSONA,
          metadata: {
            name: `Persona ${i}`,
            slug: `persona-${i}`,
            version: '1.0.0',
            tags: [],
          },
          source: `persona Test${i} {}`,
          stats: { downloads: 0, stars: 0, views: 0 },
          published: false,
          deleted: false,
        })
      );

      const results = await Promise.all(promises);
      expect(results.every((r) => r.ok)).toBe(true);

      const allResult = await backend.find({});
      expect(allResult.ok).toBe(true);
      if (allResult.ok) {
        expect(allResult.value.length).toBe(10);
      }
    });

    it('should handle concurrent reads', async () => {
      const artifact = {
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Concurrent Read Test',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      };

      const created = await backend.create(artifact);
      expect(created.ok).toBe(true);

      if (created.ok) {
        const promises = Array.from({ length: 10 }, () =>
          backend.read(created.value.id)
        );

        const results = await Promise.all(promises);
        expect(results.every((r) => r.ok && r.value !== null)).toBe(true);
      }
    });

    it('should handle concurrent updates safely', async () => {
      const artifact = {
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Concurrent Update Test',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      };

      const created = await backend.create(artifact);
      expect(created.ok).toBe(true);

      if (created.ok) {
        const promises = Array.from({ length: 5 }, (_, i) =>
          backend.update(created.value.id, {
            stats: { downloads: i + 1, stars: 0, views: 0 },
          } as any)
        );

        const results = await Promise.all(promises);
        expect(results.every((r) => r.ok)).toBe(true);
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              UTILITY OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Utility Operations', () => {
    beforeEach(async () => {
      await backend.connect();
    });

    it('should clear all data', async () => {
      await backend.create({
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Test',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      });

      const clearResult = await backend.clear();
      expect(clearResult.ok).toBe(true);

      const findResult = await backend.find({});
      expect(findResult.ok).toBe(true);
      if (findResult.ok) {
        expect(findResult.value.length).toBe(0);
      }
    });
  });
});
