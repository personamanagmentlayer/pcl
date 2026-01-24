/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Conversation Threading for Multi-Turn Optimization
 * Phase 2.3: Context & Memory
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { randomUUID } from 'node:crypto';
import type {
  ConversationThread,
  ThreadConfig,
  ContextMessage,
} from '../memory/types.js';
import { DEFAULT_THREAD_CONFIG } from '../memory/types.js';

/**
 * Thread manager for multi-turn conversation optimization
 * Organizes conversations into threads for better context management
 */
export class ThreadManager {
  private readonly config: ThreadConfig;
  private readonly threads: Map<string, ConversationThread>; // threadId -> thread
  private readonly personaThreads: Map<string, Set<string>>; // personaId -> threadIds
  private readonly activeThreads: Map<string, string>; // personaId -> active threadId

  constructor(config: Partial<ThreadConfig> = {}) {
    this.config = { ...DEFAULT_THREAD_CONFIG, ...config } as ThreadConfig;
    this.threads = new Map();
    this.personaThreads = new Map();
    this.activeThreads = new Map();

    // Start cleanup timer for inactive threads
    if (this.config.autoSummarize) {
      this.startCleanupTimer();
    }
  }

  /**
   * Create a new conversation thread
   */
  createThread(
    personaId: string,
    metadata: Record<string, unknown> = {}
  ): ConversationThread {
    if (!this.config.enabled) {
      throw new Error('Threading is disabled');
    }

    const thread: ConversationThread = {
      id: randomUUID(),
      personaId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      messages: [],
      tags: [],
      metadata,
    };

    this.threads.set(thread.id, thread);

    // Track persona threads
    let personaThreadSet = this.personaThreads.get(personaId);
    if (!personaThreadSet) {
      personaThreadSet = new Set();
      this.personaThreads.set(personaId, personaThreadSet);
    }
    personaThreadSet.add(thread.id);

    // Enforce max threads limit
    if (personaThreadSet.size > this.config.maxThreads) {
      this.evictOldestThread(personaId);
    }

    // Set as active thread
    this.activeThreads.set(personaId, thread.id);

    return thread;
  }

  /**
   * Get a thread by ID
   */
  getThread(threadId: string): ConversationThread | undefined {
    return this.threads.get(threadId);
  }

  /**
   * Get active thread for a persona
   */
  getActiveThread(personaId: string): ConversationThread | undefined {
    const threadId = this.activeThreads.get(personaId);
    return threadId ? this.threads.get(threadId) : undefined;
  }

  /**
   * Set active thread for a persona
   */
  setActiveThread(personaId: string, threadId: string): boolean {
    const thread = this.threads.get(threadId);
    if (!thread || thread.personaId !== personaId) return false;

    this.activeThreads.set(personaId, threadId);
    thread.lastActivity = Date.now();
    return true;
  }

  /**
   * Add a message to a thread
   */
  addMessage(threadId: string, message: ContextMessage): boolean {
    const thread = this.threads.get(threadId);
    if (!thread) return false;

    thread.messages.push(message);
    thread.lastActivity = Date.now();

    // Enforce max messages per thread
    if (thread.messages.length > this.config.maxMessagesPerThread) {
      // Remove oldest messages
      const toRemove =
        thread.messages.length - this.config.maxMessagesPerThread;
      thread.messages.splice(0, toRemove);
    }

    return true;
  }

  /**
   * Add a message to the active thread (or create new thread)
   */
  addToActiveThread(personaId: string, message: ContextMessage): string {
    let thread = this.getActiveThread(personaId);

    // Create new thread if none exists
    if (!thread) {
      thread = this.createThread(personaId);
    }

    this.addMessage(thread.id, message);
    return thread.id;
  }

  /**
   * Get all threads for a persona
   */
  getPersonaThreads(personaId: string): ConversationThread[] {
    const threadIds = this.personaThreads.get(personaId);
    if (!threadIds) return [];

    return Array.from(threadIds)
      .map((id) => this.threads.get(id))
      .filter((thread): thread is ConversationThread => thread !== undefined)
      .sort((a, b) => b.lastActivity - a.lastActivity);
  }

  /**
   * Get recent threads (across all personas)
   */
  getRecentThreads(limit: number = 10): ConversationThread[] {
    return Array.from(this.threads.values())
      .sort((a, b) => b.lastActivity - a.lastActivity)
      .slice(0, limit);
  }

  /**
   * Get inactive threads
   */
  getInactiveThreads(minInactivity?: number): ConversationThread[] {
    const threshold = minInactivity || this.config.inactivityThreshold;
    const now = Date.now();

    return Array.from(this.threads.values()).filter(
      (thread) => now - thread.lastActivity >= threshold
    );
  }

  /**
   * Add tags to a thread
   */
  addTags(threadId: string, tags: string[]): boolean {
    const thread = this.threads.get(threadId);
    if (!thread) return false;

    for (const tag of tags) {
      if (!thread.tags.includes(tag)) {
        thread.tags.push(tag);
      }
    }

    return true;
  }

  /**
   * Find threads by tags
   */
  findByTags(tags: string[]): ConversationThread[] {
    const results: ConversationThread[] = [];

    for (const thread of this.threads.values()) {
      const hasMatchingTag = tags.some((tag) => thread.tags.includes(tag));
      if (hasMatchingTag) {
        results.push(thread);
      }
    }

    return results.sort((a, b) => b.lastActivity - a.lastActivity);
  }

  /**
   * Summarize a thread
   * In production, this would use an LLM to generate the summary
   */
  summarizeThread(threadId: string): string {
    const thread = this.threads.get(threadId);
    if (!thread) return '';

    if (thread.summary) return thread.summary;

    // Simple summarization heuristic
    const messageCount = thread.messages.length;
    const userMessages = thread.messages.filter(
      (m) => m.role === 'user'
    ).length;
    const assistantMessages = thread.messages.filter(
      (m) => m.role === 'assistant'
    ).length;
    const duration = thread.lastActivity - thread.startTime;
    const durationMinutes = Math.floor(duration / 60000);

    const summary = `Thread with ${messageCount} messages (${userMessages} user, ${assistantMessages} assistant) over ${durationMinutes} minutes. Tags: ${thread.tags.join(', ') || 'none'}`;

    thread.summary = summary;
    return summary;
  }

  /**
   * Delete a thread
   */
  deleteThread(threadId: string): boolean {
    const thread = this.threads.get(threadId);
    if (!thread) return false;

    // Remove from persona threads
    const personaThreadSet = this.personaThreads.get(thread.personaId);
    if (personaThreadSet) {
      personaThreadSet.delete(threadId);
    }

    // Remove as active thread if it is
    if (this.activeThreads.get(thread.personaId) === threadId) {
      this.activeThreads.delete(thread.personaId);
    }

    return this.threads.delete(threadId);
  }

  /**
   * Clear all threads for a persona
   */
  clearPersonaThreads(personaId: string): void {
    const threadIds = this.personaThreads.get(personaId);
    if (!threadIds) return;

    for (const threadId of threadIds) {
      this.threads.delete(threadId);
    }

    this.personaThreads.delete(personaId);
    this.activeThreads.delete(personaId);
  }

  /**
   * Clear all threads
   */
  clearAll(): void {
    this.threads.clear();
    this.personaThreads.clear();
    this.activeThreads.clear();
  }

  /**
   * Get thread statistics
   */
  getStats(): {
    totalThreads: number;
    activeThreads: number;
    inactiveThreads: number;
    avgMessagesPerThread: number;
    avgThreadDuration: number;
  } {
    const threads = Array.from(this.threads.values());
    const now = Date.now();

    let totalMessages = 0;
    let totalDuration = 0;
    let inactiveCount = 0;

    for (const thread of threads) {
      totalMessages += thread.messages.length;
      totalDuration += thread.lastActivity - thread.startTime;

      if (now - thread.lastActivity >= this.config.inactivityThreshold) {
        inactiveCount++;
      }
    }

    return {
      totalThreads: threads.length,
      activeThreads: threads.length - inactiveCount,
      inactiveThreads: inactiveCount,
      avgMessagesPerThread:
        threads.length > 0 ? totalMessages / threads.length : 0,
      avgThreadDuration:
        threads.length > 0 ? totalDuration / threads.length : 0,
    };
  }

  /**
   * Evict oldest thread for a persona
   */
  private evictOldestThread(personaId: string): void {
    const threads = this.getPersonaThreads(personaId);
    if (threads.length === 0) return;

    // Find oldest thread (by start time)
    const oldest = threads.reduce((old, curr) =>
      curr.startTime < old.startTime ? curr : old
    );

    this.deleteThread(oldest.id);
  }

  /**
   * Start cleanup timer for inactive threads
   */
  private startCleanupTimer(): void {
    // Run every 5 minutes
    setInterval(
      () => {
        this.cleanupInactiveThreads();
      },
      5 * 60 * 1000
    );
  }

  /**
   * Cleanup inactive threads by summarizing them
   */
  private cleanupInactiveThreads(): void {
    const inactiveThreads = this.getInactiveThreads();

    for (const thread of inactiveThreads) {
      // Summarize thread if it doesn't have a summary
      if (!thread.summary) {
        this.summarizeThread(thread.id);
      }

      // Could optionally archive or compress thread here
      // For now, we just ensure it has a summary
    }
  }

  /**
   * Merge threads (combine messages from multiple threads)
   */
  mergeThreads(
    threadIds: string[],
    newThreadMetadata: Record<string, unknown> = {}
  ): ConversationThread | null {
    if (threadIds.length === 0) return null;

    const threads = threadIds
      .map((id) => this.threads.get(id))
      .filter((t): t is ConversationThread => t !== undefined);

    if (threads.length === 0) return null;

    // All threads must belong to same persona
    const personaId = threads[0].personaId;
    if (!threads.every((t) => t.personaId === personaId)) {
      throw new Error('Cannot merge threads from different personas');
    }

    // Create new merged thread
    const mergedThread = this.createThread(personaId, newThreadMetadata);

    // Combine all messages in chronological order
    const allMessages = threads.flatMap((t) => t.messages);
    allMessages.sort((a, b) => a.timestamp - b.timestamp);
    mergedThread.messages = allMessages;

    // Combine tags
    const allTags = new Set(threads.flatMap((t) => t.tags));
    mergedThread.tags = Array.from(allTags);

    // Update timestamps
    mergedThread.startTime = Math.min(...threads.map((t) => t.startTime));
    mergedThread.lastActivity = Math.max(...threads.map((t) => t.lastActivity));

    // Delete original threads
    for (const threadId of threadIds) {
      this.deleteThread(threadId);
    }

    return mergedThread;
  }

  /**
   * Split a thread at a specific message index
   */
  splitThread(
    threadId: string,
    splitIndex: number
  ): [ConversationThread, ConversationThread] | null {
    const thread = this.threads.get(threadId);
    if (!thread || splitIndex <= 0 || splitIndex >= thread.messages.length) {
      return null;
    }

    // Create first thread (messages before split)
    const thread1 = this.createThread(thread.personaId, {
      ...thread.metadata,
      split: 'first',
    });
    thread1.messages = thread.messages.slice(0, splitIndex);
    thread1.tags = [...thread.tags];
    thread1.startTime = thread.startTime;
    thread1.lastActivity =
      thread1.messages[thread1.messages.length - 1].timestamp;

    // Create second thread (messages after split)
    const thread2 = this.createThread(thread.personaId, {
      ...thread.metadata,
      split: 'second',
    });
    thread2.messages = thread.messages.slice(splitIndex);
    thread2.tags = [...thread.tags];
    thread2.startTime = thread2.messages[0].timestamp;
    thread2.lastActivity = thread.lastActivity;

    // Delete original thread
    this.deleteThread(threadId);

    return [thread1, thread2];
  }
}
