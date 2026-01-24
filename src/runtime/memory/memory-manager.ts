/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Memory Manager - Orchestrates All Memory & Context Features
 * Phase 2.3: Context & Memory
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { MemoryStorage } from './memory-storage.js';
import { KnowledgeSharing } from './knowledge-sharing.js';
import { ContextWindow } from '../context/context-window.js';
import { ThreadManager } from '../context/threading.js';
import { SemanticDeduplicator } from '../context/deduplication.js';
import { ContextPrioritizer } from '../context/prioritization.js';
import type {
  MemoryContextConfig,
  ContextMessage,
  MemoryEntry,
  KnowledgeEntry,
  MemoryStats,
  ContextStats,
  KnowledgeStats,
} from './types.js';
import { DEFAULT_MEMORY_CONTEXT_CONFIG } from './types.js';

/**
 * Comprehensive memory and context manager
 * Integrates all Phase 2.3 features into a unified system
 */
export class MemoryManager {
  private readonly config: MemoryContextConfig;
  private readonly memoryStorage: MemoryStorage;
  private readonly knowledgeSharing: KnowledgeSharing;
  private readonly contextWindow: ContextWindow;
  private readonly threadManager: ThreadManager;
  private readonly deduplicator: SemanticDeduplicator;
  private readonly prioritizer: ContextPrioritizer;

  constructor(config: Partial<MemoryContextConfig> = {}) {
    this.config = {
      ...DEFAULT_MEMORY_CONTEXT_CONFIG,
      ...config,
    } as MemoryContextConfig;

    // Initialize all subsystems
    this.memoryStorage = new MemoryStorage(this.config.memory);
    this.knowledgeSharing = new KnowledgeSharing(this.config.knowledgeSharing);
    this.contextWindow = new ContextWindow(this.config.contextWindow);
    this.threadManager = new ThreadManager(this.config.threading);
    this.deduplicator = new SemanticDeduplicator(
      this.config.contextWindow.deduplicationThreshold
    );
    this.prioritizer = new ContextPrioritizer(this.config.prioritization);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Memory Storage Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Store a memory for a persona
   */
  storeMemory(
    entry: Omit<
      MemoryEntry,
      'id' | 'timestamp' | 'accessCount' | 'lastAccessed'
    >
  ): MemoryEntry {
    return this.memoryStorage.store(entry);
  }

  /**
   * Retrieve memories for a persona
   */
  retrieveMemories(
    query: Parameters<typeof this.memoryStorage.retrieve>[0]
  ): MemoryEntry[] {
    return this.memoryStorage.retrieve(query);
  }

  /**
   * Get memory statistics for a persona
   */
  getMemoryStats(personaId: string): MemoryStats | null {
    return this.memoryStorage.getStats(personaId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Knowledge Sharing Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Share knowledge from a persona
   */
  shareKnowledge(
    entry: Omit<KnowledgeEntry, 'id' | 'timestamp' | 'usageCount' | 'lastUsed'>
  ): KnowledgeEntry {
    return this.knowledgeSharing.share(entry);
  }

  /**
   * Retrieve shared knowledge
   */
  retrieveKnowledge(
    query: Parameters<typeof this.knowledgeSharing.retrieve>[0]
  ): KnowledgeEntry[] {
    return this.knowledgeSharing.retrieve(query);
  }

  /**
   * Get knowledge sharing statistics
   */
  getKnowledgeStats(): KnowledgeStats {
    return this.knowledgeSharing.getStats();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Context Window Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Add a message to context window
   * Automatically handles prioritization and deduplication
   */
  addToContext(
    message: Omit<ContextMessage, 'id' | 'timestamp' | 'importance'>
  ): ContextMessage {
    // Create base message
    let contextMessage: ContextMessage = {
      ...message,
      id: '',
      timestamp: 0,
      importance: 0.5,
    };

    // Compute importance
    contextMessage = this.prioritizer.computeImportance(contextMessage);

    // Add to context window
    const addedMessage = this.contextWindow.addMessage(contextMessage);

    // Optionally deduplicate
    if (this.config.contextWindow.semanticDeduplication) {
      this.contextWindow.deduplicateMessages();
    }

    return addedMessage;
  }

  /**
   * Get all messages from context window
   */
  getContext(): ContextMessage[] {
    return this.contextWindow.getMessages();
  }

  /**
   * Get context statistics
   */
  getContextStats(): ContextStats {
    return this.contextWindow.getStats();
  }

  /**
   * Clear context window
   */
  clearContext(): void {
    this.contextWindow.clear();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Thread Management Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Add a message to the active thread
   */
  addToActiveThread(personaId: string, message: ContextMessage): string {
    return this.threadManager.addToActiveThread(personaId, message);
  }

  /**
   * Create a new conversation thread
   */
  createThread(personaId: string, metadata?: Record<string, unknown>) {
    return this.threadManager.createThread(personaId, metadata);
  }

  /**
   * Get all threads for a persona
   */
  getThreads(personaId: string) {
    return this.threadManager.getPersonaThreads(personaId);
  }

  /**
   * Get active thread for a persona
   */
  getActiveThread(personaId: string) {
    return this.threadManager.getActiveThread(personaId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Integrated Workflow Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Process a message with full memory & context integration
   * This is the main entry point for using all features together
   */
  processMessage(
    personaId: string,
    content: string,
    role: ContextMessage['role'] = 'user',
    metadata: Record<string, unknown> = {}
  ): {
    message: ContextMessage;
    threadId: string;
    relevantMemories: MemoryEntry[];
    relevantKnowledge: KnowledgeEntry[];
  } {
    // Create context message
    const message: Omit<ContextMessage, 'id' | 'timestamp' | 'importance'> = {
      role,
      content,
      tokenCount: ContextWindow.estimateTokenCount(content),
      metadata,
    };

    // Add to context with prioritization
    const contextMessage = this.addToContext(message);

    // Add to thread
    const threadId = this.addToActiveThread(personaId, contextMessage);

    // Retrieve relevant memories
    const relevantMemories = this.retrieveMemories({
      personaId,
      limit: 10,
      sortBy: 'importance',
      sortOrder: 'desc',
    });

    // Extract tags from content for knowledge retrieval
    const tags = this.extractTags(content);

    // Retrieve relevant knowledge
    const relevantKnowledge = this.retrieveKnowledge({
      tags,
      excludePersona: personaId, // Get knowledge from other personas
      limit: 5,
    });

    return {
      message: contextMessage,
      threadId,
      relevantMemories,
      relevantKnowledge,
    };
  }

  /**
   * Store a response with automatic knowledge extraction
   */
  storeResponse(
    personaId: string,
    content: string,
    metadata: Record<string, unknown> = {}
  ): {
    message: ContextMessage;
    threadId: string;
    extractedKnowledge: KnowledgeEntry[];
  } {
    // Create context message
    const message: Omit<ContextMessage, 'id' | 'timestamp' | 'importance'> = {
      role: 'assistant',
      content,
      tokenCount: ContextWindow.estimateTokenCount(content),
      metadata,
    };

    // Add to context
    const contextMessage = this.addToContext(message);

    // Add to thread
    const threadId = this.addToActiveThread(personaId, contextMessage);

    // Extract and share knowledge if confidence is high
    const extractedKnowledge: KnowledgeEntry[] = [];

    if (this.config.knowledgeSharing.autoShare) {
      const knowledge = this.extractKnowledge(personaId, content, metadata);
      for (const entry of knowledge) {
        try {
          const shared = this.shareKnowledge(entry);
          extractedKnowledge.push(shared);
        } catch {
          // Skip if below threshold
        }
      }
    }

    return {
      message: contextMessage,
      threadId,
      extractedKnowledge,
    };
  }

  /**
   * Get comprehensive statistics
   */
  getStats(personaId?: string) {
    return {
      memory: personaId ? this.getMemoryStats(personaId) : null,
      context: this.getContextStats(),
      knowledge: this.getKnowledgeStats(),
      threads: this.threadManager.getStats(),
    };
  }

  /**
   * Cleanup expired data across all subsystems
   */
  cleanup(): void {
    this.memoryStorage.cleanupExpired();
    this.knowledgeSharing.cleanupExpired();
  }

  /**
   * Clear all data for a persona
   */
  clearPersona(personaId: string): void {
    this.memoryStorage.clearPersona(personaId);
    this.threadManager.clearPersonaThreads(personaId);
  }

  /**
   * Clear all data across all subsystems
   */
  clearAll(): void {
    this.memoryStorage.clearAll();
    this.knowledgeSharing.clear();
    this.contextWindow.clear();
    this.threadManager.clearAll();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helper Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extract tags from content
   * Simple heuristic - in production, could use NLP
   */
  private extractTags(content: string): string[] {
    const tags: string[] = [];

    // Domain detection
    if (/code|programming|function|class/i.test(content)) {
      tags.push('code');
    }
    if (/data|analysis|statistics|metrics/i.test(content)) {
      tags.push('analysis');
    }
    if (/create|write|design|generate/i.test(content)) {
      tags.push('creative');
    }
    if (/security|vulnerability|attack|exploit/i.test(content)) {
      tags.push('security');
    }
    if (/performance|optimization|speed|latency/i.test(content)) {
      tags.push('performance');
    }

    return tags;
  }

  /**
   * Extract knowledge from content
   * Simple heuristic - in production, could use NLP/LLM
   */
  private extractKnowledge(
    personaId: string,
    content: string,
    metadata: Record<string, unknown>
  ): Array<
    Omit<KnowledgeEntry, 'id' | 'timestamp' | 'usageCount' | 'lastUsed'>
  > {
    const knowledge: Array<
      Omit<KnowledgeEntry, 'id' | 'timestamp' | 'usageCount' | 'lastUsed'>
    > = [];

    // Simple pattern matching for knowledge extraction
    const patterns = [
      {
        regex: /(?:always|never|must|should)\s+(.{20,100})/gi,
        type: 'best-practice' as const,
      },
      {
        regex: /(?:solution|fix|solved|resolved):\s*(.{20,100})/gi,
        type: 'solution' as const,
      },
      {
        regex: /(?:pattern|approach|strategy):\s*(.{20,100})/gi,
        type: 'pattern' as const,
      },
    ];

    for (const pattern of patterns) {
      const matches = content.matchAll(pattern.regex);
      for (const match of matches) {
        knowledge.push({
          sourcePersonaId: personaId,
          type: pattern.type,
          content: match[1].trim(),
          context: content.substring(0, 200), // First 200 chars as context
          confidence: 0.8, // High default confidence
          tags: this.extractTags(match[1]),
          relatedEntries: [],
        });
      }
    }

    return knowledge;
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<MemoryContextConfig> {
    return { ...this.config };
  }

  /**
   * Get individual subsystems for advanced use
   */
  getSubsystems() {
    return {
      memoryStorage: this.memoryStorage,
      knowledgeSharing: this.knowledgeSharing,
      contextWindow: this.contextWindow,
      threadManager: this.threadManager,
      deduplicator: this.deduplicator,
      prioritizer: this.prioritizer,
    };
  }
}
