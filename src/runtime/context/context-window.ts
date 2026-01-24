/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Context Window Management with Intelligent Compression
 * Phase 2.3: Context & Memory
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { randomUUID } from 'node:crypto';
import type {
  ContextMessage,
  ContextWindowConfig,
  ContextSummary,
  ContextStats,
} from '../memory/types.js';
import { DEFAULT_CONTEXT_WINDOW_CONFIG } from '../memory/types.js';

/**
 * Context window manager with intelligent compression
 * Manages token limits and compresses context when needed
 */
export class ContextWindow {
  private readonly config: ContextWindowConfig;
  private readonly messages: Map<string, ContextMessage>; // messageId -> message
  private readonly summaries: Map<string, ContextSummary>; // summaryId -> summary
  private readonly messageOrder: string[]; // Ordered message IDs
  private currentTokens: number;

  constructor(config: Partial<ContextWindowConfig> = {}) {
    this.config = {
      ...DEFAULT_CONTEXT_WINDOW_CONFIG,
      ...config,
    } as ContextWindowConfig;
    this.messages = new Map();
    this.summaries = new Map();
    this.messageOrder = [];
    this.currentTokens = 0;
  }

  /**
   * Add a message to the context window
   */
  addMessage(
    message: Omit<ContextMessage, 'id' | 'timestamp'>
  ): ContextMessage {
    const contextMessage: ContextMessage = {
      ...message,
      id: randomUUID(),
      timestamp: Date.now(),
    };

    this.messages.set(contextMessage.id, contextMessage);
    this.messageOrder.push(contextMessage.id);
    this.currentTokens += contextMessage.tokenCount;

    // Check if compression is needed
    const utilizationPercentage = this.currentTokens / this.config.maxTokens;
    if (utilizationPercentage >= this.config.compressionThreshold) {
      this.compressContext();
    }

    return contextMessage;
  }

  /**
   * Get all messages in chronological order
   */
  getMessages(): ContextMessage[] {
    return this.messageOrder
      .map((id) => this.messages.get(id))
      .filter((msg): msg is ContextMessage => msg !== undefined);
  }

  /**
   * Get recent messages
   */
  getRecentMessages(count: number): ContextMessage[] {
    const messages = this.getMessages();
    return messages.slice(-count);
  }

  /**
   * Get messages within a time range
   */
  getMessagesInRange(startTime: number, endTime: number): ContextMessage[] {
    return this.getMessages().filter(
      (msg) => msg.timestamp >= startTime && msg.timestamp <= endTime
    );
  }

  /**
   * Get most important messages
   */
  getImportantMessages(count: number): ContextMessage[] {
    const messages = this.getMessages();
    return messages.sort((a, b) => b.importance - a.importance).slice(0, count);
  }

  /**
   * Update message importance
   */
  updateImportance(messageId: string, importance: number): boolean {
    const message = this.messages.get(messageId);
    if (!message) return false;

    message.importance = Math.max(0, Math.min(1, importance));
    return true;
  }

  /**
   * Remove a message from context
   */
  removeMessage(messageId: string): boolean {
    const message = this.messages.get(messageId);
    if (!message) return false;

    this.messages.delete(messageId);
    const index = this.messageOrder.indexOf(messageId);
    if (index !== -1) {
      this.messageOrder.splice(index, 1);
    }
    this.currentTokens -= message.tokenCount;

    return true;
  }

  /**
   * Clear all messages and summaries
   */
  clear(): void {
    this.messages.clear();
    this.summaries.clear();
    this.messageOrder.length = 0;
    this.currentTokens = 0;
  }

  /**
   * Get context statistics
   */
  getStats(): ContextStats {
    const deduplicatedCount = Array.from(this.summaries.values()).reduce(
      (sum, summary) => sum + summary.originalMessages.length,
      0
    );

    const totalSummaryTokens = Array.from(this.summaries.values()).reduce(
      (sum, summary) => sum + summary.tokenCount,
      0
    );
    const totalOriginalTokens = Array.from(this.summaries.values()).reduce(
      (sum, summary) => sum + summary.tokenCount / summary.compressionRatio,
      0
    );

    return {
      currentTokens: this.currentTokens,
      maxTokens: this.config.maxTokens,
      utilizationPercentage: this.currentTokens / this.config.maxTokens,
      messageCount: this.messages.size,
      summaryCount: this.summaries.size,
      compressionRatio:
        totalOriginalTokens > 0 ? totalSummaryTokens / totalOriginalTokens : 1,
      deduplicatedCount,
    };
  }

  /**
   * Get all summaries
   */
  getSummaries(): ContextSummary[] {
    return Array.from(this.summaries.values());
  }

  /**
   * Compress context to target ratio
   * Preserves recent and important messages, summarizes the rest
   */
  private compressContext(): void {
    const targetTokens = Math.floor(
      this.config.maxTokens * this.config.compressionRatio
    );
    const messages = this.getMessages();

    // Identify messages to preserve
    const toPreserve = new Set<string>();

    // Preserve recent messages
    const recentMessages = messages.slice(-this.config.preserveRecent);
    for (const msg of recentMessages) {
      toPreserve.add(msg.id);
    }

    // Preserve important messages
    const importantMessages = messages
      .sort((a, b) => b.importance - a.importance)
      .slice(0, this.config.preserveImportant);
    for (const msg of importantMessages) {
      toPreserve.add(msg.id);
    }

    // Calculate tokens in preserved messages
    let preservedTokens = 0;
    for (const msg of messages) {
      if (toPreserve.has(msg.id)) {
        preservedTokens += msg.tokenCount;
      }
    }

    // If preserved messages already exceed target, remove less important ones
    if (preservedTokens > targetTokens) {
      // Keep only most recent messages that fit
      let tokensUsed = 0;
      toPreserve.clear();

      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (tokensUsed + msg.tokenCount <= targetTokens) {
          toPreserve.add(msg.id);
          tokensUsed += msg.tokenCount;
        }
      }

      // Remove messages not in preserve set
      for (const msg of messages) {
        if (!toPreserve.has(msg.id)) {
          this.removeMessage(msg.id);
        }
      }

      return;
    }

    // Group remaining messages for summarization
    const toSummarize: ContextMessage[] = [];
    for (const msg of messages) {
      if (!toPreserve.has(msg.id)) {
        toSummarize.push(msg);
      }
    }

    if (toSummarize.length === 0) return;

    // Create summary
    const summary = this.createSummary(toSummarize);

    // Remove summarized messages
    for (const msg of toSummarize) {
      this.removeMessage(msg.id);
    }

    // Store summary
    this.summaries.set(summary.id, summary);
    this.currentTokens += summary.tokenCount;
  }

  /**
   * Create a summary of messages
   * In a real implementation, this would call an LLM to generate the summary
   * For now, we use a simple heuristic
   */
  private createSummary(messages: ContextMessage[]): ContextSummary {
    const originalTokens = messages.reduce(
      (sum, msg) => sum + msg.tokenCount,
      0
    );

    // Simple summarization: extract key information
    const roles = new Map<string, number>();
    const totalLength = messages.reduce((sum, msg) => {
      roles.set(msg.role, (roles.get(msg.role) || 0) + 1);
      return sum + msg.content.length;
    }, 0);

    const avgLength = totalLength / messages.length;
    const roleBreakdown = Array.from(roles.entries())
      .map(([role, count]) => `${count} ${role} message${count > 1 ? 's' : ''}`)
      .join(', ');

    // Create summary text (placeholder - in production, use LLM)
    const summaryText = `[Summary of ${messages.length} messages (${roleBreakdown}), avg length: ${Math.round(avgLength)} chars, timespan: ${new Date(messages[0].timestamp).toISOString()} to ${new Date(messages[messages.length - 1].timestamp).toISOString()}]`;

    const summaryTokens = Math.ceil(summaryText.length / 4); // Rough token estimate

    return {
      id: randomUUID(),
      originalMessages: messages.map((m) => m.id),
      summary: summaryText,
      timestamp: Date.now(),
      tokenCount: summaryTokens,
      compressionRatio: summaryTokens / originalTokens,
    };
  }

  /**
   * Apply semantic deduplication to remove similar messages
   * Returns IDs of removed messages
   */
  deduplicateMessages(): string[] {
    if (!this.config.semanticDeduplication) return [];

    const messages = this.getMessages();
    const removed: string[] = [];
    const kept = new Set<string>();

    for (let i = 0; i < messages.length; i++) {
      const msg1 = messages[i];
      if (removed.includes(msg1.id)) continue;

      kept.add(msg1.id);

      // Compare with subsequent messages
      for (let j = i + 1; j < messages.length; j++) {
        const msg2 = messages[j];
        if (removed.includes(msg2.id)) continue;

        const similarity = this.computeSimilarity(msg1, msg2);
        if (similarity >= this.config.deduplicationThreshold) {
          // Keep message with higher importance
          if (msg2.importance > msg1.importance) {
            removed.push(msg1.id);
            kept.delete(msg1.id);
            kept.add(msg2.id);
            break;
          } else {
            removed.push(msg2.id);
          }
        }
      }
    }

    // Remove duplicates
    for (const messageId of removed) {
      this.removeMessage(messageId);
    }

    return removed;
  }

  /**
   * Compute similarity between two messages
   * Uses simple token overlap (Jaccard similarity)
   */
  private computeSimilarity(
    msg1: ContextMessage,
    msg2: ContextMessage
  ): number {
    // Simple token-based similarity
    const tokens1 = new Set(msg1.content.toLowerCase().split(/\s+/));
    const tokens2 = new Set(msg2.content.toLowerCase().split(/\s+/));

    const intersection = new Set([...tokens1].filter((t) => tokens2.has(t)));
    const union = new Set([...tokens1, ...tokens2]);

    return intersection.size / union.size;
  }

  /**
   * Estimate token count for text (rough approximation)
   */
  static estimateTokenCount(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
