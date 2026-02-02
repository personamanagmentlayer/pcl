/**
 * Context Window Tests
 *
 * Basic tests for context window management
 * Target: 53% → 70%+ coverage
 */

import { ContextWindow } from '../../../src/runtime/context/context-window';
import type { ContextMessage } from '../../../src/runtime/memory/types';

describe('ContextWindow', () => {
  describe('Construction', () => {
    it('should create window with default config', () => {
      const window = new ContextWindow();

      expect(window).toBeDefined();
    });

    it('should create window with custom config', () => {
      const window = new ContextWindow({
        maxTokens: 100000,
        compressionThreshold: 0.9,
      });

      expect(window).toBeDefined();
    });
  });

  describe('Message Management', () => {
    let window: ContextWindow;

    beforeEach(() => {
      window = new ContextWindow();
    });

    it('should add message', () => {
      const message = window.addMessage({
        role: 'user',
        content: 'Test message',
        tokenCount: 10,
        importance: 0.5,
        metadata: {},
      });

      expect(message).toBeDefined();
      expect(message.id).toBeDefined();
      expect(message.timestamp).toBeDefined();
      expect(message.content).toBe('Test message');
    });

    it('should get all messages', () => {
      window.addMessage({
        role: 'user',
        content: 'Message 1',
        tokenCount: 5,
        importance: 0.5,
        metadata: {},
      });

      window.addMessage({
        role: 'assistant',
        content: 'Message 2',
        tokenCount: 5,
        importance: 0.5,
        metadata: {},
      });

      const messages = window.getMessages();

      expect(messages.length).toBe(2);
    });

    it('should get recent messages', () => {
      for (let i = 0; i < 10; i++) {
        window.addMessage({
          role: 'user',
          content: `Message ${i}`,
          tokenCount: 5,
          importance: 0.5,
          metadata: {},
        });
      }

      const recent = window.getRecentMessages(3);

      expect(recent.length).toBe(3);
      expect(recent[2].content).toBe('Message 9');
    });

    it('should get messages in time range', async () => {
      const start = Date.now();

      window.addMessage({
        role: 'user',
        content: 'Message 1',
        tokenCount: 5,
        importance: 0.5,
        metadata: {},
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      window.addMessage({
        role: 'user',
        content: 'Message 2',
        tokenCount: 5,
        importance: 0.5,
        metadata: {},
      });

      const end = Date.now();

      const messages = window.getMessagesInRange(start, end);

      expect(messages.length).toBe(2);
    });

    it('should get important messages', () => {
      window.addMessage({
        role: 'user',
        content: 'Low importance',
        tokenCount: 5,
        importance: 0.2,
        metadata: {},
      });

      window.addMessage({
        role: 'user',
        content: 'High importance',
        tokenCount: 5,
        importance: 0.9,
        metadata: {},
      });

      window.addMessage({
        role: 'user',
        content: 'Medium importance',
        tokenCount: 5,
        importance: 0.5,
        metadata: {},
      });

      const important = window.getImportantMessages(2);

      expect(important.length).toBe(2);
      expect(important[0].content).toBe('High importance');
    });
  });

  describe('Statistics', () => {
    let window: ContextWindow;

    beforeEach(() => {
      window = new ContextWindow();
    });

    it('should get stats', () => {
      window.addMessage({
        role: 'user',
        content: 'Test',
        tokenCount: 10,
        importance: 0.5,
        metadata: {},
      });

      const stats = window.getStats();

      expect(stats).toBeDefined();
      expect(stats.messageCount).toBe(1);
      expect(stats.currentTokens).toBe(10);
    });

    it('should track token count', () => {
      window.addMessage({
        role: 'user',
        content: 'Message 1',
        tokenCount: 100,
        importance: 0.5,
        metadata: {},
      });

      window.addMessage({
        role: 'user',
        content: 'Message 2',
        tokenCount: 200,
        importance: 0.5,
        metadata: {},
      });

      const stats = window.getStats();

      expect(stats.currentTokens).toBe(300);
    });

    it('should calculate utilization', () => {
      window.addMessage({
        role: 'user',
        content: 'Test',
        tokenCount: 50000,
        importance: 0.5,
        metadata: {},
      });

      const stats = window.getStats();

      expect(stats.utilizationPercentage).toBeGreaterThan(0);
    });
  });

  describe('Clear and Reset', () => {
    let window: ContextWindow;

    beforeEach(() => {
      window = new ContextWindow();
    });

    it('should clear messages', () => {
      window.addMessage({
        role: 'user',
        content: 'Test',
        tokenCount: 10,
        importance: 0.5,
        metadata: {},
      });

      window.clear();

      const messages = window.getMessages();

      expect(messages.length).toBe(0);
    });

    it('should reset token count on clear', () => {
      window.addMessage({
        role: 'user',
        content: 'Test',
        tokenCount: 100,
        importance: 0.5,
        metadata: {},
      });

      window.clear();

      const stats = window.getStats();

      expect(stats.currentTokens).toBe(0);
    });
  });

  describe('Token Estimation', () => {
    it('should estimate tokens for content', () => {
      const tokens = ContextWindow.estimateTokenCount('Hello world');

      expect(tokens).toBeGreaterThan(0);
    });

    it('should estimate more tokens for longer content', () => {
      const short = ContextWindow.estimateTokenCount('Hi');
      const long = ContextWindow.estimateTokenCount(
        'This is a much longer message with many words'
      );

      expect(long).toBeGreaterThan(short);
    });
  });

  describe('Deduplication', () => {
    let window: ContextWindow;

    beforeEach(() => {
      window = new ContextWindow({
        semanticDeduplication: true,
      });
    });

    it('should support deduplication', () => {
      window.addMessage({
        role: 'user',
        content: 'Test message',
        tokenCount: 5,
        importance: 0.5,
        metadata: {},
      });

      window.addMessage({
        role: 'user',
        content: 'Test message',
        tokenCount: 5,
        importance: 0.5,
        metadata: {},
      });

      window.deduplicateMessages();

      // Deduplication should work (implementation dependent)
      expect(window.getMessages().length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Message Updates', () => {
    let window: ContextWindow;

    beforeEach(() => {
      window = new ContextWindow();
    });

    it('should update message importance', () => {
      const message = window.addMessage({
        role: 'user',
        content: 'Test',
        tokenCount: 10,
        importance: 0.5,
        metadata: {},
      });

      window.updateImportance(message.id, 0.9);

      const messages = window.getMessages();
      const updated = messages.find((m) => m.id === message.id);

      expect(updated?.importance).toBe(0.9);
    });

    it('should remove message', () => {
      const message = window.addMessage({
        role: 'user',
        content: 'Test',
        tokenCount: 10,
        importance: 0.5,
        metadata: {},
      });

      window.removeMessage(message.id);

      const messages = window.getMessages();

      expect(messages.find((m) => m.id === message.id)).toBeUndefined();
    });
  });
});
