/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Registry Manager Unit Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { RegistryManager } from '../../src/registry/manager';
import { MemoryBackend } from '../../src/registry/backends/memory';
import { ArtifactType } from '../../src/registry/interfaces';
import type { Artifact } from '../../src/registry/interfaces';

// ═══════════════════════════════════════════════════════════════════════════════
//                              TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function createTestArtifact(
  overrides?: Partial<Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>>
): Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    type: ArtifactType.PERSONA,
    metadata: {
      name: 'Test Persona',
      version: '1.0.0',
      tags: ['test'],
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
//                              SLUG GENERATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('RegistryManager - Slug Generation', () => {
  let backend: MemoryBackend;
  let manager: RegistryManager;

  beforeEach(async () => {
    backend = new MemoryBackend();
    await backend.connect();
    manager = new RegistryManager({
      backend,
      autoGenerateSlugs: true,
    });
  });

  it('should auto-generate slug from name', async () => {
    const artifact = createTestArtifact({
      metadata: {
        name: 'My Test Persona',
        version: '1.0.0',
        tags: [],
      },
    });

    const result = await manager.create(artifact);
    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.metadata.slug).toBe('my-test-persona');
    }
  });

  it('should handle special characters in slug generation', async () => {
    const artifact = createTestArtifact({
      metadata: {
        name: 'Test @#$% Persona!!!',
        version: '1.0.0',
        tags: [],
      },
    });

    const result = await manager.create(artifact);
    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.metadata.slug).toBe('test-persona');
    }
  });

  it('should not override existing slug', async () => {
    const artifact = createTestArtifact({
      metadata: {
        name: 'Test Persona',
        slug: 'custom-slug',
        version: '1.0.0',
        tags: [],
      },
    });

    const result = await manager.create(artifact);
    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.metadata.slug).toBe('custom-slug');
    }
  });

  it('should allow disabling auto-slug generation', async () => {
    const managerNoSlug = new RegistryManager({
      backend,
      autoGenerateSlugs: false,
    });

    const artifact = createTestArtifact({
      metadata: {
        name: 'Test Persona',
        version: '1.0.0',
        tags: [],
      },
    });

    const result = await managerNoSlug.create(artifact);
    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.metadata.slug).toBeUndefined();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('RegistryManager - Validation', () => {
  let backend: MemoryBackend;
  let manager: RegistryManager;

  beforeEach(async () => {
    backend = new MemoryBackend();
    await backend.connect();
    manager = new RegistryManager({
      backend,
      validateArtifacts: true,
    });
  });

  it('should reject empty name', async () => {
    const artifact = createTestArtifact({
      metadata: {
        name: '',
        version: '1.0.0',
        tags: [],
      },
    });

    const result = await manager.create(artifact);
    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toContain('name cannot be empty');
    }
  });

  it('should reject name longer than 255 characters', async () => {
    const artifact = createTestArtifact({
      metadata: {
        name: 'a'.repeat(256),
        version: '1.0.0',
        tags: [],
      },
    });

    const result = await manager.create(artifact);
    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toContain('cannot exceed 255 characters');
    }
  });

  it('should reject invalid semantic version', async () => {
    const artifact = createTestArtifact({
      metadata: {
        name: 'Test',
        version: 'invalid-version',
        tags: [],
      },
    });

    const result = await manager.create(artifact);
    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toContain('Invalid version format');
    }
  });

  it('should accept valid semantic versions', async () => {
    const versions = ['1.0.0', '2.3.4', '1.0.0-alpha', '1.0.0+build.123'];

    for (const version of versions) {
      const artifact = createTestArtifact({
        metadata: {
          name: `Test ${version}`, // Unique name for each
          version,
          tags: [],
        },
      });

      const result = await manager.create(artifact);
      expect(result.ok).toBe(true);
    }
  });

  it('should reject invalid slug format', async () => {
    const artifact = createTestArtifact({
      metadata: {
        name: 'Test',
        slug: 'Invalid_Slug!',
        version: '1.0.0',
        tags: [],
      },
    });

    const result = await manager.create(artifact);
    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toContain('Invalid slug format');
    }
  });

  it('should accept valid slug format', async () => {
    const artifact = createTestArtifact({
      metadata: {
        name: 'Test',
        slug: 'valid-slug-123',
        version: '1.0.0',
        tags: [],
      },
    });

    const result = await manager.create(artifact);
    expect(result.ok).toBe(true);
  });

  it('should reject invalid email format', async () => {
    const artifact = createTestArtifact({
      metadata: {
        name: 'Test',
        version: '1.0.0',
        authorEmail: 'invalid-email',
        tags: [],
      },
    });

    const result = await manager.create(artifact);
    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toContain('Invalid email format');
    }
  });

  it('should accept valid email format', async () => {
    const artifact = createTestArtifact({
      metadata: {
        name: 'Test',
        version: '1.0.0',
        authorEmail: 'user@example.com',
        tags: [],
      },
    });

    const result = await manager.create(artifact);
    expect(result.ok).toBe(true);
  });

  it('should reject more than 20 tags', async () => {
    const artifact = createTestArtifact({
      metadata: {
        name: 'Test',
        version: '1.0.0',
        tags: Array.from({ length: 21 }, (_, i) => `tag${i}`),
      },
    });

    const result = await manager.create(artifact);
    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toContain('Cannot have more than 20 tags');
    }
  });

  it('should reject duplicate tags', async () => {
    const artifact = createTestArtifact({
      metadata: {
        name: 'Test',
        version: '1.0.0',
        tags: ['tag1', 'tag2', 'tag1'],
      },
    });

    const result = await manager.create(artifact);
    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toContain('Tags must be unique');
    }
  });

  it('should reject empty source code', async () => {
    const artifact = createTestArtifact({
      source: '',
    });

    const result = await manager.create(artifact);
    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toContain('Source code cannot be empty');
    }
  });

  it('should allow disabling validation', async () => {
    const managerNoValidation = new RegistryManager({
      backend,
      validateArtifacts: false,
    });

    const artifact = createTestArtifact({
      metadata: {
        name: 'ValidName',
        version: '1.0.0',
        tags: [],
      },
      source: '', // Empty source should bypass validation but backend may catch it
    });

    const result = await managerNoValidation.create(artifact);
    // With validation disabled, should succeed even with empty source
    expect(result.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              CRUD TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('RegistryManager - CRUD Operations', () => {
  let backend: MemoryBackend;
  let manager: RegistryManager;

  beforeEach(async () => {
    backend = new MemoryBackend();
    await backend.connect();
    manager = new RegistryManager({ backend });
  });

  it('should create artifact', async () => {
    const artifact = createTestArtifact();
    const result = await manager.create(artifact);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBeDefined();
      expect(result.value.metadata.name).toBe('Test Persona');
    }
  });

  it('should read artifact by ID', async () => {
    const createResult = await manager.create(createTestArtifact());
    expect(createResult.ok).toBe(true);

    if (createResult.ok) {
      const readResult = await manager.read(createResult.value.id);
      expect(readResult.ok).toBe(true);

      if (readResult.ok && readResult.value) {
        expect(readResult.value.id).toBe(createResult.value.id);
      }
    }
  });

  it('should read artifact by slug', async () => {
    const artifact = createTestArtifact({
      metadata: {
        name: 'Test Persona',
        slug: 'test-persona',
        version: '1.0.0',
        tags: [],
      },
    });

    const createResult = await manager.create(artifact);
    expect(createResult.ok).toBe(true);

    const readResult = await manager.readBySlug('test-persona');
    expect(readResult.ok).toBe(true);

    if (readResult.ok && readResult.value) {
      expect(readResult.value.metadata.slug).toBe('test-persona');
    }
  });

  it('should update artifact', async () => {
    const createResult = await manager.create(createTestArtifact());
    expect(createResult.ok).toBe(true);

    if (createResult.ok) {
      const updateResult = await manager.update(createResult.value.id, {
        metadata: {
          ...createResult.value.metadata,
          description: 'Updated description',
        },
      });

      expect(updateResult.ok).toBe(true);
      if (updateResult.ok) {
        expect(updateResult.value.metadata.description).toBe(
          'Updated description'
        );
      }
    }
  });

  it('should delete artifact', async () => {
    const createResult = await manager.create(createTestArtifact());
    expect(createResult.ok).toBe(true);

    if (createResult.ok) {
      const deleteResult = await manager.delete(createResult.value.id);
      expect(deleteResult.ok).toBe(true);
      expect(deleteResult.value).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              QUERY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('RegistryManager - Query Operations', () => {
  let backend: MemoryBackend;
  let manager: RegistryManager;

  beforeEach(async () => {
    backend = new MemoryBackend();
    await backend.connect();
    manager = new RegistryManager({ backend });

    // Create test data
    await manager.create(
      createTestArtifact({
        type: ArtifactType.PERSONA,
        metadata: { name: 'Persona 1', version: '1.0.0', tags: ['ai'] },
      })
    );
    await manager.create(
      createTestArtifact({
        type: ArtifactType.TEAM,
        metadata: { name: 'Team 1', version: '1.0.0', tags: ['collaboration'] },
      })
    );
    await manager.create(
      createTestArtifact({
        type: ArtifactType.WORKFLOW,
        metadata: {
          name: 'Workflow 1',
          version: '1.0.0',
          tags: ['automation'],
        },
      })
    );
  });

  it('should find all artifacts', async () => {
    const result = await manager.find({});
    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.length).toBe(3);
    }
  });

  it('should filter by type', async () => {
    const result = await manager.find({
      filter: { type: ArtifactType.PERSONA },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBe(1);
      expect(result.value[0].type).toBe(ArtifactType.PERSONA);
    }
  });

  it('should count artifacts', async () => {
    const result = await manager.count({});
    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value).toBe(3);
    }
  });

  it('should search artifacts', async () => {
    const result = await manager.search({
      query: 'Persona',
      fields: ['name'],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              STATS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('RegistryManager - Statistics', () => {
  let backend: MemoryBackend;
  let manager: RegistryManager;

  beforeEach(async () => {
    backend = new MemoryBackend();
    await backend.connect();
    manager = new RegistryManager({ backend });

    // Create test data with unique names to avoid slug collisions
    await manager.create(
      createTestArtifact({
        type: ArtifactType.PERSONA,
        metadata: { name: 'Test Persona A', version: '1.0.0', tags: [] },
      })
    );
    await manager.create(
      createTestArtifact({
        type: ArtifactType.TEAM,
        metadata: { name: 'Test Team B', version: '1.0.0', tags: [] },
      })
    );
    await manager.create(
      createTestArtifact({
        type: ArtifactType.WORKFLOW,
        metadata: { name: 'Test Workflow C', version: '1.0.0', tags: [] },
      })
    );
  });

  it('should return registry statistics', async () => {
    const result = await manager.stats();
    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.total).toBe(3);
      expect(result.value.byType.persona).toBe(1);
      expect(result.value.byType.team).toBe(1);
      expect(result.value.byType.workflow).toBe(1);
    }
  });
});
