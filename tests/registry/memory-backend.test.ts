/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Memory Backend Unit Tests (Phase 1.2A)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Comprehensive test suite for MemoryBackend.
 * Target: 100% code coverage
 *
 * @packageDocumentation
 * @module tests/registry/memory-backend
 */

import { MemoryBackend } from '../../src/registry/backends/memory';
import { ArtifactType } from '../../src/registry/interfaces';
import type { Artifact } from '../../src/registry/interfaces';

// ═══════════════════════════════════════════════════════════════════════════════
//                              TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function createTestArtifact(overrides?: Partial<Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>>): Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    type: ArtifactType.PERSONA,
    metadata: {
      name: 'Test Persona',
      slug: 'test-persona',
      description: 'A test persona',
      version: '1.0.0',
      author: 'Test Author',
      tags: ['test', 'persona'],
      skills: ['typescript', 'testing'],
    },
    source: 'persona TEST { name: "Test" }',
    stats: {
      downloads: 0,
      stars: 0,
      views: 0,
    },
    published: false,
    deleted: false,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              CONNECTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('MemoryBackend - Connection', () => {
  let backend: MemoryBackend;

  beforeEach(() => {
    backend = new MemoryBackend();
  });

  it('should start disconnected', () => {
    expect(backend.isConnected()).toBe(false);
  });

  it('should connect successfully', async () => {
    const result = await backend.connect();
    expect(result.ok).toBe(true);
    expect(backend.isConnected()).toBe(true);
  });

  it('should allow multiple connect calls', async () => {
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

  it('should allow multiple disconnect calls', async () => {
    await backend.connect();
    await backend.disconnect();
    const result = await backend.disconnect();
    expect(result.ok).toBe(true);
    expect(backend.isConnected()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              CREATE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('MemoryBackend - Create', () => {
  let backend: MemoryBackend;

  beforeEach(async () => {
    backend = new MemoryBackend();
    await backend.connect();
  });

  it('should create an artifact with generated ID and timestamps', async () => {
    const artifact = createTestArtifact();
    const result = await backend.create(artifact);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBeDefined();
      expect(result.value.createdAt).toBeInstanceOf(Date);
      expect(result.value.updatedAt).toBeInstanceOf(Date);
      expect(result.value.metadata.name).toBe('Test Persona');
    }
  });

  it('should fail to create when not connected', async () => {
    await backend.disconnect();
    const artifact = createTestArtifact();
    const result = await backend.create(artifact);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONNECTION_ERROR');
    }
  });

  it('should reject duplicate slugs', async () => {
    const artifact1 = createTestArtifact({ metadata: { ...createTestArtifact().metadata, slug: 'unique-slug' } });
    const artifact2 = createTestArtifact({ metadata: { ...createTestArtifact().metadata, slug: 'unique-slug' } });

    const result1 = await backend.create(artifact1);
    expect(result1.ok).toBe(true);

    const result2 = await backend.create(artifact2);
    expect(result2.ok).toBe(false);
    if (!result2.ok) {
      expect(result2.error.code).toBe('DUPLICATE');
      expect(result2.error.message).toContain('unique-slug');
    }
  });

  it('should allow artifacts without slugs', async () => {
    const artifact = createTestArtifact();
    delete artifact.metadata.slug;

    const result = await backend.create(artifact);
    expect(result.ok).toBe(true);
  });

  it('should allow same slug if original is deleted', async () => {
    const artifact1 = createTestArtifact({ metadata: { ...createTestArtifact().metadata, slug: 'test-slug' } });

    const createResult1 = await backend.create(artifact1);
    expect(createResult1.ok).toBe(true);

    if (createResult1.ok) {
      const deleteResult = await backend.delete(createResult1.value.id);
      expect(deleteResult.ok).toBe(true);

      const artifact2 = createTestArtifact({ metadata: { ...createTestArtifact().metadata, slug: 'test-slug' } });
      const createResult2 = await backend.create(artifact2);
      expect(createResult2.ok).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              READ TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('MemoryBackend - Read', () => {
  let backend: MemoryBackend;

  beforeEach(async () => {
    backend = new MemoryBackend();
    await backend.connect();
  });

  it('should read an existing artifact', async () => {
    const artifact = createTestArtifact();
    const createResult = await backend.create(artifact);
    expect(createResult.ok).toBe(true);

    if (createResult.ok) {
      const readResult = await backend.read(createResult.value.id);
      expect(readResult.ok).toBe(true);
      if (readResult.ok) {
        expect(readResult.value).toBeDefined();
        expect(readResult.value?.id).toBe(createResult.value.id);
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

  it('should fail to read when not connected', async () => {
    await backend.disconnect();
    const result = await backend.read('some-id');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONNECTION_ERROR');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              UPDATE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('MemoryBackend - Update', () => {
  let backend: MemoryBackend;

  beforeEach(async () => {
    backend = new MemoryBackend();
    await backend.connect();
  });

  it('should update an existing artifact', async () => {
    const artifact = createTestArtifact();
    const createResult = await backend.create(artifact);
    expect(createResult.ok).toBe(true);

    if (createResult.ok) {
      const updateResult = await backend.update(createResult.value.id, {
        metadata: { ...createResult.value.metadata, name: 'Updated Name' },
      });

      expect(updateResult.ok).toBe(true);
      if (updateResult.ok) {
        expect(updateResult.value.metadata.name).toBe('Updated Name');
        expect(updateResult.value.updatedAt.getTime()).toBeGreaterThan(createResult.value.createdAt.getTime());
        expect(updateResult.value.createdAt).toEqual(createResult.value.createdAt);
      }
    }
  });

  it('should fail to update non-existent artifact', async () => {
    const result = await backend.update('non-existent-id', { metadata: { name: 'Updated' } as any });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('should reject duplicate slug on update', async () => {
    const artifact1 = createTestArtifact({ metadata: { ...createTestArtifact().metadata, slug: 'slug-1' } });
    const artifact2 = createTestArtifact({ metadata: { ...createTestArtifact().metadata, slug: 'slug-2' } });

    const create1 = await backend.create(artifact1);
    const create2 = await backend.create(artifact2);

    expect(create1.ok && create2.ok).toBe(true);

    if (create1.ok && create2.ok) {
      const updateResult = await backend.update(create2.value.id, {
        metadata: { ...create2.value.metadata, slug: 'slug-1' },
      });

      expect(updateResult.ok).toBe(false);
      if (!updateResult.ok) {
        expect(updateResult.error.code).toBe('DUPLICATE');
      }
    }
  });

  it('should allow updating to same slug', async () => {
    const artifact = createTestArtifact({ metadata: { ...createTestArtifact().metadata, slug: 'same-slug' } });
    const createResult = await backend.create(artifact);

    expect(createResult.ok).toBe(true);

    if (createResult.ok) {
      const updateResult = await backend.update(createResult.value.id, {
        metadata: { ...createResult.value.metadata, name: 'New Name' },
      });

      expect(updateResult.ok).toBe(true);
    }
  });

  it('should fail to update when not connected', async () => {
    await backend.disconnect();
    const result = await backend.update('some-id', { metadata: { name: 'Updated' } as any });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONNECTION_ERROR');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              DELETE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('MemoryBackend - Delete', () => {
  let backend: MemoryBackend;

  beforeEach(async () => {
    backend = new MemoryBackend();
    await backend.connect();
  });

  it('should soft delete an artifact', async () => {
    const artifact = createTestArtifact();
    const createResult = await backend.create(artifact);
    expect(createResult.ok).toBe(true);

    if (createResult.ok) {
      const deleteResult = await backend.delete(createResult.value.id);
      expect(deleteResult.ok).toBe(true);
      if (deleteResult.ok) {
        expect(deleteResult.value).toBe(true);
      }

      const readResult = await backend.read(createResult.value.id);
      expect(readResult.ok).toBe(true);
      if (readResult.ok && readResult.value) {
        expect(readResult.value.deleted).toBe(true);
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

  it('should fail to delete when not connected', async () => {
    await backend.disconnect();
    const result = await backend.delete('some-id');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONNECTION_ERROR');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              PURGE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('MemoryBackend - Purge', () => {
  let backend: MemoryBackend;

  beforeEach(async () => {
    backend = new MemoryBackend();
    await backend.connect();
  });

  it('should permanently delete an artifact', async () => {
    const artifact = createTestArtifact();
    const createResult = await backend.create(artifact);
    expect(createResult.ok).toBe(true);

    if (createResult.ok) {
      const purgeResult = await backend.purge(createResult.value.id);
      expect(purgeResult.ok).toBe(true);
      if (purgeResult.ok) {
        expect(purgeResult.value).toBe(true);
      }

      const readResult = await backend.read(createResult.value.id);
      expect(readResult.ok).toBe(true);
      if (readResult.ok) {
        expect(readResult.value).toBeNull();
      }
    }
  });

  it('should return false for non-existent artifact', async () => {
    const result = await backend.purge('non-existent-id');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(false);
    }
  });

  it('should fail to purge when not connected', async () => {
    await backend.disconnect();
    const result = await backend.purge('some-id');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONNECTION_ERROR');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              QUERY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('MemoryBackend - Query', () => {
  let backend: MemoryBackend;

  beforeEach(async () => {
    backend = new MemoryBackend();
    await backend.connect();

    // Create test artifacts
    await backend.create(createTestArtifact({
      type: ArtifactType.PERSONA,
      metadata: { ...createTestArtifact().metadata, name: 'Persona 1', tags: ['tag1'], author: 'Author A' },
    }));
    await backend.create(createTestArtifact({
      type: ArtifactType.TEAM,
      metadata: { ...createTestArtifact().metadata, name: 'Team 1', tags: ['tag2'], author: 'Author B' },
    }));
    await backend.create(createTestArtifact({
      type: ArtifactType.WORKFLOW,
      metadata: { ...createTestArtifact().metadata, name: 'Workflow 1', tags: ['tag1', 'tag2'], author: 'Author A' },
    }));
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
      expect(result.value.length).toBe(1);
      expect(result.value[0].type).toBe(ArtifactType.PERSONA);
    }
  });

  it('should filter by multiple types', async () => {
    const result = await backend.find({
      filter: { type: [ArtifactType.PERSONA, ArtifactType.TEAM] },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBe(2);
    }
  });

  it('should filter by tags', async () => {
    const result = await backend.find({
      filter: { tags: ['tag1'] },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBe(2);
    }
  });

  it('should filter by author', async () => {
    const result = await backend.find({
      filter: { author: 'Author A' },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBe(2);
    }
  });

  it('should sort by name ascending', async () => {
    const result = await backend.find({
      sort: { field: 'name', order: 'asc' },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0].metadata.name).toBe('Persona 1');
      expect(result.value[1].metadata.name).toBe('Team 1');
      expect(result.value[2].metadata.name).toBe('Workflow 1');
    }
  });

  it('should sort by name descending', async () => {
    const result = await backend.find({
      sort: { field: 'name', order: 'desc' },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0].metadata.name).toBe('Workflow 1');
      expect(result.value[2].metadata.name).toBe('Persona 1');
    }
  });

  it('should paginate results', async () => {
    const result = await backend.find({
      pagination: { offset: 1, limit: 1 },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBe(1);
    }
  });

  it('should count artifacts', async () => {
    const result = await backend.count({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(3);
    }
  });

  it('should count with filters', async () => {
    const result = await backend.count({
      filter: { type: ArtifactType.PERSONA },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(1);
    }
  });

  it('should find one artifact', async () => {
    const result = await backend.findOne({
      filter: { type: ArtifactType.TEAM },
    });
    expect(result.ok).toBe(true);
    if (result.ok && result.value) {
      expect(result.value.type).toBe(ArtifactType.TEAM);
    }
  });

  it('should return null when findOne has no matches', async () => {
    const result = await backend.findOne({
      filter: { type: ArtifactType.SKILL },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeNull();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              VERSION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('MemoryBackend - Versions', () => {
  let backend: MemoryBackend;
  let artifactId: string;

  beforeEach(async () => {
    backend = new MemoryBackend();
    await backend.connect();

    const createResult = await backend.create(createTestArtifact());
    if (createResult.ok) {
      artifactId = createResult.value.id;
    }
  });

  it('should create a new version', async () => {
    const result = await backend.createVersion({
      artifactId,
      version: '1.0.0',
      source: 'persona TEST_V1 {}',
      published: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.version).toBe('1.0.0');
      expect(result.value.createdAt).toBeInstanceOf(Date);
    }
  });

  it('should reject duplicate versions', async () => {
    await backend.createVersion({
      artifactId,
      version: '1.0.0',
      source: 'persona TEST_V1 {}',
      published: false,
    });

    const result = await backend.createVersion({
      artifactId,
      version: '1.0.0',
      source: 'persona TEST_V1 {}',
      published: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('DUPLICATE');
    }
  });

  it('should fail to create version for non-existent artifact', async () => {
    const result = await backend.createVersion({
      artifactId: 'non-existent',
      version: '1.0.0',
      source: 'persona TEST {}',
      published: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('should list versions in descending order', async () => {
    await backend.createVersion({
      artifactId,
      version: '1.0.0',
      source: 'v1',
      published: false,
    });
    await backend.createVersion({
      artifactId,
      version: '2.0.0',
      source: 'v2',
      published: false,
    });
    await backend.createVersion({
      artifactId,
      version: '1.5.0',
      source: 'v1.5',
      published: false,
    });

    const result = await backend.listVersions(artifactId);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBe(3);
      expect(result.value[0].version).toBe('2.0.0');
      expect(result.value[2].version).toBe('1.0.0');
    }
  });

  it('should get a specific version', async () => {
    await backend.createVersion({
      artifactId,
      version: '1.0.0',
      source: 'v1',
      published: false,
    });

    const result = await backend.getVersion(artifactId, '1.0.0');
    expect(result.ok).toBe(true);
    if (result.ok && result.value) {
      expect(result.value.version).toBe('1.0.0');
      expect(result.value.source).toBe('v1');
    }
  });

  it('should return null for non-existent version', async () => {
    const result = await backend.getVersion(artifactId, '9.9.9');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeNull();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              TRANSACTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('MemoryBackend - Transactions', () => {
  let backend: MemoryBackend;

  beforeEach(async () => {
    backend = new MemoryBackend();
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
    // Create initial artifact
    await backend.create(createTestArtifact());

    const txResult = await backend.beginTransaction();
    expect(txResult.ok).toBe(true);

    if (txResult.ok) {
      // Make changes
      await backend.create(createTestArtifact({ metadata: { ...createTestArtifact().metadata, name: 'New Artifact' } }));

      // Rollback
      const rollbackResult = await txResult.value.rollback();
      expect(rollbackResult.ok).toBe(true);

      // Verify rollback
      const countResult = await backend.count({});
      expect(countResult.ok).toBe(true);
      if (countResult.ok) {
        expect(countResult.value).toBe(1); // Only original artifact
      }
    }
  });

  it('should reject commit after rollback', async () => {
    const txResult = await backend.beginTransaction();
    if (txResult.ok) {
      await txResult.value.rollback();
      const commitResult = await txResult.value.commit();
      expect(commitResult.ok).toBe(false);
    }
  });

  it('should reject rollback after commit', async () => {
    const txResult = await backend.beginTransaction();
    if (txResult.ok) {
      await txResult.value.commit();
      const rollbackResult = await txResult.value.rollback();
      expect(rollbackResult.ok).toBe(false);
    }
  });

  it('should reject double commit', async () => {
    const txResult = await backend.beginTransaction();
    if (txResult.ok) {
      await txResult.value.commit();
      const secondCommit = await txResult.value.commit();
      expect(secondCommit.ok).toBe(false);
    }
  });

  it('should reject double rollback', async () => {
    const txResult = await backend.beginTransaction();
    if (txResult.ok) {
      await txResult.value.rollback();
      const secondRollback = await txResult.value.rollback();
      expect(secondRollback.ok).toBe(false);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              CLEAR TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('MemoryBackend - Clear', () => {
  let backend: MemoryBackend;

  beforeEach(async () => {
    backend = new MemoryBackend();
    await backend.connect();
  });

  it('should clear all data', async () => {
    await backend.create(createTestArtifact());
    await backend.create(createTestArtifact({ metadata: { ...createTestArtifact().metadata, name: 'Artifact 2' } }));

    const clearResult = await backend.clear();
    expect(clearResult.ok).toBe(true);

    const countResult = await backend.count({});
    expect(countResult.ok).toBe(true);
    if (countResult.ok) {
      expect(countResult.value).toBe(0);
    }
  });
});
