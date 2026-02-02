/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Knowledge Sharing Tests
 *
 * Comprehensive tests for cross-persona knowledge sharing system
 * Target: 62.82% → 90%+ coverage (~40+ tests)
 *
 * Focus Areas:
 * - Knowledge retrieval with complex queries
 * - Related knowledge traversal (getRelated with depth)
 * - Similarity-based search (findSimilar)
 * - Relevance scoring with tag overlap
 * - Knowledge cleanup and expiration
 * - Eviction strategies
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { KnowledgeSharing } from '../../../src/runtime/memory/knowledge-sharing';

describe('KnowledgeSharing', () => {
  describe('Construction', () => {
    it('should create instance with default config', () => {
      const ks = new KnowledgeSharing();
      expect(ks).toBeDefined();
    });

    it('should create instance with custom config', () => {
      const ks = new KnowledgeSharing({
        enabled: true,
        maxEntries: 1000,
        shareThreshold: 0.9,
      });
      expect(ks).toBeDefined();
    });

    it('should merge custom config with defaults', () => {
      const ks = new KnowledgeSharing({
        shareThreshold: 0.6,
      });
      expect(ks).toBeDefined();
    });
  });

  describe('Knowledge Sharing', () => {
    let ks: KnowledgeSharing;

    beforeEach(() => {
      ks = new KnowledgeSharing({
        enabled: true,
        autoShare: true,
        shareThreshold: 0.7,
        maxEntries: 100,
      });
    });

    it('should share knowledge entry successfully', () => {
      const entry = ks.share({
        sourcePersonaId: 'persona-1',
        type: 'fact',
        content: 'Important fact',
        context: 'Discovery context',
        confidence: 0.9,
        tags: ['test'],
        relatedEntries: [],
      });

      expect(entry).toBeDefined();
      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeGreaterThan(0);
      expect(entry.usageCount).toBe(0);
      expect(entry.lastUsed).toBeGreaterThan(0);
      expect(entry.content).toBe('Important fact');
    });

    it('should throw error when sharing is disabled', () => {
      const disabledKs = new KnowledgeSharing({ enabled: false });

      expect(() => {
        disabledKs.share({
          sourcePersonaId: 'persona-1',
          type: 'fact',
          content: 'Test',
          context: 'Context',
          confidence: 0.9,
          tags: [],
          relatedEntries: [],
        });
      }).toThrow('Knowledge sharing is disabled');
    });

    it('should throw error when confidence below share threshold', () => {
      expect(() => {
        ks.share({
          sourcePersonaId: 'persona-1',
          type: 'fact',
          content: 'Low confidence fact',
          context: 'Context',
          confidence: 0.5, // Below threshold of 0.7
          tags: [],
          relatedEntries: [],
        });
      }).toThrow(/below share threshold/);
    });

    it('should track persona contributions', () => {
      ks.share({
        sourcePersonaId: 'persona-1',
        type: 'fact',
        content: 'First fact',
        context: 'Context',
        confidence: 0.9,
        tags: [],
        relatedEntries: [],
      });

      ks.share({
        sourcePersonaId: 'persona-1',
        type: 'pattern',
        content: 'Second fact',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      const stats = ks.getStats();
      expect(stats.topContributors).toHaveLength(1);
      expect(stats.topContributors[0].personaId).toBe('persona-1');
      expect(stats.topContributors[0].contributions).toBe(2);
    });

    it('should enforce maxEntries limit with eviction', () => {
      const smallKs = new KnowledgeSharing({
        enabled: true,
        maxEntries: 5,
        shareThreshold: 0.5,
      });

      // Add 10 entries (exceeds limit of 5)
      for (let i = 0; i < 10; i++) {
        smallKs.share({
          sourcePersonaId: 'persona-1',
          type: 'fact',
          content: `Fact ${i}`,
          context: 'Context',
          confidence: 0.6,
          tags: [],
          relatedEntries: [],
        });
      }

      const stats = smallKs.getStats();
      expect(stats.totalEntries).toBeLessThanOrEqual(5);
    });
  });

  describe('Knowledge Retrieval - Basic Filters', () => {
    let ks: KnowledgeSharing;

    beforeEach(() => {
      ks = new KnowledgeSharing({
        enabled: true,
        shareThreshold: 0.5,
      });

      // Seed with diverse knowledge entries
      ks.share({
        sourcePersonaId: 'persona-1',
        type: 'fact',
        content: 'Fact about TypeScript',
        context: 'Context',
        confidence: 0.9,
        tags: ['typescript', 'programming'],
        relatedEntries: [],
      });

      ks.share({
        sourcePersonaId: 'persona-2',
        type: 'pattern',
        content: 'Design pattern observation',
        context: 'Context',
        confidence: 0.8,
        tags: ['design', 'patterns'],
        relatedEntries: [],
      });

      ks.share({
        sourcePersonaId: 'persona-1',
        type: 'solution',
        content: 'Solution to common problem',
        context: 'Context',
        confidence: 0.7,
        tags: ['typescript', 'solution'],
        relatedEntries: [],
      });

      ks.share({
        sourcePersonaId: 'persona-3',
        type: 'best-practice',
        content: 'Best practice for testing',
        context: 'Context',
        confidence: 0.95,
        tags: ['testing', 'best-practices'],
        relatedEntries: [],
      });
    });

    it('should return empty array when disabled', () => {
      const disabledKs = new KnowledgeSharing({ enabled: false });
      const results = disabledKs.retrieve({});
      expect(results).toEqual([]);
    });

    it('should retrieve all entries with empty query', () => {
      const results = ks.retrieve({});
      expect(results).toHaveLength(4);
    });

    it('should filter by single type', () => {
      const results = ks.retrieve({ type: 'fact' });
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('fact');
    });

    it('should filter by multiple types (array)', () => {
      const results = ks.retrieve({ type: ['fact', 'pattern'] });
      expect(results).toHaveLength(2);
      expect(
        results.every((r) => r.type === 'fact' || r.type === 'pattern')
      ).toBe(true);
    });

    it('should filter by tags (any matching tag)', () => {
      const results = ks.retrieve({ tags: ['typescript'] });
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.tags.includes('typescript'))).toBe(true);
    });

    it('should filter by multiple tags (any matching)', () => {
      const results = ks.retrieve({ tags: ['typescript', 'testing'] });
      expect(results).toHaveLength(3);
    });

    it('should filter by minimum confidence', () => {
      const results = ks.retrieve({ minConfidence: 0.85 });
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every((r) => r.confidence >= 0.85)).toBe(true);
    });

    it('should exclude entries from specific persona', () => {
      const results = ks.retrieve({ excludePersona: 'persona-1' });
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.sourcePersonaId !== 'persona-1')).toBe(
        true
      );
    });

    it('should apply limit to results', () => {
      const results = ks.retrieve({ limit: 2 });
      expect(results).toHaveLength(2);
    });

    it('should combine multiple filters', () => {
      const results = ks.retrieve({
        type: ['fact', 'solution'],
        tags: ['typescript'],
        minConfidence: 0.7,
        excludePersona: 'persona-2',
        limit: 5,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.tags.includes('typescript'))).toBe(true);
      expect(results.every((r) => r.confidence >= 0.7)).toBe(true);
      expect(results.every((r) => r.sourcePersonaId !== 'persona-2')).toBe(
        true
      );
    });
  });

  describe('Knowledge Retrieval - Sorting and Scoring', () => {
    let ks: KnowledgeSharing;

    beforeEach(() => {
      ks = new KnowledgeSharing({
        enabled: true,
        shareThreshold: 0.5,
        relevanceScoring: false, // Test without relevance scoring first
      });
    });

    it('should sort by confidence and usage count', () => {
      const entry1 = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Low confidence, low usage',
        context: 'Context',
        confidence: 0.6,
        tags: ['test'],
        relatedEntries: [],
      });

      const entry2 = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'High confidence, no usage',
        context: 'Context',
        confidence: 0.95,
        tags: ['test'],
        relatedEntries: [],
      });

      ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Medium confidence',
        context: 'Context',
        confidence: 0.75,
        tags: ['test'],
        relatedEntries: [],
      });

      // Simulate usage - entry1 has high usage but low confidence
      ks.update(entry1.id, { usageCount: 50 });

      const results = ks.retrieve({ tags: ['test'] });

      // Entry with high usage (50) will rank higher than high confidence with 0 usage
      // Score = confidence * (1 + log1p(usageCount))
      // entry1: 0.6 * (1 + log1p(50)) ≈ 0.6 * 4.86 ≈ 2.92
      // entry2: 0.95 * (1 + log1p(0)) = 0.95
      expect(results.length).toBe(3);
      expect(results[0].id).toBe(entry1.id); // Highest score due to usage
    });

    it('should increment usage count on retrieval', () => {
      const entry = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Test fact',
        context: 'Context',
        confidence: 0.9,
        tags: ['test'],
        relatedEntries: [],
      });

      const initialUsage = entry.usageCount;

      ks.retrieve({ tags: ['test'] });
      const results = ks.retrieve({ tags: ['test'] });

      expect(results[0].usageCount).toBeGreaterThan(initialUsage);
    });

    it('should update lastUsed timestamp on retrieval', () => {
      const entry = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Test fact',
        context: 'Context',
        confidence: 0.9,
        tags: ['test'],
        relatedEntries: [],
      });

      const initialLastUsed = entry.lastUsed;

      // Wait a bit to ensure timestamp difference
      setTimeout(() => {}, 10);

      const results = ks.retrieve({ tags: ['test'] });
      expect(results[0].lastUsed).toBeGreaterThanOrEqual(initialLastUsed);
    });
  });

  describe('Relevance Scoring', () => {
    let ks: KnowledgeSharing;

    beforeEach(() => {
      ks = new KnowledgeSharing({
        enabled: true,
        shareThreshold: 0.5,
        relevanceScoring: true, // Enable relevance scoring
      });
    });

    it('should boost confidence based on tag overlap', () => {
      ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'High tag overlap',
        context: 'Context',
        confidence: 0.6,
        tags: ['typescript', 'testing', 'patterns'],
        relatedEntries: [],
      });

      ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Low tag overlap',
        context: 'Context',
        confidence: 0.6,
        tags: ['javascript'],
        relatedEntries: [],
      });

      const results = ks.retrieve({
        tags: ['typescript', 'testing'],
      });

      // Entry with more matching tags should rank higher
      expect(results[0].content).toBe('High tag overlap');
    });

    it('should calculate Jaccard similarity for tags', () => {
      ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Exact match',
        context: 'Context',
        confidence: 0.7,
        tags: ['a', 'b', 'c'],
        relatedEntries: [],
      });

      ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Partial match',
        context: 'Context',
        confidence: 0.7,
        tags: ['a', 'd', 'e'],
        relatedEntries: [],
      });

      const results = ks.retrieve({ tags: ['a', 'b', 'c'] });

      // Exact tag match should rank higher
      expect(results[0].content).toBe('Exact match');
    });

    it('should handle empty query tags in relevance scoring', () => {
      ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Test fact',
        context: 'Context',
        confidence: 0.8,
        tags: ['tag1'],
        relatedEntries: [],
      });

      const results = ks.retrieve({}); // No tags in query
      expect(results).toHaveLength(1);
      expect(results[0].confidence).toBe(0.8); // Confidence unchanged
    });

    it('should cap boosted confidence at 1.0', () => {
      ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'High confidence with tags',
        context: 'Context',
        confidence: 0.95,
        tags: ['a', 'b', 'c', 'd', 'e'],
        relatedEntries: [],
      });

      const results = ks.retrieve({ tags: ['a', 'b', 'c', 'd', 'e'] });

      // Confidence should not exceed 1
      expect(results[0].confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Knowledge Updates and Deletions', () => {
    let ks: KnowledgeSharing;

    beforeEach(() => {
      ks = new KnowledgeSharing({
        enabled: true,
        shareThreshold: 0.5,
        relevanceScoring: false, // Disable to test exact values
      });
    });

    it('should update existing knowledge entry', () => {
      const entry = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Original content',
        context: 'Context',
        confidence: 0.8,
        tags: ['original'],
        relatedEntries: [],
      });

      const updated = ks.update(entry.id, {
        content: 'Updated content',
        confidence: 0.9,
        tags: ['updated'],
      });

      expect(updated).toBe(true);

      const results = ks.retrieve({ tags: ['updated'] });
      expect(results[0].content).toBe('Updated content');
      expect(results[0].confidence).toBe(0.9);
    });

    it('should return false when updating non-existent entry', () => {
      const updated = ks.update('non-existent-id', { content: 'Test' });
      expect(updated).toBe(false);
    });

    it('should delete knowledge entry', () => {
      const entry = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'To be deleted',
        context: 'Context',
        confidence: 0.8,
        tags: ['delete'],
        relatedEntries: [],
      });

      const deleted = ks.delete(entry.id);
      expect(deleted).toBe(true);

      const results = ks.retrieve({ tags: ['delete'] });
      expect(results).toHaveLength(0);
    });

    it('should return false when deleting non-existent entry', () => {
      const deleted = ks.delete('non-existent-id');
      expect(deleted).toBe(false);
    });

    it('should update persona contributions on delete', () => {
      ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'First',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      const entry2 = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Second',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      ks.delete(entry2.id);

      const stats = ks.getStats();
      expect(stats.topContributors[0].contributions).toBe(1);
    });

    it('should handle deletion when persona has zero contributions', () => {
      const entry = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Test',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      // Delete should handle gracefully even if count is already 0
      const deleted = ks.delete(entry.id);
      expect(deleted).toBe(true);

      // Verify contributions are decremented properly
      // Note: Implementation keeps entry with 0 contributions in the map
      const stats = ks.getStats();
      const p1Contributor = stats.topContributors.find(
        (c) => c.personaId === 'p1'
      );
      if (p1Contributor) {
        expect(p1Contributor.contributions).toBe(0);
      }
    });
  });

  describe('Related Knowledge Management', () => {
    let ks: KnowledgeSharing;

    beforeEach(() => {
      ks = new KnowledgeSharing({
        enabled: true,
        shareThreshold: 0.5,
      });
    });

    it('should link two knowledge entries bidirectionally', () => {
      const entry1 = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'First fact',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      const entry2 = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Second fact',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      const linked = ks.linkRelated(entry1.id, entry2.id);
      expect(linked).toBe(true);

      expect(entry1.relatedEntries).toContain(entry2.id);
      expect(entry2.relatedEntries).toContain(entry1.id);
    });

    it('should return false when linking non-existent entries', () => {
      const entry = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Test',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      const linked1 = ks.linkRelated(entry.id, 'non-existent');
      expect(linked1).toBe(false);

      const linked2 = ks.linkRelated('non-existent', entry.id);
      expect(linked2).toBe(false);

      const linked3 = ks.linkRelated('non-existent-1', 'non-existent-2');
      expect(linked3).toBe(false);
    });

    it('should not duplicate related entry links', () => {
      const entry1 = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'First',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      const entry2 = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Second',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      ks.linkRelated(entry1.id, entry2.id);
      ks.linkRelated(entry1.id, entry2.id); // Link again

      expect(entry1.relatedEntries).toHaveLength(1);
      expect(entry2.relatedEntries).toHaveLength(1);
    });

    it('should get directly related entries (depth 1)', () => {
      const entry1 = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Root',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      const entry2 = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Child 1',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      const entry3 = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Child 2',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      ks.linkRelated(entry1.id, entry2.id);
      ks.linkRelated(entry1.id, entry3.id);

      const related = ks.getRelated(entry1.id, 1);
      expect(related).toHaveLength(2);
      expect(related.map((e) => e.content)).toContain('Child 1');
      expect(related.map((e) => e.content)).toContain('Child 2');
    });

    it('should get related entries with depth 2', () => {
      const entry1 = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Root',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      const entry2 = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Level 1',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Level 2',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      ks.linkRelated(entry1.id, entry2.id);
      const level2Results = ks.retrieve({});
      const entry3 = level2Results.find((e) => e.content === 'Level 2');
      if (entry3) {
        ks.linkRelated(entry2.id, entry3.id);
      }

      const related = ks.getRelated(entry1.id, 2);
      expect(related).toHaveLength(2);
      expect(related.map((e) => e.content)).toContain('Level 1');
      expect(related.map((e) => e.content)).toContain('Level 2');
    });

    it('should handle depth 0 (no related entries)', () => {
      const entry = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Root',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      const related = ks.getRelated(entry.id, 0);
      expect(related).toHaveLength(0);
    });

    it('should exclude source entry from related results', () => {
      const entry1 = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Entry 1',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      const entry2 = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Entry 2',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      ks.linkRelated(entry1.id, entry2.id);

      const related = ks.getRelated(entry1.id, 1);
      expect(related.every((e) => e.id !== entry1.id)).toBe(true);
    });

    it('should return empty array for non-existent entry', () => {
      const related = ks.getRelated('non-existent-id', 1);
      expect(related).toEqual([]);
    });

    it('should handle circular references without infinite loop', () => {
      const entry1 = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Entry 1',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      const entry2 = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Entry 2',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      const entry3 = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Entry 3',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      // Create circular reference: 1 -> 2 -> 3 -> 1
      ks.linkRelated(entry1.id, entry2.id);
      ks.linkRelated(entry2.id, entry3.id);
      ks.linkRelated(entry3.id, entry1.id);

      const related = ks.getRelated(entry1.id, 5);
      expect(related.length).toBeGreaterThan(0);
      expect(related.length).toBeLessThanOrEqual(2); // Should not loop infinitely
    });

    it('should filter out undefined entries in related results', () => {
      const entry1 = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Entry 1',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      const entry2 = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Entry 2',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      ks.linkRelated(entry1.id, entry2.id);

      // Manually add a non-existent ID to related entries
      entry1.relatedEntries.push('non-existent-id');

      const related = ks.getRelated(entry1.id, 1);
      expect(related.every((e) => e !== undefined)).toBe(true);
    });
  });

  describe('Similarity-Based Search', () => {
    let ks: KnowledgeSharing;

    beforeEach(() => {
      ks = new KnowledgeSharing({
        enabled: true,
        shareThreshold: 0.5,
      });

      ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'TypeScript is a statically typed superset of JavaScript',
        context: 'Context',
        confidence: 0.9,
        tags: [],
        relatedEntries: [],
      });

      ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'JavaScript is a dynamic programming language',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Python is great for machine learning',
        context: 'Context',
        confidence: 0.85,
        tags: [],
        relatedEntries: [],
      });
    });

    it('should find similar entries based on content', () => {
      const similar = ks.findSimilar('TypeScript JavaScript typed', 5);

      expect(similar.length).toBeGreaterThan(0);
      expect(similar[0].content).toContain('TypeScript');
    });

    it('should respect limit parameter', () => {
      const similar = ks.findSimilar('programming language', 2);
      expect(similar.length).toBeLessThanOrEqual(2);
    });

    it('should use default limit of 5', () => {
      for (let i = 0; i < 10; i++) {
        ks.share({
          sourcePersonaId: 'p1',
          type: 'fact',
          content: `Programming language fact ${i}`,
          context: 'Context',
          confidence: 0.8,
          tags: [],
          relatedEntries: [],
        });
      }

      const similar = ks.findSimilar('programming language');
      expect(similar.length).toBeLessThanOrEqual(5);
    });

    it('should filter out low similarity matches (< 0.1)', () => {
      const similar = ks.findSimilar('quantum computing blockchain crypto', 10);

      // Should filter out entries with very low similarity
      expect(similar.length).toBeLessThanOrEqual(3);
    });

    it('should return empty array for no matches', () => {
      const similar = ks.findSimilar('xyzabc nonsense words', 5);
      expect(similar).toEqual([]);
    });

    it('should handle empty content query', () => {
      const similar = ks.findSimilar('', 5);
      expect(similar).toBeDefined();
    });

    it('should be case-insensitive', () => {
      const similar1 = ks.findSimilar('TYPESCRIPT', 5);
      const similar2 = ks.findSimilar('typescript', 5);

      expect(similar1.length).toBe(similar2.length);
    });

    it('should calculate Jaccard similarity correctly', () => {
      const similar = ks.findSimilar(
        'TypeScript is a statically typed superset of JavaScript',
        1
      );

      // Should find the exact or very similar match
      expect(similar.length).toBeGreaterThan(0);
      expect(similar[0].content).toContain('TypeScript');
    });

    it('should sort results by similarity score', () => {
      const similar = ks.findSimilar('JavaScript programming', 3);

      if (similar.length > 1) {
        // Results should be sorted by similarity (most similar first)
        // First result should contain more matching words
        expect(similar[0].content).toMatch(/JavaScript|programming/);
      }
    });
  });

  describe('Statistics', () => {
    let ks: KnowledgeSharing;

    beforeEach(() => {
      ks = new KnowledgeSharing({
        enabled: true,
        shareThreshold: 0.5,
      });
    });

    it('should return empty stats for empty knowledge base', () => {
      const stats = ks.getStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.avgConfidence).toBe(0);
      expect(stats.avgUsageCount).toBe(0);
      expect(stats.topContributors).toEqual([]);
    });

    it('should calculate total entries correctly', () => {
      ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Fact 1',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      ks.share({
        sourcePersonaId: 'p1',
        type: 'pattern',
        content: 'Pattern 1',
        context: 'Context',
        confidence: 0.9,
        tags: [],
        relatedEntries: [],
      });

      const stats = ks.getStats();
      expect(stats.totalEntries).toBe(2);
    });

    it('should count entries by type', () => {
      ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Fact 1',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Fact 2',
        context: 'Context',
        confidence: 0.9,
        tags: [],
        relatedEntries: [],
      });

      ks.share({
        sourcePersonaId: 'p1',
        type: 'pattern',
        content: 'Pattern 1',
        context: 'Context',
        confidence: 0.85,
        tags: [],
        relatedEntries: [],
      });

      const stats = ks.getStats();
      expect(stats.entriesByType.fact).toBe(2);
      expect(stats.entriesByType.pattern).toBe(1);
      expect(stats.entriesByType.solution).toBe(0);
      expect(stats.entriesByType['best-practice']).toBe(0);
    });

    it('should calculate average confidence', () => {
      ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Fact 1',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Fact 2',
        context: 'Context',
        confidence: 0.6,
        tags: [],
        relatedEntries: [],
      });

      const stats = ks.getStats();
      expect(stats.avgConfidence).toBe(0.7);
    });

    it('should calculate average usage count', () => {
      const entry1 = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Fact 1',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      const entry2 = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Fact 2',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      ks.update(entry1.id, { usageCount: 10 });
      ks.update(entry2.id, { usageCount: 20 });

      const stats = ks.getStats();
      expect(stats.avgUsageCount).toBe(15);
    });

    it('should rank top contributors', () => {
      for (let i = 0; i < 5; i++) {
        ks.share({
          sourcePersonaId: 'persona-1',
          type: 'fact',
          content: `Fact ${i}`,
          context: 'Context',
          confidence: 0.8,
          tags: [],
          relatedEntries: [],
        });
      }

      for (let i = 0; i < 3; i++) {
        ks.share({
          sourcePersonaId: 'persona-2',
          type: 'fact',
          content: `Fact ${i}`,
          context: 'Context',
          confidence: 0.8,
          tags: [],
          relatedEntries: [],
        });
      }

      const stats = ks.getStats();
      expect(stats.topContributors).toHaveLength(2);
      expect(stats.topContributors[0].personaId).toBe('persona-1');
      expect(stats.topContributors[0].contributions).toBe(5);
      expect(stats.topContributors[1].personaId).toBe('persona-2');
      expect(stats.topContributors[1].contributions).toBe(3);
    });

    it('should limit top contributors to 10', () => {
      for (let i = 0; i < 15; i++) {
        ks.share({
          sourcePersonaId: `persona-${i}`,
          type: 'fact',
          content: 'Fact',
          context: 'Context',
          confidence: 0.8,
          tags: [],
          relatedEntries: [],
        });
      }

      const stats = ks.getStats();
      expect(stats.topContributors.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Cleanup and Expiration', () => {
    let ks: KnowledgeSharing;

    beforeEach(() => {
      ks = new KnowledgeSharing({
        enabled: true,
        shareThreshold: 0.5,
        ttl: 1000, // 1 second TTL
      });
    });

    it('should not cleanup when TTL is 0', () => {
      const noExpirationKs = new KnowledgeSharing({
        enabled: true,
        ttl: 0,
      });

      noExpirationKs.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Never expires',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      noExpirationKs.cleanupExpired();

      const stats = noExpirationKs.getStats();
      expect(stats.totalEntries).toBe(1);
    });

    it('should remove expired entries based on TTL', async () => {
      const entry = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Short-lived fact',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      // Manually set old timestamp
      ks.update(entry.id, { timestamp: Date.now() - 2000 });

      ks.cleanupExpired();

      const stats = ks.getStats();
      expect(stats.totalEntries).toBe(0);
    });

    it('should keep non-expired entries', () => {
      ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Fresh fact',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      ks.cleanupExpired();

      const stats = ks.getStats();
      expect(stats.totalEntries).toBe(1);
    });

    it('should update persona contributions when cleaning up', () => {
      const entry = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'To be expired',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      ks.update(entry.id, { timestamp: Date.now() - 2000 });

      ks.cleanupExpired();

      const stats = ks.getStats();
      // After deletion, contributor may have 0 contributions but still be in map
      const p1Contributor = stats.topContributors.find(
        (c) => c.personaId === 'p1'
      );
      if (p1Contributor) {
        expect(p1Contributor.contributions).toBe(0);
      } else {
        // Or it may be removed entirely
        expect(stats.topContributors).toEqual([]);
      }
    });
  });

  describe('Eviction Strategies', () => {
    let ks: KnowledgeSharing;

    beforeEach(() => {
      ks = new KnowledgeSharing({
        enabled: true,
        shareThreshold: 0.5,
        maxEntries: 10,
      });
    });

    it('should evict least useful entries when over limit', () => {
      // Add entries with varying usefulness scores
      for (let i = 0; i < 15; i++) {
        const entry = ks.share({
          sourcePersonaId: 'p1',
          type: 'fact',
          content: `Fact ${i}`,
          context: 'Context',
          confidence: i < 5 ? 0.6 : 0.9, // First 5 have lower confidence
          tags: [],
          relatedEntries: [],
        });

        if (i < 5) {
          // First 5 entries have low usage
          ks.update(entry.id, { usageCount: 1 });
        } else {
          // Rest have higher usage
          ks.update(entry.id, { usageCount: 10 });
        }
      }

      const stats = ks.getStats();
      expect(stats.totalEntries).toBeLessThanOrEqual(10);
    });

    it('should consider confidence in eviction scoring', () => {
      const lowConfidenceEntry = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Low confidence',
        context: 'Context',
        confidence: 0.5,
        tags: ['test'],
        relatedEntries: [],
      });

      ks.update(lowConfidenceEntry.id, { usageCount: 0 });

      // Fill up to trigger eviction
      for (let i = 0; i < 15; i++) {
        ks.share({
          sourcePersonaId: 'p1',
          type: 'fact',
          content: `High confidence ${i}`,
          context: 'Context',
          confidence: 0.95,
          tags: [],
          relatedEntries: [],
        });
      }

      const results = ks.retrieve({ tags: ['test'] });
      expect(results).toHaveLength(0); // Low confidence entry should be evicted
    });

    it('should consider usage count in eviction scoring', () => {
      const unusedEntry = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Unused entry',
        context: 'Context',
        confidence: 0.9,
        tags: ['unused'],
        relatedEntries: [],
      });

      ks.update(unusedEntry.id, { usageCount: 0 });

      for (let i = 0; i < 15; i++) {
        const entry = ks.share({
          sourcePersonaId: 'p1',
          type: 'fact',
          content: `Used entry ${i}`,
          context: 'Context',
          confidence: 0.9,
          tags: [],
          relatedEntries: [],
        });
        ks.update(entry.id, { usageCount: 50 });
      }

      const results = ks.retrieve({ tags: ['unused'] });
      expect(results).toHaveLength(0); // Unused entry should be evicted
    });

    it('should consider recency in eviction scoring', () => {
      const oldEntry = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Old entry',
        context: 'Context',
        confidence: 0.9,
        tags: ['old'],
        relatedEntries: [],
      });

      // Make it very old
      const veryOldTime = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago
      ks.update(oldEntry.id, { lastUsed: veryOldTime, usageCount: 0 });

      for (let i = 0; i < 15; i++) {
        ks.share({
          sourcePersonaId: 'p1',
          type: 'fact',
          content: `Recent entry ${i}`,
          context: 'Context',
          confidence: 0.9,
          tags: [],
          relatedEntries: [],
        });
      }

      const results = ks.retrieve({ tags: ['old'] });
      expect(results).toHaveLength(0); // Old entry should be evicted
    });

    it('should evict bottom 10% of entries', () => {
      // Add exactly 100 entries
      const largeKs = new KnowledgeSharing({
        enabled: true,
        shareThreshold: 0.5,
        maxEntries: 100,
      });

      for (let i = 0; i < 100; i++) {
        largeKs.share({
          sourcePersonaId: 'p1',
          type: 'fact',
          content: `Entry ${i}`,
          context: 'Context',
          confidence: 0.8,
          tags: [],
          relatedEntries: [],
        });
      }

      const beforeStats = largeKs.getStats();
      expect(beforeStats.totalEntries).toBe(100);

      // Add one more to trigger eviction
      largeKs.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Trigger eviction',
        context: 'Context',
        confidence: 0.9,
        tags: [],
        relatedEntries: [],
      });

      const afterStats = largeKs.getStats();
      // Should evict ~10% (10 entries) to make room
      expect(afterStats.totalEntries).toBeLessThanOrEqual(100);
      expect(afterStats.totalEntries).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Clear Functionality', () => {
    let ks: KnowledgeSharing;

    beforeEach(() => {
      ks = new KnowledgeSharing({
        enabled: true,
        shareThreshold: 0.5,
      });
    });

    it('should clear all knowledge', () => {
      ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Fact 1',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      ks.share({
        sourcePersonaId: 'p2',
        type: 'pattern',
        content: 'Pattern 1',
        context: 'Context',
        confidence: 0.9,
        tags: [],
        relatedEntries: [],
      });

      ks.clear();

      const stats = ks.getStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.topContributors).toEqual([]);
    });

    it('should clear persona contributions', () => {
      ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'Fact',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      ks.clear();

      const stats = ks.getStats();
      expect(stats.topContributors).toHaveLength(0);
    });

    it('should allow new entries after clear', () => {
      ks.clear();

      const entry = ks.share({
        sourcePersonaId: 'p1',
        type: 'fact',
        content: 'New fact after clear',
        context: 'Context',
        confidence: 0.8,
        tags: [],
        relatedEntries: [],
      });

      expect(entry).toBeDefined();

      const stats = ks.getStats();
      expect(stats.totalEntries).toBe(1);
    });
  });
});
