/**
 * Tests for Escalation Triggers
 * Default escalation rules for auto-escalation
 */

import {
  DEFAULT_ESCALATION_RULES,
  createEscalationRule,
} from '../../../src/runtime/escalation/triggers';
import type {
  EscalationResponse,
  EscalationContext,
} from '../../../src/runtime/escalation/types';

// Helper to create test response
function createResponse(
  overrides: Partial<EscalationResponse> = {}
): EscalationResponse {
  return {
    content: 'Test response content',
    confidence: 0.8,
    metadata: {},
    ...overrides,
  };
}

// Helper to create test context
function createContext(
  overrides: Partial<EscalationContext> = {}
): EscalationContext {
  return {
    requestId: 'req-123',
    personaId: 'persona-1',
    providerId: 'anthropic',
    modelId: 'claude-3-5-sonnet',
    message: {
      content: 'Test message',
      metadata: {},
    },
    attempt: 1,
    ...overrides,
  };
}

describe('DEFAULT_ESCALATION_RULES', () => {
  it('should have 7 default rules', () => {
    expect(DEFAULT_ESCALATION_RULES).toHaveLength(7);
  });

  it('should have all rules with required fields', () => {
    DEFAULT_ESCALATION_RULES.forEach((rule) => {
      expect(rule.name).toBeDefined();
      expect(rule.condition).toBeInstanceOf(Function);
      expect(rule.action).toBeDefined();
      expect(['retry', 'fallback', 'upgrade', 'team']).toContain(rule.action);
    });
  });

  describe('low-confidence rule', () => {
    const rule = DEFAULT_ESCALATION_RULES.find(
      (r) => r.name === 'low-confidence'
    )!;

    it('should exist', () => {
      expect(rule).toBeDefined();
    });

    it('should trigger for confidence < 0.5', () => {
      const response = createResponse({ confidence: 0.4 });
      const context = createContext();

      expect(rule.condition(response, context)).toBe(true);
    });

    it('should not trigger for confidence >= 0.5', () => {
      const response = createResponse({ confidence: 0.5 });
      const context = createContext();

      expect(rule.condition(response, context)).toBe(false);
    });

    it('should have retry action', () => {
      expect(rule.action).toBe('retry');
    });

    it('should have maxRetries of 2', () => {
      expect(rule.maxRetries).toBe(2);
    });

    it('should have priority 3', () => {
      expect(rule.priority).toBe(3);
    });
  });

  describe('very-low-confidence rule', () => {
    const rule = DEFAULT_ESCALATION_RULES.find(
      (r) => r.name === 'very-low-confidence'
    )!;

    it('should exist', () => {
      expect(rule).toBeDefined();
    });

    it('should trigger for confidence < 0.3', () => {
      const response = createResponse({ confidence: 0.2 });
      const context = createContext();

      expect(rule.condition(response, context)).toBe(true);
    });

    it('should not trigger for confidence >= 0.3', () => {
      const response = createResponse({ confidence: 0.3 });
      const context = createContext();

      expect(rule.condition(response, context)).toBe(false);
    });

    it('should have upgrade action', () => {
      expect(rule.action).toBe('upgrade');
    });

    it('should target claude-opus-4', () => {
      expect(rule.target).toBe('claude-opus-4');
    });

    it('should have priority 5', () => {
      expect(rule.priority).toBe(5);
    });
  });

  describe('error-response rule', () => {
    const rule = DEFAULT_ESCALATION_RULES.find(
      (r) => r.name === 'error-response'
    )!;

    it('should exist', () => {
      expect(rule).toBeDefined();
    });

    it('should trigger for content with "error"', () => {
      const response = createResponse({
        content: 'There was an error processing',
      });
      const context = createContext();

      expect(rule.condition(response, context)).toBe(true);
    });

    it('should trigger for content with "cannot"', () => {
      const response = createResponse({
        content: 'I cannot complete this task',
      });
      const context = createContext();

      expect(rule.condition(response, context)).toBe(true);
    });

    it('should trigger for content with "unable"', () => {
      const response = createResponse({
        content: 'Unable to process the request',
      });
      const context = createContext();

      expect(rule.condition(response, context)).toBe(true);
    });

    it('should be case insensitive', () => {
      const response = createResponse({ content: 'ERROR occurred' });
      const context = createContext();

      expect(rule.condition(response, context)).toBe(true);
    });

    it('should not trigger for normal content', () => {
      const response = createResponse({ content: 'Here is the result' });
      const context = createContext();

      expect(rule.condition(response, context)).toBe(false);
    });

    it('should have fallback action', () => {
      expect(rule.action).toBe('fallback');
    });

    it('should have priority 4', () => {
      expect(rule.priority).toBe(4);
    });
  });

  describe('short-response rule', () => {
    const rule = DEFAULT_ESCALATION_RULES.find(
      (r) => r.name === 'short-response'
    )!;

    it('should exist', () => {
      expect(rule).toBeDefined();
    });

    it('should trigger for short response to long message', () => {
      const response = createResponse({ content: 'OK' });
      const context = createContext({
        message: { content: 'A'.repeat(250) },
      });

      expect(rule.condition(response, context)).toBe(true);
    });

    it('should not trigger for long response to long message', () => {
      const response = createResponse({ content: 'A'.repeat(100) });
      const context = createContext({
        message: { content: 'B'.repeat(250) },
      });

      expect(rule.condition(response, context)).toBe(false);
    });

    it('should not trigger for short response to short message', () => {
      const response = createResponse({ content: 'OK' });
      const context = createContext({
        message: { content: 'Hi' },
      });

      expect(rule.condition(response, context)).toBe(false);
    });

    it('should have retry action', () => {
      expect(rule.action).toBe('retry');
    });

    it('should have maxRetries of 1', () => {
      expect(rule.maxRetries).toBe(1);
    });

    it('should have priority 2', () => {
      expect(rule.priority).toBe(2);
    });
  });

  describe('high-complexity-low-confidence rule', () => {
    const rule = DEFAULT_ESCALATION_RULES.find(
      (r) => r.name === 'high-complexity-low-confidence'
    )!;

    it('should exist', () => {
      expect(rule).toBeDefined();
    });

    it('should trigger for high complexity and low confidence', () => {
      const response = createResponse({ confidence: 0.5 });
      const context = createContext({ complexity: 0.8 });

      expect(rule.condition(response, context)).toBe(true);
    });

    it('should not trigger for high complexity and high confidence', () => {
      const response = createResponse({ confidence: 0.9 });
      const context = createContext({ complexity: 0.8 });

      expect(rule.condition(response, context)).toBe(false);
    });

    it('should not trigger for low complexity and low confidence', () => {
      const response = createResponse({ confidence: 0.5 });
      const context = createContext({ complexity: 0.5 });

      expect(rule.condition(response, context)).toBe(false);
    });

    it('should handle missing complexity as 0', () => {
      const response = createResponse({ confidence: 0.5 });
      const context = createContext(); // No complexity

      expect(rule.condition(response, context)).toBe(false);
    });

    it('should have team action', () => {
      expect(rule.action).toBe('team');
    });

    it('should target expert-team', () => {
      expect(rule.target).toBe('expert-team');
    });

    it('should have priority 4', () => {
      expect(rule.priority).toBe(4);
    });
  });

  describe('empty-response rule', () => {
    const rule = DEFAULT_ESCALATION_RULES.find(
      (r) => r.name === 'empty-response'
    )!;

    it('should exist', () => {
      expect(rule).toBeDefined();
    });

    it('should trigger for empty content', () => {
      const response = createResponse({ content: '' });
      const context = createContext();

      expect(rule.condition(response, context)).toBe(true);
    });

    it('should trigger for whitespace-only content', () => {
      const response = createResponse({ content: '   \n  \t  ' });
      const context = createContext();

      expect(rule.condition(response, context)).toBe(true);
    });

    it('should not trigger for non-empty content', () => {
      const response = createResponse({ content: 'OK' });
      const context = createContext();

      expect(rule.condition(response, context)).toBe(false);
    });

    it('should have retry action', () => {
      expect(rule.action).toBe('retry');
    });

    it('should have maxRetries of 1', () => {
      expect(rule.maxRetries).toBe(1);
    });

    it('should have priority 5', () => {
      expect(rule.priority).toBe(5);
    });
  });

  describe('refused-response rule', () => {
    const rule = DEFAULT_ESCALATION_RULES.find(
      (r) => r.name === 'refused-response'
    )!;

    it('should exist', () => {
      expect(rule).toBeDefined();
    });

    it('should trigger for "i can\'t"', () => {
      const response = createResponse({ content: "I can't help with that" });
      const context = createContext();

      expect(rule.condition(response, context)).toBe(true);
    });

    it('should trigger for "i cannot"', () => {
      const response = createResponse({
        content: 'I cannot complete this task',
      });
      const context = createContext();

      expect(rule.condition(response, context)).toBe(true);
    });

    it('should trigger for "i am unable"', () => {
      const response = createResponse({
        content: 'I am unable to process this',
      });
      const context = createContext();

      expect(rule.condition(response, context)).toBe(true);
    });

    it('should trigger for "not possible"', () => {
      const response = createResponse({ content: 'That is not possible' });
      const context = createContext();

      expect(rule.condition(response, context)).toBe(true);
    });

    it('should be case insensitive', () => {
      const response = createResponse({ content: "I CAN'T do that" });
      const context = createContext();

      expect(rule.condition(response, context)).toBe(true);
    });

    it('should not trigger for normal content', () => {
      const response = createResponse({
        content: 'Here is what you asked for',
      });
      const context = createContext();

      expect(rule.condition(response, context)).toBe(false);
    });

    it('should have fallback action', () => {
      expect(rule.action).toBe('fallback');
    });

    it('should have priority 4', () => {
      expect(rule.priority).toBe(4);
    });
  });

  describe('rule priorities', () => {
    it('should have higher priority for more critical issues', () => {
      const emptyRule = DEFAULT_ESCALATION_RULES.find(
        (r) => r.name === 'empty-response'
      )!;
      const veryLowRule = DEFAULT_ESCALATION_RULES.find(
        (r) => r.name === 'very-low-confidence'
      )!;

      expect(emptyRule.priority).toBe(5);
      expect(veryLowRule.priority).toBe(5);
    });

    it('should have all rules with defined priorities', () => {
      DEFAULT_ESCALATION_RULES.forEach((rule) => {
        expect(rule.priority).toBeGreaterThan(0);
      });
    });
  });
});

describe('createEscalationRule', () => {
  it('should create basic rule', () => {
    const rule = createEscalationRule(
      'test-rule',
      (response) => response.confidence < 0.5,
      'retry'
    );

    expect(rule.name).toBe('test-rule');
    expect(rule.condition).toBeInstanceOf(Function);
    expect(rule.action).toBe('retry');
    expect(rule.priority).toBe(1);
  });

  it('should create rule with target', () => {
    const rule = createEscalationRule(
      'upgrade-rule',
      (response) => response.confidence < 0.3,
      'upgrade',
      { target: 'claude-opus' }
    );

    expect(rule.target).toBe('claude-opus');
  });

  it('should create rule with maxRetries', () => {
    const rule = createEscalationRule(
      'retry-rule',
      (response) => response.confidence < 0.5,
      'retry',
      { maxRetries: 3 }
    );

    expect(rule.maxRetries).toBe(3);
  });

  it('should create rule with custom priority', () => {
    const rule = createEscalationRule(
      'priority-rule',
      (response) => response.confidence < 0.5,
      'retry',
      { priority: 10 }
    );

    expect(rule.priority).toBe(10);
  });

  it('should create rule with all options', () => {
    const rule = createEscalationRule(
      'full-rule',
      (response) => response.confidence < 0.4,
      'upgrade',
      {
        target: 'claude-opus',
        maxRetries: 2,
        priority: 8,
      }
    );

    expect(rule.name).toBe('full-rule');
    expect(rule.action).toBe('upgrade');
    expect(rule.target).toBe('claude-opus');
    expect(rule.maxRetries).toBe(2);
    expect(rule.priority).toBe(8);
  });

  it('should default priority to 1 if not provided', () => {
    const rule = createEscalationRule(
      'default-priority',
      (response) => true,
      'retry'
    );

    expect(rule.priority).toBe(1);
  });

  it('should create rule for fallback action', () => {
    const rule = createEscalationRule(
      'fallback-rule',
      (response) => response.content.includes('error'),
      'fallback'
    );

    expect(rule.action).toBe('fallback');
  });

  it('should create rule for team action', () => {
    const rule = createEscalationRule(
      'team-rule',
      (response, context) => context.complexity! > 0.8,
      'team',
      { target: 'experts' }
    );

    expect(rule.action).toBe('team');
    expect(rule.target).toBe('experts');
  });

  it('should create working condition function', () => {
    const rule = createEscalationRule(
      'working-condition',
      (response) => response.confidence < 0.5,
      'retry'
    );

    const lowConfResponse = createResponse({ confidence: 0.4 });
    const highConfResponse = createResponse({ confidence: 0.8 });
    const context = createContext();

    expect(rule.condition(lowConfResponse, context)).toBe(true);
    expect(rule.condition(highConfResponse, context)).toBe(false);
  });

  it('should create rule with context-dependent condition', () => {
    const rule = createEscalationRule(
      'context-rule',
      (response, context) =>
        response.confidence < 0.6 && (context.complexity || 0) > 0.7,
      'upgrade'
    );

    const response = createResponse({ confidence: 0.5 });
    const highComplexity = createContext({ complexity: 0.8 });
    const lowComplexity = createContext({ complexity: 0.5 });

    expect(rule.condition(response, highComplexity)).toBe(true);
    expect(rule.condition(response, lowComplexity)).toBe(false);
  });

  it('should handle empty options object', () => {
    const rule = createEscalationRule(
      'no-options',
      (response) => false,
      'retry',
      {}
    );

    expect(rule.priority).toBe(1);
    expect(rule.target).toBeUndefined();
    expect(rule.maxRetries).toBeUndefined();
  });

  it('should handle undefined options', () => {
    const rule = createEscalationRule(
      'undefined-options',
      (response) => false,
      'retry',
      undefined
    );

    expect(rule.priority).toBe(1);
  });
});
