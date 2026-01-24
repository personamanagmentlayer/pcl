/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Long-Term Memory Storage
 * Phase 2.3: Context & Memory
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { randomUUID } from 'node:crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import type {
  MemoryEntry,
  MemoryQuery,
  MemoryStorageConfig,
  MemoryStats,
} from './types.js';
import { DEFAULT_MEMORY_STORAGE_CONFIG } from './types.js';

/**
 * Long-term memory storage for personas
 * Persistent learning across sessions with importance decay
 */
export class MemoryStorage {
  private readonly config: MemoryStorageConfig;
  private readonly memories: Map<string, Map<string, MemoryEntry>>; // personaId -> memoryId -> entry
  private lastDecay: number;

  constructor(config: Partial<MemoryStorageConfig> = {}) {
    this.config = {
      ...DEFAULT_MEMORY_STORAGE_CONFIG,
      ...config,
    } as MemoryStorageConfig;
    this.memories = new Map();
    this.lastDecay = Date.now();

    // Load existing memories from disk
    if (this.config.persistToDisk && this.config.diskPath) {
      this.loadFromDisk();
    }

    // Start decay timer if enabled
    if (this.config.importanceDecay) {
      this.startDecayTimer();
    }
  }

  /**
   * Store a new memory entry
   */
  store(
    entry: Omit<
      MemoryEntry,
      'id' | 'timestamp' | 'accessCount' | 'lastAccessed'
    >
  ): MemoryEntry {
    if (!this.config.enabled) {
      throw new Error('Memory storage is disabled');
    }

    const memoryEntry: MemoryEntry = {
      ...entry,
      id: randomUUID(),
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
    };

    // Get or create persona memory map
    let personaMemories = this.memories.get(entry.personaId);
    if (!personaMemories) {
      personaMemories = new Map();
      this.memories.set(entry.personaId, personaMemories);
    }

    // Add memory entry
    personaMemories.set(memoryEntry.id, memoryEntry);

    // Enforce max entries limit
    if (personaMemories.size > this.config.maxEntries) {
      this.evictLeastImportant(entry.personaId);
    }

    // Persist to disk if enabled
    if (this.config.persistToDisk) {
      this.saveToDisk(entry.personaId);
    }

    return memoryEntry;
  }

  /**
   * Retrieve memories matching query criteria
   */
  retrieve(query: MemoryQuery): MemoryEntry[] {
    if (!this.config.enabled) {
      return [];
    }

    let results: MemoryEntry[] = [];

    // Filter by persona
    const personaIds = query.personaId
      ? [query.personaId]
      : Array.from(this.memories.keys());

    for (const personaId of personaIds) {
      const personaMemories = this.memories.get(personaId);
      if (!personaMemories) continue;

      for (const entry of personaMemories.values()) {
        // Apply filters
        if (query.type) {
          const types = Array.isArray(query.type) ? query.type : [query.type];
          if (!types.includes(entry.type)) continue;
        }

        if (query.tags && query.tags.length > 0) {
          const hasMatchingTag = query.tags.some((tag) =>
            entry.tags.includes(tag)
          );
          if (!hasMatchingTag) continue;
        }

        if (
          query.minImportance !== undefined &&
          entry.importance < query.minImportance
        ) {
          continue;
        }

        if (query.timeRange) {
          if (
            entry.timestamp < query.timeRange.start ||
            entry.timestamp > query.timeRange.end
          ) {
            continue;
          }
        }

        results.push(entry);
      }
    }

    // Sort results
    const sortBy = query.sortBy || 'timestamp';
    const sortOrder = query.sortOrder || 'desc';

    results.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'timestamp':
          comparison = a.timestamp - b.timestamp;
          break;
        case 'importance':
          comparison = a.importance - b.importance;
          break;
        case 'accessCount':
          comparison = a.accessCount - b.accessCount;
          break;
        case 'lastAccessed':
          comparison = a.lastAccessed - b.lastAccessed;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Apply limit
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    // Update access counts and timestamps
    for (const entry of results) {
      entry.accessCount++;
      entry.lastAccessed = Date.now();
    }

    return results;
  }

  /**
   * Update an existing memory entry
   */
  update(
    memoryId: string,
    personaId: string,
    updates: Partial<MemoryEntry>
  ): boolean {
    const personaMemories = this.memories.get(personaId);
    if (!personaMemories) return false;

    const entry = personaMemories.get(memoryId);
    if (!entry) return false;

    // Apply updates
    Object.assign(entry, updates);

    // Persist to disk if enabled
    if (this.config.persistToDisk) {
      this.saveToDisk(personaId);
    }

    return true;
  }

  /**
   * Delete a memory entry
   */
  delete(memoryId: string, personaId: string): boolean {
    const personaMemories = this.memories.get(personaId);
    if (!personaMemories) return false;

    const deleted = personaMemories.delete(memoryId);

    // Persist to disk if enabled
    if (deleted && this.config.persistToDisk) {
      this.saveToDisk(personaId);
    }

    return deleted;
  }

  /**
   * Clear all memories for a persona
   */
  clearPersona(personaId: string): void {
    this.memories.delete(personaId);

    // Remove disk file if exists
    if (this.config.persistToDisk && this.config.diskPath) {
      const filePath = join(this.config.diskPath, `${personaId}.json.gz`);
      if (existsSync(filePath)) {
        try {
          const fs = require('node:fs');
          fs.unlinkSync(filePath);
        } catch {
          // Ignore errors during cleanup
        }
      }
    }
  }

  /**
   * Clear all memories
   */
  clearAll(): void {
    this.memories.clear();

    // Clear disk storage if exists
    if (
      this.config.persistToDisk &&
      this.config.diskPath &&
      existsSync(this.config.diskPath)
    ) {
      try {
        const fs = require('node:fs');
        fs.rmSync(this.config.diskPath, { recursive: true, force: true });
      } catch {
        // Ignore errors during cleanup
      }
    }
  }

  /**
   * Get statistics for a persona's memories
   */
  getStats(personaId: string): MemoryStats | null {
    const personaMemories = this.memories.get(personaId);
    if (!personaMemories || personaMemories.size === 0) return null;

    const entries = Array.from(personaMemories.values());
    const entriesByType: Record<MemoryEntry['type'], number> = {
      fact: 0,
      preference: 0,
      skill: 0,
      conversation: 0,
      feedback: 0,
    };

    let totalImportance = 0;
    let totalAccessCount = 0;
    let oldestTimestamp = Infinity;
    let newestTimestamp = 0;

    for (const entry of entries) {
      entriesByType[entry.type]++;
      totalImportance += entry.importance;
      totalAccessCount += entry.accessCount;
      oldestTimestamp = Math.min(oldestTimestamp, entry.timestamp);
      newestTimestamp = Math.max(newestTimestamp, entry.timestamp);
    }

    return {
      totalEntries: entries.length,
      entriesByType,
      totalSize: JSON.stringify(entries).length,
      oldestEntry: oldestTimestamp,
      newestEntry: newestTimestamp,
      avgImportance: totalImportance / entries.length,
      avgAccessCount: totalAccessCount / entries.length,
    };
  }

  /**
   * Apply importance decay to all memories
   */
  private applyDecay(): void {
    if (!this.config.importanceDecay) return;

    const now = Date.now();
    const daysSinceLastDecay = (now - this.lastDecay) / (24 * 60 * 60 * 1000);
    const decayFactor = Math.pow(this.config.decayRate, daysSinceLastDecay);

    for (const personaMemories of this.memories.values()) {
      for (const entry of personaMemories.values()) {
        entry.importance *= decayFactor;

        // Remove entries below minimum importance threshold (0.01)
        if (entry.importance < 0.01) {
          personaMemories.delete(entry.id);
        }
      }
    }

    this.lastDecay = now;

    // Persist all changes to disk
    if (this.config.persistToDisk) {
      for (const personaId of this.memories.keys()) {
        this.saveToDisk(personaId);
      }
    }
  }

  /**
   * Start decay timer (runs daily)
   */
  private startDecayTimer(): void {
    setInterval(
      () => {
        this.applyDecay();
      },
      24 * 60 * 60 * 1000
    ); // Run every 24 hours
  }

  /**
   * Evict least important memories to stay under max entries limit
   */
  private evictLeastImportant(personaId: string): void {
    const personaMemories = this.memories.get(personaId);
    if (!personaMemories) return;

    const entries = Array.from(personaMemories.values());
    entries.sort((a, b) => a.importance - b.importance);

    // Remove bottom 10% to avoid frequent evictions
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      personaMemories.delete(entries[i].id);
    }
  }

  /**
   * Save persona memories to disk
   */
  private saveToDisk(personaId: string): void {
    if (!this.config.diskPath) return;

    const personaMemories = this.memories.get(personaId);
    if (!personaMemories) return;

    try {
      // Ensure directory exists
      if (!existsSync(this.config.diskPath)) {
        mkdirSync(this.config.diskPath, { recursive: true });
      }

      const filePath = join(
        this.config.diskPath,
        `${personaId}.json${this.config.compressionEnabled ? '.gz' : ''}`
      );
      const data = JSON.stringify(Array.from(personaMemories.values()));

      if (this.config.compressionEnabled) {
        const compressed = gzipSync(Buffer.from(data, 'utf-8'));
        writeFileSync(filePath, compressed);
      } else {
        writeFileSync(filePath, data, 'utf-8');
      }
    } catch (error) {
      console.error(`Failed to save memories for persona ${personaId}:`, error);
    }
  }

  /**
   * Load all memories from disk
   */
  private loadFromDisk(): void {
    if (!this.config.diskPath || !existsSync(this.config.diskPath)) return;

    try {
      const fs = require('node:fs');
      const files = fs.readdirSync(this.config.diskPath);

      for (const file of files) {
        if (!file.endsWith('.json') && !file.endsWith('.json.gz')) continue;

        const personaId = file.replace(/\.json(\.gz)?$/, '');
        const filePath = join(this.config.diskPath, file);

        try {
          let data: string;

          if (file.endsWith('.gz')) {
            const compressed = readFileSync(filePath);
            data = gunzipSync(compressed).toString('utf-8');
          } else {
            data = readFileSync(filePath, 'utf-8');
          }

          const entries: MemoryEntry[] = JSON.parse(data);
          const personaMemories = new Map<string, MemoryEntry>();

          for (const entry of entries) {
            personaMemories.set(entry.id, entry);
          }

          this.memories.set(personaId, personaMemories);
        } catch (error) {
          console.error(`Failed to load memories from ${file}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to load memories from disk:', error);
    }
  }

  /**
   * Clean up expired memories based on TTL
   */
  cleanupExpired(): void {
    if (this.config.ttl === 0) return; // No expiration

    const now = Date.now();
    const expirationTime = now - this.config.ttl;

    for (const [personaId, personaMemories] of this.memories.entries()) {
      for (const [memoryId, entry] of personaMemories.entries()) {
        if (entry.timestamp < expirationTime) {
          personaMemories.delete(memoryId);
        }
      }

      // Persist changes if any deletions occurred
      if (this.config.persistToDisk) {
        this.saveToDisk(personaId);
      }
    }
  }
}
