/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Cross-Persona Knowledge Sharing
 * Phase 2.3: Context & Memory
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { randomUUID } from 'node:crypto';
import type {
  KnowledgeEntry,
  KnowledgeSharingConfig,
  KnowledgeStats,
} from './types.js';
import { DEFAULT_KNOWLEDGE_SHARING_CONFIG } from './types.js';

/**
 * Knowledge sharing system for cross-persona learning
 * Enables personas to learn from each other's experiences
 */
export class KnowledgeSharing {
  private readonly config: KnowledgeSharingConfig;
  private readonly knowledge: Map<string, KnowledgeEntry>; // knowledgeId -> entry
  private readonly personaContributions: Map<string, number>; // personaId -> count

  constructor(config: Partial<KnowledgeSharingConfig> = {}) {
    this.config = {
      ...DEFAULT_KNOWLEDGE_SHARING_CONFIG,
      ...config,
    } as KnowledgeSharingConfig;
    this.knowledge = new Map();
    this.personaContributions = new Map();
  }

  /**
   * Share knowledge from a persona
   */
  share(
    entry: Omit<KnowledgeEntry, 'id' | 'timestamp' | 'usageCount' | 'lastUsed'>
  ): KnowledgeEntry {
    if (!this.config.enabled) {
      throw new Error('Knowledge sharing is disabled');
    }

    // Check auto-share threshold
    if (
      this.config.autoShare &&
      entry.confidence < this.config.shareThreshold
    ) {
      throw new Error(
        `Knowledge confidence ${entry.confidence} below share threshold ${this.config.shareThreshold}`
      );
    }

    const knowledgeEntry: KnowledgeEntry = {
      ...entry,
      id: randomUUID(),
      timestamp: Date.now(),
      usageCount: 0,
      lastUsed: Date.now(),
    };

    this.knowledge.set(knowledgeEntry.id, knowledgeEntry);

    // Update persona contributions
    const currentCount =
      this.personaContributions.get(entry.sourcePersonaId) || 0;
    this.personaContributions.set(entry.sourcePersonaId, currentCount + 1);

    // Enforce max entries limit
    if (this.knowledge.size > this.config.maxEntries) {
      this.evictLeastUseful();
    }

    return knowledgeEntry;
  }

  /**
   * Retrieve relevant knowledge for a query
   */
  retrieve(query: {
    type?: KnowledgeEntry['type'] | KnowledgeEntry['type'][];
    tags?: string[];
    minConfidence?: number;
    excludePersona?: string; // Exclude knowledge from this persona
    limit?: number;
  }): KnowledgeEntry[] {
    if (!this.config.enabled) return [];

    let results: KnowledgeEntry[] = [];

    for (const entry of Array.from(this.knowledge.values())) {
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
        query.minConfidence !== undefined &&
        entry.confidence < query.minConfidence
      ) {
        continue;
      }

      if (
        query.excludePersona &&
        entry.sourcePersonaId === query.excludePersona
      ) {
        continue;
      }

      results.push(entry);
    }

    // Apply relevance scoring if enabled
    if (this.config.relevanceScoring) {
      results = this.scoreRelevance(results, query);
    }

    // Sort by relevance (confidence * usage)
    results.sort((a, b) => {
      const scoreA = a.confidence * (1 + Math.log1p(a.usageCount));
      const scoreB = b.confidence * (1 + Math.log1p(b.usageCount));
      return scoreB - scoreA;
    });

    // Apply limit
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    // Update usage counts
    for (const entry of results) {
      entry.usageCount++;
      entry.lastUsed = Date.now();
    }

    return results;
  }

  /**
   * Update an existing knowledge entry
   */
  update(knowledgeId: string, updates: Partial<KnowledgeEntry>): boolean {
    const entry = this.knowledge.get(knowledgeId);
    if (!entry) return false;

    Object.assign(entry, updates);
    return true;
  }

  /**
   * Delete a knowledge entry
   */
  delete(knowledgeId: string): boolean {
    const entry = this.knowledge.get(knowledgeId);
    if (!entry) return false;

    // Update persona contributions
    const currentCount =
      this.personaContributions.get(entry.sourcePersonaId) || 0;
    if (currentCount > 0) {
      this.personaContributions.set(entry.sourcePersonaId, currentCount - 1);
    }

    return this.knowledge.delete(knowledgeId);
  }

  /**
   * Link related knowledge entries
   */
  linkRelated(knowledgeId1: string, knowledgeId2: string): boolean {
    const entry1 = this.knowledge.get(knowledgeId1);
    const entry2 = this.knowledge.get(knowledgeId2);

    if (!entry1 || !entry2) return false;

    if (!entry1.relatedEntries.includes(knowledgeId2)) {
      entry1.relatedEntries.push(knowledgeId2);
    }

    if (!entry2.relatedEntries.includes(knowledgeId1)) {
      entry2.relatedEntries.push(knowledgeId1);
    }

    return true;
  }

  /**
   * Get related knowledge entries
   */
  getRelated(knowledgeId: string, depth: number = 1): KnowledgeEntry[] {
    const entry = this.knowledge.get(knowledgeId);
    if (!entry) return [];

    const related = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [
      { id: knowledgeId, depth: 0 },
    ];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id) || current.depth > depth) continue;

      visited.add(current.id);
      const currentEntry = this.knowledge.get(current.id);
      if (!currentEntry) continue;

      for (const relatedId of currentEntry.relatedEntries) {
        if (relatedId !== knowledgeId) {
          related.add(relatedId);
        }
        if (current.depth < depth) {
          queue.push({ id: relatedId, depth: current.depth + 1 });
        }
      }
    }

    return Array.from(related)
      .map((id) => this.knowledge.get(id))
      .filter((entry): entry is KnowledgeEntry => entry !== undefined);
  }

  /**
   * Get knowledge statistics
   */
  getStats(): KnowledgeStats {
    const entries = Array.from(this.knowledge.values());
    const entriesByType: Record<KnowledgeEntry['type'], number> = {
      fact: 0,
      pattern: 0,
      solution: 0,
      'best-practice': 0,
    };

    let totalConfidence = 0;
    let totalUsage = 0;

    for (const entry of entries) {
      entriesByType[entry.type]++;
      totalConfidence += entry.confidence;
      totalUsage += entry.usageCount;
    }

    const topContributors = Array.from(this.personaContributions.entries())
      .map(([personaId, contributions]) => ({ personaId, contributions }))
      .sort((a, b) => b.contributions - a.contributions)
      .slice(0, 10);

    return {
      totalEntries: entries.length,
      entriesByType,
      avgConfidence: entries.length > 0 ? totalConfidence / entries.length : 0,
      avgUsageCount: entries.length > 0 ? totalUsage / entries.length : 0,
      topContributors,
    };
  }

  /**
   * Clear all knowledge
   */
  clear(): void {
    this.knowledge.clear();
    this.personaContributions.clear();
  }

  /**
   * Clean up expired knowledge based on TTL
   */
  cleanupExpired(): void {
    if (this.config.ttl === 0) return; // No expiration

    const now = Date.now();
    const expirationTime = now - this.config.ttl;

    for (const [knowledgeId, entry] of Array.from(this.knowledge.entries())) {
      if (entry.timestamp < expirationTime) {
        this.delete(knowledgeId);
      }
    }
  }

  /**
   * Evict least useful knowledge to stay under max entries limit
   */
  private evictLeastUseful(): void {
    const entries = Array.from(this.knowledge.values());

    // Score by usefulness: confidence * usage * recency
    const now = Date.now();
    entries.sort((a, b) => {
      const recencyA = 1 / (1 + (now - a.lastUsed) / (24 * 60 * 60 * 1000)); // Days since last use
      const recencyB = 1 / (1 + (now - b.lastUsed) / (24 * 60 * 60 * 1000));

      const scoreA = a.confidence * (1 + a.usageCount) * recencyA;
      const scoreB = b.confidence * (1 + b.usageCount) * recencyB;

      return scoreA - scoreB;
    });

    // Remove bottom 10% to avoid frequent evictions
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.delete(entries[i].id);
    }
  }

  /**
   * Score knowledge entries by relevance to query
   */
  private scoreRelevance(
    entries: KnowledgeEntry[],
    query: {
      tags?: string[];
      type?: KnowledgeEntry['type'] | KnowledgeEntry['type'][];
    }
  ): KnowledgeEntry[] {
    // Simple relevance scoring based on tag overlap
    if (!query.tags || query.tags.length === 0) {
      return entries;
    }

    const queryTagsSet = new Set(query.tags);

    return entries.map((entry) => {
      const entryTagsSet = new Set(entry.tags);
      const intersection = new Set(
        Array.from(queryTagsSet).filter((tag) => entryTagsSet.has(tag))
      );
      const union = new Set([
        ...Array.from(queryTagsSet),
        ...Array.from(entryTagsSet),
      ]);

      // Jaccard similarity for tag overlap
      const tagSimilarity = intersection.size / union.size;

      // Boost confidence by tag similarity
      const boostedConfidence = entry.confidence * (1 + tagSimilarity);

      return {
        ...entry,
        confidence: Math.min(1, boostedConfidence),
      };
    });
  }

  /**
   * Find similar knowledge entries based on content
   */
  findSimilar(content: string, limit: number = 5): KnowledgeEntry[] {
    const entries = Array.from(this.knowledge.values());

    // Simple token-based similarity
    const queryTokens = new Set(content.toLowerCase().split(/\s+/));

    const scored = entries.map((entry) => {
      const entryTokens = new Set(entry.content.toLowerCase().split(/\s+/));
      const intersection = new Set(
        Array.from(queryTokens).filter((t) => entryTokens.has(t))
      );
      const union = new Set([
        ...Array.from(queryTokens),
        ...Array.from(entryTokens),
      ]);

      const similarity = intersection.size / union.size;

      return { entry, similarity };
    });

    scored.sort((a, b) => b.similarity - a.similarity);

    return scored
      .slice(0, limit)
      .filter((s) => s.similarity > 0.1) // Minimum similarity threshold
      .map((s) => s.entry);
  }
}
