/**
 * Quality signal extractors for confidence scoring
 * Part of Q2 2025 Adaptive Intelligence - Phase 2
 */

import type {
  ConfidenceSignals,
  ExecutionContext,
  ScoredResponse,
} from './types.js';
import type { PerformanceDataPoint } from '../analytics/types.js';

/**
 * Extract quality signals from response and context
 */
export class SignalExtractor {
  /**
   * Extract all signals for confidence computation
   */
  static extractSignals(
    response: ScoredResponse,
    context: ExecutionContext,
    history: PerformanceDataPoint[]
  ): ConfidenceSignals {
    return {
      providerConfidence: response.providerConfidence,
      responseLength: this.scoreResponseLength(response.content),
      structureQuality: this.assessStructure(response.content),
      coherenceScore: this.assessCoherence(response.content),
      providerReliability: this.getProviderReliability(
        context.providerId,
        history
      ),
      similarTaskPerformance: this.getSimilarTaskScore(context, history),
      tokenEfficiency: this.computeTokenEfficiency(context.tokens),
      latencyScore: this.normalizeLatency(context.duration),
      costScore: this.normalizeCost(context.cost),
      messageComplexity: this.assessComplexity(context.message.content),
      domainMatch: this.assessDomainMatch(context),
    };
  }

  /**
   * Score response length (normalized)
   */
  private static scoreResponseLength(content: string): number {
    const length = content.length;

    // Optimal range: 100-2000 characters
    if (length < 50) return 0.5; // Too short
    if (length > 5000) return 0.7; // Very long
    if (length >= 100 && length <= 2000) return 1.0; // Optimal
    if (length < 100) return 0.5 + (length / 100) * 0.5; // Scaling up
    return Math.max(0.7, 1.0 - (length - 2000) / 10000); // Scaling down
  }

  /**
   * Assess structure quality (JSON, markdown, code blocks)
   */
  private static assessStructure(content: string): number {
    let score = 0.5; // Base score

    // Check for valid JSON
    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
      try {
        JSON.parse(content);
        score += 0.3; // Valid JSON
      } catch {
        score += 0.1; // JSON-like but invalid
      }
    }

    // Check for markdown formatting
    const markdownPatterns = [
      /^#+\s+/m, // Headers
      /\*\*.*?\*\*/g, // Bold
      /`.*?`/g, // Code
      /\[.*?\]\(.*?\)/g, // Links
      /^[-*+]\s+/m, // Lists
    ];

    const markdownMatches = markdownPatterns.filter((pattern) =>
      pattern.test(content)
    ).length;
    score += Math.min(0.3, markdownMatches * 0.1);

    // Check for code blocks
    const codeBlockCount = (content.match(/```/g) || []).length / 2;
    score += Math.min(0.2, codeBlockCount * 0.1);

    return Math.min(1, score);
  }

  /**
   * Assess coherence (sentence flow, logical structure)
   */
  private static assessCoherence(content: string): number {
    let score = 0.6; // Base score

    // Check for complete sentences
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 10);
    if (sentences.length > 0) {
      score += 0.1;
    }

    // Check for logical connectors
    const connectors = [
      'however',
      'therefore',
      'additionally',
      'furthermore',
      'moreover',
      'consequently',
      'thus',
      'hence',
    ];
    const connectorCount = connectors.filter((c) =>
      content.toLowerCase().includes(c)
    ).length;
    score += Math.min(0.15, connectorCount * 0.05);

    // Check for paragraph structure
    const paragraphs = content
      .split(/\n\n+/)
      .filter((p) => p.trim().length > 20);
    if (paragraphs.length >= 2) {
      score += 0.15;
    }

    // Penalize excessive repetition
    const words = content.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const repetitionRatio = uniqueWords.size / Math.max(1, words.length);
    if (repetitionRatio < 0.3) {
      score -= 0.2; // High repetition
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Get provider reliability from historical data
   */
  private static getProviderReliability(
    providerId: string,
    history: PerformanceDataPoint[]
  ): number {
    const providerHistory = history.filter(
      (dp) => dp.providerId === providerId
    );

    if (providerHistory.length === 0) {
      return 0.7; // Neutral assumption
    }

    // Average confidence from historical data
    const avgConfidence =
      providerHistory.reduce((sum, dp) => sum + dp.confidence, 0) /
      providerHistory.length;

    return avgConfidence;
  }

  /**
   * Get performance on similar tasks
   */
  private static getSimilarTaskScore(
    context: ExecutionContext,
    history: PerformanceDataPoint[]
  ): number {
    // Filter to similar tasks (same domain, similar complexity)
    const similarTasks = history.filter((dp) => {
      const domainMatch = dp.context.messageType === context.domain;
      const complexityMatch =
        context.complexity !== undefined
          ? Math.abs((dp.context.complexity || 0.5) - context.complexity) < 0.2
          : true;

      return domainMatch && complexityMatch;
    });

    if (similarTasks.length === 0) {
      return 0.6; // Neutral assumption
    }

    // Average confidence on similar tasks
    const avgConfidence =
      similarTasks.reduce((sum, dp) => sum + dp.confidence, 0) /
      similarTasks.length;

    return avgConfidence;
  }

  /**
   * Compute token efficiency
   */
  private static computeTokenEfficiency(tokens: {
    input: number;
    output: number;
  }): number {
    if (tokens.input === 0) return 0.5;

    const ratio = tokens.output / tokens.input;

    // Optimal range: 0.5-3.0 (output is 50%-300% of input)
    if (ratio < 0.1) return 0.3; // Too little output
    if (ratio > 10) return 0.5; // Too much output
    if (ratio >= 0.5 && ratio <= 3.0) return 1.0; // Optimal
    if (ratio < 0.5) return 0.3 + ratio; // Scaling up
    return Math.max(0.5, 1.0 - (ratio - 3.0) / 10); // Scaling down
  }

  /**
   * Normalize latency to score (faster = better, within reason)
   */
  private static normalizeLatency(latencyMs: number): number {
    // Optimal range: 100ms - 5s
    if (latencyMs < 50) return 0.7; // Too fast (suspicious)
    if (latencyMs > 30000) return 0.3; // Too slow
    if (latencyMs >= 100 && latencyMs <= 5000) return 1.0; // Optimal
    if (latencyMs < 100) return 0.7 + (latencyMs / 100) * 0.3; // Scaling up
    return Math.max(0.3, 1.0 - (latencyMs - 5000) / 25000); // Scaling down
  }

  /**
   * Normalize cost to score (lower = better)
   */
  private static normalizeCost(costUsd: number): number {
    // Lower cost = higher score (within reason)
    // Typical range: $0.0001 - $1.00 per request

    if (costUsd < 0.0001) return 0.8; // Suspiciously cheap
    if (costUsd > 10) return 0.2; // Very expensive
    if (costUsd <= 0.01) return 1.0; // Good cost
    return Math.max(0.2, 1.0 - Math.log10(costUsd * 100) / 3); // Logarithmic scaling
  }

  /**
   * Assess message complexity
   */
  private static assessComplexity(message: string): number {
    let complexity = 0;

    // Code blocks increase complexity
    const codeBlocks = (message.match(/```/g) || []).length / 2;
    complexity += codeBlocks * 0.15;

    // Math expressions increase complexity
    const mathPatterns =
      message.match(/\$.*?\$|\\\(.*?\\\)|\\\[.*?\\\]/g) || [];
    complexity += mathPatterns.length * 0.1;

    // Long content increases complexity
    if (message.length > 2000) complexity += 0.2;
    if (message.length > 5000) complexity += 0.3;

    // Structured data (JSON, tables)
    if (message.includes('{') && message.includes('}')) complexity += 0.1;
    if (message.includes('|') && message.includes('\n')) complexity += 0.1;

    return Math.min(1, complexity);
  }

  /**
   * Assess domain match between message and persona
   */
  private static assessDomainMatch(context: ExecutionContext): number {
    // For now, return neutral score
    // In full implementation, would check persona specialization
    return context.domain ? 0.8 : 0.6;
  }
}
