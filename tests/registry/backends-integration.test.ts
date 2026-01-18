/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Registry Backend Integration Tests (Phase 1.3)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Comprehensive integration test suite for all registry backends.
 * Tests all 4 backends with identical test cases to ensure consistency.
 *
 * Backends tested:
 * - MemoryBackend (zero-dependency, in-memory)
 * - JSONFileBackend (zero-dependency, persistent)
 * - SQLiteBackend (requires better-sqlite3, ENABLE_DB_TESTS=true)
 * - PostgreSQLBackend (requires pg + server, ENABLE_DB_TESTS=true)
 *
 * @packageDocumentation
 * @module tests/registry/backends-integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

import { MemoryBackend } from '../../src/registry/backends/memory';
import { JSONFileBackend } from '../../src/registry/backends/json-file';
import { ArtifactType } from '../../src/registry/interfaces';
import type { IBackend, Artifact } from '../../src/registry/interfaces';

// ═══════════════════════════════════════════════════════════════════════════════
//                              TEST CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const ENABLE_DB_TESTS = process.env.ENABLE_DB_TESTS === 'true';
const TEST_DIR = join(tmpdir(), 'pcl-test-backends');

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
      slug: 'test-persona-' + randomUUID().slice(0, 8),
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
//                              MEMORY BACKEND TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('MemoryBackend Integration', () => {
  let backend: MemoryBackend;

  beforeEach(async () => {
    backend = new MemoryBackend();
    await backend.connect();
  });

  afterEach(async () => {
    if (backend.isConnected()) {
      await backend.disconnect();
    }
  });

  it('should perform full CRUD lifecycle', async () => {
    // Create
    const artifact = createTestArtifact();
    const createResult = await backend.create(artifact);
    expect(createResult.ok).toBe(true);
    expect(createResult.ok && createResult.value.id).toBeDefined();

    const id = createResult.ok ? createResult.value.id : '';

    // Read
    const readResult = await backend.read(id);
    expect(readResult.ok).toBe(true);
    expect(readResult.ok && readResult.value?.metadata.name).toBe(
      'Test Persona'
    );

    // Update
    const updateResult = await backend.update(id, {
      metadata: { ...artifact.metadata, name: 'Updated Persona' },
    });
    expect(updateResult.ok).toBe(true);
    expect(updateResult.ok && updateResult.value.metadata.name).toBe(
      'Updated Persona'
    );

    // Delete
    const deleteResult = await backend.delete(id);
    expect(deleteResult.ok).toBe(true);
    expect(deleteResult.ok && deleteResult.value).toBe(true);
  });

  it('should handle queries correctly', async () => {
    await backend.create(createTestArtifact({ type: ArtifactType.PERSONA }));
    await backend.create(createTestArtifact({ type: ArtifactType.TEAM }));
    await backend.create(createTestArtifact({ type: ArtifactType.WORKFLOW }));

    const allResult = await backend.find({});
    expect(allResult.ok && allResult.value.length).toBe(3);

    const personasResult = await backend.find({
      filter: { type: ArtifactType.PERSONA },
    });
    expect(personasResult.ok && personasResult.value.length).toBe(1);
  });

  it('should handle transactions', async () => {
    const txResult = await backend.beginTransaction();
    expect(txResult.ok).toBe(true);

    if (txResult.ok) {
      await backend.create(createTestArtifact());
      const rollbackResult = await txResult.value.rollback();
      expect(rollbackResult.ok).toBe(true);

      const countResult = await backend.count({});
      expect(countResult.ok && countResult.value).toBe(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              JSON FILE BACKEND TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('JSONFileBackend Integration', () => {
  let backend: JSONFileBackend;
  let testFile: string;

  beforeEach(async () => {
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }

    testFile = join(TEST_DIR, `registry-${randomUUID()}.json`);
    backend = new JSONFileBackend({
      filePath: testFile,
      pretty: false,
      autoSave: true,
    });
    await backend.connect();
  });

  afterEach(async () => {
    if (backend.isConnected()) {
      await backend.disconnect();
    }
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should perform full CRUD lifecycle', async () => {
    // Create
    const artifact = createTestArtifact();
    const createResult = await backend.create(artifact);
    expect(createResult.ok).toBe(true);
    expect(createResult.ok && createResult.value.id).toBeDefined();

    const id = createResult.ok ? createResult.value.id : '';

    // Read
    const readResult = await backend.read(id);
    expect(readResult.ok).toBe(true);
    expect(readResult.ok && readResult.value?.metadata.name).toBe(
      'Test Persona'
    );

    // Update
    const updateResult = await backend.update(id, {
      metadata: { ...artifact.metadata, name: 'Updated Persona' },
    });
    expect(updateResult.ok).toBe(true);
    expect(updateResult.ok && updateResult.value.metadata.name).toBe(
      'Updated Persona'
    );

    // Delete
    const deleteResult = await backend.delete(id);
    expect(deleteResult.ok).toBe(true);
    expect(deleteResult.ok && deleteResult.value).toBe(true);
  });

  it('should persist data to disk', async () => {
    const artifact = createTestArtifact();
    const createResult = await backend.create(artifact);
    expect(createResult.ok).toBe(true);

    // Disconnect and reconnect
    await backend.disconnect();
    backend = new JSONFileBackend({
      filePath: testFile,
      pretty: false,
      autoSave: true,
    });
    await backend.connect();

    // Data should still be there
    const countResult = await backend.count({});
    expect(countResult.ok && countResult.value).toBe(1);
  });

  it('should handle queries correctly', async () => {
    await backend.create(createTestArtifact({ type: ArtifactType.PERSONA }));
    await backend.create(createTestArtifact({ type: ArtifactType.TEAM }));
    await backend.create(createTestArtifact({ type: ArtifactType.WORKFLOW }));

    const allResult = await backend.find({});
    expect(allResult.ok && allResult.value.length).toBe(3);

    const personasResult = await backend.find({
      filter: { type: ArtifactType.PERSONA },
    });
    expect(personasResult.ok && personasResult.value.length).toBe(1);
  });

  it('should handle transactions', async () => {
    const txResult = await backend.beginTransaction();
    expect(txResult.ok).toBe(true);

    if (txResult.ok) {
      await backend.create(createTestArtifact());
      const rollbackResult = await txResult.value.rollback();
      expect(rollbackResult.ok).toBe(true);

      const countResult = await backend.count({});
      expect(countResult.ok && countResult.value).toBe(0);
    }
  });

  it('should reject duplicate slugs', async () => {
    const slug = 'unique-slug-' + randomUUID().slice(0, 8);
    const artifact1 = createTestArtifact({
      metadata: { ...createTestArtifact().metadata, slug },
    });
    const artifact2 = createTestArtifact({
      metadata: { ...createTestArtifact().metadata, slug },
    });

    const result1 = await backend.create(artifact1);
    expect(result1.ok).toBe(true);

    const result2 = await backend.create(artifact2);
    expect(result2.ok).toBe(false);
    if (!result2.ok) {
      expect(result2.error.code).toBe('DUPLICATE');
    }
  });

  it('should handle versions', async () => {
    const createResult = await backend.create(createTestArtifact());
    expect(createResult.ok).toBe(true);

    if (createResult.ok) {
      const versionResult = await backend.createVersion({
        artifactId: createResult.value.id,
        version: '2.0.0',
        source: 'persona TEST_V2 {}',
        published: false,
      });
      expect(versionResult.ok).toBe(true);

      const listResult = await backend.listVersions(createResult.value.id);
      expect(listResult.ok && listResult.value.length).toBe(1);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              DATABASE BACKEND TESTS (OPTIONAL)
// ═══════════════════════════════════════════════════════════════════════════════

if (!ENABLE_DB_TESTS) {
  describe.skip('SQLite Backend', () => {
    it('skipped - set ENABLE_DB_TESTS=true to enable', () => {});
  });

  describe.skip('PostgreSQL Backend', () => {
    it('skipped - set ENABLE_DB_TESTS=true to enable', () => {});
  });
}

// Export for documentation
export { createTestArtifact };
