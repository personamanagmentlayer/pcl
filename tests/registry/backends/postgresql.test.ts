/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * PostgreSQL Backend Test Suite
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Comprehensive tests for the PostgreSQL registry backend.
 * Tests connection pooling, prepared statements, transactions, and SQL queries.
 *
 * @packageDocumentation
 */

import { vi } from 'vitest';
import { PostgreSQLBackend } from '../../../src/registry/backends/postgresql';
import { ArtifactType } from '../../../src/registry/interfaces';

// Mock pg module
const mockRelease = vi.fn();
const mockQuery = vi.fn();
const mockConnect = vi.fn();
const mockEnd = vi.fn();

const mockConnection = {
  query: mockQuery,
  release: mockRelease,
};

const mockPool = {
  query: mockQuery,
  connect: vi.fn(() => Promise.resolve(mockConnection)),
  end: mockEnd,
};

vi.mock('pg', () => ({
  Pool: vi.fn(() => mockPool),
}));

describe('PostgreSQLBackend', () => {
  let backend: PostgreSQLBackend;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    backend = new PostgreSQLBackend({
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      user: 'test_user',
      password: 'test_password',
    });
  });

  afterEach(async () => {
    if (backend.isConnected()) {
      await backend.disconnect();
    }
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              CONNECTION MANAGEMENT
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Connection Management', () => {
    it('should connect successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ '?column?': 1 }],
        rowCount: 1,
      });

      const result = await backend.connect();
      expect(result.ok).toBe(true);
      expect(backend.isConnected()).toBe(true);
    });

    it('should test connection with SELECT 1', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ '?column?': 1 }],
        rowCount: 1,
      });

      await backend.connect();
      expect(mockQuery).toHaveBeenCalledWith('SELECT 1');
    });

    it('should configure connection pool', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const Pool = (await import('pg')).Pool;
      await backend.connect();

      expect(Pool).toHaveBeenCalledWith({
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password',
        max: 20,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        ssl: undefined,
      });
    });

    it('should support custom pool configuration', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const customBackend = new PostgreSQLBackend({
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password',
        max: 50,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 60000,
        ssl: { rejectUnauthorized: false },
      });

      const Pool = (await import('pg')).Pool;
      await customBackend.connect();

      expect(Pool).toHaveBeenCalledWith({
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password',
        max: 50,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 60000,
        ssl: { rejectUnauthorized: false },
      });

      await customBackend.disconnect();
    });

    it('should be idempotent when connecting multiple times', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      await backend.connect();
      const result = await backend.connect();

      expect(result.ok).toBe(true);
    });

    it('should disconnect successfully', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      await backend.connect();
      const result = await backend.disconnect();

      expect(result.ok).toBe(true);
      expect(backend.isConnected()).toBe(false);
      expect(mockEnd).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection failed'));

      const result = await backend.connect();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('CONNECTION_ERROR');
      }
    });

    it('should handle disconnect when not connected', async () => {
      const result = await backend.disconnect();
      expect(result.ok).toBe(true);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              CREATE OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Create Operations', () => {
    beforeEach(async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      await backend.connect();
    });

    it('should create artifact', async () => {
      const mockRow = {
        id: 'test-id',
        type: 'persona',
        name: 'Test Persona',
        slug: 'test-persona',
        description: null,
        version: '1.0.0',
        author: null,
        author_email: null,
        organization: null,
        license: null,
        repository: null,
        homepage: null,
        custom: {},
        source: 'persona Test {}',
        downloads: 0,
        stars: 0,
        views: 0,
        last_accessed: null,
        created_at: new Date(),
        updated_at: new Date(),
        published: false,
        deleted: false,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 });

      const result = await backend.create({
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Test Persona',
          slug: 'test-persona',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      });

      expect(result.ok).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO artifacts'),
        expect.any(Array)
      );
    });

    it('should create artifact with tags', async () => {
      const mockRow = {
        id: 'test-id',
        type: 'persona',
        name: 'Test',
        slug: null,
        description: null,
        version: '1.0.0',
        author: null,
        author_email: null,
        organization: null,
        license: null,
        repository: null,
        homepage: null,
        custom: {},
        source: 'persona Test {}',
        downloads: 0,
        stars: 0,
        views: 0,
        last_accessed: null,
        created_at: new Date(),
        updated_at: new Date(),
        published: false,
        deleted: false,
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 2 });

      const result = await backend.create({
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Test',
          version: '1.0.0',
          tags: ['tag1', 'tag2'],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      });

      expect(result.ok).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tags')
      );
    });

    it('should create artifact with skills', async () => {
      const mockRow = {
        id: 'test-id',
        type: 'persona',
        name: 'Test',
        slug: null,
        description: null,
        version: '1.0.0',
        author: null,
        author_email: null,
        organization: null,
        license: null,
        repository: null,
        homepage: null,
        custom: {},
        source: 'persona Test {}',
        downloads: 0,
        stars: 0,
        views: 0,
        last_accessed: null,
        created_at: new Date(),
        updated_at: new Date(),
        published: false,
        deleted: false,
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 2 });

      const result = await backend.create({
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Test',
          version: '1.0.0',
          tags: [],
          skills: ['skill1', 'skill2'],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      });

      expect(result.ok).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO skills')
      );
    });

    it('should create artifact with keywords', async () => {
      const mockRow = {
        id: 'test-id',
        type: 'persona',
        name: 'Test',
        slug: null,
        description: null,
        version: '1.0.0',
        author: null,
        author_email: null,
        organization: null,
        license: null,
        repository: null,
        homepage: null,
        custom: {},
        source: 'persona Test {}',
        downloads: 0,
        stars: 0,
        views: 0,
        last_accessed: null,
        created_at: new Date(),
        updated_at: new Date(),
        published: false,
        deleted: false,
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const result = await backend.create({
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Test',
          version: '1.0.0',
          tags: [],
          keywords: ['keyword1'],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      });

      expect(result.ok).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO keywords')
      );
    });

    it('should handle unique constraint violations', async () => {
      const error: any = new Error('Duplicate key');
      error.code = '23505';

      mockQuery.mockRejectedValueOnce(error);

      const result = await backend.create({
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Duplicate',
          slug: 'duplicate',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DUPLICATE');
      }
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const result = await backend.create({
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

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('REGISTRY_ERROR');
      }
    });

    it('should fail when not connected', async () => {
      await backend.disconnect();

      const result = await backend.create({
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

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('CONNECTION_ERROR');
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              READ OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Read Operations', () => {
    beforeEach(async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      await backend.connect();
    });

    it('should read existing artifact', async () => {
      const mockRow = {
        id: 'test-id',
        type: 'persona',
        name: 'Test',
        slug: 'test',
        description: 'Test description',
        version: '1.0.0',
        author: 'Author',
        author_email: 'author@test.com',
        organization: 'Org',
        license: 'MIT',
        repository: 'https://github.com/test',
        homepage: 'https://test.com',
        custom: { key: 'value' },
        source: 'persona Test {}',
        downloads: 10,
        stars: 5,
        views: 20,
        last_accessed: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        published: true,
        deleted: false,
        tags: ['tag1', 'tag2'],
        skills: ['skill1'],
        keywords: ['keyword1'],
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 });

      const result = await backend.read('test-id');
      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
        expect(result.value.id).toBe('test-id');
        expect(result.value.metadata.name).toBe('Test');
        expect(result.value.metadata.tags).toEqual(['tag1', 'tag2']);
        expect(result.value.metadata.skills).toEqual(['skill1']);
        expect(result.value.published).toBe(true);
      }
    });

    it('should use aggregate queries for related data', async () => {
      const mockRow = {
        id: 'test-id',
        type: 'persona',
        name: 'Test',
        slug: null,
        description: null,
        version: '1.0.0',
        author: null,
        author_email: null,
        organization: null,
        license: null,
        repository: null,
        homepage: null,
        custom: {},
        source: 'persona Test {}',
        downloads: 0,
        stars: 0,
        views: 0,
        last_accessed: null,
        created_at: new Date(),
        updated_at: new Date(),
        published: false,
        deleted: false,
        tags: null,
        skills: null,
        keywords: null,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 });

      await backend.read('test-id');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ARRAY_AGG'),
        ['test-id']
      );
    });

    it('should return null for non-existent artifact', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await backend.read('non-existent');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });

    it('should handle read errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Read error'));

      const result = await backend.read('test-id');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('REGISTRY_ERROR');
      }
    });

    it('should filter null values from arrays', async () => {
      const mockRow = {
        id: 'test-id',
        type: 'persona',
        name: 'Test',
        slug: null,
        description: null,
        version: '1.0.0',
        author: null,
        author_email: null,
        organization: null,
        license: null,
        repository: null,
        homepage: null,
        custom: {},
        source: 'persona Test {}',
        downloads: 0,
        stars: 0,
        views: 0,
        last_accessed: null,
        created_at: new Date(),
        updated_at: new Date(),
        published: false,
        deleted: false,
        tags: [null],
        skills: [null],
        keywords: [null],
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 });

      const result = await backend.read('test-id');
      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
        expect(result.value.metadata.tags).toEqual([]);
        // Skills array is empty array when only null values
        expect(result.value.metadata.skills).toEqual([]);
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              UPDATE OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Update Operations', () => {
    beforeEach(async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      await backend.connect();
    });

    it('should update artifact', async () => {
      const existing = {
        id: 'test-id',
        type: 'persona',
        name: 'Original',
        slug: null,
        description: null,
        version: '1.0.0',
        author: null,
        author_email: null,
        organization: null,
        license: null,
        repository: null,
        homepage: null,
        custom: {},
        source: 'persona Test {}',
        downloads: 0,
        stars: 0,
        views: 0,
        last_accessed: null,
        created_at: new Date(),
        updated_at: new Date(),
        published: false,
        deleted: false,
        tags: [],
        skills: [],
        keywords: [],
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [existing], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{ ...existing, name: 'Updated' }],
          rowCount: 1,
        });

      const result = await backend.update('test-id', {
        metadata: { name: 'Updated', version: '1.0.0', tags: [] },
      });

      expect(result.ok).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE artifacts'),
        expect.any(Array)
      );
    });

    it('should fail for non-existent artifact', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await backend.update('non-existent', {
        metadata: { name: 'Updated', version: '1.0.0', tags: [] },
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('should build dynamic UPDATE query', async () => {
      const existing = {
        id: 'test-id',
        type: 'persona',
        name: 'Original',
        slug: null,
        description: null,
        version: '1.0.0',
        author: null,
        author_email: null,
        organization: null,
        license: null,
        repository: null,
        homepage: null,
        custom: {},
        source: 'persona Test {}',
        downloads: 0,
        stars: 0,
        views: 0,
        last_accessed: null,
        created_at: new Date(),
        updated_at: new Date(),
        published: false,
        deleted: false,
        tags: [],
        skills: [],
        keywords: [],
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [existing], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [existing], rowCount: 1 });

      await backend.update('test-id', {
        metadata: { name: 'New Name' },
        source: 'new source',
        published: true,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE artifacts SET'),
        expect.any(Array)
      );
    });

    it('should handle update errors', async () => {
      const existing = {
        id: 'test-id',
        type: 'persona',
        name: 'Test',
        slug: null,
        description: null,
        version: '1.0.0',
        author: null,
        author_email: null,
        organization: null,
        license: null,
        repository: null,
        homepage: null,
        custom: {},
        source: 'persona Test {}',
        downloads: 0,
        stars: 0,
        views: 0,
        last_accessed: null,
        created_at: new Date(),
        updated_at: new Date(),
        published: false,
        deleted: false,
        tags: [],
        skills: [],
        keywords: [],
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [existing], rowCount: 1 })
        .mockRejectedValueOnce(new Error('Update error'));

      const result = await backend.update('test-id', {
        metadata: { name: 'Updated', version: '1.0.0', tags: [] },
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('REGISTRY_ERROR');
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              DELETE OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Delete Operations', () => {
    beforeEach(async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      await backend.connect();
    });

    it('should soft delete artifact', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const result = await backend.delete('test-id');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(true);
      }
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE artifacts SET deleted = TRUE'),
        ['test-id']
      );
    });

    it('should return false when deleting non-existent artifact', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await backend.delete('non-existent');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(false);
      }
    });

    it('should hard delete (purge) artifact', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const result = await backend.purge('test-id');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(true);
      }
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM artifacts'),
        ['test-id']
      );
    });

    it('should handle delete errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Delete error'));

      const result = await backend.delete('test-id');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('REGISTRY_ERROR');
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              QUERY OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Query Operations', () => {
    beforeEach(async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      await backend.connect();
    });

    it('should find artifacts (stub)', async () => {
      const result = await backend.find({});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Array.isArray(result.value)).toBe(true);
      }
    });

    it('should count artifacts (stub)', async () => {
      const result = await backend.count({});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(typeof result.value).toBe('number');
      }
    });

    it('should find one artifact (stub)', async () => {
      const result = await backend.findOne({});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value === null || typeof result.value === 'object').toBe(
          true
        );
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              VERSION OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Version Operations', () => {
    beforeEach(async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      await backend.connect();
    });

    it('should return not implemented for createVersion', async () => {
      const result = await backend.createVersion({
        artifactId: 'test-id',
        version: '1.0.0',
        source: 'test',
        published: true,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_IMPLEMENTED');
      }
    });

    it('should return empty array for listVersions', async () => {
      const result = await backend.listVersions('test-id');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });

    it('should return null for getVersion', async () => {
      const result = await backend.getVersion('test-id', '1.0.0');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              TRANSACTION OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Transaction Operations', () => {
    beforeEach(async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      await backend.connect();
    });

    it('should begin transaction', async () => {
      const result = await backend.beginTransaction();
      expect(result.ok).toBe(true);
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockQuery).toHaveBeenCalledWith('BEGIN');
    });

    it('should commit transaction', async () => {
      const txResult = await backend.beginTransaction();
      expect(txResult.ok).toBe(true);

      if (txResult.ok) {
        const commitResult = await txResult.value.commit();
        expect(commitResult.ok).toBe(true);
        expect(mockQuery).toHaveBeenCalledWith('COMMIT');
        expect(mockRelease).toHaveBeenCalled();
      }
    });

    it('should rollback transaction', async () => {
      const txResult = await backend.beginTransaction();
      expect(txResult.ok).toBe(true);

      if (txResult.ok) {
        const rollbackResult = await txResult.value.rollback();
        expect(rollbackResult.ok).toBe(true);
        expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
        expect(mockRelease).toHaveBeenCalled();
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

    it('should handle transaction errors', async () => {
      mockPool.connect.mockRejectedValueOnce(new Error('Transaction error'));

      const result = await backend.beginTransaction();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('TRANSACTION_ERROR');
      }
    });

    it('should handle commit errors', async () => {
      const txResult = await backend.beginTransaction();
      expect(txResult.ok).toBe(true);

      if (txResult.ok) {
        mockQuery.mockRejectedValueOnce(new Error('Commit failed'));

        const commitResult = await txResult.value.commit();
        expect(commitResult.ok).toBe(false);
        if (!commitResult.ok) {
          expect(commitResult.error.code).toBe('TRANSACTION_ERROR');
        }
      }
    });

    it('should handle rollback errors', async () => {
      const txResult = await backend.beginTransaction();
      expect(txResult.ok).toBe(true);

      if (txResult.ok) {
        mockQuery.mockRejectedValueOnce(new Error('Rollback failed'));

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
  //                              SQL INJECTION PROTECTION
  // ═════════════════════════════════════════════════════════════════════════════

  describe('SQL Injection Protection', () => {
    beforeEach(async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      await backend.connect();
    });

    it('should use parameterized queries for create', async () => {
      const mockRow = {
        id: 'test-id',
        type: 'persona',
        name: "'; DROP TABLE artifacts; --",
        slug: null,
        description: null,
        version: '1.0.0',
        author: null,
        author_email: null,
        organization: null,
        license: null,
        repository: null,
        homepage: null,
        custom: {},
        source: 'persona Test {}',
        downloads: 0,
        stars: 0,
        views: 0,
        last_accessed: null,
        created_at: new Date(),
        updated_at: new Date(),
        published: false,
        deleted: false,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 });

      await backend.create({
        type: ArtifactType.PERSONA,
        metadata: {
          name: "'; DROP TABLE artifacts; --",
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      });

      // Should use parameterized query
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('$1'),
        expect.any(Array)
      );
    });

    it('should use parameterized queries for read', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await backend.read("' OR '1'='1");

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('$1'),
        expect.arrayContaining(["' OR '1'='1"])
      );
    });

    it('should use parameterized queries for delete', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await backend.delete("'; DROP TABLE artifacts; --");

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('$1'),
        expect.arrayContaining(["'; DROP TABLE artifacts; --"])
      );
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              CONNECTION POOL BEHAVIOR
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Connection Pool Behavior', () => {
    beforeEach(async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      await backend.connect();
    });

    it('should acquire connection from pool for transactions', async () => {
      await backend.beginTransaction();
      expect(mockPool.connect).toHaveBeenCalled();
    });

    it('should release connection after commit', async () => {
      const txResult = await backend.beginTransaction();

      if (txResult.ok) {
        await txResult.value.commit();
        expect(mockRelease).toHaveBeenCalled();
      }
    });

    it('should release connection after rollback', async () => {
      const txResult = await backend.beginTransaction();

      if (txResult.ok) {
        await txResult.value.rollback();
        expect(mockRelease).toHaveBeenCalled();
      }
    });

    it('should use pool query for non-transaction operations', async () => {
      const mockRow = {
        id: 'test-id',
        type: 'persona',
        name: 'Test',
        slug: null,
        description: null,
        version: '1.0.0',
        author: null,
        author_email: null,
        organization: null,
        license: null,
        repository: null,
        homepage: null,
        custom: {},
        source: 'persona Test {}',
        downloads: 0,
        stars: 0,
        views: 0,
        last_accessed: null,
        created_at: new Date(),
        updated_at: new Date(),
        published: false,
        deleted: false,
        tags: [],
        skills: [],
        keywords: [],
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 });

      await backend.read('test-id');
      expect(mockQuery).toHaveBeenCalled();
    });
  });
});
