/**
 * Tests for Semantic Deduplication
 */

import { SemanticDeduplicator } from '../../../src/runtime/context/deduplication.js';
import type { ContextMessage } from '../../../src/runtime/memory/types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Message Factory
// ═══════════════════════════════════════════════════════════════════════════════

function createMessage(
  overrides: Partial<ContextMessage> = {}
): ContextMessage {
  return {
    id: `msg-${Math.random()}`,
    role: 'user',
    content: 'Test message content',
    timestamp: Date.now(),
    tokenCount: 10,
    importance: 0.5,
    metadata: {},
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('SemanticDeduplicator', () => {
  describe('initialization', () => {
    it('should initialize with default threshold', () => {
      const deduplicator = new SemanticDeduplicator();
      expect(deduplicator.getSimilarityThreshold()).toBe(0.9);
    });

    it('should initialize with custom threshold', () => {
      const deduplicator = new SemanticDeduplicator(0.8);
      expect(deduplicator.getSimilarityThreshold()).toBe(0.8);
    });

    it('should allow updating threshold', () => {
      const deduplicator = new SemanticDeduplicator();
      deduplicator.setSimilarityThreshold(0.75);
      expect(deduplicator.getSimilarityThreshold()).toBe(0.75);
    });

    it('should throw error for invalid threshold (too low)', () => {
      const deduplicator = new SemanticDeduplicator();
      expect(() => deduplicator.setSimilarityThreshold(-0.1)).toThrow(
        'Similarity threshold must be between 0 and 1'
      );
    });

    it('should throw error for invalid threshold (too high)', () => {
      const deduplicator = new SemanticDeduplicator();
      expect(() => deduplicator.setSimilarityThreshold(1.1)).toThrow(
        'Similarity threshold must be between 0 and 1'
      );
    });

    it('should accept threshold at boundaries', () => {
      const deduplicator = new SemanticDeduplicator();
      deduplicator.setSimilarityThreshold(0);
      expect(deduplicator.getSimilarityThreshold()).toBe(0);
      deduplicator.setSimilarityThreshold(1);
      expect(deduplicator.getSimilarityThreshold()).toBe(1);
    });
  });

  describe('text similarity', () => {
    it('should return high similarity for identical text and structure', () => {
      const deduplicator = new SemanticDeduplicator();
      const timestamp = Date.now();
      const msg1 = createMessage({
        content: 'Hello world',
        timestamp,
        role: 'user',
        tokenCount: 10,
        importance: 0.5,
      });
      const msg2 = createMessage({
        content: 'Hello world',
        timestamp,
        role: 'user',
        tokenCount: 10,
        importance: 0.5,
      });

      const similarity = deduplicator.computeSimilarity(msg1, msg2);
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should be case-insensitive', () => {
      const deduplicator = new SemanticDeduplicator();
      const timestamp = Date.now();
      const msg1 = createMessage({
        content: 'Hello World',
        timestamp,
        tokenCount: 10,
      });
      const msg2 = createMessage({
        content: 'hello world',
        timestamp,
        tokenCount: 10,
      });

      const similarity = deduplicator.computeSimilarity(msg1, msg2);
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should ignore punctuation', () => {
      const deduplicator = new SemanticDeduplicator();
      const timestamp = Date.now();
      const msg1 = createMessage({
        content: 'Hello, world!',
        timestamp,
        tokenCount: 10,
      });
      const msg2 = createMessage({
        content: 'Hello world',
        timestamp,
        tokenCount: 10,
      });

      const similarity = deduplicator.computeSimilarity(msg1, msg2);
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should compute partial similarity for overlapping text', () => {
      const deduplicator = new SemanticDeduplicator();
      const msg1 = createMessage({ content: 'The quick brown fox' });
      const msg2 = createMessage({ content: 'The quick brown dog' });

      const similarity = deduplicator.computeSimilarity(msg1, msg2);
      expect(similarity).toBeGreaterThan(0.4);
      expect(similarity).toBeLessThan(0.8);
    });

    it('should return low similarity for completely different text', () => {
      const deduplicator = new SemanticDeduplicator();
      const msg1 = createMessage({ content: 'apple banana cherry' });
      const msg2 = createMessage({ content: 'xyz abc def' });

      const similarity = deduplicator.computeSimilarity(msg1, msg2);
      expect(similarity).toBeLessThan(0.3);
    });
  });

  describe('structural similarity', () => {
    it('should give higher score for same role', () => {
      const deduplicator = new SemanticDeduplicator();
      const baseTime = Date.now();

      const msg1 = createMessage({
        content: 'Test',
        role: 'user',
        tokenCount: 10,
        importance: 0.5,
        timestamp: baseTime,
      });

      const msg2SameRole = createMessage({
        content: 'Test',
        role: 'user',
        tokenCount: 10,
        importance: 0.5,
        timestamp: baseTime,
      });

      const msg3DiffRole = createMessage({
        content: 'Test',
        role: 'assistant',
        tokenCount: 10,
        importance: 0.5,
        timestamp: baseTime,
      });

      const sim1 = deduplicator.computeSimilarity(msg1, msg2SameRole);
      const sim2 = deduplicator.computeSimilarity(msg1, msg3DiffRole);

      expect(sim1).toBeGreaterThan(sim2);
    });

    it('should give higher score for similar token counts', () => {
      const deduplicator = new SemanticDeduplicator();

      const msg1 = createMessage({ content: 'Test', tokenCount: 100 });
      const msg2Similar = createMessage({ content: 'Test', tokenCount: 105 });
      const msg3Different = createMessage({ content: 'Test', tokenCount: 500 });

      const sim1 = deduplicator.computeSimilarity(msg1, msg2Similar);
      const sim2 = deduplicator.computeSimilarity(msg1, msg3Different);

      expect(sim1).toBeGreaterThan(sim2);
    });

    it('should give higher score for similar importance', () => {
      const deduplicator = new SemanticDeduplicator();

      const msg1 = createMessage({ content: 'Test', importance: 0.5 });
      const msg2Similar = createMessage({ content: 'Test', importance: 0.55 });
      const msg3Different = createMessage({ content: 'Test', importance: 0.1 });

      const sim1 = deduplicator.computeSimilarity(msg1, msg2Similar);
      const sim2 = deduplicator.computeSimilarity(msg1, msg3Different);

      expect(sim1).toBeGreaterThan(sim2);
    });

    it('should give higher score for closer timestamps', () => {
      const deduplicator = new SemanticDeduplicator();
      const baseTime = Date.now();

      const msg1 = createMessage({ content: 'Test', timestamp: baseTime });
      const msg2Close = createMessage({
        content: 'Test',
        timestamp: baseTime + 1000,
      }); // 1 second later
      const msg3Far = createMessage({
        content: 'Test',
        timestamp: baseTime + 3600000,
      }); // 1 hour later

      const sim1 = deduplicator.computeSimilarity(msg1, msg2Close);
      const sim2 = deduplicator.computeSimilarity(msg1, msg3Far);

      expect(sim1).toBeGreaterThan(sim2);
    });
  });

  describe('deduplicate', () => {
    it('should identify exact duplicates', () => {
      const deduplicator = new SemanticDeduplicator(0.7); // Lower threshold for test
      const timestamp = Date.now();
      const msg1 = createMessage({
        id: 'msg-1',
        content: 'Hello world',
        tokenCount: 10,
        timestamp,
        role: 'user',
        importance: 0.5,
      });
      const msg2 = createMessage({
        id: 'msg-2',
        content: 'Hello world',
        tokenCount: 10,
        timestamp,
        role: 'user',
        importance: 0.5,
      });
      const msg3 = createMessage({
        id: 'msg-3',
        content: 'Different message',
        tokenCount: 15,
        timestamp,
      });

      const result = deduplicator.deduplicate([msg1, msg2, msg3]);

      expect(result.kept).toContain('msg-1');
      expect(result.kept).toContain('msg-3');
      expect(result.duplicates).toContain('msg-2');
      expect(result.removedCount).toBe(1);
      expect(result.tokensSaved).toBe(10);
    });

    it('should keep no duplicates when all messages are unique', () => {
      const deduplicator = new SemanticDeduplicator(0.7);
      const msg1 = createMessage({ id: 'msg-1', content: 'Message one' });
      const msg2 = createMessage({ id: 'msg-2', content: 'Message two' });
      const msg3 = createMessage({ id: 'msg-3', content: 'Message three' });

      const result = deduplicator.deduplicate([msg1, msg2, msg3]);

      expect(result.kept.length).toBe(3);
      expect(result.duplicates.length).toBe(0);
      expect(result.removedCount).toBe(0);
      expect(result.tokensSaved).toBe(0);
    });

    it('should handle empty message list', () => {
      const deduplicator = new SemanticDeduplicator();
      const result = deduplicator.deduplicate([]);

      expect(result.kept.length).toBe(0);
      expect(result.duplicates.length).toBe(0);
      expect(result.removedCount).toBe(0);
      expect(result.tokensSaved).toBe(0);
    });

    it('should handle single message', () => {
      const deduplicator = new SemanticDeduplicator();
      const msg = createMessage({ id: 'msg-1' });

      const result = deduplicator.deduplicate([msg]);

      expect(result.kept).toEqual(['msg-1']);
      expect(result.duplicates.length).toBe(0);
    });

    it('should update importance of kept message when duplicate is more important', () => {
      const deduplicator = new SemanticDeduplicator(0.7);
      const timestamp = Date.now();
      const msg1 = createMessage({
        id: 'msg-1',
        content: 'Hello world',
        importance: 0.3,
        timestamp,
        tokenCount: 10,
        role: 'user',
      });
      const msg2 = createMessage({
        id: 'msg-2',
        content: 'Hello world',
        importance: 0.8,
        timestamp,
        tokenCount: 10,
        role: 'user',
      });

      deduplicator.deduplicate([msg1, msg2]);

      expect(msg1.importance).toBe(0.8); // Updated to msg2's importance
    });

    it('should calculate correct tokens saved', () => {
      const deduplicator = new SemanticDeduplicator(0.7);
      const timestamp = Date.now();
      const msg1 = createMessage({
        id: 'msg-1',
        content: 'Same',
        tokenCount: 10,
        timestamp,
        role: 'user',
        importance: 0.5,
      });
      const msg2 = createMessage({
        id: 'msg-2',
        content: 'Same',
        tokenCount: 15,
        timestamp,
        role: 'user',
        importance: 0.5,
      });
      const msg3 = createMessage({
        id: 'msg-3',
        content: 'Same',
        tokenCount: 20,
        timestamp,
        role: 'user',
        importance: 0.5,
      });

      const result = deduplicator.deduplicate([msg1, msg2, msg3]);

      expect(result.tokensSaved).toBe(35); // 15 + 20
    });
  });

  describe('findDuplicates', () => {
    it('should find duplicates of a target message', () => {
      const deduplicator = new SemanticDeduplicator(0.7);
      const timestamp = Date.now();
      const target = createMessage({
        id: 'target',
        content: 'Hello world',
        timestamp,
        tokenCount: 10,
        role: 'user',
        importance: 0.5,
      });
      const dup1 = createMessage({
        id: 'dup1',
        content: 'Hello world',
        timestamp,
        tokenCount: 10,
        role: 'user',
        importance: 0.5,
      });
      const dup2 = createMessage({
        id: 'dup2',
        content: 'Hello world',
        timestamp,
        tokenCount: 10,
        role: 'user',
        importance: 0.5,
      });
      const different = createMessage({ id: 'diff', content: 'Different' });

      const duplicates = deduplicator.findDuplicates(target, [
        dup1,
        dup2,
        different,
      ]);

      expect(duplicates.length).toBe(2);
      expect(duplicates).toContainEqual(dup1);
      expect(duplicates).toContainEqual(dup2);
    });

    it('should exclude target itself from results', () => {
      const deduplicator = new SemanticDeduplicator(0.7);
      const timestamp = Date.now();
      const target = createMessage({
        id: 'target',
        content: 'Hello',
        timestamp,
        tokenCount: 5,
        role: 'user',
        importance: 0.5,
      });
      const dup = createMessage({
        id: 'dup',
        content: 'Hello',
        timestamp,
        tokenCount: 5,
        role: 'user',
        importance: 0.5,
      });

      const duplicates = deduplicator.findDuplicates(target, [target, dup]);

      expect(duplicates.length).toBe(1);
      expect(duplicates[0].id).toBe('dup');
    });

    it('should return empty array when no duplicates found', () => {
      const deduplicator = new SemanticDeduplicator(0.7);
      const target = createMessage({ content: 'Unique' });
      const different1 = createMessage({ content: 'Different one' });
      const different2 = createMessage({ content: 'Different two' });

      const duplicates = deduplicator.findDuplicates(target, [
        different1,
        different2,
      ]);

      expect(duplicates.length).toBe(0);
    });
  });

  describe('isDuplicate', () => {
    it('should return true for duplicate messages', () => {
      const deduplicator = new SemanticDeduplicator(0.7);
      const timestamp = Date.now();
      const msg1 = createMessage({
        content: 'Same message',
        timestamp,
        tokenCount: 10,
        role: 'user',
        importance: 0.5,
      });
      const msg2 = createMessage({
        content: 'Same message',
        timestamp,
        tokenCount: 10,
        role: 'user',
        importance: 0.5,
      });

      expect(deduplicator.isDuplicate(msg1, msg2)).toBe(true);
    });

    it('should return false for different messages', () => {
      const deduplicator = new SemanticDeduplicator(0.7);
      const msg1 = createMessage({ content: 'Message one' });
      const msg2 = createMessage({ content: 'Message two' });

      expect(deduplicator.isDuplicate(msg1, msg2)).toBe(false);
    });

    it('should respect similarity threshold', () => {
      const deduplicator = new SemanticDeduplicator(0.99); // Very strict
      const msg1 = createMessage({ content: 'The quick brown fox' });
      const msg2 = createMessage({ content: 'The quick brown dog' }); // Slightly different

      expect(deduplicator.isDuplicate(msg1, msg2)).toBe(false);
    });
  });

  describe('clusterSimilar', () => {
    it('should group similar messages into clusters', () => {
      const deduplicator = new SemanticDeduplicator(0.7);
      const timestamp = Date.now();
      const msg1 = createMessage({
        id: 'msg-1',
        content: 'Group A',
        timestamp,
        tokenCount: 8,
        role: 'user',
        importance: 0.5,
      });
      const msg2 = createMessage({
        id: 'msg-2',
        content: 'Group A',
        timestamp,
        tokenCount: 8,
        role: 'user',
        importance: 0.5,
      });
      const msg3 = createMessage({
        id: 'msg-3',
        content: 'Group B',
        timestamp,
        tokenCount: 8,
        role: 'user',
        importance: 0.5,
      });
      const msg4 = createMessage({
        id: 'msg-4',
        content: 'Group B',
        timestamp,
        tokenCount: 8,
        role: 'user',
        importance: 0.5,
      });

      const clusters = deduplicator.clusterSimilar([msg1, msg2, msg3, msg4]);

      expect(clusters.length).toBe(2);
      expect(clusters[0].length).toBe(2);
      expect(clusters[1].length).toBe(2);
    });

    it('should put unique messages in separate clusters', () => {
      const deduplicator = new SemanticDeduplicator(0.7);
      const msg1 = createMessage({ content: 'Unique one' });
      const msg2 = createMessage({ content: 'Unique two' });
      const msg3 = createMessage({ content: 'Unique three' });

      const clusters = deduplicator.clusterSimilar([msg1, msg2, msg3]);

      expect(clusters.length).toBe(3);
      expect(clusters[0].length).toBe(1);
      expect(clusters[1].length).toBe(1);
      expect(clusters[2].length).toBe(1);
    });

    it('should handle empty message list', () => {
      const deduplicator = new SemanticDeduplicator();
      const clusters = deduplicator.clusterSimilar([]);

      expect(clusters.length).toBe(0);
    });

    it('should handle single message', () => {
      const deduplicator = new SemanticDeduplicator();
      const msg = createMessage();

      const clusters = deduplicator.clusterSimilar([msg]);

      expect(clusters.length).toBe(1);
      expect(clusters[0].length).toBe(1);
    });
  });

  describe('getRepresentative', () => {
    it('should return the message with highest score', () => {
      const deduplicator = new SemanticDeduplicator();
      const msg1 = createMessage({
        id: 'msg-1',
        importance: 0.5,
        tokenCount: 100,
      });
      const msg2 = createMessage({
        id: 'msg-2',
        importance: 0.8,
        tokenCount: 100,
      }); // Higher importance
      const msg3 = createMessage({
        id: 'msg-3',
        importance: 0.5,
        tokenCount: 200,
      });

      const representative = deduplicator.getRepresentative([msg1, msg2, msg3]);

      expect(representative.id).toBe('msg-2'); // Highest importance
    });

    it('should return single message from single-message cluster', () => {
      const deduplicator = new SemanticDeduplicator();
      const msg = createMessage({ id: 'only-one' });

      const representative = deduplicator.getRepresentative([msg]);

      expect(representative.id).toBe('only-one');
    });

    it('should throw error for empty cluster', () => {
      const deduplicator = new SemanticDeduplicator();

      expect(() => deduplicator.getRepresentative([])).toThrow(
        'Cannot get representative from empty cluster'
      );
    });

    it('should weight importance more than token count', () => {
      const deduplicator = new SemanticDeduplicator();
      const msg1 = createMessage({
        id: 'msg-1',
        importance: 0.9,
        tokenCount: 10,
      }); // High importance, low tokens
      const msg2 = createMessage({
        id: 'msg-2',
        importance: 0.1,
        tokenCount: 1000,
      }); // Low importance, high tokens

      const representative = deduplicator.getRepresentative([msg1, msg2]);

      expect(representative.id).toBe('msg-1'); // Importance (60%) > tokens (40%)
    });
  });

  describe('deduplicateByClustering', () => {
    it('should deduplicate using clustering approach', () => {
      const deduplicator = new SemanticDeduplicator(0.7);
      const timestamp = Date.now();
      const msg1 = createMessage({
        id: 'msg-1',
        content: 'Group A',
        importance: 0.8,
        tokenCount: 10,
        timestamp,
        role: 'user',
      });
      const msg2 = createMessage({
        id: 'msg-2',
        content: 'Group A',
        importance: 0.5,
        tokenCount: 10,
        timestamp,
        role: 'user',
      });
      const msg3 = createMessage({
        id: 'msg-3',
        content: 'Group B',
        importance: 0.6,
        tokenCount: 15,
        timestamp,
        role: 'user',
      });

      const result = deduplicator.deduplicateByClustering([msg1, msg2, msg3]);

      expect(result.kept.length).toBe(2);
      expect(result.kept).toContain('msg-1'); // Best from Group A
      expect(result.kept).toContain('msg-3'); // Only in Group B
      expect(result.duplicates).toContain('msg-2');
      expect(result.removedCount).toBe(1);
      expect(result.tokensSaved).toBe(10);
    });

    it('should keep all messages when none are similar', () => {
      const deduplicator = new SemanticDeduplicator(0.7);
      const msg1 = createMessage({
        id: 'msg-1',
        content: 'Unique A',
        tokenCount: 10,
      });
      const msg2 = createMessage({
        id: 'msg-2',
        content: 'Unique B',
        tokenCount: 15,
      });
      const msg3 = createMessage({
        id: 'msg-3',
        content: 'Unique C',
        tokenCount: 20,
      });

      const result = deduplicator.deduplicateByClustering([msg1, msg2, msg3]);

      expect(result.kept.length).toBe(3);
      expect(result.duplicates.length).toBe(0);
      expect(result.tokensSaved).toBe(0);
    });

    it('should handle empty message list', () => {
      const deduplicator = new SemanticDeduplicator();
      const result = deduplicator.deduplicateByClustering([]);

      expect(result.kept.length).toBe(0);
      expect(result.duplicates.length).toBe(0);
      expect(result.removedCount).toBe(0);
      expect(result.tokensSaved).toBe(0);
    });

    it('should calculate correct tokens saved', () => {
      const deduplicator = new SemanticDeduplicator(0.7);
      const timestamp = Date.now();
      const msg1 = createMessage({
        id: 'msg-1',
        content: 'Same',
        importance: 0.9,
        tokenCount: 10,
        timestamp,
        role: 'user',
      });
      const msg2 = createMessage({
        id: 'msg-2',
        content: 'Same',
        importance: 0.5,
        tokenCount: 20,
        timestamp,
        role: 'user',
      });
      const msg3 = createMessage({
        id: 'msg-3',
        content: 'Same',
        importance: 0.3,
        tokenCount: 30,
        timestamp,
        role: 'user',
      });

      const result = deduplicator.deduplicateByClustering([msg1, msg2, msg3]);

      expect(result.tokensSaved).toBe(50); // 20 + 30 (msg2 and msg3 removed)
      expect(result.kept).toContain('msg-1'); // Highest importance
    });
  });

  describe('edge cases', () => {
    it('should handle very long text', () => {
      const deduplicator = new SemanticDeduplicator();
      const longText = 'word '.repeat(1000);
      const timestamp = Date.now();
      const msg1 = createMessage({
        content: longText,
        timestamp,
        tokenCount: 1000,
        role: 'user',
        importance: 0.5,
      });
      const msg2 = createMessage({
        content: longText,
        timestamp,
        tokenCount: 1000,
        role: 'user',
        importance: 0.5,
      });

      const similarity = deduplicator.computeSimilarity(msg1, msg2);
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should handle empty text content', () => {
      const deduplicator = new SemanticDeduplicator();
      const msg1 = createMessage({ content: '' });
      const msg2 = createMessage({ content: '' });

      const similarity = deduplicator.computeSimilarity(msg1, msg2);
      expect(similarity).toBeDefined();
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('should handle special characters in text', () => {
      const deduplicator = new SemanticDeduplicator();
      const msg1 = createMessage({ content: '@#$%^&*()_+-=[]{}|;:",.<>?/' });
      const msg2 = createMessage({ content: '@#$%^&*()_+-=[]{}|;:",.<>?/' });

      const similarity = deduplicator.computeSimilarity(msg1, msg2);
      expect(similarity).toBeGreaterThan(0.5);
    });

    it('should handle Unicode characters', () => {
      const deduplicator = new SemanticDeduplicator();
      const timestamp = Date.now();
      const msg1 = createMessage({
        content: 'Hello 世界 🌍',
        timestamp,
        tokenCount: 15,
        role: 'user',
        importance: 0.5,
      });
      const msg2 = createMessage({
        content: 'Hello 世界 🌍',
        timestamp,
        tokenCount: 15,
        role: 'user',
        importance: 0.5,
      });

      const similarity = deduplicator.computeSimilarity(msg1, msg2);
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should handle very low similarity threshold', () => {
      const deduplicator = new SemanticDeduplicator(0.01);
      const msg1 = createMessage({ id: 'msg-1', content: 'A' });
      const msg2 = createMessage({ id: 'msg-2', content: 'Z' });

      const result = deduplicator.deduplicate([msg1, msg2]);

      // With very low threshold, even different messages might be considered duplicates
      expect(result.kept.length).toBeGreaterThan(0);
    });

    it('should handle messages with same timestamp', () => {
      const deduplicator = new SemanticDeduplicator();
      const timestamp = Date.now();
      const msg1 = createMessage({
        content: 'Test',
        timestamp,
        tokenCount: 5,
        role: 'user',
        importance: 0.5,
      });
      const msg2 = createMessage({
        content: 'Test',
        timestamp,
        tokenCount: 5,
        role: 'user',
        importance: 0.5,
      });

      const similarity = deduplicator.computeSimilarity(msg1, msg2);
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should handle zero importance', () => {
      const deduplicator = new SemanticDeduplicator();
      const timestamp = Date.now();
      const msg1 = createMessage({
        content: 'Test',
        importance: 0,
        timestamp,
        tokenCount: 5,
        role: 'user',
      });
      const msg2 = createMessage({
        content: 'Test',
        importance: 0,
        timestamp,
        tokenCount: 5,
        role: 'user',
      });

      const similarity = deduplicator.computeSimilarity(msg1, msg2);
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should handle zero token count', () => {
      const deduplicator = new SemanticDeduplicator();
      const timestamp = Date.now();
      const msg1 = createMessage({
        content: '',
        tokenCount: 0,
        timestamp,
        role: 'user',
        importance: 0.5,
      });
      const msg2 = createMessage({
        content: '',
        tokenCount: 0,
        timestamp,
        role: 'user',
        importance: 0.5,
      });

      const similarity = deduplicator.computeSimilarity(msg1, msg2);
      expect(similarity).toBeDefined();
    });
  });
});
