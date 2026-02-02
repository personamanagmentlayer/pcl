/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Semantic Deduplication
 * Phase 2.3: Context & Memory
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ContextMessage, DeduplicationResult } from '../memory/types.js';

/**
 * Semantic deduplication to avoid redundant processing
 * Identifies and removes semantically similar messages
 */
export class SemanticDeduplicator {
  private similarityThreshold: number;

  constructor(similarityThreshold: number = 0.9) {
    this.similarityThreshold = similarityThreshold;
  }

  /**
   * Deduplicate a list of messages
   * Returns result with duplicate and kept message IDs
   */
  deduplicate(messages: ContextMessage[]): DeduplicationResult {
    const duplicates: string[] = [];
    const kept: string[] = [];
    let tokensSaved = 0;

    const processed = new Set<string>();

    for (let i = 0; i < messages.length; i++) {
      const msg1 = messages[i];

      // Skip if already marked as duplicate
      if (duplicates.includes(msg1.id)) continue;

      // Mark as kept initially
      kept.push(msg1.id);
      processed.add(msg1.id);

      // Compare with subsequent messages
      for (let j = i + 1; j < messages.length; j++) {
        const msg2 = messages[j];

        // Skip if already processed
        if (processed.has(msg2.id)) continue;

        // Compute similarity
        const similarity = this.computeSimilarity(msg1, msg2);

        if (similarity >= this.similarityThreshold) {
          // Mark msg2 as duplicate
          duplicates.push(msg2.id);
          processed.add(msg2.id);
          tokensSaved += msg2.tokenCount;

          // Update msg1 importance if msg2 was more important
          if (msg2.importance > msg1.importance) {
            msg1.importance = msg2.importance;
          }
        }
      }
    }

    return {
      duplicates,
      kept,
      removedCount: duplicates.length,
      tokensSaved,
    };
  }

  /**
   * Find duplicates of a specific message in a list
   */
  findDuplicates(
    target: ContextMessage,
    messages: ContextMessage[]
  ): ContextMessage[] {
    const duplicates: ContextMessage[] = [];

    for (const msg of messages) {
      if (msg.id === target.id) continue;

      const similarity = this.computeSimilarity(target, msg);
      if (similarity >= this.similarityThreshold) {
        duplicates.push(msg);
      }
    }

    return duplicates;
  }

  /**
   * Check if two messages are duplicates
   */
  isDuplicate(msg1: ContextMessage, msg2: ContextMessage): boolean {
    const similarity = this.computeSimilarity(msg1, msg2);
    return similarity >= this.similarityThreshold;
  }

  /**
   * Compute similarity between two messages
   * Uses combined text similarity and structural similarity
   */
  computeSimilarity(msg1: ContextMessage, msg2: ContextMessage): number {
    // Text similarity (70% weight)
    const textSim = this.textSimilarity(msg1.content, msg2.content);

    // Structural similarity (30% weight)
    const structuralSim = this.structuralSimilarity(msg1, msg2);

    return textSim * 0.7 + structuralSim * 0.3;
  }

  /**
   * Compute text similarity using token overlap (Jaccard similarity)
   */
  private textSimilarity(text1: string, text2: string): number {
    // Normalize text
    const normalize = (text: string) =>
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .trim();

    const normalized1 = normalize(text1);
    const normalized2 = normalize(text2);

    // Exact match check
    if (normalized1 === normalized2) return 1.0;

    // Token-based similarity
    const tokens1 = new Set(normalized1.split(/\s+/));
    const tokens2 = new Set(normalized2.split(/\s+/));

    const intersection = new Set(
      Array.from(tokens1).filter((t) => tokens2.has(t))
    );
    const union = new Set([...Array.from(tokens1), ...Array.from(tokens2)]);

    if (union.size === 0) return 0;

    return intersection.size / union.size;
  }

  /**
   * Compute structural similarity based on message properties
   */
  private structuralSimilarity(
    msg1: ContextMessage,
    msg2: ContextMessage
  ): number {
    let score = 0;
    let factors = 0;

    // Role match (25%)
    if (msg1.role === msg2.role) {
      score += 0.25;
    }
    factors++;

    // Token count similarity (25%)
    const tokenRatio =
      Math.min(msg1.tokenCount, msg2.tokenCount) /
      Math.max(msg1.tokenCount, msg2.tokenCount);
    score += tokenRatio * 0.25;
    factors++;

    // Importance similarity (25%)
    const importanceDiff = Math.abs(msg1.importance - msg2.importance);
    score += (1 - importanceDiff) * 0.25;
    factors++;

    // Timestamp proximity (25%)
    // Messages within 1 minute are more likely to be related
    const timeDiff = Math.abs(msg1.timestamp - msg2.timestamp);
    const timeScore = Math.exp(-timeDiff / (60 * 1000)); // Exponential decay
    score += timeScore * 0.25;
    factors++;

    return score / factors;
  }

  /**
   * Group similar messages together
   * Returns clusters of similar messages
   */
  clusterSimilar(messages: ContextMessage[]): ContextMessage[][] {
    const clusters: ContextMessage[][] = [];
    const processed = new Set<string>();

    for (const msg of messages) {
      if (processed.has(msg.id)) continue;

      const cluster: ContextMessage[] = [msg];
      processed.add(msg.id);

      // Find all similar messages
      for (const other of messages) {
        if (processed.has(other.id)) continue;

        const similarity = this.computeSimilarity(msg, other);
        if (similarity >= this.similarityThreshold) {
          cluster.push(other);
          processed.add(other.id);
        }
      }

      clusters.push(cluster);
    }

    return clusters;
  }

  /**
   * Get the most representative message from a cluster
   * Chooses based on highest importance and most tokens
   */
  getRepresentative(cluster: ContextMessage[]): ContextMessage {
    if (cluster.length === 0) {
      throw new Error('Cannot get representative from empty cluster');
    }

    if (cluster.length === 1) return cluster[0];

    // Score by importance (60%) + token count (40%)
    return cluster.reduce((best, current) => {
      const bestScore = best.importance * 0.6 + (best.tokenCount / 1000) * 0.4;
      const currentScore =
        current.importance * 0.6 + (current.tokenCount / 1000) * 0.4;
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * Deduplicate using clustering approach
   * Keeps one representative from each cluster
   */
  deduplicateByClustering(messages: ContextMessage[]): DeduplicationResult {
    const clusters = this.clusterSimilar(messages);
    const kept: string[] = [];
    const duplicates: string[] = [];
    let tokensSaved = 0;

    for (const cluster of clusters) {
      const representative = this.getRepresentative(cluster);
      kept.push(representative.id);

      for (const msg of cluster) {
        if (msg.id !== representative.id) {
          duplicates.push(msg.id);
          tokensSaved += msg.tokenCount;
        }
      }
    }

    return {
      duplicates,
      kept,
      removedCount: duplicates.length,
      tokensSaved,
    };
  }

  /**
   * Update similarity threshold
   */
  setSimilarityThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Similarity threshold must be between 0 and 1');
    }
    this.similarityThreshold = threshold;
  }

  /**
   * Get current similarity threshold
   */
  getSimilarityThreshold(): number {
    return this.similarityThreshold;
  }
}
