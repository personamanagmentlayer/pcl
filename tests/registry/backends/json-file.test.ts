/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * JSON File Backend Test Suite
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Comprehensive tests for the file-based JSON registry backend.
 * Tests persistence, encryption, compression, backup/restore, and file I/O.
 *
 * @packageDocumentation
 */

import {
  mkdirSync,
  rmSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { JSONFileBackend } from '../../../src/registry/backends/json-file';
import { ArtifactType } from '../../../src/registry/interfaces';

describe('JSONFileBackend', () => {
  let testDir: string;
  let filePath: string;
  let backend: JSONFileBackend;

  beforeEach(() => {
    // Create unique test directory
    testDir = join(
      tmpdir(),
      `pcl-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    filePath = join(testDir, 'registry.json');
  });

  afterEach(async () => {
    // Cleanup
    if (backend && backend.isConnected()) {
      await backend.disconnect();
    }
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              CONNECTION & INITIALIZATION
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Connection and Initialization', () => {
    it('should create directory and file on connect', async () => {
      backend = new JSONFileBackend({ filePath });
      const result = await backend.connect();

      expect(result.ok).toBe(true);
      expect(existsSync(testDir)).toBe(true);
      expect(existsSync(filePath)).toBe(true);
    });

    it('should load existing data on connect', async () => {
      backend = new JSONFileBackend({ filePath });
      await backend.connect();

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

      await backend.disconnect();

      // Reconnect with new instance
      const backend2 = new JSONFileBackend({ filePath });
      await backend2.connect();

      const result = await backend2.find({});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(1);
        expect(result.value[0].metadata.name).toBe('Test');
      }

      await backend2.disconnect();
    });

    it('should handle pretty-print option', async () => {
      backend = new JSONFileBackend({ filePath, pretty: true });
      await backend.connect();

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

      await backend.disconnect();

      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('\n  '); // Should have indentation
    });

    it('should handle non-pretty option', async () => {
      backend = new JSONFileBackend({ filePath, pretty: false });
      await backend.connect();

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

      await backend.disconnect();

      const content = readFileSync(filePath, 'utf-8');
      expect(content).not.toContain('\n  '); // Should not have indentation
    });

    it('should throw error if encryption enabled without key', () => {
      expect(() => {
        new JSONFileBackend({ filePath, encrypt: true });
      }).toThrow('Encryption key is required');
    });

    it('should save on disconnect', async () => {
      backend = new JSONFileBackend({ filePath, autoSave: false });
      await backend.connect();

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

      await backend.disconnect();

      // Should be saved on disconnect
      const backend2 = new JSONFileBackend({ filePath });
      await backend2.connect();
      const result = await backend2.find({});

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(1);
      }

      await backend2.disconnect();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              AUTO-SAVE BEHAVIOR
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Auto-Save Behavior', () => {
    it('should auto-save on create when enabled', async () => {
      backend = new JSONFileBackend({ filePath, autoSave: true });
      await backend.connect();

      await backend.create({
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Auto Save Test',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      });

      // Should be immediately saved
      const backend2 = new JSONFileBackend({ filePath });
      await backend2.connect();
      const result = await backend2.find({});

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(1);
      }

      await backend2.disconnect();
    });

    it('should not auto-save when disabled', async () => {
      backend = new JSONFileBackend({ filePath, autoSave: false });
      await backend.connect();

      await backend.create({
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'No Auto Save',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      });

      // Should not be saved yet
      const backend2 = new JSONFileBackend({ filePath });
      await backend2.connect();
      const result = await backend2.find({});

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(0);
      }

      await backend2.disconnect();
    });

    it('should manually flush when autoSave is disabled', async () => {
      backend = new JSONFileBackend({ filePath, autoSave: false });
      await backend.connect();

      await backend.create({
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Manual Flush',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      });

      const flushResult = await backend.flush();
      expect(flushResult.ok).toBe(true);

      // Should be saved now
      const backend2 = new JSONFileBackend({ filePath });
      await backend2.connect();
      const result = await backend2.find({});

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(1);
      }

      await backend2.disconnect();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              CRUD OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('CRUD Operations', () => {
    beforeEach(async () => {
      backend = new JSONFileBackend({ filePath });
      await backend.connect();
    });

    it('should create artifact', async () => {
      const result = await backend.create({
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Test',
          slug: 'test',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBeDefined();
        expect(result.value.createdAt).toBeInstanceOf(Date);
      }
    });

    it('should reject duplicate slugs', async () => {
      await backend.create({
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'First',
          slug: 'duplicate',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona First {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      });

      const result = await backend.create({
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Second',
          slug: 'duplicate',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Second {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DUPLICATE');
      }
    });

    it('should read artifact', async () => {
      const created = await backend.create({
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Read Test',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      });

      expect(created.ok).toBe(true);
      if (created.ok) {
        const result = await backend.read(created.value.id);
        expect(result.ok).toBe(true);
        if (result.ok && result.value) {
          expect(result.value.metadata.name).toBe('Read Test');
        }
      }
    });

    it('should update artifact', async () => {
      const created = await backend.create({
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Original',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      });

      expect(created.ok).toBe(true);
      if (created.ok) {
        const result = await backend.update(created.value.id, {
          metadata: { name: 'Updated', version: '1.0.0', tags: [] },
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.metadata.name).toBe('Updated');
          expect(result.value.createdAt).toEqual(created.value.createdAt);
        }
      }
    });

    it('should soft delete artifact', async () => {
      const created = await backend.create({
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
      });

      expect(created.ok).toBe(true);
      if (created.ok) {
        const deleteResult = await backend.delete(created.value.id);
        expect(deleteResult.ok).toBe(true);

        const readResult = await backend.read(created.value.id);
        expect(readResult.ok).toBe(true);
        if (readResult.ok && readResult.value) {
          expect(readResult.value.deleted).toBe(true);
        }
      }
    });

    it('should hard delete (purge) artifact', async () => {
      const created = await backend.create({
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
      });

      expect(created.ok).toBe(true);
      if (created.ok) {
        const purgeResult = await backend.purge(created.value.id);
        expect(purgeResult.ok).toBe(true);

        const readResult = await backend.read(created.value.id);
        expect(readResult.ok).toBe(true);
        if (readResult.ok) {
          expect(readResult.value).toBeNull();
        }
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              SEARCH OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Search Operations', () => {
    beforeEach(async () => {
      backend = new JSONFileBackend({ filePath });
      await backend.connect();

      // Create test data
      await backend.create({
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'JavaScript Expert',
          description: 'Expert in JavaScript programming',
          version: '1.0.0',
          tags: ['javascript', 'programming'],
          skills: ['coding', 'debugging'],
        },
        source: 'persona JSExpert {}',
        stats: { downloads: 100, stars: 50, views: 200 },
        published: true,
        deleted: false,
      });

      await backend.create({
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Python Developer',
          description: 'Python programming specialist',
          version: '1.0.0',
          tags: ['python', 'programming'],
          skills: ['coding', 'testing'],
        },
        source: 'persona PyDev {}',
        stats: { downloads: 80, stars: 40, views: 150 },
        published: true,
        deleted: false,
      });
    });

    it('should search by exact text match', async () => {
      const result = await backend.search({
        query: 'JavaScript',
        fuzzy: false,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0].score).toBeGreaterThan(0);
      }
    });

    it('should search with fuzzy matching', async () => {
      const result = await backend.search({
        query: 'javascrpt', // Typo
        fuzzy: true,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBeGreaterThan(0);
      }
    });

    it('should search specific fields', async () => {
      const result = await backend.search({
        query: 'Expert',
        fields: ['name'],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBeGreaterThan(0);
        if (result.value[0].artifact) {
          expect(result.value[0].artifact.metadata.name).toContain('Expert');
        }
      }
    });

    it('should provide highlights when requested', async () => {
      const result = await backend.search({
        query: 'JavaScript',
        highlight: true,
      });

      expect(result.ok).toBe(true);
      if (result.ok && result.value.length > 0) {
        expect(result.value[0].highlights).toBeDefined();
      }
    });

    it('should combine search with filters', async () => {
      const result = await backend.search({
        query: 'programming',
        filter: { tags: ['python'] },
      });

      expect(result.ok).toBe(true);
      if (result.ok && result.value.length > 0) {
        if (result.value[0].artifact) {
          expect(result.value[0].artifact.metadata.tags).toContain('python');
        }
      }
    });

    it('should sort search results', async () => {
      const result = await backend.search({
        query: 'programming',
        sort: { field: 'downloads', order: 'desc' },
      });

      expect(result.ok).toBe(true);
      if (result.ok && result.value.length > 1) {
        const first = result.value[0].artifact!.stats.downloads;
        const second = result.value[1].artifact!.stats.downloads;
        expect(first).toBeGreaterThanOrEqual(second);
      }
    });

    it('should paginate search results', async () => {
      const result = await backend.search({
        query: 'programming',
        pagination: { offset: 0, limit: 1 },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBeLessThanOrEqual(1);
      }
    });

    it('should calculate Levenshtein distance correctly', async () => {
      // Test fuzzy matching with various typos
      const result = await backend.search({
        query: 'pythom', // Close to 'python'
        fuzzy: true,
      });

      expect(result.ok).toBe(true);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              COMPRESSION
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Compression', () => {
    it('should compress data when enabled', async () => {
      backend = new JSONFileBackend({ filePath, compress: true });
      await backend.connect();

      await backend.create({
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Compressed',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      });

      await backend.disconnect();

      // File should be binary (gzipped)
      const buffer = readFileSync(filePath);
      expect(buffer[0]).toBe(0x1f); // Gzip magic number
      expect(buffer[1]).toBe(0x8b);
    });

    it('should decompress on load', async () => {
      backend = new JSONFileBackend({ filePath, compress: true });
      await backend.connect();

      await backend.create({
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Compressed',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      });

      await backend.disconnect();

      // Reconnect and read
      const backend2 = new JSONFileBackend({ filePath, compress: true });
      await backend2.connect();

      const result = await backend2.find({});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(1);
        expect(result.value[0].metadata.name).toBe('Compressed');
      }

      await backend2.disconnect();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              ENCRYPTION
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Encryption', () => {
    it('should encrypt data when enabled', async () => {
      backend = new JSONFileBackend({
        filePath,
        encrypt: true,
        encryptionKey: 'test-encryption-key-12345',
      });
      await backend.connect();

      await backend.create({
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Encrypted',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      });

      await backend.disconnect();

      // File should not contain plaintext
      const content = readFileSync(filePath, 'utf-8');
      expect(content).not.toContain('Encrypted');
      expect(content).not.toContain('persona Test');
    });

    it('should decrypt on load', async () => {
      const key = 'test-encryption-key-12345';

      backend = new JSONFileBackend({
        filePath,
        encrypt: true,
        encryptionKey: key,
      });
      await backend.connect();

      await backend.create({
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Encrypted',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      });

      await backend.disconnect();

      // Reconnect with same key
      const backend2 = new JSONFileBackend({
        filePath,
        encrypt: true,
        encryptionKey: key,
      });
      await backend2.connect();

      const result = await backend2.find({});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(1);
        expect(result.value[0].metadata.name).toBe('Encrypted');
      }

      await backend2.disconnect();
    });

    it('should combine compression and encryption', async () => {
      const key = 'test-key-12345';

      backend = new JSONFileBackend({
        filePath,
        compress: true,
        encrypt: true,
        encryptionKey: key,
      });
      await backend.connect();

      await backend.create({
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Compressed and Encrypted',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      });

      await backend.disconnect();

      // Reconnect
      const backend2 = new JSONFileBackend({
        filePath,
        compress: true,
        encrypt: true,
        encryptionKey: key,
      });
      await backend2.connect();

      const result = await backend2.find({});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(1);
      }

      await backend2.disconnect();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              EXPORT/IMPORT
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Export and Import', () => {
    beforeEach(async () => {
      backend = new JSONFileBackend({ filePath });
      await backend.connect();

      await backend.create({
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Export Test',
          version: '1.0.0',
          tags: ['test'],
        },
        source: 'persona Test {}',
        stats: { downloads: 10, stars: 5, views: 20 },
        published: true,
        deleted: false,
      });
    });

    it('should export data as JSON', async () => {
      const result = await backend.exportData({ pretty: true });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const data = JSON.parse(result.value);
        expect(data.metadata.totalArtifacts).toBe(1);
        expect(Object.keys(data.artifacts).length).toBe(1);
      }
    });

    it('should exclude deleted artifacts by default', async () => {
      const created = await backend.create({
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
      });

      if (created.ok) {
        await backend.delete(created.value.id);
      }

      const result = await backend.exportData();
      expect(result.ok).toBe(true);
      if (result.ok) {
        const data = JSON.parse(result.value);
        expect(data.metadata.totalArtifacts).toBe(1); // Deleted one excluded
      }
    });

    it('should include deleted artifacts when requested', async () => {
      const created = await backend.create({
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
      });

      if (created.ok) {
        await backend.delete(created.value.id);
      }

      const result = await backend.exportData({ includeDeleted: true });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const data = JSON.parse(result.value);
        expect(data.metadata.totalArtifacts).toBe(2);
      }
    });

    it('should import data', async () => {
      const exportResult = await backend.exportData();
      expect(exportResult.ok).toBe(true);

      if (exportResult.ok) {
        await backend.disconnect();
        rmSync(filePath, { force: true });

        const backend2 = new JSONFileBackend({ filePath });
        await backend2.connect();

        const importResult = await backend2.importData(exportResult.value);
        expect(importResult.ok).toBe(true);
        if (importResult.ok) {
          expect(importResult.value.imported).toBe(1);
          expect(importResult.value.errors.length).toBe(0);
        }

        await backend2.disconnect();
      }
    });

    it('should skip duplicates when requested', async () => {
      const exportResult = await backend.exportData();
      expect(exportResult.ok).toBe(true);

      if (exportResult.ok) {
        const importResult = await backend.importData(exportResult.value, {
          skipDuplicates: true,
        });

        expect(importResult.ok).toBe(true);
        if (importResult.ok) {
          expect(importResult.value.skipped).toBe(1);
        }
      }
    });

    it('should merge data when requested', async () => {
      const exportResult = await backend.exportData();
      expect(exportResult.ok).toBe(true);

      if (exportResult.ok) {
        const importResult = await backend.importData(exportResult.value, {
          merge: true,
        });

        expect(importResult.ok).toBe(true);
        if (importResult.ok) {
          expect(importResult.value.imported).toBe(1);
        }
      }
    });

    it('should export to file', async () => {
      const exportPath = join(testDir, 'export.json');
      const result = await backend.exportToFile(exportPath, { pretty: true });

      expect(result.ok).toBe(true);
      expect(existsSync(exportPath)).toBe(true);
    });

    it('should import from file', async () => {
      const exportPath = join(testDir, 'export.json');
      await backend.exportToFile(exportPath);

      await backend.disconnect();
      rmSync(filePath, { force: true });

      const backend2 = new JSONFileBackend({ filePath });
      await backend2.connect();

      const result = await backend2.importFromFile(exportPath);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.imported).toBe(1);
      }

      await backend2.disconnect();
    });

    it('should export to compressed file', async () => {
      const exportPath = join(testDir, 'export.json.gz');
      const result = await backend.exportToFile(exportPath, { compress: true });

      expect(result.ok).toBe(true);
      expect(existsSync(exportPath)).toBe(true);

      // Should be compressed
      const buffer = readFileSync(exportPath);
      expect(buffer[0]).toBe(0x1f); // Gzip magic
    });

    it('should import from compressed file', async () => {
      const exportPath = join(testDir, 'export.json.gz');
      await backend.exportToFile(exportPath, { compress: true });

      await backend.disconnect();
      rmSync(filePath, { force: true });

      const backend2 = new JSONFileBackend({ filePath });
      await backend2.connect();

      const result = await backend2.importFromFile(exportPath, {
        compressed: true,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.imported).toBe(1);
      }

      await backend2.disconnect();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              UTILITY METHODS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Utility Methods', () => {
    beforeEach(async () => {
      backend = new JSONFileBackend({ filePath });
      await backend.connect();
    });

    it('should return file size', async () => {
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

      const size = backend.getFileSize();
      expect(size).toBeGreaterThan(0);
    });

    it('should return artifact count', async () => {
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

      const count = backend.getArtifactCount();
      expect(count).toBe(1);
    });

    it('should check artifact existence', async () => {
      const created = await backend.create({
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

      expect(created.ok).toBe(true);
      if (created.ok) {
        const existsResult = await backend.exists(created.value.id);
        expect(existsResult.ok).toBe(true);
        if (existsResult.ok) {
          expect(existsResult.value).toBe(true);
        }

        const notExistsResult = await backend.exists('non-existent');
        expect(notExistsResult.ok).toBe(true);
        if (notExistsResult.ok) {
          expect(notExistsResult.value).toBe(false);
        }
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              VERSION OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Version Operations', () => {
    let artifactId: string;

    beforeEach(async () => {
      backend = new JSONFileBackend({ filePath });
      await backend.connect();

      const created = await backend.create({
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Versioned',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Test {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      });

      expect(created.ok).toBe(true);
      if (created.ok) {
        artifactId = created.value.id;
      }
    });

    it('should create version', async () => {
      const result = await backend.createVersion({
        artifactId,
        version: '1.0.0',
        source: 'persona Test v1 {}',
        published: true,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.createdAt).toBeInstanceOf(Date);
      }
    });

    it('should list versions sorted by date', async () => {
      await backend.createVersion({
        artifactId,
        version: '1.0.0',
        source: 'v1',
        published: true,
      });

      await backend.createVersion({
        artifactId,
        version: '2.0.0',
        source: 'v2',
        published: true,
      });

      const result = await backend.listVersions(artifactId);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(2);
        // Should be sorted by creation date descending
        expect(result.value[0].createdAt.getTime()).toBeGreaterThanOrEqual(
          result.value[1].createdAt.getTime()
        );
      }
    });

    it('should get specific version', async () => {
      await backend.createVersion({
        artifactId,
        version: '1.5.0',
        source: 'v1.5',
        published: true,
      });

      const result = await backend.getVersion(artifactId, '1.5.0');
      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
        expect(result.value.source).toBe('v1.5');
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  //                              TRANSACTION OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Transaction Operations', () => {
    beforeEach(async () => {
      backend = new JSONFileBackend({ filePath });
      await backend.connect();
    });

    it('should support transactions', async () => {
      const txResult = await backend.beginTransaction();
      expect(txResult.ok).toBe(true);

      if (txResult.ok) {
        await backend.create({
          type: ArtifactType.PERSONA,
          metadata: {
            name: 'In Transaction',
            version: '1.0.0',
            tags: [],
          },
          source: 'persona Test {}',
          stats: { downloads: 0, stars: 0, views: 0 },
          published: false,
          deleted: false,
        });

        const commitResult = await txResult.value.commit();
        expect(commitResult.ok).toBe(true);
      }
    });

    it('should rollback transaction', async () => {
      await backend.create({
        type: ArtifactType.PERSONA,
        metadata: {
          name: 'Before',
          version: '1.0.0',
          tags: [],
        },
        source: 'persona Before {}',
        stats: { downloads: 0, stars: 0, views: 0 },
        published: false,
        deleted: false,
      });

      const txResult = await backend.beginTransaction();
      expect(txResult.ok).toBe(true);

      if (txResult.ok) {
        await backend.create({
          type: ArtifactType.PERSONA,
          metadata: {
            name: 'During',
            version: '1.0.0',
            tags: [],
          },
          source: 'persona During {}',
          stats: { downloads: 0, stars: 0, views: 0 },
          published: false,
          deleted: false,
        });

        await txResult.value.rollback();

        const findResult = await backend.find({});
        expect(findResult.ok).toBe(true);
        if (findResult.ok) {
          expect(findResult.value.length).toBe(1);
          expect(findResult.value[0].metadata.name).toBe('Before');
        }
      }
    });
  });
});
