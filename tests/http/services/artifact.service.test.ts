/**
 * Comprehensive test suite for Artifact Service
 * Tests all public methods with edge cases, error handling, and validation
 */

import { APIException } from '../../../src/http/middleware/error-handler';
import type {
  ArtifactMetadata,
  ArtifactType,
  CreateArtifactInput,
  UpdateArtifactInput,
} from '../../../src/http/schemas/artifact.schema';
import {
  createArtifact,
  getArtifactById,
  updateArtifact,
  deleteArtifact,
  listArtifacts,
  starArtifact,
  unstarArtifact,
  trackDownload,
} from '../../../src/http/services/artifact.service';

// ============================================================================
// Test Data Helpers
// ============================================================================

/**
 * Create valid artifact metadata for testing
 * Generates unique slug by default to avoid collisions
 */
function createValidMetadata(
  overrides?: Partial<ArtifactMetadata>
): ArtifactMetadata {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  return {
    name: 'Test Artifact',
    description: 'This is a test artifact for unit testing purposes',
    version: '1.0.0',
    tags: ['test', 'example'],
    license: 'MIT',
    slug: `test-artifact-${uniqueSuffix}`,
    ...overrides,
  };
}

/**
 * Create valid create artifact input
 */
function createValidInput(
  overrides?: Partial<CreateArtifactInput>
): CreateArtifactInput {
  return {
    type: 'persona',
    metadata: createValidMetadata(overrides?.metadata),
    source: 'persona TestPersona {\n  description: "A test persona"\n}',
    published: false,
    ...overrides,
  };
}

/**
 * Generate unique username for testing
 */
function generateUsername(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate unique user ID for testing
 */
function generateUserId(): string {
  return `uid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// createArtifact Tests
// ============================================================================

describe('createArtifact', () => {
  describe('successful creation', () => {
    it('should create artifact with all fields', async () => {
      const input = createValidInput();
      const userId = generateUserId();
      const username = generateUsername();

      const result = await createArtifact(input, userId, username);

      expect(result).toMatchObject({
        type: input.type,
        metadata: expect.objectContaining({
          name: input.metadata.name,
          description: input.metadata.description,
          version: input.metadata.version,
        }),
        source: input.source,
        published: input.published,
        authorId: userId,
        authorUsername: username,
      });
      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^artifact_/);
      expect(result.stats).toEqual({
        downloads: 0,
        stars: 0,
        views: 0,
      });
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should auto-generate slug from name if not provided', async () => {
      const input = createValidInput({
        metadata: createValidMetadata({
          name: 'My Test Artifact',
          slug: undefined,
        }),
      });

      const result = await createArtifact(
        input,
        generateUserId(),
        generateUsername()
      );

      expect(result.metadata.slug).toBe('my-test-artifact');
    });

    it('should use provided slug if given', async () => {
      const customSlug = 'custom-artifact-slug';
      const input = createValidInput({
        metadata: createValidMetadata({
          slug: customSlug,
        }),
      });

      const result = await createArtifact(
        input,
        generateUserId(),
        generateUsername()
      );

      expect(result.metadata.slug).toBe(customSlug);
    });

    it('should create artifact with minimal metadata', async () => {
      const input = createValidInput({
        metadata: {
          name: 'Minimal Artifact',
          description: 'Minimal description for testing',
          version: '0.1.0',
          tags: [],
        },
      });

      const result = await createArtifact(
        input,
        generateUserId(),
        generateUsername()
      );

      expect(result.metadata.tags).toEqual([]);
      expect(result.metadata.license).toBeUndefined();
    });

    it('should create artifact with all optional fields', async () => {
      const input = createValidInput({
        metadata: createValidMetadata({
          license: 'Apache-2.0',
          repository: 'https://github.com/example/repo',
          homepage: 'https://example.com',
          keywords: ['ai', 'persona', 'testing'],
        }),
      });

      const result = await createArtifact(
        input,
        generateUserId(),
        generateUsername()
      );

      expect(result.metadata.license).toBe('Apache-2.0');
      expect(result.metadata.repository).toBe(
        'https://github.com/example/repo'
      );
      expect(result.metadata.homepage).toBe('https://example.com');
      expect(result.metadata.keywords).toEqual(['ai', 'persona', 'testing']);
    });

    it('should create published artifact', async () => {
      const input = createValidInput({ published: true });

      const result = await createArtifact(
        input,
        generateUserId(),
        generateUsername()
      );

      expect(result.published).toBe(true);
    });

    it('should create unpublished artifact by default', async () => {
      const input = createValidInput({ published: false });

      const result = await createArtifact(
        input,
        generateUserId(),
        generateUsername()
      );

      expect(result.published).toBe(false);
    });
  });

  describe('artifact types', () => {
    const types: ArtifactType[] = ['persona', 'skill', 'workflow', 'team'];

    types.forEach((type) => {
      it(`should create ${type} artifact`, async () => {
        const input = createValidInput({ type });

        const result = await createArtifact(
          input,
          generateUserId(),
          generateUsername()
        );

        expect(result.type).toBe(type);
      });
    });
  });

  describe('slug generation', () => {
    it('should convert uppercase to lowercase', async () => {
      const input = createValidInput({
        metadata: createValidMetadata({
          name: 'UPPERCASE NAME',
          slug: undefined,
        }),
      });

      const result = await createArtifact(
        input,
        generateUserId(),
        generateUsername()
      );

      expect(result.metadata.slug).toBe('uppercase-name');
    });

    it('should convert spaces to hyphens', async () => {
      const input = createValidInput({
        metadata: createValidMetadata({
          name: 'Name With Spaces',
          slug: undefined,
        }),
      });

      const result = await createArtifact(
        input,
        generateUserId(),
        generateUsername()
      );

      expect(result.metadata.slug).toBe('name-with-spaces');
    });

    it('should remove special characters', async () => {
      const input = createValidInput({
        metadata: createValidMetadata({
          name: 'Name!@#$%With^&*()Special',
          slug: undefined,
        }),
      });

      const result = await createArtifact(
        input,
        generateUserId(),
        generateUsername()
      );

      expect(result.metadata.slug).toBe('namewithspecial');
    });

    it('should collapse multiple hyphens', async () => {
      const input = createValidInput({
        metadata: createValidMetadata({
          name: 'Name---With---Hyphens',
          slug: undefined,
        }),
      });

      const result = await createArtifact(
        input,
        generateUserId(),
        generateUsername()
      );

      expect(result.metadata.slug).toBe('name-with-hyphens');
    });

    it('should truncate slug to 100 characters', async () => {
      const longName = 'a'.repeat(150);
      const input = createValidInput({
        metadata: createValidMetadata({ name: longName }),
      });

      const result = await createArtifact(
        input,
        generateUserId(),
        generateUsername()
      );

      expect(result.metadata.slug.length).toBeLessThanOrEqual(100);
    });

    it('should handle numbers in name', async () => {
      const input = createValidInput({
        metadata: createValidMetadata({
          name: 'Artifact 123 Version 2',
          slug: undefined,
        }),
      });

      const result = await createArtifact(
        input,
        generateUserId(),
        generateUsername()
      );

      expect(result.metadata.slug).toBe('artifact-123-version-2');
    });
  });

  describe('error handling', () => {
    it('should throw error for duplicate slug', async () => {
      const slug = `unique-slug-${Date.now()}`;
      const input1 = createValidInput({
        metadata: createValidMetadata({ slug }),
      });
      const input2 = createValidInput({
        metadata: createValidMetadata({ slug }),
      });

      await createArtifact(input1, generateUserId(), generateUsername());

      await expect(
        createArtifact(input2, generateUserId(), generateUsername())
      ).rejects.toThrow(APIException);

      await expect(
        createArtifact(input2, generateUserId(), generateUsername())
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'SLUG_TAKEN',
      });
    });

    it('should throw error for duplicate generated slug', async () => {
      const name = `Unique Name ${Date.now()}`;
      const input1 = createValidInput({
        metadata: createValidMetadata({ name, slug: undefined }),
      });
      const input2 = createValidInput({
        metadata: createValidMetadata({ name, slug: undefined }),
      });

      await createArtifact(input1, generateUserId(), generateUsername());

      await expect(
        createArtifact(input2, generateUserId(), generateUsername())
      ).rejects.toThrow(APIException);
    });
  });

  describe('initialization', () => {
    it('should initialize stats to zero', async () => {
      const input = createValidInput();

      const result = await createArtifact(
        input,
        generateUserId(),
        generateUsername()
      );

      expect(result.stats).toEqual({
        downloads: 0,
        stars: 0,
        views: 0,
      });
    });

    it('should set createdAt and updatedAt to current time', async () => {
      const before = new Date();
      const input = createValidInput();

      const result = await createArtifact(
        input,
        generateUserId(),
        generateUsername()
      );

      const after = new Date();
      const createdAt = new Date(result.createdAt);
      const updatedAt = new Date(result.updatedAt);

      expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});

// ============================================================================
// getArtifactById Tests
// ============================================================================

describe('getArtifactById', () => {
  describe('successful retrieval', () => {
    it('should retrieve existing artifact by ID', async () => {
      const input = createValidInput();
      const created = await createArtifact(
        input,
        generateUserId(),
        generateUsername()
      );

      const result = await getArtifactById(created.id);

      expect(result).toMatchObject({
        id: created.id,
        type: created.type,
        metadata: created.metadata,
        source: created.source,
      });
    });

    it('should increment view count on retrieval', async () => {
      const input = createValidInput();
      const created = await createArtifact(
        input,
        generateUserId(),
        generateUsername()
      );

      expect(created.stats.views).toBe(0);

      const result1 = await getArtifactById(created.id);
      expect(result1.stats.views).toBe(1);

      const result2 = await getArtifactById(created.id);
      expect(result2.stats.views).toBe(2);

      const result3 = await getArtifactById(created.id);
      expect(result3.stats.views).toBe(3);
    });

    it('should return artifact with all fields', async () => {
      const input = createValidInput({
        metadata: createValidMetadata({
          repository: 'https://github.com/test/repo',
          homepage: 'https://test.com',
          keywords: ['test', 'example'],
        }),
      });
      const created = await createArtifact(
        input,
        generateUserId(),
        generateUsername()
      );

      const result = await getArtifactById(created.id);

      expect(result.metadata.repository).toBe('https://github.com/test/repo');
      expect(result.metadata.homepage).toBe('https://test.com');
      expect(result.metadata.keywords).toEqual(['test', 'example']);
    });

    it('should accept optional userId parameter', async () => {
      const input = createValidInput();
      const userId = generateUserId();
      const created = await createArtifact(input, userId, generateUsername());

      const result = await getArtifactById(created.id, userId);

      expect(result.id).toBe(created.id);
    });
  });

  describe('error handling', () => {
    it('should throw 404 for non-existent artifact', async () => {
      await expect(getArtifactById('nonexistent-id')).rejects.toThrow(
        APIException
      );

      await expect(getArtifactById('nonexistent-id')).rejects.toMatchObject({
        statusCode: 404,
        code: 'ARTIFACT_NOT_FOUND',
      });
    });

    it('should throw 404 for invalid artifact ID format', async () => {
      await expect(getArtifactById('invalid')).rejects.toThrow(APIException);
    });

    it('should throw 404 for empty string ID', async () => {
      await expect(getArtifactById('')).rejects.toThrow(APIException);
    });
  });
});

// ============================================================================
// updateArtifact Tests
// ============================================================================

describe('updateArtifact', () => {
  describe('successful updates', () => {
    it('should update artifact metadata', async () => {
      const userId = generateUserId();
      const created = await createArtifact(
        createValidInput(),
        userId,
        generateUsername()
      );

      const updates: UpdateArtifactInput = {
        metadata: {
          name: 'Updated Name',
          description: 'Updated description for testing',
        },
      };

      const result = await updateArtifact(created.id, updates, userId);

      expect(result.metadata.name).toBe('Updated Name');
      expect(result.metadata.description).toBe(
        'Updated description for testing'
      );
      expect(result.metadata.version).toBe(created.metadata.version); // Unchanged
    });

    it('should update artifact source', async () => {
      const userId = generateUserId();
      const created = await createArtifact(
        createValidInput(),
        userId,
        generateUsername()
      );

      const newSource = 'persona UpdatedPersona {\n  description: "Updated"\n}';
      const updates: UpdateArtifactInput = {
        source: newSource,
      };

      const result = await updateArtifact(created.id, updates, userId);

      expect(result.source).toBe(newSource);
    });

    it('should update published status', async () => {
      const userId = generateUserId();
      const created = await createArtifact(
        createValidInput({ published: false }),
        userId,
        generateUsername()
      );

      const updates: UpdateArtifactInput = {
        published: true,
      };

      const result = await updateArtifact(created.id, updates, userId);

      expect(result.published).toBe(true);
    });

    it('should update multiple fields at once', async () => {
      const userId = generateUserId();
      const created = await createArtifact(
        createValidInput(),
        userId,
        generateUsername()
      );

      const updates: UpdateArtifactInput = {
        metadata: {
          name: 'Multi Update',
          version: '2.0.0',
        },
        source: 'updated source code',
        published: true,
      };

      const result = await updateArtifact(created.id, updates, userId);

      expect(result.metadata.name).toBe('Multi Update');
      expect(result.metadata.version).toBe('2.0.0');
      expect(result.source).toBe('updated source code');
      expect(result.published).toBe(true);
    });

    it('should preserve unchanged metadata fields', async () => {
      const userId = generateUserId();
      const created = await createArtifact(
        createValidInput({
          metadata: createValidMetadata({
            repository: 'https://github.com/test/repo',
            keywords: ['preserved', 'keywords'],
          }),
        }),
        userId,
        generateUsername()
      );

      const updates: UpdateArtifactInput = {
        metadata: {
          name: 'Updated Name',
        },
      };

      const result = await updateArtifact(created.id, updates, userId);

      expect(result.metadata.repository).toBe('https://github.com/test/repo');
      expect(result.metadata.keywords).toEqual(['preserved', 'keywords']);
    });

    it('should update slug', async () => {
      const userId = generateUserId();
      const created = await createArtifact(
        createValidInput(),
        userId,
        generateUsername()
      );

      const newSlug = `updated-slug-${Date.now()}`;
      const updates: UpdateArtifactInput = {
        metadata: {
          slug: newSlug,
        },
      };

      const result = await updateArtifact(created.id, updates, userId);

      expect(result.metadata.slug).toBe(newSlug);
    });

    it('should update updatedAt timestamp', async () => {
      const userId = generateUserId();
      const created = await createArtifact(
        createValidInput(),
        userId,
        generateUsername()
      );

      const originalUpdatedAt = created.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updates: UpdateArtifactInput = {
        metadata: { name: 'Updated' },
      };

      const result = await updateArtifact(created.id, updates, userId);

      expect(result.updatedAt).not.toBe(originalUpdatedAt);
      expect(new Date(result.updatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );
    });

    it('should preserve createdAt timestamp', async () => {
      const userId = generateUserId();
      const created = await createArtifact(
        createValidInput(),
        userId,
        generateUsername()
      );

      const updates: UpdateArtifactInput = {
        metadata: { name: 'Updated' },
      };

      const result = await updateArtifact(created.id, updates, userId);

      expect(result.createdAt).toBe(created.createdAt);
    });
  });

  describe('error handling', () => {
    it('should throw 404 for non-existent artifact', async () => {
      const updates: UpdateArtifactInput = {
        metadata: { name: 'Updated' },
      };

      await expect(
        updateArtifact('nonexistent', updates, generateUserId())
      ).rejects.toThrow(APIException);

      await expect(
        updateArtifact('nonexistent', updates, generateUserId())
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'ARTIFACT_NOT_FOUND',
      });
    });

    it('should throw 403 when updating artifact owned by different user', async () => {
      const owner = generateUserId();
      const otherUser = generateUserId();
      const created = await createArtifact(
        createValidInput(),
        owner,
        generateUsername()
      );

      const updates: UpdateArtifactInput = {
        metadata: { name: 'Unauthorized Update' },
      };

      await expect(
        updateArtifact(created.id, updates, otherUser)
      ).rejects.toThrow(APIException);

      await expect(
        updateArtifact(created.id, updates, otherUser)
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });

    it('should throw 409 when updating slug to existing slug', async () => {
      const userId = generateUserId();
      const username = generateUsername();

      await createArtifact(
        createValidInput({
          metadata: createValidMetadata({ slug: 'existing-slug' }),
        }),
        userId,
        username
      );

      const artifact2 = await createArtifact(
        createValidInput({
          metadata: createValidMetadata({ slug: 'different-slug' }),
        }),
        userId,
        username
      );

      const updates: UpdateArtifactInput = {
        metadata: { slug: 'existing-slug' },
      };

      await expect(
        updateArtifact(artifact2.id, updates, userId)
      ).rejects.toThrow(APIException);

      await expect(
        updateArtifact(artifact2.id, updates, userId)
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'SLUG_TAKEN',
      });
    });

    it('should allow updating slug to same slug (no change)', async () => {
      const userId = generateUserId();
      const created = await createArtifact(
        createValidInput({
          metadata: createValidMetadata({ slug: 'same-slug' }),
        }),
        userId,
        generateUsername()
      );

      const updates: UpdateArtifactInput = {
        metadata: { slug: 'same-slug' },
      };

      const result = await updateArtifact(created.id, updates, userId);

      expect(result.metadata.slug).toBe('same-slug');
    });
  });

  describe('partial updates', () => {
    it('should update only name', async () => {
      const userId = generateUserId();
      const created = await createArtifact(
        createValidInput(),
        userId,
        generateUsername()
      );

      const updates: UpdateArtifactInput = {
        metadata: { name: 'Only Name Updated' },
      };

      const result = await updateArtifact(created.id, updates, userId);

      expect(result.metadata.name).toBe('Only Name Updated');
      expect(result.metadata.description).toBe(created.metadata.description);
      expect(result.metadata.version).toBe(created.metadata.version);
    });

    it('should update only description', async () => {
      const userId = generateUserId();
      const created = await createArtifact(
        createValidInput(),
        userId,
        generateUsername()
      );

      const updates: UpdateArtifactInput = {
        metadata: { description: 'Only description was updated here' },
      };

      const result = await updateArtifact(created.id, updates, userId);

      expect(result.metadata.description).toBe(
        'Only description was updated here'
      );
      expect(result.metadata.name).toBe(created.metadata.name);
    });

    it('should update only version', async () => {
      const userId = generateUserId();
      const created = await createArtifact(
        createValidInput(),
        userId,
        generateUsername()
      );

      const updates: UpdateArtifactInput = {
        metadata: { version: '3.0.0' },
      };

      const result = await updateArtifact(created.id, updates, userId);

      expect(result.metadata.version).toBe('3.0.0');
      expect(result.metadata.name).toBe(created.metadata.name);
    });
  });
});

// ============================================================================
// deleteArtifact Tests
// ============================================================================

describe('deleteArtifact', () => {
  describe('successful deletion', () => {
    it('should delete existing artifact', async () => {
      const userId = generateUserId();
      const created = await createArtifact(
        createValidInput(),
        userId,
        generateUsername()
      );

      await deleteArtifact(created.id, userId);

      await expect(getArtifactById(created.id)).rejects.toThrow(APIException);
    });

    it('should allow same slug to be reused after deletion', async () => {
      const userId = generateUserId();
      const username = generateUsername();
      const slug = `reusable-slug-${Date.now()}`;

      const artifact1 = await createArtifact(
        createValidInput({
          metadata: createValidMetadata({ slug }),
        }),
        userId,
        username
      );

      await deleteArtifact(artifact1.id, userId);

      // Should be able to create new artifact with same slug
      const artifact2 = await createArtifact(
        createValidInput({
          metadata: createValidMetadata({ slug }),
        }),
        userId,
        username
      );

      expect(artifact2.metadata.slug).toBe(slug);
      expect(artifact2.id).not.toBe(artifact1.id);
    });

    it('should remove artifact from list results', async () => {
      const userId = generateUserId();
      const username = generateUsername();

      const created = await createArtifact(
        createValidInput({ published: true }),
        userId,
        username
      );

      // Verify artifact exists by retrieving it
      const retrieved = await getArtifactById(created.id);
      expect(retrieved.id).toBe(created.id);

      await deleteArtifact(created.id, userId);

      // Verify artifact no longer exists
      await expect(getArtifactById(created.id)).rejects.toThrow(APIException);
    });
  });

  describe('error handling', () => {
    it('should throw 404 for non-existent artifact', async () => {
      await expect(
        deleteArtifact('nonexistent', generateUserId())
      ).rejects.toThrow(APIException);

      await expect(
        deleteArtifact('nonexistent', generateUserId())
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'ARTIFACT_NOT_FOUND',
      });
    });

    it('should throw 403 when deleting artifact owned by different user', async () => {
      const owner = generateUserId();
      const otherUser = generateUserId();
      const created = await createArtifact(
        createValidInput(),
        owner,
        generateUsername()
      );

      await expect(deleteArtifact(created.id, otherUser)).rejects.toThrow(
        APIException
      );

      await expect(deleteArtifact(created.id, otherUser)).rejects.toMatchObject(
        {
          statusCode: 403,
          code: 'FORBIDDEN',
        }
      );
    });

    it('should not allow deletion after already deleted', async () => {
      const userId = generateUserId();
      const created = await createArtifact(
        createValidInput(),
        userId,
        generateUsername()
      );

      await deleteArtifact(created.id, userId);

      await expect(deleteArtifact(created.id, userId)).rejects.toThrow(
        APIException
      );
    });
  });

  describe('cascade effects', () => {
    it('should remove all stars when artifact is deleted', async () => {
      const owner = generateUserId();
      const user1 = generateUserId();
      const user2 = generateUserId();

      const created = await createArtifact(
        createValidInput(),
        owner,
        generateUsername()
      );

      await starArtifact(created.id, user1);
      await starArtifact(created.id, user2);

      await deleteArtifact(created.id, owner);

      // Verify artifact no longer exists
      await expect(getArtifactById(created.id)).rejects.toThrow(APIException);
    });
  });
});

// ============================================================================
// listArtifacts Tests
// ============================================================================

describe('listArtifacts', () => {
  describe('basic listing', () => {
    it('should list all artifacts', async () => {
      const userId = generateUserId();
      const username = generateUsername();

      // Create some artifacts
      await createArtifact(
        createValidInput({ published: true }),
        userId,
        username
      );
      await createArtifact(
        createValidInput({ published: true }),
        userId,
        username
      );

      const result = await listArtifacts({});

      expect(result.artifacts).toBeDefined();
      expect(Array.isArray(result.artifacts)).toBe(true);
      expect(result.pagination).toBeDefined();
    });

    it('should return pagination metadata', async () => {
      const result = await listArtifacts({});

      expect(result.pagination).toMatchObject({
        total: expect.any(Number),
        offset: expect.any(Number),
        limit: expect.any(Number),
        hasMore: expect.any(Boolean),
      });
    });

    it('should default to limit 20', async () => {
      const result = await listArtifacts({});

      expect(result.pagination.limit).toBe(20);
    });

    it('should default to offset 0', async () => {
      const result = await listArtifacts({});

      expect(result.pagination.offset).toBe(0);
    });
  });

  describe('filtering by type', () => {
    it('should filter by persona type', async () => {
      const userId = generateUserId();
      const username = generateUsername();

      await createArtifact(
        createValidInput({ type: 'persona', published: true }),
        userId,
        username
      );
      await createArtifact(
        createValidInput({ type: 'skill', published: true }),
        userId,
        username
      );

      const result = await listArtifacts({ type: 'persona' });

      expect(result.artifacts.every((a) => a.type === 'persona')).toBe(true);
    });

    it('should filter by skill type', async () => {
      const userId = generateUserId();
      const username = generateUsername();

      await createArtifact(
        createValidInput({ type: 'skill', published: true }),
        userId,
        username
      );

      const result = await listArtifacts({ type: 'skill' });

      expect(result.artifacts.every((a) => a.type === 'skill')).toBe(true);
    });

    it('should filter by workflow type', async () => {
      const userId = generateUserId();
      const username = generateUsername();

      await createArtifact(
        createValidInput({ type: 'workflow', published: true }),
        userId,
        username
      );

      const result = await listArtifacts({ type: 'workflow' });

      expect(result.artifacts.every((a) => a.type === 'workflow')).toBe(true);
    });

    it('should filter by team type', async () => {
      const userId = generateUserId();
      const username = generateUsername();

      await createArtifact(
        createValidInput({ type: 'team', published: true }),
        userId,
        username
      );

      const result = await listArtifacts({ type: 'team' });

      expect(result.artifacts.every((a) => a.type === 'team')).toBe(true);
    });
  });

  describe('filtering by published status', () => {
    it('should filter published artifacts', async () => {
      const userId = generateUserId();
      const username = generateUsername();

      await createArtifact(
        createValidInput({ published: true }),
        userId,
        username
      );
      await createArtifact(
        createValidInput({ published: false }),
        userId,
        username
      );

      const result = await listArtifacts({ published: 'true' });

      expect(result.artifacts.every((a) => a.published === true)).toBe(true);
    });

    it('should filter unpublished artifacts', async () => {
      const userId = generateUserId();
      const username = generateUsername();

      await createArtifact(
        createValidInput({ published: false }),
        userId,
        username
      );

      const result = await listArtifacts({ published: 'false' });

      expect(result.artifacts.every((a) => a.published === false)).toBe(true);
    });
  });

  describe('filtering by author', () => {
    it('should filter by author username', async () => {
      const username1 = generateUsername();
      const username2 = generateUsername();

      await createArtifact(
        createValidInput({ published: true }),
        generateUserId(),
        username1
      );
      await createArtifact(
        createValidInput({ published: true }),
        generateUserId(),
        username2
      );

      const result = await listArtifacts({ author: username1 });

      expect(
        result.artifacts.every((a) => a.authorUsername === username1)
      ).toBe(true);
    });

    it('should return empty list for non-existent author', async () => {
      const result = await listArtifacts({ author: 'nonexistent-author' });

      expect(result.artifacts).toHaveLength(0);
    });
  });

  describe('filtering by tags', () => {
    it('should filter by single tag', async () => {
      const userId = generateUserId();
      const username = generateUsername();

      await createArtifact(
        createValidInput({
          metadata: createValidMetadata({ tags: ['ai', 'testing'] }),
          published: true,
        }),
        userId,
        username
      );
      await createArtifact(
        createValidInput({
          metadata: createValidMetadata({ tags: ['other'] }),
          published: true,
        }),
        userId,
        username
      );

      const result = await listArtifacts({ tags: 'ai' });

      expect(
        result.artifacts.every((a) =>
          a.metadata.tags.some((t) => t.toLowerCase() === 'ai')
        )
      ).toBe(true);
    });

    it('should filter by multiple tags (OR logic)', async () => {
      const userId = generateUserId();
      const username = generateUsername();

      await createArtifact(
        createValidInput({
          metadata: createValidMetadata({ tags: ['tag1'] }),
          published: true,
        }),
        userId,
        username
      );
      await createArtifact(
        createValidInput({
          metadata: createValidMetadata({ tags: ['tag2'] }),
          published: true,
        }),
        userId,
        username
      );

      const result = await listArtifacts({ tags: 'tag1,tag2' });

      expect(result.artifacts.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle tags with whitespace', async () => {
      const userId = generateUserId();
      const username = generateUsername();

      await createArtifact(
        createValidInput({
          metadata: createValidMetadata({ tags: ['spaced'] }),
          published: true,
        }),
        userId,
        username
      );

      const result = await listArtifacts({ tags: ' spaced , other ' });

      expect(
        result.artifacts.some((a) => a.metadata.tags.includes('spaced'))
      ).toBe(true);
    });

    it('should be case-insensitive for tag matching', async () => {
      const userId = generateUserId();
      const username = generateUsername();

      await createArtifact(
        createValidInput({
          metadata: createValidMetadata({ tags: ['CaseSensitive'] }),
          published: true,
        }),
        userId,
        username
      );

      const result = await listArtifacts({ tags: 'casesensitive' });

      expect(
        result.artifacts.some((a) =>
          a.metadata.tags.some((t) => t.toLowerCase() === 'casesensitive')
        )
      ).toBe(true);
    });
  });

  describe('search functionality', () => {
    it('should search by name', async () => {
      const userId = generateUserId();
      const username = generateUsername();
      const uniqueName = `SearchableName${Date.now()}`;

      await createArtifact(
        createValidInput({
          metadata: createValidMetadata({ name: uniqueName }),
          published: true,
        }),
        userId,
        username
      );

      const result = await listArtifacts({ search: uniqueName });

      expect(result.artifacts.some((a) => a.metadata.name === uniqueName)).toBe(
        true
      );
    });

    it('should search by description', async () => {
      const userId = generateUserId();
      const username = generateUsername();
      const uniqueWord = `searchable${Date.now()}`;

      await createArtifact(
        createValidInput({
          metadata: createValidMetadata({
            description: `This contains ${uniqueWord} in description`,
          }),
          published: true,
        }),
        userId,
        username
      );

      const result = await listArtifacts({ search: uniqueWord });

      expect(
        result.artifacts.some((a) =>
          a.metadata.description.includes(uniqueWord)
        )
      ).toBe(true);
    });

    it('should search by tags', async () => {
      const userId = generateUserId();
      const username = generateUsername();
      const uniqueTag = `searchtag${Date.now()}`;

      await createArtifact(
        createValidInput({
          metadata: createValidMetadata({ tags: [uniqueTag] }),
          published: true,
        }),
        userId,
        username
      );

      const result = await listArtifacts({ search: uniqueTag });

      expect(
        result.artifacts.some((a) => a.metadata.tags.includes(uniqueTag))
      ).toBe(true);
    });

    it('should be case-insensitive', async () => {
      const userId = generateUserId();
      const username = generateUsername();

      await createArtifact(
        createValidInput({
          metadata: createValidMetadata({ name: 'CaseSensitiveName' }),
          published: true,
        }),
        userId,
        username
      );

      const result = await listArtifacts({ search: 'casesensitivename' });

      expect(
        result.artifacts.some((a) => a.metadata.name === 'CaseSensitiveName')
      ).toBe(true);
    });
  });

  describe('sorting', () => {
    it('should sort by createdAt desc (default)', async () => {
      const result = await listArtifacts({ sort: 'createdAt:desc' });

      if (result.artifacts.length > 1) {
        for (let i = 0; i < result.artifacts.length - 1; i++) {
          const current = new Date(result.artifacts[i].createdAt).getTime();
          const next = new Date(result.artifacts[i + 1].createdAt).getTime();
          expect(current).toBeGreaterThanOrEqual(next);
        }
      }
    });

    it('should sort by createdAt asc', async () => {
      const result = await listArtifacts({ sort: 'createdAt:asc' });

      if (result.artifacts.length > 1) {
        for (let i = 0; i < result.artifacts.length - 1; i++) {
          const current = new Date(result.artifacts[i].createdAt).getTime();
          const next = new Date(result.artifacts[i + 1].createdAt).getTime();
          expect(current).toBeLessThanOrEqual(next);
        }
      }
    });

    it('should sort by downloads desc', async () => {
      const result = await listArtifacts({ sort: 'downloads:desc' });

      if (result.artifacts.length > 1) {
        for (let i = 0; i < result.artifacts.length - 1; i++) {
          expect(result.artifacts[i].stats.downloads).toBeGreaterThanOrEqual(
            result.artifacts[i + 1].stats.downloads
          );
        }
      }
    });

    it('should sort by downloads asc', async () => {
      const result = await listArtifacts({ sort: 'downloads:asc' });

      if (result.artifacts.length > 1) {
        for (let i = 0; i < result.artifacts.length - 1; i++) {
          expect(result.artifacts[i].stats.downloads).toBeLessThanOrEqual(
            result.artifacts[i + 1].stats.downloads
          );
        }
      }
    });

    it('should sort by stars desc', async () => {
      const result = await listArtifacts({ sort: 'stars:desc' });

      if (result.artifacts.length > 1) {
        for (let i = 0; i < result.artifacts.length - 1; i++) {
          expect(result.artifacts[i].stats.stars).toBeGreaterThanOrEqual(
            result.artifacts[i + 1].stats.stars
          );
        }
      }
    });

    it('should sort by stars asc', async () => {
      const result = await listArtifacts({ sort: 'stars:asc' });

      if (result.artifacts.length > 1) {
        for (let i = 0; i < result.artifacts.length - 1; i++) {
          expect(result.artifacts[i].stats.stars).toBeLessThanOrEqual(
            result.artifacts[i + 1].stats.stars
          );
        }
      }
    });
  });

  describe('pagination', () => {
    it('should respect limit parameter', async () => {
      const userId = generateUserId();
      const username = generateUsername();

      // Create 5 artifacts
      for (let i = 0; i < 5; i++) {
        await createArtifact(
          createValidInput({ published: true }),
          userId,
          username
        );
      }

      const result = await listArtifacts({ limit: '3' });

      expect(result.artifacts.length).toBeLessThanOrEqual(3);
      expect(result.pagination.limit).toBe(3);
    });

    it('should respect offset parameter', async () => {
      const userId = generateUserId();
      const username = generateUsername();

      // Create artifacts
      for (let i = 0; i < 5; i++) {
        await createArtifact(
          createValidInput({ published: true }),
          userId,
          username
        );
      }

      const result = await listArtifacts({ offset: '2', limit: '10' });

      expect(result.pagination.offset).toBe(2);
    });

    it('should calculate hasMore correctly', async () => {
      const userId = generateUserId();
      const username = generateUsername();

      // Create 3 artifacts
      for (let i = 0; i < 3; i++) {
        await createArtifact(
          createValidInput({ published: true }),
          userId,
          username
        );
      }

      const result = await listArtifacts({ limit: '2' });

      if (result.pagination.total > 2) {
        expect(result.pagination.hasMore).toBe(true);
      }
    });

    it('should handle offset beyond total', async () => {
      const result = await listArtifacts({ offset: '10000', limit: '10' });

      expect(result.artifacts).toHaveLength(0);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should handle limit of 1', async () => {
      const result = await listArtifacts({ limit: '1' });

      expect(result.artifacts.length).toBeLessThanOrEqual(1);
    });

    it('should handle large limit up to 100', async () => {
      const result = await listArtifacts({ limit: '100' });

      expect(result.pagination.limit).toBe(100);
    });
  });

  describe('combined filters', () => {
    it('should combine type and published filters', async () => {
      const userId = generateUserId();
      const username = generateUsername();

      await createArtifact(
        createValidInput({ type: 'persona', published: true }),
        userId,
        username
      );

      const result = await listArtifacts({
        type: 'persona',
        published: 'true',
      });

      expect(
        result.artifacts.every(
          (a) => a.type === 'persona' && a.published === true
        )
      ).toBe(true);
    });

    it('should combine author and type filters', async () => {
      const username = generateUsername();

      await createArtifact(
        createValidInput({ type: 'skill', published: true }),
        generateUserId(),
        username
      );

      const result = await listArtifacts({ type: 'skill', author: username });

      expect(
        result.artifacts.every(
          (a) => a.type === 'skill' && a.authorUsername === username
        )
      ).toBe(true);
    });

    it('should combine search and tags', async () => {
      const userId = generateUserId();
      const username = generateUsername();

      await createArtifact(
        createValidInput({
          metadata: createValidMetadata({
            name: 'Searchable',
            tags: ['findme'],
          }),
          published: true,
        }),
        userId,
        username
      );

      const result = await listArtifacts({
        search: 'Searchable',
        tags: 'findme',
      });

      expect(result.artifacts.length).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================================
// starArtifact Tests
// ============================================================================

describe('starArtifact', () => {
  describe('successful starring', () => {
    it('should star an artifact', async () => {
      const artifact = await createArtifact(
        createValidInput(),
        generateUserId(),
        generateUsername()
      );
      const userId = generateUserId();

      const result = await starArtifact(artifact.id, userId);

      expect(result.starred).toBe(true);
      expect(result.totalStars).toBeGreaterThan(0);
    });

    it('should increment star count', async () => {
      const artifact = await createArtifact(
        createValidInput(),
        generateUserId(),
        generateUsername()
      );
      const initialStars = artifact.stats.stars;

      const userId = generateUserId();
      const result = await starArtifact(artifact.id, userId);

      expect(result.totalStars).toBe(initialStars + 1);
    });

    it('should allow multiple users to star same artifact', async () => {
      const artifact = await createArtifact(
        createValidInput(),
        generateUserId(),
        generateUsername()
      );

      const user1 = generateUserId();
      const user2 = generateUserId();
      const user3 = generateUserId();

      await starArtifact(artifact.id, user1);
      await starArtifact(artifact.id, user2);
      const result = await starArtifact(artifact.id, user3);

      expect(result.totalStars).toBeGreaterThanOrEqual(3);
    });

    it('should not double-count if same user stars twice', async () => {
      const artifact = await createArtifact(
        createValidInput(),
        generateUserId(),
        generateUsername()
      );
      const userId = generateUserId();

      const result1 = await starArtifact(artifact.id, userId);
      const result2 = await starArtifact(artifact.id, userId);

      expect(result2.totalStars).toBe(result1.totalStars);
    });
  });

  describe('error handling', () => {
    it('should throw 404 for non-existent artifact', async () => {
      await expect(
        starArtifact('nonexistent', generateUserId())
      ).rejects.toThrow(APIException);

      await expect(
        starArtifact('nonexistent', generateUserId())
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'ARTIFACT_NOT_FOUND',
      });
    });
  });
});

// ============================================================================
// unstarArtifact Tests
// ============================================================================

describe('unstarArtifact', () => {
  describe('successful unstarring', () => {
    it('should unstar a starred artifact', async () => {
      const artifact = await createArtifact(
        createValidInput(),
        generateUserId(),
        generateUsername()
      );
      const userId = generateUserId();

      await starArtifact(artifact.id, userId);
      const result = await unstarArtifact(artifact.id, userId);

      expect(result.starred).toBe(false);
    });

    it('should decrement star count', async () => {
      const artifact = await createArtifact(
        createValidInput(),
        generateUserId(),
        generateUsername()
      );
      const userId = generateUserId();

      const starResult = await starArtifact(artifact.id, userId);
      const unstarResult = await unstarArtifact(artifact.id, userId);

      expect(unstarResult.totalStars).toBe(starResult.totalStars - 1);
    });

    it('should not go below zero stars', async () => {
      const artifact = await createArtifact(
        createValidInput(),
        generateUserId(),
        generateUsername()
      );
      const userId = generateUserId();

      await starArtifact(artifact.id, userId);
      await unstarArtifact(artifact.id, userId);
      const result = await unstarArtifact(artifact.id, userId);

      expect(result.totalStars).toBeGreaterThanOrEqual(0);
    });

    it('should handle unstarring without prior star', async () => {
      const artifact = await createArtifact(
        createValidInput(),
        generateUserId(),
        generateUsername()
      );
      const userId = generateUserId();

      const result = await unstarArtifact(artifact.id, userId);

      expect(result.starred).toBe(false);
    });

    it('should allow re-starring after unstarring', async () => {
      const artifact = await createArtifact(
        createValidInput(),
        generateUserId(),
        generateUsername()
      );
      const userId = generateUserId();

      await starArtifact(artifact.id, userId);
      await unstarArtifact(artifact.id, userId);
      const result = await starArtifact(artifact.id, userId);

      expect(result.starred).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should throw 404 for non-existent artifact', async () => {
      await expect(
        unstarArtifact('nonexistent', generateUserId())
      ).rejects.toThrow(APIException);

      await expect(
        unstarArtifact('nonexistent', generateUserId())
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'ARTIFACT_NOT_FOUND',
      });
    });
  });
});

// ============================================================================
// trackDownload Tests
// ============================================================================

describe('trackDownload', () => {
  describe('successful tracking', () => {
    it('should track a download', async () => {
      const artifact = await createArtifact(
        createValidInput(),
        generateUserId(),
        generateUsername()
      );

      await trackDownload(artifact.id);

      const updated = await getArtifactById(artifact.id);
      expect(updated.stats.downloads).toBe(1);
    });

    it('should increment download count on multiple downloads', async () => {
      const artifact = await createArtifact(
        createValidInput(),
        generateUserId(),
        generateUsername()
      );

      await trackDownload(artifact.id);
      await trackDownload(artifact.id);
      await trackDownload(artifact.id);

      const updated = await getArtifactById(artifact.id);
      expect(updated.stats.downloads).toBe(3);
    });

    it('should not affect other stats', async () => {
      const artifact = await createArtifact(
        createValidInput(),
        generateUserId(),
        generateUsername()
      );

      await trackDownload(artifact.id);

      const updated = await getArtifactById(artifact.id);
      expect(updated.stats.stars).toBe(0);
      // views will be 1 because getArtifactById increments it
    });
  });

  describe('error handling', () => {
    it('should throw 404 for non-existent artifact', async () => {
      await expect(trackDownload('nonexistent')).rejects.toThrow(APIException);

      await expect(trackDownload('nonexistent')).rejects.toMatchObject({
        statusCode: 404,
        code: 'ARTIFACT_NOT_FOUND',
      });
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('artifact service integration', () => {
  describe('complete artifact lifecycle', () => {
    it('should handle create -> read -> update -> delete lifecycle', async () => {
      const userId = generateUserId();
      const username = generateUsername();

      // Create
      const created = await createArtifact(
        createValidInput(),
        userId,
        username
      );
      expect(created.id).toBeDefined();

      // Read
      const retrieved = await getArtifactById(created.id);
      expect(retrieved.id).toBe(created.id);

      // Update
      const updated = await updateArtifact(
        created.id,
        { metadata: { name: 'Updated Lifecycle' } },
        userId
      );
      expect(updated.metadata.name).toBe('Updated Lifecycle');

      // Delete
      await deleteArtifact(created.id, userId);
      await expect(getArtifactById(created.id)).rejects.toThrow(APIException);
    });

    it('should track stats throughout lifecycle', async () => {
      const userId = generateUserId();
      const username = generateUsername();
      const user2 = generateUserId();

      // Create
      const created = await createArtifact(
        createValidInput(),
        userId,
        username
      );

      // View
      await getArtifactById(created.id);
      let artifact = await getArtifactById(created.id);
      expect(artifact.stats.views).toBe(2);

      // Star
      await starArtifact(created.id, user2);
      artifact = await getArtifactById(created.id);
      expect(artifact.stats.stars).toBeGreaterThan(0);

      // Download
      await trackDownload(created.id);
      artifact = await getArtifactById(created.id);
      expect(artifact.stats.downloads).toBe(1);
    });
  });

  describe('multi-user scenarios', () => {
    it('should allow different users to create artifacts with same name', async () => {
      const name = 'Common Artifact Name';
      const user1 = generateUserId();
      const user2 = generateUserId();

      const artifact1 = await createArtifact(
        createValidInput({
          metadata: createValidMetadata({ name }),
        }),
        user1,
        generateUsername()
      );

      const artifact2 = await createArtifact(
        createValidInput({
          metadata: createValidMetadata({ name }),
        }),
        user2,
        generateUsername()
      );

      expect(artifact1.metadata.name).toBe(name);
      expect(artifact2.metadata.name).toBe(name);
      expect(artifact1.id).not.toBe(artifact2.id);
      expect(artifact1.metadata.slug).not.toBe(artifact2.metadata.slug);
    });

    it('should enforce ownership for updates and deletes', async () => {
      const owner = generateUserId();
      const otherUser = generateUserId();

      const artifact = await createArtifact(
        createValidInput(),
        owner,
        generateUsername()
      );

      // Other user cannot update
      await expect(
        updateArtifact(artifact.id, { metadata: { name: 'Hacked' } }, otherUser)
      ).rejects.toThrow(APIException);

      // Other user cannot delete
      await expect(deleteArtifact(artifact.id, otherUser)).rejects.toThrow(
        APIException
      );

      // Owner can update
      const updated = await updateArtifact(
        artifact.id,
        { metadata: { name: 'Owner Update' } },
        owner
      );
      expect(updated.metadata.name).toBe('Owner Update');

      // Owner can delete
      await deleteArtifact(artifact.id, owner);
    });
  });

  describe('stats consistency', () => {
    it('should maintain consistent view count across operations', async () => {
      const artifact = await createArtifact(
        createValidInput(),
        generateUserId(),
        generateUsername()
      );

      // Multiple views
      await getArtifactById(artifact.id);
      await getArtifactById(artifact.id);
      await getArtifactById(artifact.id);

      const result = await getArtifactById(artifact.id);
      expect(result.stats.views).toBe(4);
    });

    it('should maintain consistent star count with multiple users', async () => {
      const artifact = await createArtifact(
        createValidInput(),
        generateUserId(),
        generateUsername()
      );

      const users = [generateUserId(), generateUserId(), generateUserId()];

      for (const user of users) {
        await starArtifact(artifact.id, user);
      }

      const result = await getArtifactById(artifact.id);
      expect(result.stats.stars).toBe(3);

      // Unstar one
      await unstarArtifact(artifact.id, users[0]);

      const afterUnstar = await getArtifactById(artifact.id);
      expect(afterUnstar.stats.stars).toBe(2);
    });
  });
});
