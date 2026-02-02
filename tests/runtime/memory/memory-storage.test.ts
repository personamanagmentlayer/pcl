/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Memory Storage Comprehensive Tests
 * Target: 64.36% → 90%+ coverage (~160 untested lines)
 *
 * Focus Areas:
 * - Storage operations (save, load, delete)
 * - Memory decay over time
 * - Cleanup of expired memories
 * - Storage capacity limits
 * - Compression/optimization
 * - Error recovery
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { MemoryStorage } from '../../../src/runtime/memory/memory-storage.js';
import { existsSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

describe('MemoryStorage', () => {
  const TEST_DISK_PATH = './.pcl/test-memory';

  afterEach(() => {
    // Cleanup test directories
    if (existsSync(TEST_DISK_PATH)) {
      rmSync(TEST_DISK_PATH, { recursive: true, force: true });
    }
  });

  describe('Construction & Configuration', () => {
    it('should create storage with default config', () => {
      const storage = new MemoryStorage({ persistToDisk: false });
      expect(storage).toBeDefined();
    });

    it('should create storage with custom config', () => {
      const storage = new MemoryStorage({
        enabled: true,
        maxEntries: 100,
        ttl: 1000,
        persistToDisk: false,
        importanceDecay: false,
      });
      expect(storage).toBeDefined();
    });

    it('should load existing memories from disk on construction', () => {
      // Create initial storage and add memory
      const storage1 = new MemoryStorage({
        persistToDisk: true,
        diskPath: TEST_DISK_PATH,
        compressionEnabled: true,
      });

      storage1.store({
        personaId: 'test-persona',
        type: 'fact',
        content: 'Persistent fact',
        metadata: {},
        importance: 0.8,
        tags: ['test'],
      });

      // Create new storage instance - should load from disk
      const storage2 = new MemoryStorage({
        persistToDisk: true,
        diskPath: TEST_DISK_PATH,
        compressionEnabled: true,
      });

      const results = storage2.retrieve({ personaId: 'test-persona' });
      expect(results.length).toBe(1);
      expect(results[0].content).toBe('Persistent fact');
    });

    it('should handle missing disk path on construction', () => {
      const storage = new MemoryStorage({
        persistToDisk: true,
        diskPath: './non-existent-path',
      });
      expect(storage).toBeDefined();
    });
  });

  describe('Store Operations', () => {
    it('should throw error when storage is disabled', () => {
      const storage = new MemoryStorage({
        enabled: false,
        persistToDisk: false,
      });

      expect(() => {
        storage.store({
          personaId: 'test-persona',
          type: 'fact',
          content: 'Test',
          metadata: {},
          importance: 0.5,
          tags: [],
        });
      }).toThrow('Memory storage is disabled');
    });

    it('should generate unique IDs for stored memories', () => {
      const storage = new MemoryStorage({ persistToDisk: false });

      const entry1 = storage.store({
        personaId: 'test-persona',
        type: 'fact',
        content: 'First fact',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      const entry2 = storage.store({
        personaId: 'test-persona',
        type: 'fact',
        content: 'Second fact',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      expect(entry1.id).toBeDefined();
      expect(entry2.id).toBeDefined();
      expect(entry1.id).not.toBe(entry2.id);
    });

    it('should set timestamp and initial access counts', () => {
      const storage = new MemoryStorage({ persistToDisk: false });
      const before = Date.now();

      const entry = storage.store({
        personaId: 'test-persona',
        type: 'fact',
        content: 'Test fact',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      const after = Date.now();

      expect(entry.timestamp).toBeGreaterThanOrEqual(before);
      expect(entry.timestamp).toBeLessThanOrEqual(after);
      expect(entry.accessCount).toBe(0);
      expect(entry.lastAccessed).toBe(entry.timestamp);
    });

    it('should create persona memory map if not exists', () => {
      const storage = new MemoryStorage({ persistToDisk: false });

      const entry = storage.store({
        personaId: 'new-persona',
        type: 'fact',
        content: 'First memory for new persona',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      expect(entry).toBeDefined();
      expect(entry.personaId).toBe('new-persona');
    });

    it('should evict least important memories when exceeding maxEntries', () => {
      const storage = new MemoryStorage({
        maxEntries: 10,
        persistToDisk: false,
      });

      // Add 15 memories with varying importance
      for (let i = 0; i < 15; i++) {
        storage.store({
          personaId: 'test-persona',
          type: 'fact',
          content: `Fact ${i}`,
          metadata: {},
          importance: i / 20, // 0.0 to 0.7
          tags: [],
        });
      }

      const results = storage.retrieve({ personaId: 'test-persona' });

      // Should have removed bottom 10% (1-2 entries) to stay under limit
      expect(results.length).toBeLessThanOrEqual(10);

      // Higher importance memories should remain
      const importanceValues = results.map((r) => r.importance);
      const avgImportance =
        importanceValues.reduce((a, b) => a + b, 0) / importanceValues.length;
      expect(avgImportance).toBeGreaterThan(0.3);
    });

    it('should persist to disk when enabled', () => {
      const storage = new MemoryStorage({
        persistToDisk: true,
        diskPath: TEST_DISK_PATH,
        compressionEnabled: true,
      });

      storage.store({
        personaId: 'test-persona',
        type: 'fact',
        content: 'Persistent memory',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      expect(existsSync(TEST_DISK_PATH)).toBe(true);
      const files = readdirSync(TEST_DISK_PATH);
      expect(files.length).toBeGreaterThan(0);
      expect(files.some((f) => f.startsWith('test-persona'))).toBe(true);
    });
  });

  describe('Retrieve Operations', () => {
    let storage: MemoryStorage;

    beforeEach(() => {
      storage = new MemoryStorage({ persistToDisk: false });
    });

    it('should return empty array when storage is disabled', () => {
      const disabledStorage = new MemoryStorage({
        enabled: false,
        persistToDisk: false,
      });
      const results = disabledStorage.retrieve({ personaId: 'test' });
      expect(results).toEqual([]);
    });

    it('should retrieve all memories for a persona', () => {
      storage.store({
        personaId: 'persona-1',
        type: 'fact',
        content: 'Fact 1',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      storage.store({
        personaId: 'persona-1',
        type: 'preference',
        content: 'Preference 1',
        metadata: {},
        importance: 0.6,
        tags: [],
      });

      const results = storage.retrieve({ personaId: 'persona-1' });
      expect(results.length).toBe(2);
    });

    it('should retrieve memories across all personas when no personaId specified', () => {
      storage.store({
        personaId: 'persona-1',
        type: 'fact',
        content: 'Fact 1',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      storage.store({
        personaId: 'persona-2',
        type: 'fact',
        content: 'Fact 2',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      const results = storage.retrieve({});
      expect(results.length).toBe(2);
    });

    it('should filter by single memory type', () => {
      storage.store({
        personaId: 'test-persona',
        type: 'fact',
        content: 'Fact',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      storage.store({
        personaId: 'test-persona',
        type: 'preference',
        content: 'Preference',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      const results = storage.retrieve({
        personaId: 'test-persona',
        type: 'fact',
      });

      expect(results.length).toBe(1);
      expect(results[0].type).toBe('fact');
    });

    it('should filter by multiple memory types', () => {
      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'F',
        metadata: {},
        importance: 0.8,
        tags: [],
      });
      storage.store({
        personaId: 'test',
        type: 'preference',
        content: 'P',
        metadata: {},
        importance: 0.8,
        tags: [],
      });
      storage.store({
        personaId: 'test',
        type: 'skill',
        content: 'S',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      const results = storage.retrieve({
        personaId: 'test',
        type: ['fact', 'skill'],
      });

      expect(results.length).toBe(2);
      expect(
        results.every((r) => r.type === 'fact' || r.type === 'skill')
      ).toBe(true);
    });

    it('should filter by tags (any matching tag)', () => {
      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'Tagged fact',
        metadata: {},
        importance: 0.8,
        tags: ['important', 'coding'],
      });

      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'Another fact',
        metadata: {},
        importance: 0.8,
        tags: ['testing'],
      });

      const results = storage.retrieve({
        personaId: 'test',
        tags: ['coding', 'debug'],
      });

      expect(results.length).toBe(1);
      expect(results[0].content).toBe('Tagged fact');
    });

    it('should filter by minimum importance', () => {
      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'High importance',
        metadata: {},
        importance: 0.9,
        tags: [],
      });

      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'Low importance',
        metadata: {},
        importance: 0.3,
        tags: [],
      });

      const results = storage.retrieve({
        personaId: 'test',
        minImportance: 0.7,
      });

      expect(results.length).toBe(1);
      expect(results[0].content).toBe('High importance');
    });

    it('should filter by time range', () => {
      const now = Date.now();

      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'Old fact',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      // Simulate time passing
      vi.useFakeTimers();
      vi.setSystemTime(now + 10000);

      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'New fact',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      const results = storage.retrieve({
        personaId: 'test',
        timeRange: { start: now + 5000, end: now + 15000 },
      });

      vi.useRealTimers();

      expect(results.length).toBe(1);
      expect(results[0].content).toBe('New fact');
    });

    it('should sort by timestamp ascending', () => {
      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'First',
        metadata: {},
        importance: 0.8,
        tags: [],
      });
      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'Second',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      const results = storage.retrieve({
        personaId: 'test',
        sortBy: 'timestamp',
        sortOrder: 'asc',
      });

      expect(results[0].content).toBe('First');
      expect(results[1].content).toBe('Second');
    });

    it('should sort by timestamp descending (default)', () => {
      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'First',
        metadata: {},
        importance: 0.8,
        tags: [],
      });
      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'Second',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      const results = storage.retrieve({
        personaId: 'test',
        sortBy: 'timestamp',
      });

      // Most recent should be first in descending order
      expect(results.length).toBe(2);
      expect(results[0].timestamp).toBeGreaterThanOrEqual(results[1].timestamp);
    });

    it('should sort by importance', () => {
      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'Low',
        metadata: {},
        importance: 0.3,
        tags: [],
      });
      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'High',
        metadata: {},
        importance: 0.9,
        tags: [],
      });

      const results = storage.retrieve({
        personaId: 'test',
        sortBy: 'importance',
        sortOrder: 'desc',
      });

      expect(results[0].content).toBe('High');
      expect(results[1].content).toBe('Low');
    });

    it('should sort by access count', () => {
      const entry1 = storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'A',
        metadata: {},
        importance: 0.8,
        tags: [],
      });
      const entry2 = storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'B',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      // Manually increment access count
      storage.retrieve({ personaId: 'test' }); // Accesses both
      storage.retrieve({ personaId: 'test' }); // Accesses both again

      const results = storage.retrieve({
        personaId: 'test',
        sortBy: 'accessCount',
        sortOrder: 'desc',
      });

      expect(results[0].accessCount).toBeGreaterThanOrEqual(2);
    });

    it('should sort by last accessed', () => {
      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'A',
        metadata: {},
        importance: 0.8,
        tags: [],
      });
      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'B',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      const results = storage.retrieve({
        personaId: 'test',
        sortBy: 'lastAccessed',
        sortOrder: 'desc',
      });

      expect(results.length).toBe(2);
    });

    it('should apply limit to results', () => {
      for (let i = 0; i < 10; i++) {
        storage.store({
          personaId: 'test',
          type: 'fact',
          content: `Fact ${i}`,
          metadata: {},
          importance: 0.8,
          tags: [],
        });
      }

      const results = storage.retrieve({
        personaId: 'test',
        limit: 3,
      });

      expect(results.length).toBe(3);
    });

    it('should increment access counts on retrieve', () => {
      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'Test fact',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      storage.retrieve({ personaId: 'test' });
      storage.retrieve({ personaId: 'test' });
      const results = storage.retrieve({ personaId: 'test' });

      expect(results[0].accessCount).toBe(3);
    });

    it('should update lastAccessed timestamp on retrieve', () => {
      const before = Date.now();

      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'Test fact',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      vi.useFakeTimers();
      vi.setSystemTime(before + 5000);

      const results = storage.retrieve({ personaId: 'test' });

      vi.useRealTimers();

      expect(results[0].lastAccessed).toBeGreaterThan(before);
    });
  });

  describe('Update Operations', () => {
    let storage: MemoryStorage;

    beforeEach(() => {
      storage = new MemoryStorage({ persistToDisk: false });
    });

    it('should update existing memory entry', () => {
      const entry = storage.store({
        personaId: 'test-persona',
        type: 'fact',
        content: 'Original content',
        metadata: {},
        importance: 0.5,
        tags: [],
      });

      const updated = storage.update(entry.id, 'test-persona', {
        content: 'Updated content',
        importance: 0.9,
      });

      expect(updated).toBe(true);

      const results = storage.retrieve({ personaId: 'test-persona' });
      expect(results[0].content).toBe('Updated content');
      expect(results[0].importance).toBe(0.9);
    });

    it('should return false when persona not found', () => {
      const updated = storage.update('fake-id', 'non-existent', {
        content: 'Updated',
      });

      expect(updated).toBe(false);
    });

    it('should return false when memory not found', () => {
      storage.store({
        personaId: 'test-persona',
        type: 'fact',
        content: 'Test',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      const updated = storage.update('fake-id', 'test-persona', {
        content: 'Updated',
      });

      expect(updated).toBe(false);
    });

    it('should persist updates to disk when enabled', () => {
      const storage = new MemoryStorage({
        persistToDisk: true,
        diskPath: TEST_DISK_PATH,
        compressionEnabled: false,
      });

      const entry = storage.store({
        personaId: 'test-persona',
        type: 'fact',
        content: 'Original',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      storage.update(entry.id, 'test-persona', { content: 'Updated' });

      // Verify disk update by creating new instance
      const storage2 = new MemoryStorage({
        persistToDisk: true,
        diskPath: TEST_DISK_PATH,
      });

      const results = storage2.retrieve({ personaId: 'test-persona' });
      expect(results[0].content).toBe('Updated');
    });
  });

  describe('Delete Operations', () => {
    let storage: MemoryStorage;

    beforeEach(() => {
      storage = new MemoryStorage({ persistToDisk: false });
    });

    it('should delete memory entry', () => {
      const entry = storage.store({
        personaId: 'test-persona',
        type: 'fact',
        content: 'To be deleted',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      const deleted = storage.delete(entry.id, 'test-persona');
      expect(deleted).toBe(true);

      const results = storage.retrieve({ personaId: 'test-persona' });
      expect(results.length).toBe(0);
    });

    it('should return false when persona not found', () => {
      const deleted = storage.delete('fake-id', 'non-existent');
      expect(deleted).toBe(false);
    });

    it('should return false when memory not found', () => {
      storage.store({
        personaId: 'test-persona',
        type: 'fact',
        content: 'Test',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      const deleted = storage.delete('fake-id', 'test-persona');
      expect(deleted).toBe(false);
    });

    it('should persist deletion to disk when enabled', () => {
      const storage = new MemoryStorage({
        persistToDisk: true,
        diskPath: TEST_DISK_PATH,
        compressionEnabled: false,
      });

      const entry = storage.store({
        personaId: 'test-persona',
        type: 'fact',
        content: 'To delete',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      storage.delete(entry.id, 'test-persona');

      // Verify disk deletion
      const storage2 = new MemoryStorage({
        persistToDisk: true,
        diskPath: TEST_DISK_PATH,
      });

      const results = storage2.retrieve({ personaId: 'test-persona' });
      expect(results.length).toBe(0);
    });
  });

  describe('Clear Operations', () => {
    it('should clear all memories for a persona', () => {
      const storage = new MemoryStorage({ persistToDisk: false });

      storage.store({
        personaId: 'persona-1',
        type: 'fact',
        content: 'Fact 1',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      storage.store({
        personaId: 'persona-2',
        type: 'fact',
        content: 'Fact 2',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      storage.clearPersona('persona-1');

      const results1 = storage.retrieve({ personaId: 'persona-1' });
      const results2 = storage.retrieve({ personaId: 'persona-2' });

      expect(results1.length).toBe(0);
      expect(results2.length).toBe(1);
    });

    it('should remove disk file when clearing persona', () => {
      const storage = new MemoryStorage({
        persistToDisk: true,
        diskPath: TEST_DISK_PATH,
        compressionEnabled: true,
      });

      storage.store({
        personaId: 'test-persona',
        type: 'fact',
        content: 'Test',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      const filesBefore = readdirSync(TEST_DISK_PATH);
      expect(filesBefore.length).toBeGreaterThan(0);

      storage.clearPersona('test-persona');

      const filesAfter = existsSync(TEST_DISK_PATH)
        ? readdirSync(TEST_DISK_PATH)
        : [];
      expect(filesAfter.length).toBe(0);
    });

    it('should clear all memories from all personas', () => {
      const storage = new MemoryStorage({ persistToDisk: false });

      storage.store({
        personaId: 'persona-1',
        type: 'fact',
        content: 'F1',
        metadata: {},
        importance: 0.8,
        tags: [],
      });
      storage.store({
        personaId: 'persona-2',
        type: 'fact',
        content: 'F2',
        metadata: {},
        importance: 0.8,
        tags: [],
      });
      storage.store({
        personaId: 'persona-3',
        type: 'fact',
        content: 'F3',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      storage.clearAll();

      const results = storage.retrieve({});
      expect(results.length).toBe(0);
    });

    it('should clear disk storage when clearing all', () => {
      const storage = new MemoryStorage({
        persistToDisk: true,
        diskPath: TEST_DISK_PATH,
      });

      storage.store({
        personaId: 'test-persona',
        type: 'fact',
        content: 'Test',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      expect(existsSync(TEST_DISK_PATH)).toBe(true);

      storage.clearAll();

      expect(existsSync(TEST_DISK_PATH)).toBe(false);
    });
  });

  describe('Statistics', () => {
    let storage: MemoryStorage;

    beforeEach(() => {
      storage = new MemoryStorage({ persistToDisk: false });
    });

    it('should return null stats for non-existent persona', () => {
      const stats = storage.getStats('non-existent');
      expect(stats).toBeNull();
    });

    it('should return null stats for persona with no memories', () => {
      storage.store({
        personaId: 'other-persona',
        type: 'fact',
        content: 'Test',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      const stats = storage.getStats('empty-persona');
      expect(stats).toBeNull();
    });

    it('should calculate total entries', () => {
      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'F1',
        metadata: {},
        importance: 0.8,
        tags: [],
      });
      storage.store({
        personaId: 'test',
        type: 'preference',
        content: 'P1',
        metadata: {},
        importance: 0.6,
        tags: [],
      });

      const stats = storage.getStats('test');
      expect(stats?.totalEntries).toBe(2);
    });

    it('should count entries by type', () => {
      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'F1',
        metadata: {},
        importance: 0.8,
        tags: [],
      });
      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'F2',
        metadata: {},
        importance: 0.8,
        tags: [],
      });
      storage.store({
        personaId: 'test',
        type: 'preference',
        content: 'P1',
        metadata: {},
        importance: 0.6,
        tags: [],
      });
      storage.store({
        personaId: 'test',
        type: 'skill',
        content: 'S1',
        metadata: {},
        importance: 0.7,
        tags: [],
      });

      const stats = storage.getStats('test');
      expect(stats?.entriesByType.fact).toBe(2);
      expect(stats?.entriesByType.preference).toBe(1);
      expect(stats?.entriesByType.skill).toBe(1);
      expect(stats?.entriesByType.conversation).toBe(0);
      expect(stats?.entriesByType.feedback).toBe(0);
    });

    it('should calculate total size in bytes', () => {
      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'Test fact',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      const stats = storage.getStats('test');
      expect(stats?.totalSize).toBeGreaterThan(0);
    });

    it('should track oldest and newest entries', () => {
      const entry1 = storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'Old',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      vi.useFakeTimers();
      vi.setSystemTime(Date.now() + 5000);

      const entry2 = storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'New',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      vi.useRealTimers();

      const stats = storage.getStats('test');
      expect(stats?.oldestEntry).toBe(entry1.timestamp);
      expect(stats?.newestEntry).toBe(entry2.timestamp);
    });

    it('should calculate average importance', () => {
      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'F1',
        metadata: {},
        importance: 0.6,
        tags: [],
      });
      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'F2',
        metadata: {},
        importance: 0.8,
        tags: [],
      });
      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'F3',
        metadata: {},
        importance: 1.0,
        tags: [],
      });

      const stats = storage.getStats('test');
      expect(stats?.avgImportance).toBeCloseTo(0.8, 1);
    });

    it('should calculate average access count', () => {
      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'F1',
        metadata: {},
        importance: 0.8,
        tags: [],
      });
      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'F2',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      // Access memories
      storage.retrieve({ personaId: 'test' });
      storage.retrieve({ personaId: 'test' });

      const stats = storage.getStats('test');
      expect(stats?.avgAccessCount).toBe(2);
    });
  });

  describe('Disk Persistence', () => {
    it('should save to disk with compression', () => {
      const storage = new MemoryStorage({
        persistToDisk: true,
        diskPath: TEST_DISK_PATH,
        compressionEnabled: true,
      });

      storage.store({
        personaId: 'test-persona',
        type: 'fact',
        content: 'Test fact',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      expect(existsSync(TEST_DISK_PATH)).toBe(true);
      const files = readdirSync(TEST_DISK_PATH);
      expect(files.some((f) => f.endsWith('.json.gz'))).toBe(true);
    });

    it('should save to disk without compression', () => {
      const storage = new MemoryStorage({
        persistToDisk: true,
        diskPath: TEST_DISK_PATH,
        compressionEnabled: false,
      });

      storage.store({
        personaId: 'test-persona',
        type: 'fact',
        content: 'Test fact',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      const files = readdirSync(TEST_DISK_PATH);
      expect(files.some((f) => f.endsWith('.json') && !f.endsWith('.gz'))).toBe(
        true
      );
    });

    it('should create directory if it does not exist', () => {
      const storage = new MemoryStorage({
        persistToDisk: true,
        diskPath: TEST_DISK_PATH,
      });

      storage.store({
        personaId: 'test-persona',
        type: 'fact',
        content: 'Test',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      expect(existsSync(TEST_DISK_PATH)).toBe(true);
    });

    it('should load compressed files from disk', () => {
      const storage1 = new MemoryStorage({
        persistToDisk: true,
        diskPath: TEST_DISK_PATH,
        compressionEnabled: true,
      });

      storage1.store({
        personaId: 'test-persona',
        type: 'fact',
        content: 'Compressed memory',
        metadata: { test: true },
        importance: 0.9,
        tags: ['test'],
      });

      const storage2 = new MemoryStorage({
        persistToDisk: true,
        diskPath: TEST_DISK_PATH,
        compressionEnabled: true,
      });

      const results = storage2.retrieve({ personaId: 'test-persona' });
      expect(results.length).toBe(1);
      expect(results[0].content).toBe('Compressed memory');
      expect(results[0].metadata.test).toBe(true);
    });

    it('should load uncompressed files from disk', () => {
      const storage1 = new MemoryStorage({
        persistToDisk: true,
        diskPath: TEST_DISK_PATH,
        compressionEnabled: false,
      });

      storage1.store({
        personaId: 'test-persona',
        type: 'fact',
        content: 'Uncompressed memory',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      const storage2 = new MemoryStorage({
        persistToDisk: true,
        diskPath: TEST_DISK_PATH,
        compressionEnabled: false,
      });

      const results = storage2.retrieve({ personaId: 'test-persona' });
      expect(results[0].content).toBe('Uncompressed memory');
    });

    it('should handle corrupted disk files gracefully', () => {
      // Create directory and write invalid JSON
      mkdirSync(TEST_DISK_PATH, { recursive: true });
      const fs = require('node:fs');
      fs.writeFileSync(
        join(TEST_DISK_PATH, 'corrupted-persona.json'),
        'invalid json{[}]'
      );

      // Should not throw
      const storage = new MemoryStorage({
        persistToDisk: true,
        diskPath: TEST_DISK_PATH,
      });

      expect(storage).toBeDefined();
    });

    it('should skip non-JSON files when loading', () => {
      mkdirSync(TEST_DISK_PATH, { recursive: true });
      const fs = require('node:fs');
      fs.writeFileSync(join(TEST_DISK_PATH, 'readme.txt'), 'Some text file');

      const storage = new MemoryStorage({
        persistToDisk: true,
        diskPath: TEST_DISK_PATH,
      });

      expect(storage).toBeDefined();
      const results = storage.retrieve({});
      expect(results.length).toBe(0);
    });
  });

  describe('Memory Decay', () => {
    it('should apply importance decay over time', () => {
      const storage = new MemoryStorage({
        persistToDisk: false,
        importanceDecay: true,
        decayRate: 0.5, // 50% decay per day
      });

      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'Decaying memory',
        metadata: {},
        importance: 1.0,
        tags: [],
      });

      // Trigger decay manually by calling private method through instance
      (storage as any).lastDecay = Date.now() - 2 * 24 * 60 * 60 * 1000; // 2 days ago
      (storage as any).applyDecay();

      const results = storage.retrieve({ personaId: 'test' });
      expect(results[0].importance).toBeLessThan(1.0);
      expect(results[0].importance).toBeCloseTo(0.25, 1); // 0.5^2 = 0.25
    });

    it('should remove memories below minimum importance threshold', () => {
      const storage = new MemoryStorage({
        persistToDisk: false,
        importanceDecay: true,
        decayRate: 0.001, // Very aggressive decay
      });

      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'Will be removed',
        metadata: {},
        importance: 0.05,
        tags: [],
      });

      // Trigger decay
      (storage as any).lastDecay = Date.now() - 10 * 24 * 60 * 60 * 1000; // 10 days ago
      (storage as any).applyDecay();

      const results = storage.retrieve({ personaId: 'test' });
      expect(results.length).toBe(0);
    });

    it('should persist decay changes to disk', () => {
      const storage = new MemoryStorage({
        persistToDisk: true,
        diskPath: TEST_DISK_PATH,
        importanceDecay: true,
        decayRate: 0.5,
      });

      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'Test',
        metadata: {},
        importance: 1.0,
        tags: [],
      });

      // Apply decay
      (storage as any).lastDecay = Date.now() - 24 * 60 * 60 * 1000;
      (storage as any).applyDecay();

      // Load from disk
      const storage2 = new MemoryStorage({
        persistToDisk: true,
        diskPath: TEST_DISK_PATH,
      });

      const results = storage2.retrieve({ personaId: 'test' });
      expect(results[0].importance).toBeCloseTo(0.5, 1);
    });

    it('should not apply decay when disabled', () => {
      const storage = new MemoryStorage({
        persistToDisk: false,
        importanceDecay: false,
      });

      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'No decay',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      (storage as any).applyDecay();

      const results = storage.retrieve({ personaId: 'test' });
      expect(results[0].importance).toBe(0.8);
    });
  });

  describe('Cleanup Expired Memories', () => {
    it('should remove memories older than TTL', () => {
      const storage = new MemoryStorage({
        persistToDisk: false,
        ttl: 5000, // 5 seconds
      });

      vi.useFakeTimers();
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'Old memory',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      // Move time forward past TTL
      vi.setSystemTime(startTime + 10000);

      storage.cleanupExpired();

      const results = storage.retrieve({ personaId: 'test' });
      expect(results.length).toBe(0);

      vi.useRealTimers();
    });

    it('should keep memories within TTL', () => {
      const storage = new MemoryStorage({
        persistToDisk: false,
        ttl: 10000, // 10 seconds
      });

      vi.useFakeTimers();
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'Recent memory',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      // Move time forward but within TTL
      vi.setSystemTime(startTime + 5000);

      storage.cleanupExpired();

      const results = storage.retrieve({ personaId: 'test' });
      expect(results.length).toBe(1);

      vi.useRealTimers();
    });

    it('should not cleanup when TTL is 0 (no expiration)', () => {
      const storage = new MemoryStorage({
        persistToDisk: false,
        ttl: 0,
      });

      vi.useFakeTimers();
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'Permanent memory',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      // Move time far into future
      vi.setSystemTime(startTime + 1000000000);

      storage.cleanupExpired();

      const results = storage.retrieve({ personaId: 'test' });
      expect(results.length).toBe(1);

      vi.useRealTimers();
    });

    it('should persist cleanup to disk', () => {
      const storage = new MemoryStorage({
        persistToDisk: true,
        diskPath: TEST_DISK_PATH,
        ttl: 5000,
      });

      vi.useFakeTimers();
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      storage.store({
        personaId: 'test',
        type: 'fact',
        content: 'Expiring',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      vi.setSystemTime(startTime + 10000);
      storage.cleanupExpired();

      vi.useRealTimers();

      // Load from disk
      const storage2 = new MemoryStorage({
        persistToDisk: true,
        diskPath: TEST_DISK_PATH,
      });

      const results = storage2.retrieve({ personaId: 'test' });
      expect(results.length).toBe(0);
    });

    it('should cleanup multiple expired memories across personas', () => {
      const storage = new MemoryStorage({
        persistToDisk: false,
        ttl: 5000, // 5 second TTL
      });

      vi.useFakeTimers();
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      // Create old memories at t=0
      storage.store({
        personaId: 'persona-1',
        type: 'fact',
        content: 'Old 1',
        metadata: {},
        importance: 0.8,
        tags: [],
      });
      storage.store({
        personaId: 'persona-2',
        type: 'fact',
        content: 'Old 2',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      // Create recent memory at t=8000 (8 seconds)
      vi.setSystemTime(startTime + 8000);
      storage.store({
        personaId: 'persona-1',
        type: 'fact',
        content: 'Recent 1',
        metadata: {},
        importance: 0.8,
        tags: [],
      });

      // Cleanup at t=10000 (10 seconds)
      // expirationTime = 10000 - 5000 = 5000
      // Old 1 (t=0) < 5000 → DELETED
      // Old 2 (t=0) < 5000 → DELETED
      // Recent 1 (t=8000) > 5000 → KEPT
      vi.setSystemTime(startTime + 10000);
      storage.cleanupExpired();

      vi.useRealTimers();

      const results1 = storage.retrieve({ personaId: 'persona-1' });
      const results2 = storage.retrieve({ personaId: 'persona-2' });

      expect(results1.length).toBe(1);
      expect(results1[0].content).toBe('Recent 1');
      expect(results2.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle save errors gracefully', () => {
      const storage = new MemoryStorage({
        persistToDisk: true,
        diskPath: '/invalid/path/that/cannot/be/created',
      });

      // Should not throw
      expect(() => {
        storage.store({
          personaId: 'test',
          type: 'fact',
          content: 'Test',
          metadata: {},
          importance: 0.8,
          tags: [],
        });
      }).not.toThrow();
    });

    it('should handle load errors gracefully', () => {
      mkdirSync(TEST_DISK_PATH, { recursive: true });
      const fs = require('node:fs');

      // Create a file that will fail to decompress
      fs.writeFileSync(
        join(TEST_DISK_PATH, 'bad-persona.json.gz'),
        'not gzipped data'
      );

      // Should not throw
      const storage = new MemoryStorage({
        persistToDisk: true,
        diskPath: TEST_DISK_PATH,
      });

      expect(storage).toBeDefined();
    });
  });
});
