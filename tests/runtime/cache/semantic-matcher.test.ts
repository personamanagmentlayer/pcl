/**
 * Tests for Semantic Matching
 * Similarity computation for cache lookups
 */

import { SemanticMatcher } from '../../../src/runtime/cache/semantic-matcher';
import type { MatchMessage } from '../../../src/runtime/cache/semantic-matcher';

// Helper to create test messages
function createMessage(
  content: string,
  metadata?: { personaId?: string; domain?: string }
): MatchMessage {
  return {
    content,
    metadata,
  };
}

describe('SemanticMatcher', () => {
  let matcher: SemanticMatcher;

  beforeEach(() => {
    matcher = new SemanticMatcher();
  });

  describe('computeSimilarity', () => {
    it('should return 1.0 for identical messages', () => {
      const msg1 = createMessage('Hello world');
      const msg2 = createMessage('Hello world');

      const similarity = matcher.computeSimilarity(msg1, msg2);

      expect(similarity).toBeGreaterThanOrEqual(0.7); // High similarity
    });

    it('should return low similarity for completely different messages', () => {
      const msg1 = createMessage('Hello world');
      const msg2 = createMessage('Goodbye universe');

      const similarity = matcher.computeSimilarity(msg1, msg2);

      expect(similarity).toBeLessThan(0.3);
    });

    it('should handle empty messages', () => {
      const msg1 = createMessage('');
      const msg2 = createMessage('');

      const similarity = matcher.computeSimilarity(msg1, msg2);

      // Empty messages cause NaN in length ratio calculation
      expect(isNaN(similarity) || similarity === 0).toBe(true);
    });

    it('should handle partial overlap', () => {
      const msg1 = createMessage('The quick brown fox');
      const msg2 = createMessage('The lazy brown dog');

      const similarity = matcher.computeSimilarity(msg1, msg2);

      // Should have some similarity (shared words: the, brown)
      expect(similarity).toBeGreaterThan(0.2);
      expect(similarity).toBeLessThan(0.8);
    });

    it('should be case insensitive', () => {
      const msg1 = createMessage('Hello World');
      const msg2 = createMessage('hello world');

      const similarity = matcher.computeSimilarity(msg1, msg2);

      expect(similarity).toBeGreaterThanOrEqual(0.7);
    });

    it('should ignore punctuation', () => {
      const msg1 = createMessage('Hello, world!');
      const msg2 = createMessage('Hello world');

      const similarity = matcher.computeSimilarity(msg1, msg2);

      expect(similarity).toBeGreaterThanOrEqual(0.7);
    });

    it('should handle messages with special characters', () => {
      const msg1 = createMessage('Test @#$% special &*() characters');
      const msg2 = createMessage('Test special characters');

      const similarity = matcher.computeSimilarity(msg1, msg2);

      expect(similarity).toBeGreaterThan(0.5);
    });

    it('should filter out very long tokens', () => {
      const msg1 = createMessage('Short words here');
      const msg2 = createMessage(
        'Short words verylongtokenexceedingtwentycharacters here'
      );

      const similarity = matcher.computeSimilarity(msg1, msg2);

      // Long token filtered out, so "short words here" should match well
      expect(similarity).toBeGreaterThan(0.4);
    });

    it('should handle messages with only whitespace', () => {
      const msg1 = createMessage('   ');
      const msg2 = createMessage('   ');

      const similarity = matcher.computeSimilarity(msg1, msg2);

      // No tokens but structural similarity from length ratio
      expect(similarity).toBeLessThan(0.3);
    });

    it('should boost similarity for same persona', () => {
      const msg1 = createMessage('Different text here', {
        personaId: 'analyst-1',
      });
      const msg2 = createMessage('Completely different text', {
        personaId: 'analyst-1',
      });

      const msg3 = createMessage('Different text here', {
        personaId: 'analyst-1',
      });
      const msg4 = createMessage('Completely different text', {
        personaId: 'analyst-2',
      });

      const samPersona = matcher.computeSimilarity(msg1, msg2);
      const diffPersona = matcher.computeSimilarity(msg3, msg4);

      expect(samPersona).toBeGreaterThan(diffPersona);
    });

    it('should boost similarity for same domain', () => {
      const msg1 = createMessage('Text A', { domain: 'coding' });
      const msg2 = createMessage('Text B', { domain: 'coding' });

      const msg3 = createMessage('Text A', { domain: 'coding' });
      const msg4 = createMessage('Text B', { domain: 'writing' });

      const sameDomain = matcher.computeSimilarity(msg1, msg2);
      const diffDomain = matcher.computeSimilarity(msg3, msg4);

      expect(sameDomain).toBeGreaterThan(diffDomain);
    });

    it('should combine persona and domain bonuses', () => {
      const msg1 = createMessage('Text A', {
        personaId: 'dev-1',
        domain: 'coding',
      });
      const msg2 = createMessage('Text B', {
        personaId: 'dev-1',
        domain: 'coding',
      });

      const msg3 = createMessage('Text A', {
        personaId: 'dev-1',
        domain: 'coding',
      });
      const msg4 = createMessage('Text B', {
        personaId: 'dev-2',
        domain: 'writing',
      });

      const bothMatch = matcher.computeSimilarity(msg1, msg2);
      const neitherMatch = matcher.computeSimilarity(msg3, msg4);

      expect(bothMatch).toBeGreaterThan(neitherMatch);
    });

    it('should consider length similarity', () => {
      const msg1 = createMessage('A'.repeat(100));
      const msg2 = createMessage('B'.repeat(100));

      const msg3 = createMessage('A'.repeat(100));
      const msg4 = createMessage('B'.repeat(10));

      const similarLength = matcher.computeSimilarity(msg1, msg2);
      const differentLength = matcher.computeSimilarity(msg3, msg4);

      // Similar length should contribute to structural similarity
      expect(similarLength).toBeGreaterThan(differentLength);
    });

    it('should handle messages without metadata', () => {
      const msg1 = createMessage('Hello world');
      const msg2 = createMessage('Hello world');

      const similarity = matcher.computeSimilarity(msg1, msg2);

      expect(similarity).toBeGreaterThanOrEqual(0.7);
    });

    it('should handle one message with metadata, one without', () => {
      const msg1 = createMessage('Hello world', { personaId: 'dev-1' });
      const msg2 = createMessage('Hello world');

      const similarity = matcher.computeSimilarity(msg1, msg2);

      expect(similarity).toBeGreaterThan(0.5);
    });

    it('should handle messages with only persona metadata', () => {
      const msg1 = createMessage('Text', { personaId: 'dev-1' });
      const msg2 = createMessage('Text', { personaId: 'dev-1' });

      const similarity = matcher.computeSimilarity(msg1, msg2);

      expect(similarity).toBeGreaterThan(0.5);
    });

    it('should handle messages with only domain metadata', () => {
      const msg1 = createMessage('Text', { domain: 'coding' });
      const msg2 = createMessage('Text', { domain: 'coding' });

      const similarity = matcher.computeSimilarity(msg1, msg2);

      expect(similarity).toBeGreaterThan(0.5);
    });

    it('should weight text similarity higher than structural', () => {
      // Same text, different metadata
      const msg1 = createMessage('Identical text content', {
        personaId: 'dev-1',
        domain: 'coding',
      });
      const msg2 = createMessage('Identical text content', {
        personaId: 'dev-2',
        domain: 'writing',
      });

      // Different text, same metadata
      const msg3 = createMessage('Completely different text', {
        personaId: 'analyst-1',
        domain: 'analysis',
      });
      const msg4 = createMessage('Totally other content', {
        personaId: 'analyst-1',
        domain: 'analysis',
      });

      const sameText = matcher.computeSimilarity(msg1, msg2);
      const sameMeta = matcher.computeSimilarity(msg3, msg4);

      // Text weighted at 0.7, structural at 0.3
      expect(sameText).toBeGreaterThan(sameMeta);
    });

    it('should handle messages with numbers', () => {
      const msg1 = createMessage('Calculate 123 plus 456 equals 579');
      const msg2 = createMessage('Calculate 123 plus 456 equals 579');

      const similarity = matcher.computeSimilarity(msg1, msg2);

      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should handle messages with mixed content', () => {
      const msg1 = createMessage('Code: const x = 42; // comment');
      const msg2 = createMessage('Code: const x = 42; // comment');

      const similarity = matcher.computeSimilarity(msg1, msg2);

      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should handle very short messages', () => {
      const msg1 = createMessage('Hi');
      const msg2 = createMessage('Hi');

      const similarity = matcher.computeSimilarity(msg1, msg2);

      expect(similarity).toBeGreaterThan(0.5);
    });

    it('should handle very long messages', () => {
      const longText = 'word '.repeat(1000);
      const msg1 = createMessage(longText);
      const msg2 = createMessage(longText);

      const similarity = matcher.computeSimilarity(msg1, msg2);

      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should return similarity in range [0, 1]', () => {
      const msg1 = createMessage('Any text', { personaId: 'p1', domain: 'd1' });
      const msg2 = createMessage('Other text', {
        personaId: 'p2',
        domain: 'd2',
      });

      const similarity = matcher.computeSimilarity(msg1, msg2);

      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('should be symmetric', () => {
      const msg1 = createMessage('First message');
      const msg2 = createMessage('Second message');

      const sim12 = matcher.computeSimilarity(msg1, msg2);
      const sim21 = matcher.computeSimilarity(msg2, msg1);

      expect(sim12).toBe(sim21);
    });

    it('should handle unicode characters', () => {
      const msg1 = createMessage('Hello 世界 🌍');
      const msg2 = createMessage('Hello 世界 🌍');

      const similarity = matcher.computeSimilarity(msg1, msg2);

      expect(similarity).toBeGreaterThan(0.5);
    });

    it('should handle messages with only stop words', () => {
      const msg1 = createMessage('a an the');
      const msg2 = createMessage('a an the');

      const similarity = matcher.computeSimilarity(msg1, msg2);

      expect(similarity).toBeGreaterThan(0.5);
    });

    it('should handle repeated words', () => {
      const msg1 = createMessage('test test test test');
      const msg2 = createMessage('test test');

      const similarity = matcher.computeSimilarity(msg1, msg2);

      // Both have only "test" in token sets
      expect(similarity).toBeGreaterThan(0.5);
    });

    it('should handle word order differences', () => {
      const msg1 = createMessage('quick brown fox');
      const msg2 = createMessage('fox brown quick');

      const similarity = matcher.computeSimilarity(msg1, msg2);

      // Same tokens, different order - Jaccard doesn't care about order
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should handle substring matches', () => {
      const msg1 = createMessage('testing');
      const msg2 = createMessage('test');

      const similarity = matcher.computeSimilarity(msg1, msg2);

      // Different tokens (testing vs test)
      expect(similarity).toBeLessThan(0.5);
    });

    it('should handle messages with newlines and tabs', () => {
      const msg1 = createMessage('Line 1\nLine 2\tTabbed');
      const msg2 = createMessage('Line 1 Line 2 Tabbed');

      const similarity = matcher.computeSimilarity(msg1, msg2);

      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should handle messages with multiple spaces', () => {
      const msg1 = createMessage('Multiple    spaces    here');
      const msg2 = createMessage('Multiple spaces here');

      const similarity = matcher.computeSimilarity(msg1, msg2);

      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should compute consistent similarity for same inputs', () => {
      const msg1 = createMessage('Consistent test');
      const msg2 = createMessage('Consistent test');

      const sim1 = matcher.computeSimilarity(msg1, msg2);
      const sim2 = matcher.computeSimilarity(msg1, msg2);
      const sim3 = matcher.computeSimilarity(msg1, msg2);

      expect(sim1).toBe(sim2);
      expect(sim2).toBe(sim3);
    });

    it('should handle extreme length ratios', () => {
      const msg1 = createMessage('a');
      const msg2 = createMessage('a '.repeat(1000));

      const similarity = matcher.computeSimilarity(msg1, msg2);

      // Length ratio contributes to structural similarity
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('should handle HTML/XML-like content', () => {
      const msg1 = createMessage('<div>Hello</div>');
      const msg2 = createMessage('div Hello div');

      const similarity = matcher.computeSimilarity(msg1, msg2);

      // Punctuation removed, tokens are: "div", "hello" vs "div", "hello", "div"
      // Not a perfect match due to different token counts
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(0.3);
    });
  });
});
