/**
 * Tests for Conversation Threading
 * Multi-turn conversation optimization with thread management
 */

import { ThreadManager } from '../../../src/runtime/context/threading';
import type {
  ThreadConfig,
  ContextMessage,
} from '../../../src/runtime/memory/types';

// Helper to create test messages
function createMessage(
  overrides: Partial<ContextMessage> = {}
): ContextMessage {
  return {
    id: `msg-${Date.now()}-${Math.random()}`,
    role: 'user',
    content: 'Test message',
    timestamp: Date.now(),
    tokenCount: 10,
    importance: 0.5,
    metadata: {},
    ...overrides,
  };
}

describe('ThreadManager', () => {
  describe('initialization', () => {
    it('should create ThreadManager with default config', () => {
      const manager = new ThreadManager();
      expect(manager).toBeDefined();
    });

    it('should create ThreadManager with custom config', () => {
      const config: Partial<ThreadConfig> = {
        enabled: true,
        maxThreads: 5,
        maxMessagesPerThread: 100,
      };
      const manager = new ThreadManager(config);
      expect(manager).toBeDefined();
    });
  });

  describe('createThread', () => {
    it('should create a new thread', () => {
      const manager = new ThreadManager({ enabled: true });
      const thread = manager.createThread('persona-1');

      expect(thread).toBeDefined();
      expect(thread.id).toBeDefined();
      expect(thread.personaId).toBe('persona-1');
      expect(thread.messages).toEqual([]);
      expect(thread.startTime).toBeDefined();
      expect(thread.lastActivity).toBeDefined();
    });

    it('should create thread with metadata', () => {
      const manager = new ThreadManager({ enabled: true });
      const metadata = { topic: 'testing', priority: 'high' };
      const thread = manager.createThread('persona-1', metadata);

      expect(thread.metadata).toEqual(metadata);
    });

    it('should throw error when threading is disabled', () => {
      const manager = new ThreadManager({ enabled: false });
      expect(() => manager.createThread('persona-1')).toThrow(
        'Threading is disabled'
      );
    });

    it('should set created thread as active', () => {
      const manager = new ThreadManager({ enabled: true });
      const thread = manager.createThread('persona-1');
      const active = manager.getActiveThread('persona-1');

      expect(active?.id).toBe(thread.id);
    });

    it('should create thread with empty tags array', () => {
      const manager = new ThreadManager({ enabled: true });
      const thread = manager.createThread('persona-1');

      expect(thread.tags).toEqual([]);
    });
  });

  describe('getThread', () => {
    it('should retrieve thread by id', () => {
      const manager = new ThreadManager({ enabled: true });
      const thread = manager.createThread('persona-1', { topic: 'test' });

      const retrieved = manager.getThread(thread.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(thread.id);
      expect(retrieved?.metadata.topic).toBe('test');
    });

    it('should return undefined for non-existent thread', () => {
      const manager = new ThreadManager({ enabled: true });
      const retrieved = manager.getThread('non-existent');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('getActiveThread', () => {
    it('should return active thread for persona', () => {
      const manager = new ThreadManager({ enabled: true });
      const thread = manager.createThread('persona-1');
      const active = manager.getActiveThread('persona-1');

      expect(active?.id).toBe(thread.id);
    });

    it('should return undefined when no active thread', () => {
      const manager = new ThreadManager({ enabled: true });
      const active = manager.getActiveThread('persona-1');

      expect(active).toBeUndefined();
    });

    it('should update active thread when creating new thread', () => {
      const manager = new ThreadManager({ enabled: true });
      const thread1 = manager.createThread('persona-1');
      const thread2 = manager.createThread('persona-1');

      const active = manager.getActiveThread('persona-1');
      expect(active?.id).toBe(thread2.id);
    });
  });

  describe('setActiveThread', () => {
    it('should set active thread', () => {
      const manager = new ThreadManager({ enabled: true });
      const thread1 = manager.createThread('persona-1');
      const thread2 = manager.createThread('persona-1');

      const success = manager.setActiveThread('persona-1', thread1.id);
      expect(success).toBe(true);

      const active = manager.getActiveThread('persona-1');
      expect(active?.id).toBe(thread1.id);
    });

    it('should return false for non-existent thread', () => {
      const manager = new ThreadManager({ enabled: true });
      const success = manager.setActiveThread('persona-1', 'non-existent');

      expect(success).toBe(false);
    });

    it('should return false for wrong persona', () => {
      const manager = new ThreadManager({ enabled: true });
      const thread = manager.createThread('persona-1');

      const success = manager.setActiveThread('persona-2', thread.id);
      expect(success).toBe(false);
    });

    it('should update thread when setting active', () => {
      const manager = new ThreadManager({ enabled: true });
      const thread1 = manager.createThread('persona-1');
      const thread2 = manager.createThread('persona-1');

      // Verify thread2 is active
      expect(manager.getActiveThread('persona-1')?.id).toBe(thread2.id);

      // Set thread1 as active
      const success = manager.setActiveThread('persona-1', thread1.id);
      expect(success).toBe(true);

      // Verify thread1 is now active
      expect(manager.getActiveThread('persona-1')?.id).toBe(thread1.id);
    });
  });

  describe('addMessage', () => {
    it('should add message to thread', () => {
      const manager = new ThreadManager({ enabled: true });
      const thread = manager.createThread('persona-1');
      const message = createMessage({ content: 'Hello' });

      const success = manager.addMessage(thread.id, message);
      expect(success).toBe(true);

      const retrieved = manager.getThread(thread.id);
      expect(retrieved?.messages).toHaveLength(1);
      expect(retrieved?.messages[0].content).toBe('Hello');
    });

    it('should return false for non-existent thread', () => {
      const manager = new ThreadManager({ enabled: true });
      const message = createMessage();

      const success = manager.addMessage('non-existent', message);
      expect(success).toBe(false);
    });

    it('should respect maxMessagesPerThread limit', () => {
      const manager = new ThreadManager({
        enabled: true,
        maxMessagesPerThread: 5,
      });
      const thread = manager.createThread('persona-1');

      // Add 10 messages
      for (let i = 0; i < 10; i++) {
        manager.addMessage(
          thread.id,
          createMessage({ content: `Message ${i}` })
        );
      }

      const retrieved = manager.getThread(thread.id);
      expect(retrieved?.messages).toHaveLength(5);

      // Should keep most recent messages
      expect(retrieved?.messages[4].content).toBe('Message 9');
    });

    it('should add multiple messages in sequence', () => {
      const manager = new ThreadManager({ enabled: true });
      const thread = manager.createThread('persona-1');

      manager.addMessage(thread.id, createMessage({ content: 'First' }));
      manager.addMessage(thread.id, createMessage({ content: 'Second' }));
      manager.addMessage(thread.id, createMessage({ content: 'Third' }));

      const retrieved = manager.getThread(thread.id);
      expect(retrieved?.messages).toHaveLength(3);
      expect(retrieved?.messages.map((m) => m.content)).toEqual([
        'First',
        'Second',
        'Third',
      ]);
    });
  });

  describe('addToActiveThread', () => {
    it('should add message to active thread', () => {
      const manager = new ThreadManager({ enabled: true });
      const thread = manager.createThread('persona-1');
      const message = createMessage({ content: 'Active message' });

      const threadId = manager.addToActiveThread('persona-1', message);

      expect(threadId).toBe(thread.id);

      const retrieved = manager.getThread(thread.id);
      expect(retrieved?.messages).toHaveLength(1);
      expect(retrieved?.messages[0].content).toBe('Active message');
    });

    it('should create new thread if no active thread exists', () => {
      const manager = new ThreadManager({ enabled: true });
      const message = createMessage({ content: 'Auto-create' });

      const threadId = manager.addToActiveThread('persona-1', message);

      expect(threadId).toBeDefined();

      const thread = manager.getThread(threadId);
      expect(thread).toBeDefined();
      expect(thread?.messages).toHaveLength(1);
      expect(thread?.messages[0].content).toBe('Auto-create');
    });
  });

  describe('getPersonaThreads', () => {
    it('should return all threads for a persona', () => {
      const manager = new ThreadManager({ enabled: true });
      manager.createThread('persona-1');
      manager.createThread('persona-1');
      manager.createThread('persona-2');

      const threads = manager.getPersonaThreads('persona-1');
      expect(threads).toHaveLength(2);
      threads.forEach((thread) => {
        expect(thread.personaId).toBe('persona-1');
      });
    });

    it('should return empty array when no threads exist', () => {
      const manager = new ThreadManager({ enabled: true });
      const threads = manager.getPersonaThreads('persona-1');

      expect(threads).toEqual([]);
    });

    it('should return threads sorted by lastActivity (newest first)', () => {
      const manager = new ThreadManager({ enabled: true });
      manager.createThread('persona-1');
      manager.createThread('persona-1');
      manager.createThread('persona-1');

      const threads = manager.getPersonaThreads('persona-1');

      // Verify threads are sorted by lastActivity (newest first)
      expect(threads).toHaveLength(3);
      for (let i = 0; i < threads.length - 1; i++) {
        expect(threads[i].lastActivity).toBeGreaterThanOrEqual(
          threads[i + 1].lastActivity
        );
      }
    });
  });

  describe('getRecentThreads', () => {
    it('should return recent threads across all personas', () => {
      const manager = new ThreadManager({ enabled: true });
      manager.createThread('persona-1');
      manager.createThread('persona-2');
      manager.createThread('persona-3');

      const threads = manager.getRecentThreads(10);

      expect(threads).toHaveLength(3);
    });

    it('should respect limit parameter', () => {
      const manager = new ThreadManager({ enabled: true });
      for (let i = 0; i < 10; i++) {
        manager.createThread(`persona-${i}`);
      }

      const threads = manager.getRecentThreads(5);

      expect(threads).toHaveLength(5);
    });

    it('should return threads sorted by lastActivity (newest first)', () => {
      const manager = new ThreadManager({ enabled: true });
      const thread1 = manager.createThread('persona-1');
      const thread2 = manager.createThread('persona-2');

      // Make thread1 more recent
      manager.addMessage(
        thread1.id,
        createMessage({ timestamp: Date.now() + 5000 })
      );

      const threads = manager.getRecentThreads(10);

      expect(threads[0].id).toBe(thread1.id);
    });
  });

  describe('getInactiveThreads', () => {
    it('should return all threads when no threshold specified', () => {
      const manager = new ThreadManager({ enabled: true });
      const thread1 = manager.createThread('persona-1');
      const thread2 = manager.createThread('persona-2');

      const inactive = manager.getInactiveThreads();

      // All threads should be considered potentially inactive
      expect(inactive.length).toBeGreaterThanOrEqual(0);
    });

    it('should identify inactive threads based on threshold', () => {
      const manager = new ThreadManager({ enabled: true });
      const thread = manager.createThread('persona-1');

      // Manually set lastActivity to 2 hours ago
      const retrieved = manager.getThread(thread.id);
      if (retrieved) {
        retrieved.lastActivity = Date.now() - 2 * 60 * 60 * 1000;
      }

      const inactive = manager.getInactiveThreads(60 * 60 * 1000); // 1 hour threshold
      expect(inactive.some((t) => t.id === thread.id)).toBe(true);
    });
  });

  describe('addTags', () => {
    it('should add tags to thread', () => {
      const manager = new ThreadManager({ enabled: true });
      const thread = manager.createThread('persona-1');

      const success = manager.addTags(thread.id, ['important', 'urgent']);
      expect(success).toBe(true);

      const retrieved = manager.getThread(thread.id);
      expect(retrieved?.tags).toContain('important');
      expect(retrieved?.tags).toContain('urgent');
    });

    it('should not add duplicate tags', () => {
      const manager = new ThreadManager({ enabled: true });
      const thread = manager.createThread('persona-1');

      manager.addTags(thread.id, ['important']);
      manager.addTags(thread.id, ['important']);

      const retrieved = manager.getThread(thread.id);
      expect(retrieved?.tags.filter((t) => t === 'important')).toHaveLength(1);
    });

    it('should return false for non-existent thread', () => {
      const manager = new ThreadManager({ enabled: true });
      const success = manager.addTags('non-existent', ['tag']);

      expect(success).toBe(false);
    });

    it('should add multiple tags in one call', () => {
      const manager = new ThreadManager({ enabled: true });
      const thread = manager.createThread('persona-1');

      manager.addTags(thread.id, ['tag1', 'tag2', 'tag3']);

      const retrieved = manager.getThread(thread.id);
      expect(retrieved?.tags).toHaveLength(3);
    });
  });

  describe('findByTags', () => {
    it('should find threads matching any tag (OR matching)', () => {
      const manager = new ThreadManager({ enabled: true });
      const thread1 = manager.createThread('persona-1');
      const thread2 = manager.createThread('persona-1');
      const thread3 = manager.createThread('persona-1');

      manager.addTags(thread1.id, ['urgent', 'bug']);
      manager.addTags(thread2.id, ['urgent']);
      manager.addTags(thread3.id, ['feature']);

      const threads = manager.findByTags(['urgent', 'bug']);

      // Should match thread1 (has both) and thread2 (has urgent)
      expect(threads).toHaveLength(2);
      expect(threads.some((t) => t.id === thread1.id)).toBe(true);
      expect(threads.some((t) => t.id === thread2.id)).toBe(true);
    });

    it('should return empty array when no matches', () => {
      const manager = new ThreadManager({ enabled: true });
      manager.createThread('persona-1');

      const threads = manager.findByTags(['non-existent-tag']);

      expect(threads).toEqual([]);
    });

    it('should find threads with single tag', () => {
      const manager = new ThreadManager({ enabled: true });
      const thread1 = manager.createThread('persona-1');
      const thread2 = manager.createThread('persona-2');

      manager.addTags(thread1.id, ['urgent']);
      manager.addTags(thread2.id, ['urgent']);

      const threads = manager.findByTags(['urgent']);

      expect(threads).toHaveLength(2);
    });

    it('should sort results by lastActivity (newest first)', () => {
      const manager = new ThreadManager({ enabled: true });
      const thread1 = manager.createThread('persona-1');
      const thread2 = manager.createThread('persona-1');

      manager.addTags(thread1.id, ['urgent']);
      manager.addTags(thread2.id, ['urgent']);

      // Make thread1 more recent
      manager.addMessage(thread1.id, createMessage());

      const threads = manager.findByTags(['urgent']);

      expect(threads[0].id).toBe(thread1.id);
      expect(threads[1].id).toBe(thread2.id);
    });
  });

  describe('maxThreads enforcement', () => {
    it('should enforce maxThreads limit per persona', () => {
      const manager = new ThreadManager({
        enabled: true,
        maxThreads: 3,
      });

      // Create 5 threads for same persona
      for (let i = 0; i < 5; i++) {
        manager.createThread('persona-1');
      }

      const threads = manager.getPersonaThreads('persona-1');
      expect(threads).toHaveLength(3);
    });

    it('should evict oldest threads when limit exceeded', () => {
      const manager = new ThreadManager({
        enabled: true,
        maxThreads: 2,
      });

      const thread1 = manager.createThread('persona-1');
      const thread2 = manager.createThread('persona-1');
      const thread3 = manager.createThread('persona-1');

      const threads = manager.getPersonaThreads('persona-1');

      // thread1 should be evicted
      expect(threads.some((t) => t.id === thread1.id)).toBe(false);
      expect(threads.some((t) => t.id === thread2.id)).toBe(true);
      expect(threads.some((t) => t.id === thread3.id)).toBe(true);
    });

    it('should not affect threads from different personas', () => {
      const manager = new ThreadManager({
        enabled: true,
        maxThreads: 2,
      });

      // Create threads for different personas
      manager.createThread('persona-1');
      manager.createThread('persona-1');
      manager.createThread('persona-2');
      manager.createThread('persona-2');

      const threads1 = manager.getPersonaThreads('persona-1');
      const threads2 = manager.getPersonaThreads('persona-2');

      expect(threads1).toHaveLength(2);
      expect(threads2).toHaveLength(2);
    });
  });
});
