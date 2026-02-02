/**
 * Tests for Context Prioritization
 * Intelligent message importance scoring and ranking
 */

import { ContextPrioritizer } from '../../../src/runtime/context/prioritization';
import type {
  ContextMessage,
  PrioritizationConfig,
  PrioritizationRule,
} from '../../../src/runtime/memory/types';

// Helper to create test messages
function createMessage(
  overrides: Partial<ContextMessage> = {}
): ContextMessage {
  return {
    id: `msg-${Date.now()}-${Math.random()}`,
    role: 'user',
    content: 'Test message content',
    timestamp: Date.now(),
    tokenCount: 100,
    importance: 0.5,
    metadata: {},
    ...overrides,
  };
}

describe('ContextPrioritizer', () => {
  describe('initialization', () => {
    it('should create prioritizer with default config', () => {
      const prioritizer = new ContextPrioritizer();
      expect(prioritizer).toBeDefined();
    });

    it('should create prioritizer with custom config', () => {
      const config: Partial<PrioritizationConfig> = {
        enabled: true,
        recencyWeight: 0.4,
        roleWeight: 0.3,
        lengthWeight: 0.2,
        keywordWeight: 0.1,
      };
      const prioritizer = new ContextPrioritizer(config);
      expect(prioritizer).toBeDefined();
    });

    it('should merge custom config with defaults', () => {
      const config: Partial<PrioritizationConfig> = {
        recencyWeight: 0.5,
      };
      const prioritizer = new ContextPrioritizer(config);
      expect(prioritizer).toBeDefined();
    });
  });

  describe('computeImportance', () => {
    it('should compute importance for a message', () => {
      const prioritizer = new ContextPrioritizer({ enabled: true });
      const message = createMessage({ content: 'Test message' });

      const result = prioritizer.computeImportance(message);

      expect(result.importance).toBeGreaterThanOrEqual(0);
      expect(result.importance).toBeLessThanOrEqual(1);
    });

    it('should return original message when disabled', () => {
      const prioritizer = new ContextPrioritizer({ enabled: false });
      const message = createMessage({ importance: 0.7 });

      const result = prioritizer.computeImportance(message);

      expect(result.importance).toBe(0.7);
    });

    it('should give higher importance to recent messages', () => {
      const prioritizer = new ContextPrioritizer({
        enabled: true,
        recencyWeight: 1.0,
        roleWeight: 0,
        lengthWeight: 0,
        keywordWeight: 0,
        rules: [], // No default rules
        keywords: [],
      });

      const recentMessage = createMessage({ timestamp: Date.now() });
      const oldMessage = createMessage({
        timestamp: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
      });

      const recent = prioritizer.computeImportance(recentMessage);
      const old = prioritizer.computeImportance(oldMessage);

      expect(recent.importance).toBeGreaterThan(old.importance);
    });

    it('should give higher importance to system messages', () => {
      const prioritizer = new ContextPrioritizer({
        enabled: true,
        recencyWeight: 0,
        roleWeight: 1.0,
        lengthWeight: 0,
        keywordWeight: 0,
        rules: [], // No default rules
        keywords: [],
      });

      const systemMsg = createMessage({
        role: 'system',
        timestamp: Date.now(),
      });
      const userMsg = createMessage({
        role: 'user',
        timestamp: Date.now(),
      });

      const system = prioritizer.computeImportance(systemMsg);
      const user = prioritizer.computeImportance(userMsg);

      expect(system.importance).toBeGreaterThan(user.importance);
    });

    it('should consider message length in importance', () => {
      const prioritizer = new ContextPrioritizer({
        enabled: true,
        recencyWeight: 0,
        roleWeight: 0,
        lengthWeight: 1.0,
        keywordWeight: 0,
        rules: [],
        keywords: [],
      });

      const shortMsg = createMessage({ tokenCount: 10 });
      const mediumMsg = createMessage({ tokenCount: 100 });

      const short = prioritizer.computeImportance(shortMsg);
      const medium = prioritizer.computeImportance(mediumMsg);

      // Medium-length messages should have higher importance
      expect(medium.importance).toBeGreaterThan(short.importance);
    });

    it('should boost importance for messages with keywords', () => {
      const prioritizer = new ContextPrioritizer({
        enabled: true,
        recencyWeight: 0,
        roleWeight: 0,
        lengthWeight: 0,
        keywordWeight: 1.0,
        keywords: ['important', 'urgent', 'critical'],
        rules: [],
      });

      const keywordMsg = createMessage({
        content: 'This is an important message',
        timestamp: Date.now(),
      });
      const normalMsg = createMessage({
        content: 'This is a normal message',
        timestamp: Date.now(),
      });

      const keyword = prioritizer.computeImportance(keywordMsg);
      const normal = prioritizer.computeImportance(normalMsg);

      expect(keyword.importance).toBeGreaterThan(normal.importance);
    });

    it('should normalize importance to 0-1 range', () => {
      const prioritizer = new ContextPrioritizer({
        enabled: true,
        recencyWeight: 10.0, // Exaggerated weights
        roleWeight: 10.0,
        lengthWeight: 10.0,
        keywordWeight: 10.0,
        rules: [],
        keywords: [],
      });

      const message = createMessage({ content: 'Test', timestamp: Date.now() });
      const result = prioritizer.computeImportance(message);

      expect(result.importance).toBeGreaterThanOrEqual(0);
      expect(result.importance).toBeLessThanOrEqual(1);
    });
  });

  describe('computeImportances', () => {
    it('should compute importance for multiple messages', () => {
      const prioritizer = new ContextPrioritizer({ enabled: true });
      const messages = [
        createMessage({ content: 'Message 1' }),
        createMessage({ content: 'Message 2' }),
        createMessage({ content: 'Message 3' }),
      ];

      const results = prioritizer.computeImportances(messages);

      expect(results).toHaveLength(3);
      results.forEach((msg) => {
        expect(msg.importance).toBeGreaterThanOrEqual(0);
        expect(msg.importance).toBeLessThanOrEqual(1);
      });
    });

    it('should preserve message properties', () => {
      const prioritizer = new ContextPrioritizer({ enabled: true });
      const messages = [
        createMessage({ id: 'msg-1', content: 'First' }),
        createMessage({ id: 'msg-2', content: 'Second' }),
      ];

      const results = prioritizer.computeImportances(messages);

      expect(results[0].id).toBe('msg-1');
      expect(results[0].content).toBe('First');
      expect(results[1].id).toBe('msg-2');
      expect(results[1].content).toBe('Second');
    });

    it('should handle empty array', () => {
      const prioritizer = new ContextPrioritizer({ enabled: true });
      const results = prioritizer.computeImportances([]);

      expect(results).toEqual([]);
    });
  });

  describe('sortByImportance', () => {
    it('should sort messages by importance (descending)', () => {
      const prioritizer = new ContextPrioritizer();
      const messages = [
        createMessage({ importance: 0.3 }),
        createMessage({ importance: 0.9 }),
        createMessage({ importance: 0.5 }),
      ];

      const sorted = prioritizer.sortByImportance(messages);

      expect(sorted[0].importance).toBe(0.9);
      expect(sorted[1].importance).toBe(0.5);
      expect(sorted[2].importance).toBe(0.3);
    });

    it('should not mutate original array', () => {
      const prioritizer = new ContextPrioritizer();
      const messages = [
        createMessage({ importance: 0.3 }),
        createMessage({ importance: 0.9 }),
      ];

      const sorted = prioritizer.sortByImportance(messages);

      expect(messages[0].importance).toBe(0.3);
      expect(sorted[0].importance).toBe(0.9);
    });

    it('should handle equal importance values', () => {
      const prioritizer = new ContextPrioritizer();
      const messages = [
        createMessage({ importance: 0.5 }),
        createMessage({ importance: 0.5 }),
        createMessage({ importance: 0.5 }),
      ];

      const sorted = prioritizer.sortByImportance(messages);

      expect(sorted).toHaveLength(3);
      sorted.forEach((msg) => {
        expect(msg.importance).toBe(0.5);
      });
    });

    it('should handle empty array', () => {
      const prioritizer = new ContextPrioritizer();
      const sorted = prioritizer.sortByImportance([]);

      expect(sorted).toEqual([]);
    });
  });

  describe('getTopImportant', () => {
    it('should return top N most important messages', () => {
      const prioritizer = new ContextPrioritizer();
      const messages = [
        createMessage({ importance: 0.2 }),
        createMessage({ importance: 0.9 }),
        createMessage({ importance: 0.5 }),
        createMessage({ importance: 0.8 }),
        createMessage({ importance: 0.3 }),
      ];

      const top3 = prioritizer.getTopImportant(messages, 3);

      expect(top3).toHaveLength(3);
      expect(top3[0].importance).toBe(0.9);
      expect(top3[1].importance).toBe(0.8);
      expect(top3[2].importance).toBe(0.5);
    });

    it('should handle count larger than array length', () => {
      const prioritizer = new ContextPrioritizer();
      const messages = [
        createMessage({ importance: 0.5 }),
        createMessage({ importance: 0.8 }),
      ];

      const top10 = prioritizer.getTopImportant(messages, 10);

      expect(top10).toHaveLength(2);
    });

    it('should handle count of 0', () => {
      const prioritizer = new ContextPrioritizer();
      const messages = [createMessage({ importance: 0.5 })];

      const top0 = prioritizer.getTopImportant(messages, 0);

      expect(top0).toEqual([]);
    });

    it('should handle negative count', () => {
      const prioritizer = new ContextPrioritizer();
      const messages = [createMessage({ importance: 0.5 })];

      const topNegative = prioritizer.getTopImportant(messages, -1);

      expect(topNegative).toEqual([]);
    });
  });

  describe('filterByImportance', () => {
    it('should filter messages by minimum importance', () => {
      const prioritizer = new ContextPrioritizer();
      const messages = [
        createMessage({ importance: 0.2 }),
        createMessage({ importance: 0.5 }),
        createMessage({ importance: 0.8 }),
        createMessage({ importance: 0.9 }),
      ];

      const filtered = prioritizer.filterByImportance(messages, 0.6);

      expect(filtered).toHaveLength(2);
      expect(filtered[0].importance).toBe(0.8);
      expect(filtered[1].importance).toBe(0.9);
    });

    it('should include messages equal to threshold', () => {
      const prioritizer = new ContextPrioritizer();
      const messages = [
        createMessage({ importance: 0.5 }),
        createMessage({ importance: 0.7 }),
      ];

      const filtered = prioritizer.filterByImportance(messages, 0.7);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].importance).toBe(0.7);
    });

    it('should return empty array when no messages meet threshold', () => {
      const prioritizer = new ContextPrioritizer();
      const messages = [
        createMessage({ importance: 0.2 }),
        createMessage({ importance: 0.3 }),
      ];

      const filtered = prioritizer.filterByImportance(messages, 0.9);

      expect(filtered).toEqual([]);
    });

    it('should handle threshold of 0', () => {
      const prioritizer = new ContextPrioritizer();
      const messages = [
        createMessage({ importance: 0.0 }),
        createMessage({ importance: 0.5 }),
      ];

      const filtered = prioritizer.filterByImportance(messages, 0);

      expect(filtered).toHaveLength(2);
    });

    it('should handle threshold of 1', () => {
      const prioritizer = new ContextPrioritizer();
      const messages = [
        createMessage({ importance: 0.9 }),
        createMessage({ importance: 1.0 }),
      ];

      const filtered = prioritizer.filterByImportance(messages, 1.0);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].importance).toBe(1.0);
    });
  });

  describe('rule management', () => {
    it('should add prioritization rule', () => {
      const prioritizer = new ContextPrioritizer({ enabled: true, rules: [] });
      const rule: PrioritizationRule = {
        name: 'boost-errors',
        priority: 10,
        condition: (msg) => msg.content.includes('error'),
        importanceBoost: 1.5, // 50% boost
      };

      prioritizer.addRule(rule);

      const rules = prioritizer.getRules();
      expect(rules.some((r) => r.name === 'boost-errors')).toBe(true);
    });

    it('should apply rules to messages', () => {
      const prioritizer = new ContextPrioritizer({
        enabled: true,
        recencyWeight: 0.25,
        roleWeight: 0.25,
        lengthWeight: 0.25,
        keywordWeight: 0.25,
        rules: [],
        keywords: [],
      });

      const rule: PrioritizationRule = {
        name: 'boost-errors',
        priority: 10,
        condition: (msg) => msg.content.includes('error'),
        importanceBoost: 2.0, // 2x boost
      };
      prioritizer.addRule(rule);

      const errorMsg = createMessage({
        content: 'An error occurred',
        timestamp: Date.now(),
        tokenCount: 100,
      });
      const normalMsg = createMessage({
        content: 'Normal message',
        timestamp: Date.now(),
        tokenCount: 100,
      });

      const error = prioritizer.computeImportance(errorMsg);
      const normal = prioritizer.computeImportance(normalMsg);

      expect(error.importance).toBeGreaterThan(normal.importance);
    });

    it('should remove rule by name', () => {
      const prioritizer = new ContextPrioritizer({ enabled: true, rules: [] });
      const rule: PrioritizationRule = {
        name: 'test-rule',
        priority: 5,
        condition: (msg) => true,
        importanceBoost: 1.2,
      };

      prioritizer.addRule(rule);
      const removed = prioritizer.removeRule('test-rule');

      expect(removed).toBe(true);
      const rules = prioritizer.getRules();
      expect(rules.some((r) => r.name === 'test-rule')).toBe(false);
    });

    it('should return false when removing non-existent rule', () => {
      const prioritizer = new ContextPrioritizer({ enabled: true });
      const removed = prioritizer.removeRule('non-existent');

      expect(removed).toBe(false);
    });

    it('should sort rules by priority (descending)', () => {
      const prioritizer = new ContextPrioritizer({ enabled: true, rules: [] });

      prioritizer.addRule({
        name: 'low-priority',
        priority: 1,
        condition: () => true,
        importanceBoost: 1.1,
      });

      prioritizer.addRule({
        name: 'high-priority',
        priority: 10,
        condition: () => true,
        importanceBoost: 1.1,
      });

      prioritizer.addRule({
        name: 'medium-priority',
        priority: 5,
        condition: () => true,
        importanceBoost: 1.1,
      });

      const rules = prioritizer.getRules();

      expect(rules[0].name).toBe('high-priority');
      expect(rules[1].name).toBe('medium-priority');
      expect(rules[2].name).toBe('low-priority');
    });

    it('should return copy of rules array', () => {
      const prioritizer = new ContextPrioritizer({ enabled: true, rules: [] });
      const rule: PrioritizationRule = {
        name: 'test',
        priority: 1,
        condition: () => true,
        importanceBoost: 1.1,
      };

      prioritizer.addRule(rule);
      const rules = prioritizer.getRules();
      rules.push({
        name: 'external',
        priority: 1,
        condition: () => true,
        importanceBoost: 1.1,
      });

      const rules2 = prioritizer.getRules();
      expect(rules2.some((r) => r.name === 'external')).toBe(false);
    });
  });

  describe('keyword management', () => {
    it('should add keywords', () => {
      const prioritizer = new ContextPrioritizer({
        enabled: true,
        keywords: [],
      });

      prioritizer.addKeywords(['urgent', 'critical']);

      const keywords = prioritizer.getKeywords();
      expect(keywords).toContain('urgent');
      expect(keywords).toContain('critical');
    });

    it('should not add duplicate keywords', () => {
      const prioritizer = new ContextPrioritizer({
        enabled: true,
        keywords: ['urgent'],
      });

      prioritizer.addKeywords(['urgent', 'critical']);

      const keywords = prioritizer.getKeywords();
      expect(keywords.filter((k) => k === 'urgent')).toHaveLength(1);
    });

    it('should remove keywords', () => {
      const prioritizer = new ContextPrioritizer({
        enabled: true,
        keywords: ['urgent', 'critical', 'important'],
      });

      prioritizer.removeKeywords(['urgent', 'critical']);

      const keywords = prioritizer.getKeywords();
      expect(keywords).not.toContain('urgent');
      expect(keywords).not.toContain('critical');
      expect(keywords).toContain('important');
    });

    it('should return copy of keywords array', () => {
      const prioritizer = new ContextPrioritizer({
        enabled: true,
        keywords: ['test'],
      });

      const keywords = prioritizer.getKeywords();
      keywords.push('external');

      const keywords2 = prioritizer.getKeywords();
      expect(keywords2).not.toContain('external');
    });

    it('should boost messages containing keywords', () => {
      const prioritizer = new ContextPrioritizer({
        enabled: true,
        recencyWeight: 0,
        roleWeight: 0,
        lengthWeight: 0,
        keywordWeight: 1.0,
        keywords: ['bug', 'error', 'crash'],
        rules: [],
      });

      const bugMsg = createMessage({
        content: 'Found a bug in the code',
        timestamp: Date.now(),
        tokenCount: 100,
      });
      const normalMsg = createMessage({
        content: 'Updated the documentation',
        timestamp: Date.now(),
        tokenCount: 100,
      });

      const bug = prioritizer.computeImportance(bugMsg);
      const normal = prioritizer.computeImportance(normalMsg);

      expect(bug.importance).toBeGreaterThan(normal.importance);
    });
  });

  describe('edge cases', () => {
    it('should handle message with empty content', () => {
      const prioritizer = new ContextPrioritizer({
        enabled: true,
        rules: [],
        keywords: [],
      });
      const message = createMessage({ content: '', timestamp: Date.now() });

      const result = prioritizer.computeImportance(message);

      expect(result.importance).toBeGreaterThanOrEqual(0);
      expect(result.importance).toBeLessThanOrEqual(1);
    });

    it('should handle message with very long content', () => {
      const prioritizer = new ContextPrioritizer({
        enabled: true,
        rules: [],
        keywords: [],
      });
      const message = createMessage({
        content: 'a'.repeat(10000),
        tokenCount: 10000,
        timestamp: Date.now(),
      });

      const result = prioritizer.computeImportance(message);

      expect(result.importance).toBeGreaterThanOrEqual(0);
      expect(result.importance).toBeLessThanOrEqual(1);
    });

    it('should handle message with special characters', () => {
      const prioritizer = new ContextPrioritizer({
        enabled: true,
        rules: [],
        keywords: [],
      });
      const message = createMessage({
        content: '!@#$%^&*()_+-=[]{}|;:,.<>?',
        timestamp: Date.now(),
      });

      const result = prioritizer.computeImportance(message);

      expect(result.importance).toBeGreaterThanOrEqual(0);
      expect(result.importance).toBeLessThanOrEqual(1);
    });

    it('should handle message with future timestamp', () => {
      const prioritizer = new ContextPrioritizer({
        enabled: true,
        rules: [],
        keywords: [],
      });
      const message = createMessage({
        timestamp: Date.now() + 24 * 60 * 60 * 1000, // 1 day in future
      });

      const result = prioritizer.computeImportance(message);

      expect(result.importance).toBeGreaterThanOrEqual(0);
      expect(result.importance).toBeLessThanOrEqual(1);
    });

    it('should handle message with zero token count', () => {
      const prioritizer = new ContextPrioritizer({
        enabled: true,
        rules: [],
        keywords: [],
      });
      const message = createMessage({
        tokenCount: 0,
        timestamp: Date.now(),
      });

      const result = prioritizer.computeImportance(message);

      expect(result.importance).toBeGreaterThanOrEqual(0);
      expect(result.importance).toBeLessThanOrEqual(1);
    });
  });
});
