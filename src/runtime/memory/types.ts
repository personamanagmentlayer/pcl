/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Memory & Context Management Types
 * Phase 2.3: Context & Memory
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Memory entry stored for a persona
 */
export interface MemoryEntry {
  id: string;
  personaId: string;
  timestamp: number;
  type: 'fact' | 'preference' | 'skill' | 'conversation' | 'feedback';
  content: string;
  metadata: Record<string, unknown>;
  importance: number; // 0-1 score
  accessCount: number;
  lastAccessed: number;
  tags: string[];
}

/**
 * Memory query criteria
 */
export interface MemoryQuery {
  personaId?: string;
  type?: MemoryEntry['type'] | MemoryEntry['type'][];
  tags?: string[];
  minImportance?: number;
  timeRange?: { start: number; end: number };
  limit?: number;
  sortBy?: 'timestamp' | 'importance' | 'accessCount' | 'lastAccessed';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Long-term memory storage configuration
 */
export interface MemoryStorageConfig {
  enabled: boolean;
  maxEntries: number; // Maximum entries per persona
  ttl: number; // Time-to-live in milliseconds (0 = no expiration)
  persistToDisk: boolean;
  diskPath?: string;
  compressionEnabled: boolean;
  importanceDecay: boolean; // Decay importance over time
  decayRate: number; // Decay factor per day (0-1)
}

/**
 * Default memory storage configuration
 */
export const DEFAULT_MEMORY_STORAGE_CONFIG: MemoryStorageConfig = {
  enabled: true,
  maxEntries: 10000,
  ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
  persistToDisk: true,
  diskPath: './.pcl/memory',
  compressionEnabled: true,
  importanceDecay: true,
  decayRate: 0.95, // 5% decay per day
};

/**
 * Context window message
 */
export interface ContextMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tokenCount: number;
  importance: number; // 0-1 score
  metadata: Record<string, unknown>;
}

/**
 * Context window configuration
 */
export interface ContextWindowConfig {
  maxTokens: number; // Maximum tokens in context
  compressionThreshold: number; // Compress when usage exceeds this percentage (0-1)
  compressionRatio: number; // Target compression ratio (0-1)
  preserveRecent: number; // Always preserve N most recent messages
  preserveImportant: number; // Always preserve N most important messages
  semanticDeduplication: boolean;
  deduplicationThreshold: number; // Similarity threshold (0-1)
}

/**
 * Default context window configuration
 */
export const DEFAULT_CONTEXT_WINDOW_CONFIG: ContextWindowConfig = {
  maxTokens: 200000,
  compressionThreshold: 0.8, // Compress at 80% capacity
  compressionRatio: 0.5, // Target 50% of max tokens
  preserveRecent: 10,
  preserveImportant: 5,
  semanticDeduplication: true,
  deduplicationThreshold: 0.9,
};

/**
 * Compressed context summary
 */
export interface ContextSummary {
  id: string;
  originalMessages: string[]; // Message IDs
  summary: string;
  timestamp: number;
  tokenCount: number;
  compressionRatio: number;
}

/**
 * Knowledge entry shared across personas
 */
export interface KnowledgeEntry {
  id: string;
  sourcePersonaId: string;
  timestamp: number;
  type: 'fact' | 'pattern' | 'solution' | 'best-practice';
  content: string;
  context: string; // Original context where knowledge was discovered
  confidence: number; // 0-1 score
  usageCount: number;
  lastUsed: number;
  tags: string[];
  relatedEntries: string[]; // IDs of related knowledge entries
}

/**
 * Cross-persona knowledge sharing configuration
 */
export interface KnowledgeSharingConfig {
  enabled: boolean;
  autoShare: boolean; // Automatically share high-confidence knowledge
  shareThreshold: number; // Confidence threshold for auto-sharing (0-1)
  maxEntries: number;
  ttl: number; // Time-to-live in milliseconds
  relevanceScoring: boolean;
}

/**
 * Default knowledge sharing configuration
 */
export const DEFAULT_KNOWLEDGE_SHARING_CONFIG: KnowledgeSharingConfig = {
  enabled: true,
  autoShare: true,
  shareThreshold: 0.8,
  maxEntries: 5000,
  ttl: 60 * 24 * 60 * 60 * 1000, // 60 days
  relevanceScoring: true,
};

/**
 * Conversation thread
 */
export interface ConversationThread {
  id: string;
  personaId: string;
  startTime: number;
  lastActivity: number;
  messages: ContextMessage[];
  summary?: string;
  tags: string[];
  metadata: Record<string, unknown>;
}

/**
 * Thread management configuration
 */
export interface ThreadConfig {
  enabled: boolean;
  autoSummarize: boolean; // Auto-summarize inactive threads
  inactivityThreshold: number; // Milliseconds before thread is considered inactive
  maxThreads: number; // Maximum concurrent threads per persona
  maxMessagesPerThread: number;
}

/**
 * Default thread configuration
 */
export const DEFAULT_THREAD_CONFIG: ThreadConfig = {
  enabled: true,
  autoSummarize: true,
  inactivityThreshold: 30 * 60 * 1000, // 30 minutes
  maxThreads: 50,
  maxMessagesPerThread: 100,
};

/**
 * Context prioritization rule
 */
export interface PrioritizationRule {
  name: string;
  condition: (message: ContextMessage) => boolean;
  importanceBoost: number; // Multiplier for importance (e.g., 1.5 = 50% boost)
  priority: number; // Higher priority rules evaluated first
}

/**
 * Context prioritization configuration
 */
export interface PrioritizationConfig {
  enabled: boolean;
  rules: PrioritizationRule[];
  recencyWeight: number; // Weight for recency in importance calculation (0-1)
  roleWeight: number; // Weight for message role (0-1)
  lengthWeight: number; // Weight for message length (0-1)
  keywordWeight: number; // Weight for keyword matching (0-1)
  keywords: string[]; // Important keywords that boost priority
}

/**
 * Default prioritization configuration
 */
export const DEFAULT_PRIORITIZATION_CONFIG: PrioritizationConfig = {
  enabled: true,
  rules: [
    {
      name: 'system-messages',
      condition: (msg) => msg.role === 'system',
      importanceBoost: 2.0,
      priority: 10,
    },
    {
      name: 'long-messages',
      condition: (msg) => msg.tokenCount > 500,
      importanceBoost: 1.3,
      priority: 5,
    },
    {
      name: 'recent-messages',
      condition: (msg) => Date.now() - msg.timestamp < 5 * 60 * 1000, // 5 minutes
      importanceBoost: 1.5,
      priority: 8,
    },
  ],
  recencyWeight: 0.3,
  roleWeight: 0.2,
  lengthWeight: 0.2,
  keywordWeight: 0.3,
  keywords: [
    'important',
    'critical',
    'error',
    'bug',
    'security',
    'performance',
  ],
};

/**
 * Semantic deduplication result
 */
export interface DeduplicationResult {
  duplicates: string[]; // Message IDs that are duplicates
  kept: string[]; // Message IDs that were kept
  removedCount: number;
  tokensSaved: number;
}

/**
 * Comprehensive memory and context configuration
 */
export interface MemoryContextConfig {
  memory: MemoryStorageConfig;
  contextWindow: ContextWindowConfig;
  knowledgeSharing: KnowledgeSharingConfig;
  threading: ThreadConfig;
  prioritization: PrioritizationConfig;
}

/**
 * Default memory and context configuration
 */
export const DEFAULT_MEMORY_CONTEXT_CONFIG: MemoryContextConfig = {
  memory: DEFAULT_MEMORY_STORAGE_CONFIG,
  contextWindow: DEFAULT_CONTEXT_WINDOW_CONFIG,
  knowledgeSharing: DEFAULT_KNOWLEDGE_SHARING_CONFIG,
  threading: DEFAULT_THREAD_CONFIG,
  prioritization: DEFAULT_PRIORITIZATION_CONFIG,
};

/**
 * Memory statistics
 */
export interface MemoryStats {
  totalEntries: number;
  entriesByType: Record<MemoryEntry['type'], number>;
  totalSize: number; // Bytes
  oldestEntry: number; // Timestamp
  newestEntry: number; // Timestamp
  avgImportance: number;
  avgAccessCount: number;
}

/**
 * Context statistics
 */
export interface ContextStats {
  currentTokens: number;
  maxTokens: number;
  utilizationPercentage: number;
  messageCount: number;
  summaryCount: number;
  compressionRatio: number;
  deduplicatedCount: number;
}

/**
 * Knowledge sharing statistics
 */
export interface KnowledgeStats {
  totalEntries: number;
  entriesByType: Record<KnowledgeEntry['type'], number>;
  avgConfidence: number;
  avgUsageCount: number;
  topContributors: Array<{ personaId: string; contributions: number }>;
}
