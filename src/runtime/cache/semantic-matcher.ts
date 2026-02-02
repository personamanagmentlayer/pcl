/**
 * Semantic matching for cache lookups
 * Part of Q2 2025 Adaptive Intelligence - Phase 5
 */

/**
 * Message for semantic matching
 */
export interface MatchMessage {
  content: string;
  metadata?: {
    personaId?: string;
    domain?: string;
    [key: string]: any;
  };
}

/**
 * Computes semantic similarity between messages
 */
export class SemanticMatcher {
  /**
   * Compute similarity between two messages
   */
  computeSimilarity(msg1: MatchMessage, msg2: MatchMessage): number {
    const textSim = this.tokenOverlap(msg1.content, msg2.content);
    const structuralSim = this.structuralSimilarity(msg1, msg2);

    // Weighted combination
    return textSim * 0.7 + structuralSim * 0.3;
  }

  /**
   * Token overlap (Jaccard similarity)
   */
  private tokenOverlap(text1: string, text2: string): number {
    const tokens1 = this.tokenize(text1);
    const tokens2 = this.tokenize(text2);

    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);

    // Intersection
    const intersection = new Set([...set1].filter((x) => set2.has(x)));

    // Union
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) return 0;

    // Jaccard similarity
    return intersection.size / union.size;
  }

  /**
   * Tokenize text
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter((t) => t.length > 0 && t.length < 20); // Filter noise
  }

  /**
   * Structural similarity
   */
  private structuralSimilarity(msg1: MatchMessage, msg2: MatchMessage): number {
    let score = 0;

    // Same persona
    if (
      msg1.metadata?.personaId &&
      msg2.metadata?.personaId &&
      msg1.metadata.personaId === msg2.metadata.personaId
    ) {
      score += 0.5;
    }

    // Similar length
    const len1 = msg1.content.length;
    const len2 = msg2.content.length;
    const lenRatio = Math.min(len1, len2) / Math.max(len1, len2);
    score += lenRatio * 0.3;

    // Same domain
    if (
      msg1.metadata?.domain &&
      msg2.metadata?.domain &&
      msg1.metadata.domain === msg2.metadata.domain
    ) {
      score += 0.2;
    }

    return Math.min(1, score);
  }
}
