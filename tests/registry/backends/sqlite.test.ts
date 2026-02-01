/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * SQLite Backend Test Suite
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Comprehensive tests for the SQLite registry backend.
 * Tests SQL operations, indexes, WAL mode, and embedded database features.
 *
 * @packageDocumentation
 */

import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { rmSync, existsSync } from 'node:fs';
import { vi } from 'vitest';
import { SQLiteBackend } from '../../../src/registry/backends/sqlite';
import { ArtifactType } from '../../../src/registry/interfaces';

// Mock better-sqlite3
const mockDb = {
  prepare: vi.fn(),
  exec: vi.fn(),
  close: vi.fn(),
  pragma: vi.fn(() => undefined),
  transaction: vi.fn((fn: any) => fn),
};

const mockStatement = {
  run: vi.fn(() => ({ changes: 1, lastInsertRowid: 1 })),
  get: vi.fn(() => null),
  all: vi.fn(() => []),
  pluck: vi.fn(function (this: any) {
    return this;
  }),
};

vi.mock('better-sqlite3', () => ({
  default: vi.fn(() => mockDb),
}));

describe('SQLiteBackend', () => {
  let backend: SQLiteBackend;
  let dbPath: string;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockDb.prepare.mockReturnValue(mockStatement);

    dbPath = join(
      tmpdir(),
      `pcl-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
    );
    backend = new SQLiteBackend({ filename: dbPath });
  });

  afterEach(async () => {
    if (backend.isConnected()) {
      await backend.disconnect();
    }
    if (existsSync(dbPath)) {
      rmSync(dbPath, { force: true });
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

    it('should enable WAL mode by default', async () => {
      await backend.connect();
      expect(mockDb.pragma).toHaveBeenCalledWith('journal_mode = WAL');
    });

    it('should enable foreign keys', async () => {
      await backend.connect();
      expect(mockDb.pragma).toHaveBeenCalledWith('foreign_keys = ON');
    });

    it('should set synchronous mode', async () => {
      await backend.connect();
      expect(mockDb.pragma).toHaveBeenCalledWith('synchronous = NORMAL');
    });

    it('should disable WAL when configured', async () => {
      const backend2 = new SQLiteBackend({ filename: dbPath, wal: false });
      await backend2.connect();
      expect(mockDb.pragma).not.toHaveBeenCalledWith('journal_mode = WAL');
      await backend2.disconnect();
    });

    it('should be idempotent when connecting multiple times', async () => {
      await backend.connect();
      const result = await backend.connect();
      expect(result.ok).toBe(true);
    });

    it('should disconnect successfully', async () => {
      await backend.connect();
      const result = await backend.disconnect();
      expect(result.ok).toBe(true);
      expect(backend.isConnected()).toBe(false);
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const Database = (await import('better-sqlite3')).default;
      vi.mocked(Database).mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });

      const result = await backend.connect();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('CONNECTION_ERROR');
      }
    });

    it('should support in-memory database', async () => {
      const memBackend = new SQLiteBackend({ filename: ':memory:' });
      const result = await memBackend.connect();
      expect(result.ok).toBe(true);
      await memBackend.disconnect();
    });

    it('should respect timeout setting', async () => {
      const backend2 = new SQLiteBackend({
        filename: dbPath,
        timeout: 10000,
      });
      await backend2.connect();
      await backend2.disconnect();
    });

    it('should support verbose logging when enabled', async () => {
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
      const backend2 = new SQLiteBackend({
        filename: dbPath,
        verbose: true,
      });
      await backend2.connect();
      await backend2.disconnect();
      consoleLog.mockRestore();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              CREATE OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Create Operations', () => {
    beforeEach(async () => {
      await backend.connect();
      mockStatement.get.mockReturnValue(null);
    });

    it('should create artifact', async () => {
      mockStatement.get.mockReturnValueOnce({
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
        custom: '{}',
        source: 'persona Test {}',
        downloads: 0,
        stars: 0,
        views: 0,
        last_accessed: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        published: 0,
        deleted: 0,
        tags: '',
        skills: '',
        keywords: '',
      });

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
      expect(mockStatement.run).toHaveBeenCalled();
    });

    it('should create artifact with tags', async () => {
      mockStatement.get.mockReturnValueOnce({
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
        custom: '{}',
        source: 'persona Test {}',
        downloads: 0,
        stars: 0,
        views: 0,
        last_accessed: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        published: 0,
        deleted: 0,
        tags: 'tag1,tag2',
        skills: '',
        keywords: '',
      });

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
      // Should insert tags
      expect(mockStatement.run).toHaveBeenCalledTimes(3); // artifact + 2 tags
    });

    it('should create artifact with skills', async () => {
      mockStatement.get.mockReturnValueOnce({
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
        custom: '{}',
        source: 'persona Test {}',
        downloads: 0,
        stars: 0,
        views: 0,
        last_accessed: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        published: 0,
        deleted: 0,
        tags: '',
        skills: 'skill1,skill2',
        keywords: '',
      });

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
      expect(mockStatement.run).toHaveBeenCalledTimes(3); // artifact + 2 skills
    });

    it('should handle unique constraint violations', async () => {
      mockStatement.run.mockImplementationOnce(() => {
        const error: any = new Error('UNIQUE constraint failed');
        error.message = 'UNIQUE constraint failed';
        throw error;
      });

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
      mockStatement.run.mockImplementationOnce(() => {
        throw new Error('Database error');
      });

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
        custom: '{"key":"value"}',
        source: 'persona Test {}',
        downloads: 10,
        stars: 5,
        views: 20,
        last_accessed: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        published: 1,
        deleted: 0,
        tags: 'tag1,tag2',
        skills: 'skill1',
        keywords: 'keyword1',
      };

      mockStatement.get.mockReturnValueOnce(mockRow);

      const result = await backend.read('test-id');
      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
        expect(result.value.id).toBe('test-id');
        expect(result.value.metadata.name).toBe('Test');
        expect(result.value.metadata.tags).toEqual(['tag1', 'tag2']);
        expect(result.value.metadata.skills).toEqual(['skill1']);
        expect(result.value.published).toBe(true);
        expect(result.value.deleted).toBe(false);
      }
    });

    it('should return null for non-existent artifact', async () => {
      mockStatement.get.mockReturnValueOnce(undefined);

      const result = await backend.read('non-existent');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });

    it('should parse custom metadata correctly', async () => {
      mockStatement.get.mockReturnValueOnce({
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
        custom: '{"customField":"customValue"}',
        source: 'persona Test {}',
        downloads: 0,
        stars: 0,
        views: 0,
        last_accessed: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        published: 0,
        deleted: 0,
        tags: '',
        skills: '',
        keywords: '',
      });

      const result = await backend.read('test-id');
      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
        expect(result.value.metadata.custom).toEqual({
          customField: 'customValue',
        });
      }
    });

    it('should handle read errors', async () => {
      mockStatement.get.mockImplementationOnce(() => {
        throw new Error('Read error');
      });

      const result = await backend.read('test-id');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('REGISTRY_ERROR');
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
        custom: '{}',
        source: 'persona Test {}',
        downloads: 0,
        stars: 0,
        views: 0,
        last_accessed: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        published: 0,
        deleted: 0,
        tags: '',
        skills: '',
        keywords: '',
      };

      mockStatement.get
        .mockReturnValueOnce(existing)
        .mockReturnValueOnce({ ...existing, name: 'Updated' });

      const result = await backend.update('test-id', {
        metadata: { name: 'Updated', version: '1.0.0', tags: [] },
      });

      expect(result.ok).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should fail for non-existent artifact', async () => {
      mockStatement.get.mockReturnValueOnce(undefined);

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
        custom: '{}',
        source: 'persona Test {}',
        downloads: 0,
        stars: 0,
        views: 0,
        last_accessed: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        published: 0,
        deleted: 0,
        tags: '',
        skills: '',
        keywords: '',
      };

      mockStatement.get.mockReturnValue(existing);

      await backend.update('test-id', {
        metadata: { name: 'New Name', description: 'New Desc' },
        published: true,
      });

      // Should prepare a dynamic SQL statement
      expect(mockDb.prepare).toHaveBeenCalled();
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
        custom: '{}',
        source: 'persona Test {}',
        downloads: 0,
        stars: 0,
        views: 0,
        last_accessed: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        published: 0,
        deleted: 0,
        tags: '',
        skills: '',
        keywords: '',
      };

      mockStatement.get.mockReturnValueOnce(existing);
      mockDb.prepare.mockImplementationOnce(() => {
        throw new Error('Update error');
      });

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
      await backend.connect();
    });

    it('should soft delete artifact', async () => {
      mockStatement.run.mockReturnValueOnce({ changes: 1, lastInsertRowid: 0 });

      const result = await backend.delete('test-id');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(true);
      }
    });

    it('should return false when deleting non-existent artifact', async () => {
      mockStatement.run.mockReturnValueOnce({ changes: 0, lastInsertRowid: 0 });

      const result = await backend.delete('non-existent');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(false);
      }
    });

    it('should hard delete (purge) artifact', async () => {
      mockStatement.run.mockReturnValueOnce({ changes: 1, lastInsertRowid: 0 });

      const result = await backend.purge('test-id');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(true);
      }
    });

    it('should handle delete errors', async () => {
      mockStatement.run.mockImplementationOnce(() => {
        throw new Error('Delete error');
      });

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
      await backend.connect();
    });

    it('should begin transaction', async () => {
      const result = await backend.beginTransaction();
      expect(result.ok).toBe(true);
      expect(mockDb.exec).toHaveBeenCalledWith('BEGIN IMMEDIATE');
    });

    it('should commit transaction', async () => {
      const txResult = await backend.beginTransaction();
      expect(txResult.ok).toBe(true);

      if (txResult.ok) {
        const commitResult = await txResult.value.commit();
        expect(commitResult.ok).toBe(true);
        expect(mockDb.exec).toHaveBeenCalledWith('COMMIT');
      }
    });

    it('should rollback transaction', async () => {
      const rollbackFn = vi.fn();
      mockDb.transaction.mockReturnValueOnce(rollbackFn);

      const txResult = await backend.beginTransaction();
      expect(txResult.ok).toBe(true);

      if (txResult.ok) {
        const rollbackResult = await txResult.value.rollback();
        expect(rollbackResult.ok).toBe(true);
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

    it('should handle transaction errors', async () => {
      mockDb.exec.mockImplementationOnce(() => {
        throw new Error('Transaction error');
      });

      const result = await backend.beginTransaction();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('TRANSACTION_ERROR');
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
  //                              PREPARED STATEMENTS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Prepared Statements', () => {
    beforeEach(async () => {
      await backend.connect();
    });

    it('should prepare insert statement', async () => {
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO artifacts')
      );
    });

    it('should prepare insert tag statement', async () => {
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tags')
      );
    });

    it('should prepare insert skill statement', async () => {
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO skills')
      );
    });

    it('should prepare insert keyword statement', async () => {
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO keywords')
      );
    });

    it('should prepare select statement', async () => {
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM artifacts_full')
      );
    });

    it('should prepare soft delete statement', async () => {
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE artifacts SET deleted = 1')
      );
    });

    it('should prepare hard delete statement', async () => {
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM artifacts')
      );
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              TYPE CONVERSIONS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Type Conversions', () => {
    beforeEach(async () => {
      await backend.connect();
    });

    it('should convert boolean fields correctly', async () => {
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
        custom: '{}',
        source: 'persona Test {}',
        downloads: 0,
        stars: 0,
        views: 0,
        last_accessed: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        published: 1,
        deleted: 0,
        tags: '',
        skills: '',
        keywords: '',
      };

      mockStatement.get.mockReturnValueOnce(mockRow);

      const result = await backend.read('test-id');
      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
        expect(result.value.published).toBe(true);
        expect(result.value.deleted).toBe(false);
      }
    });

    it('should convert date fields correctly', async () => {
      const now = new Date();
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
        custom: '{}',
        source: 'persona Test {}',
        downloads: 0,
        stars: 0,
        views: 0,
        last_accessed: now.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        published: 0,
        deleted: 0,
        tags: '',
        skills: '',
        keywords: '',
      };

      mockStatement.get.mockReturnValueOnce(mockRow);

      const result = await backend.read('test-id');
      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
        expect(result.value.createdAt).toBeInstanceOf(Date);
        expect(result.value.updatedAt).toBeInstanceOf(Date);
        expect(result.value.stats.lastAccessed).toBeInstanceOf(Date);
      }
    });

    it('should split comma-separated tags correctly', async () => {
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
        custom: '{}',
        source: 'persona Test {}',
        downloads: 0,
        stars: 0,
        views: 0,
        last_accessed: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        published: 0,
        deleted: 0,
        tags: 'tag1,tag2,tag3',
        skills: '',
        keywords: '',
      };

      mockStatement.get.mockReturnValueOnce(mockRow);

      const result = await backend.read('test-id');
      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
        expect(result.value.metadata.tags).toEqual(['tag1', 'tag2', 'tag3']);
      }
    });

    it('should handle empty comma-separated fields', async () => {
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
        custom: '{}',
        source: 'persona Test {}',
        downloads: 0,
        stars: 0,
        views: 0,
        last_accessed: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        published: 0,
        deleted: 0,
        tags: '',
        skills: '',
        keywords: '',
      };

      mockStatement.get.mockReturnValueOnce(mockRow);

      const result = await backend.read('test-id');
      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
        expect(result.value.metadata.tags).toEqual([]);
        expect(result.value.metadata.skills).toBeUndefined();
      }
    });
  });
});
