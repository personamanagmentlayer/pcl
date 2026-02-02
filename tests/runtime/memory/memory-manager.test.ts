/**
 * Memory Manager Tests
 *
 * Basic tests for memory management system
 * Target: 0% → 30%+ coverage (initial pass)
 */

import { MemoryManager } from '../../../src/runtime/memory/memory-manager';

describe('MemoryManager', () => {
  describe('Construction', () => {
    it('should create manager with default config', () => {
      const manager = new MemoryManager();

      expect(manager).toBeDefined();
    });

    it('should create manager with custom config', () => {
      const manager = new MemoryManager({
        memory: { enabled: true, maxEntries: 5000 },
      });

      expect(manager).toBeDefined();
    });

    it('should expose subsystems', () => {
      const manager = new MemoryManager();
      const subsystems = manager.getSubsystems();

      expect(subsystems.memoryStorage).toBeDefined();
      expect(subsystems.knowledgeSharing).toBeDefined();
      expect(subsystems.contextWindow).toBeDefined();
      expect(subsystems.threadManager).toBeDefined();
      expect(subsystems.deduplicator).toBeDefined();
      expect(subsystems.prioritizer).toBeDefined();
    });

    it('should return config', () => {
      const manager = new MemoryManager();
      const config = manager.getConfig();

      expect(config).toBeDefined();
      expect(config.memory).toBeDefined();
    });
  });

  describe('Memory Storage', () => {
    let manager: MemoryManager;

    beforeEach(() => {
      manager = new MemoryManager();
    });

    it('should store memory', () => {
      const entry = manager.storeMemory({
        personaId: 'test-persona',
        type: 'fact',
        content: 'Test fact',
        metadata: {},
        importance: 0.8,
        tags: ['test'],
      });

      expect(entry).toBeDefined();
      expect(entry.content).toBe('Test fact');
      expect(entry.personaId).toBe('test-persona');
    });

    it('should retrieve memories', () => {
      manager.storeMemory({
        personaId: 'test-persona',
        type: 'fact',
        content: 'First fact',
        metadata: {},
        importance: 0.8,
        tags: ['test'],
      });

      const memories = manager.retrieveMemories({
        personaId: 'test-persona',
      });

      expect(memories).toBeDefined();
      expect(Array.isArray(memories)).toBe(true);
    });

    it('should get memory stats', () => {
      manager.storeMemory({
        personaId: 'test-persona',
        type: 'fact',
        content: 'Test fact',
        metadata: {},
        importance: 0.8,
        tags: ['test'],
      });

      const stats = manager.getMemoryStats('test-persona');

      expect(stats).toBeDefined();
    });
  });

  describe('Knowledge Sharing', () => {
    let manager: MemoryManager;

    beforeEach(() => {
      manager = new MemoryManager({
        knowledgeSharing: { shareThreshold: 0.5 },
      });
    });

    it('should share knowledge', () => {
      const entry = manager.shareKnowledge({
        sourcePersonaId: 'test-persona',
        type: 'insight',
        content: 'Important insight',
        context: 'Context information',
        confidence: 0.9,
        tags: ['insight'],
        relatedEntries: [],
      });

      expect(entry).toBeDefined();
      expect(entry.content).toBe('Important insight');
    });

    it('should retrieve knowledge', () => {
      manager.shareKnowledge({
        sourcePersonaId: 'persona-1',
        type: 'insight',
        content: 'First insight',
        context: 'Context',
        confidence: 0.8,
        tags: ['test'],
        relatedEntries: [],
      });

      const knowledge = manager.retrieveKnowledge({
        tags: ['test'],
      });

      expect(knowledge).toBeDefined();
      expect(Array.isArray(knowledge)).toBe(true);
    });

    it('should get knowledge stats', () => {
      manager.shareKnowledge({
        sourcePersonaId: 'test-persona',
        type: 'insight',
        content: 'Test insight',
        context: 'Context',
        confidence: 0.8,
        tags: ['test'],
        relatedEntries: [],
      });

      const stats = manager.getKnowledgeStats();

      expect(stats).toBeDefined();
    });
  });

  describe('Context Window', () => {
    let manager: MemoryManager;

    beforeEach(() => {
      manager = new MemoryManager();
    });

    it('should add message to context', () => {
      const message = manager.addToContext({
        role: 'user',
        content: 'Hello, world!',
        tokenCount: 10,
        metadata: {},
      });

      expect(message).toBeDefined();
      expect(message.content).toBe('Hello, world!');
    });

    it('should retrieve context messages', () => {
      manager.addToContext({
        role: 'user',
        content: 'First message',
        tokenCount: 5,
        metadata: {},
      });

      const messages = manager.getContext();

      expect(messages).toBeDefined();
      expect(Array.isArray(messages)).toBe(true);
    });

    it('should get context stats', () => {
      manager.addToContext({
        role: 'user',
        content: 'Test message',
        tokenCount: 10,
        metadata: {},
      });

      const stats = manager.getContextStats();

      expect(stats).toBeDefined();
    });

    it('should clear context', () => {
      manager.addToContext({
        role: 'user',
        content: 'Test message',
        tokenCount: 10,
        metadata: {},
      });

      manager.clearContext();

      const messages = manager.getContext();
      expect(messages.length).toBe(0);
    });
  });

  describe('Threading', () => {
    let manager: MemoryManager;

    beforeEach(() => {
      manager = new MemoryManager();
    });

    it('should create thread', () => {
      const result = manager.createThread('test-persona', {
        name: 'Test Thread',
      });

      expect(result).toBeDefined();
    });

    it('should get threads for persona', () => {
      manager.createThread('test-persona', { name: 'Thread 1' });

      const threads = manager.getThreads('test-persona');

      expect(threads).toBeDefined();
      expect(Array.isArray(threads)).toBe(true);
    });

    it('should get active thread', () => {
      manager.createThread('test-persona', { name: 'Active Thread' });

      const activeThread = manager.getActiveThread('test-persona');

      expect(activeThread).toBeDefined();
    });

    it('should add message to active thread', () => {
      manager.createThread('test-persona', { name: 'Test Thread' });

      const message = manager.addToContext({
        role: 'user',
        content: 'Thread message',
        tokenCount: 10,
        metadata: {},
      });

      const threadId = manager.addToActiveThread('test-persona', message);

      expect(threadId).toBeDefined();
    });
  });

  describe('Integrated Workflow', () => {
    let manager: MemoryManager;

    beforeEach(() => {
      manager = new MemoryManager({
        knowledgeSharing: { shareThreshold: 0.5 },
      });
    });

    it('should process message with full integration', () => {
      const result = manager.processMessage(
        'test-persona',
        'Test message content',
        'user',
        { source: 'test' }
      );

      expect(result).toBeDefined();
      expect(result.message).toBeDefined();
      expect(result.threadId).toBeDefined();
      expect(result.relevantMemories).toBeDefined();
      expect(result.relevantKnowledge).toBeDefined();
    });

    it('should include message in result', () => {
      const result = manager.processMessage(
        'test-persona',
        'Test content',
        'user'
      );

      expect(result.message.content).toBe('Test content');
      expect(result.message.role).toBe('user');
    });

    it('should create thread from process message', () => {
      const result = manager.processMessage('test-persona', 'Message', 'user');

      expect(result.threadId).toBeDefined();
      expect(typeof result.threadId).toBe('string');
    });
  });
});
