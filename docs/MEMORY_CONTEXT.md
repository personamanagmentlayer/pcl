# Memory & Context Management Guide

> **PCL v2.3 — Context & Memory**
> Long-term learning and intelligent context management for personas

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Getting Started](#getting-started)
4. [Memory Storage](#memory-storage)
5. [Context Window Management](#context-window-management)
6. [Knowledge Sharing](#knowledge-sharing)
7. [Conversation Threading](#conversation-threading)
8. [Semantic Deduplication](#semantic-deduplication)
9. [Context Prioritization](#context-prioritization)
10. [Configuration](#configuration)
11. [Examples](#examples)
12. [Best Practices](#best-practices)
13. [Troubleshooting](#troubleshooting)
14. [API Reference](#api-reference)

---

## Overview

Phase 2.3 introduces comprehensive memory and context management capabilities to PCL, enabling:

- **Long-term memory** - Personas remember facts, preferences, and learnings across sessions
- **Intelligent context compression** - Automatic context optimization when token limits approached
- **Cross-persona knowledge sharing** - Personas learn from each other's experiences
- **Conversation threading** - Multi-turn conversations organized into coherent threads
- **Semantic deduplication** - Automatic removal of redundant information
- **Context prioritization** - Focus on the most relevant information

### Key Benefits

- ✅ **Persistent Learning** - Personas improve over time from past interactions
- ✅ **Reduced Costs** - Intelligent context management minimizes token usage
- ✅ **Better Quality** - Relevant context prioritization improves response accuracy
- ✅ **Scalability** - Handle long conversations without context overflow
- ✅ **Collaboration** - Personas share knowledge for collective improvement

---

## Features

### 1. Long-Term Persona Memory

Store and retrieve information across sessions with importance decay and persistence.

**Key Capabilities:**

- Store facts, preferences, skills, conversations, and feedback
- Importance-based scoring (0-1)
- Automatic importance decay over time
- Persistent storage to disk with compression
- Efficient querying by type, tags, time range
- Access count tracking for usage analysis

### 2. Context Window Management

Intelligent compression and management of context windows.

**Key Capabilities:**

- Automatic compression at 80% capacity (configurable)
- Preserve recent and important messages
- Generate summaries of older context
- Real-time token usage tracking
- Compression statistics and analytics
- Configurable preservation rules

### 3. Cross-Persona Knowledge Sharing

Enable personas to learn from each other.

**Key Capabilities:**

- Share facts, patterns, solutions, and best practices
- Confidence-based auto-sharing (threshold: 0.8)
- Tag-based relevance scoring
- Usage tracking and popularity metrics
- Related knowledge linking
- Top contributors tracking

### 4. Conversation Threading

Organize conversations into coherent threads.

**Key Capabilities:**

- Automatic thread management
- Auto-summarize inactive threads (>30 min)
- Thread merging and splitting
- Tag-based thread discovery
- Per-persona thread limits
- Thread statistics and analytics

### 5. Semantic Deduplication

Remove redundant information automatically.

**Key Capabilities:**

- Token overlap detection (Jaccard similarity)
- Structural similarity comparison
- Clustering-based deduplication
- Configurable similarity threshold (default: 0.9)
- Token savings tracking
- Keep most important duplicates

### 6. Context Prioritization

Focus on relevant information through importance scoring.

**Key Capabilities:**

- Multi-factor importance computation:
  - Recency (30% weight)
  - Role (20% weight)
  - Length (20% weight)
  - Keywords (30% weight)
- Custom prioritization rules
- Importance rebalancing
- Distribution analysis
- Keyword-based boosting

---

## Getting Started

### Installation

Phase 2.3 features are included in PCL v2.3+. No additional installation required.

### Basic Usage

```typescript
import { MemoryManager } from '@pcl/runtime/memory';

// Create memory manager with default configuration
const memoryManager = new MemoryManager();

// Process a user message
const result = memoryManager.processMessage(
  'developer-persona',
  'How do I optimize database queries?',
  'user'
);

console.log('Context message:', result.message);
console.log('Thread ID:', result.threadId);
console.log('Relevant memories:', result.relevantMemories);
console.log('Shared knowledge:', result.relevantKnowledge);

// Store a response
const response = memoryManager.storeResponse(
  'developer-persona',
  'Use indexes, avoid N+1 queries, and implement caching.',
  { confidence: 0.9 }
);

console.log('Extracted knowledge:', response.extractedKnowledge);
```

---

## Memory Storage

### Storing Memories

```typescript
const memory = memoryManager.storeMemory({
  personaId: 'developer-persona',
  type: 'fact',
  content: 'User prefers TypeScript over JavaScript',
  metadata: { source: 'conversation', date: '2026-01-24' },
  importance: 0.9,
  tags: ['preference', 'language'],
});
```

### Memory Types

- **`fact`** - Factual information
- **`preference`** - User preferences
- **`skill`** - Learned capabilities
- **`conversation`** - Important conversation snippets
- **`feedback`** - User feedback and ratings

### Querying Memories

```typescript
const facts = memoryManager.retrieveMemories({
  personaId: 'developer-persona',
  type: 'fact',
  sortBy: 'importance',
  sortOrder: 'desc',
});
```

---

## Context Window Management

### Adding Messages

```typescript
const message = memoryManager.addToContext({
  role: 'user',
  content: 'How do I implement authentication?',
  tokenCount: ContextWindow.estimateTokenCount(
    'How do I implement authentication?'
  ),
  metadata: { sessionId: 'abc123' },
});
```

### Automatic Compression

Context is automatically compressed when utilization exceeds 80%.

---

## Knowledge Sharing

### Sharing Knowledge

```typescript
const knowledge = memoryManager.shareKnowledge({
  sourcePersonaId: 'developer-persona',
  type: 'best-practice',
  content: 'Always validate user input before database queries',
  context: 'Discussion about SQL injection prevention',
  confidence: 0.95,
  tags: ['security', 'database', 'validation'],
  relatedEntries: [],
});
```

---

## Conversation Threading

### Creating Threads

```typescript
const threadId = memoryManager.addToActiveThread('developer-persona', message);
```

---

## Semantic Deduplication

### Configuration

```typescript
const memoryManager = new MemoryManager({
  contextWindow: {
    semanticDeduplication: true,
    deduplicationThreshold: 0.9,
  },
});
```

---

## Context Prioritization

### Custom Rules

```typescript
const subsystems = memoryManager.getSubsystems();

subsystems.prioritizer.addRule({
  name: 'error-messages',
  condition: (msg) => msg.content.toLowerCase().includes('error'),
  importanceBoost: 2.5,
  priority: 10,
});
```

---

## Configuration

### Default Configuration

```typescript
const DEFAULT_CONFIG = {
  memory: {
    enabled: true,
    maxEntries: 10000,
    ttl: 30 * 24 * 60 * 60 * 1000,
    persistToDisk: true,
    diskPath: './.pcl/memory',
    compressionEnabled: true,
    importanceDecay: true,
    decayRate: 0.95,
  },
  contextWindow: {
    maxTokens: 200000,
    compressionThreshold: 0.8,
    compressionRatio: 0.5,
    preserveRecent: 10,
    preserveImportant: 5,
    semanticDeduplication: true,
    deduplicationThreshold: 0.9,
  },
  knowledgeSharing: {
    enabled: true,
    autoShare: true,
    shareThreshold: 0.8,
    maxEntries: 5000,
    ttl: 60 * 24 * 60 * 60 * 1000,
    relevanceScoring: true,
  },
  threading: {
    enabled: true,
    autoSummarize: true,
    inactivityThreshold: 30 * 60 * 1000,
    maxThreads: 50,
    maxMessagesPerThread: 100,
  },
  prioritization: {
    enabled: true,
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
  },
};
```

---

## Examples

### Example 1: Long-Term Memory

```typescript
// Store memory
memoryManager.storeMemory({
  personaId: 'assistant',
  type: 'preference',
  content: 'User prefers detailed explanations with examples',
  importance: 0.9,
  tags: ['preference'],
  metadata: {},
});

// Retrieve later
const memories = memoryManager.retrieveMemories({
  personaId: 'assistant',
  type: 'preference',
});
```

### Example 2: Knowledge Sharing

```typescript
// Persona 1 shares
memoryManager.shareKnowledge({
  sourcePersonaId: 'backend-expert',
  type: 'best-practice',
  content: 'Use connection pooling for database efficiency',
  confidence: 0.95,
  tags: ['database', 'performance'],
  context: '',
  relatedEntries: [],
});

// Persona 2 retrieves
const knowledge = memoryManager.retrieveKnowledge({
  tags: ['database'],
  excludePersona: 'frontend-expert',
});
```

---

## Best Practices

1. **Use appropriate importance scores** (critical: 0.9-1.0, important: 0.7-0.9)
2. **Tag consistently** (lowercase, hyphens for multi-word)
3. **Monitor token usage** and adjust compression settings
4. **Run cleanup regularly** to remove expired data
5. **Customize prioritization** for your domain

---

## Troubleshooting

### High Memory Usage

- Reduce `maxEntries`
- Enable importance decay
- Reduce TTL
- Run cleanup more frequently

### Context Overflow

- Lower `maxTokens`
- Increase compression aggressiveness
- Enable deduplication

---

## API Reference

See individual module documentation for complete API details.

---

**End of Memory & Context Management Guide**
