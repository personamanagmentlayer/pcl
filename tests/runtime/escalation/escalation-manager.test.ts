/**
 * Escalation Manager Tests
 *
 * Tests for escalation management and rule-based escalation
 * Target: 0% → 60%+ coverage (initial pass)
 */

import { EscalationManager } from '../../../src/runtime/escalation/escalation-manager';
import type {
  EscalationConfig,
  EscalationResponse,
  EscalationContext,
  EscalationRule,
} from '../../../src/runtime/escalation/types';

describe('EscalationManager', () => {
  const createResponse = (
    overrides?: Partial<EscalationResponse>
  ): EscalationResponse => ({
    content: 'Test response',
    confidence: 0.9,
    metadata: {},
    ...overrides,
  });

  const createContext = (
    overrides?: Partial<EscalationContext>
  ): EscalationContext => ({
    requestId: `req-${Date.now()}`,
    personaId: 'test-persona',
    providerId: 'test-provider',
    modelId: 'test-model',
    message: {
      content: 'Test message',
      metadata: {},
    },
    attempt: 0,
    ...overrides,
  });

  const lowConfidenceRule: EscalationRule = {
    name: 'low-confidence',
    condition: (response) => response.confidence < 0.5,
    action: 'retry',
    maxRetries: 3,
    priority: 10,
  };

  const veryLowConfidenceRule: EscalationRule = {
    name: 'very-low-confidence',
    condition: (response) => response.confidence < 0.3,
    action: 'upgrade',
    target: 'better-model',
    maxRetries: 2,
    priority: 20, // Higher priority than low-confidence
  };

  describe('Construction', () => {
    it('should create manager with config', () => {
      const config: EscalationConfig = {
        enabled: true,
        rules: [],
        defaultAction: 'fail',
        globalMaxRetries: 3,
      };

      const manager = new EscalationManager(config);

      expect(manager).toBeDefined();
    });

    it('should create with custom rules', () => {
      const config: EscalationConfig = {
        enabled: true,
        rules: [lowConfidenceRule],
        defaultAction: 'retry',
        globalMaxRetries: 5,
      };

      const manager = new EscalationManager(config);

      expect(manager).toBeDefined();
    });

    it('should handle disabled escalation', () => {
      const config: EscalationConfig = {
        enabled: false,
        rules: [],
        defaultAction: 'fail',
        globalMaxRetries: 3,
      };

      const manager = new EscalationManager(config);

      expect(manager).toBeDefined();
    });
  });

  describe('Escalation Decision', () => {
    it('should not escalate when disabled', () => {
      const manager = new EscalationManager({
        enabled: false,
        rules: [lowConfidenceRule],
        defaultAction: 'fail',
        globalMaxRetries: 3,
      });

      const response = createResponse({ confidence: 0.2 });
      const context = createContext();

      const decision = manager.shouldEscalate(response, context);

      expect(decision.escalate).toBe(false);
    });

    it('should not escalate when no rules match', () => {
      const manager = new EscalationManager({
        enabled: true,
        rules: [lowConfidenceRule],
        defaultAction: 'fail',
        globalMaxRetries: 3,
      });

      const response = createResponse({ confidence: 0.9 });
      const context = createContext();

      const decision = manager.shouldEscalate(response, context);

      expect(decision.escalate).toBe(false);
    });

    it('should escalate when rule matches', () => {
      const manager = new EscalationManager({
        enabled: true,
        rules: [lowConfidenceRule],
        defaultAction: 'fail',
        globalMaxRetries: 3,
      });

      const response = createResponse({ confidence: 0.3 });
      const context = createContext();

      const decision = manager.shouldEscalate(response, context);

      expect(decision.escalate).toBe(true);
      expect(decision.action).toBe('retry');
      expect(decision.rule).toBe('low-confidence');
    });

    it('should use highest priority rule', () => {
      const manager = new EscalationManager({
        enabled: true,
        rules: [lowConfidenceRule, veryLowConfidenceRule],
        defaultAction: 'fail',
        globalMaxRetries: 3,
      });

      const response = createResponse({ confidence: 0.2 });
      const context = createContext();

      const decision = manager.shouldEscalate(response, context);

      expect(decision.escalate).toBe(true);
      expect(decision.action).toBe('upgrade');
      expect(decision.rule).toBe('very-low-confidence');
      expect(decision.target).toBe('better-model');
    });

    it('should respect global max retries', () => {
      const manager = new EscalationManager({
        enabled: true,
        rules: [lowConfidenceRule],
        defaultAction: 'fail',
        globalMaxRetries: 2,
      });

      const response = createResponse({ confidence: 0.3 });
      const context = createContext();

      // Record escalations to reach limit
      manager.recordEscalation(context.requestId, 'test', 'retry');
      manager.recordEscalation(context.requestId, 'test', 'retry');

      const decision = manager.shouldEscalate(response, context);

      expect(decision.escalate).toBe(false);
      expect(decision.reason).toBe('global max retries reached');
    });

    it('should respect rule-specific max retries', () => {
      const manager = new EscalationManager({
        enabled: true,
        rules: [lowConfidenceRule], // maxRetries: 3
        defaultAction: 'fail',
        globalMaxRetries: 10,
      });

      const response = createResponse({ confidence: 0.3 });
      const context = createContext();

      // Record 3 escalations
      manager.recordEscalation(context.requestId, 'low-confidence', 'retry');
      manager.recordEscalation(context.requestId, 'low-confidence', 'retry');
      manager.recordEscalation(context.requestId, 'low-confidence', 'retry');

      const decision = manager.shouldEscalate(response, context);

      expect(decision.escalate).toBe(false);
    });
  });

  describe('Escalation Recording', () => {
    it('should record escalation attempt', () => {
      const manager = new EscalationManager({
        enabled: true,
        rules: [],
        defaultAction: 'fail',
        globalMaxRetries: 3,
      });

      manager.recordEscalation('req-1', 'test-rule', 'retry');

      expect(manager.getRetryCount('req-1')).toBe(1);
    });

    it('should increment retry count', () => {
      const manager = new EscalationManager({
        enabled: true,
        rules: [],
        defaultAction: 'fail',
        globalMaxRetries: 3,
      });

      manager.recordEscalation('req-1', 'test-rule', 'retry');
      manager.recordEscalation('req-1', 'test-rule', 'retry');
      manager.recordEscalation('req-1', 'test-rule', 'retry');

      expect(manager.getRetryCount('req-1')).toBe(3);
    });

    it('should track different request IDs separately', () => {
      const manager = new EscalationManager({
        enabled: true,
        rules: [],
        defaultAction: 'fail',
        globalMaxRetries: 3,
      });

      manager.recordEscalation('req-1', 'test-rule', 'retry');
      manager.recordEscalation('req-2', 'test-rule', 'retry');

      expect(manager.getRetryCount('req-1')).toBe(1);
      expect(manager.getRetryCount('req-2')).toBe(1);
    });

    it('should record escalation outcome', () => {
      const manager = new EscalationManager({
        enabled: true,
        rules: [],
        defaultAction: 'fail',
        globalMaxRetries: 3,
      });

      manager.recordEscalation('req-1', 'test-rule', 'retry');
      manager.recordOutcome('req-1', true);

      const stats = manager.getStats();

      expect(stats.totalEscalations).toBe(1);
    });

    it('should record multiple outcomes', () => {
      const manager = new EscalationManager({
        enabled: true,
        rules: [],
        defaultAction: 'fail',
        globalMaxRetries: 5,
      });

      manager.recordEscalation('req-1', 'rule-1', 'retry');
      manager.recordOutcome('req-1', true);

      manager.recordEscalation('req-2', 'rule-2', 'upgrade');
      manager.recordOutcome('req-2', false);

      const stats = manager.getStats();

      expect(stats.totalEscalations).toBe(2);
    });
  });

  describe('Retry Count Management', () => {
    it('should reset retry count for request', () => {
      const manager = new EscalationManager({
        enabled: true,
        rules: [],
        defaultAction: 'fail',
        globalMaxRetries: 3,
      });

      manager.recordEscalation('req-1', 'test-rule', 'retry');
      manager.recordEscalation('req-1', 'test-rule', 'retry');

      expect(manager.getRetryCount('req-1')).toBe(2);

      manager.reset('req-1');

      expect(manager.getRetryCount('req-1')).toBe(0);
    });

    it('should clear all retry counts', () => {
      const manager = new EscalationManager({
        enabled: true,
        rules: [],
        defaultAction: 'fail',
        globalMaxRetries: 3,
      });

      manager.recordEscalation('req-1', 'test-rule', 'retry');
      manager.recordEscalation('req-2', 'test-rule', 'retry');

      manager.clearRetryCount();

      expect(manager.getRetryCount('req-1')).toBe(0);
      expect(manager.getRetryCount('req-2')).toBe(0);
    });

    it('should return 0 for unknown request ID', () => {
      const manager = new EscalationManager({
        enabled: true,
        rules: [],
        defaultAction: 'fail',
        globalMaxRetries: 3,
      });

      expect(manager.getRetryCount('unknown')).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should get empty stats initially', () => {
      const manager = new EscalationManager({
        enabled: true,
        rules: [],
        defaultAction: 'fail',
        globalMaxRetries: 3,
      });

      const stats = manager.getStats();

      expect(stats.totalEscalations).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.byRule).toEqual({});
    });

    it('should calculate success rate', () => {
      const manager = new EscalationManager({
        enabled: true,
        rules: [],
        defaultAction: 'fail',
        globalMaxRetries: 5,
      });

      manager.recordEscalation('req-1', 'rule-1', 'retry');
      manager.recordOutcome('req-1', true);

      manager.recordEscalation('req-2', 'rule-1', 'retry');
      manager.recordOutcome('req-2', true);

      manager.recordEscalation('req-3', 'rule-1', 'retry');
      manager.recordOutcome('req-3', false);

      const stats = manager.getStats();

      expect(stats.totalEscalations).toBe(3);
      expect(stats.successRate).toBeCloseTo(2 / 3, 2);
    });

    it('should group stats by rule', () => {
      const manager = new EscalationManager({
        enabled: true,
        rules: [],
        defaultAction: 'fail',
        globalMaxRetries: 5,
      });

      manager.recordEscalation('req-1', 'rule-1', 'retry');
      manager.recordOutcome('req-1', true);

      manager.recordEscalation('req-2', 'rule-2', 'upgrade');
      manager.recordOutcome('req-2', true);

      const stats = manager.getStats();

      expect(stats.byRule['rule-1']).toBeDefined();
      expect(stats.byRule['rule-2']).toBeDefined();
      expect(stats.byRule['rule-1'].count).toBe(1);
      expect(stats.byRule['rule-2'].count).toBe(1);
    });

    it('should calculate per-rule success rate', () => {
      const manager = new EscalationManager({
        enabled: true,
        rules: [],
        defaultAction: 'fail',
        globalMaxRetries: 5,
      });

      manager.recordEscalation('req-1', 'rule-1', 'retry');
      manager.recordOutcome('req-1', true);

      manager.recordEscalation('req-2', 'rule-1', 'retry');
      manager.recordOutcome('req-2', false);

      const stats = manager.getStats();

      expect(stats.byRule['rule-1'].successRate).toBe(0.5);
    });
  });

  describe('Rule Management', () => {
    it('should add custom rule', () => {
      const manager = new EscalationManager({
        enabled: true,
        rules: [],
        defaultAction: 'fail',
        globalMaxRetries: 3,
      });

      const newRule: EscalationRule = {
        name: 'custom-rule',
        condition: (response) => response.confidence < 0.4,
        action: 'fallback',
      };

      manager.addRule(newRule);

      const response = createResponse({ confidence: 0.3 });
      const context = createContext();

      const decision = manager.shouldEscalate(response, context);

      expect(decision.escalate).toBe(true);
      expect(decision.rule).toBe('custom-rule');
    });

    it('should remove rule by name', () => {
      const manager = new EscalationManager({
        enabled: true,
        rules: [lowConfidenceRule],
        defaultAction: 'fail',
        globalMaxRetries: 3,
      });

      manager.removeRule('low-confidence');

      const response = createResponse({ confidence: 0.3 });
      const context = createContext();

      const decision = manager.shouldEscalate(response, context);

      expect(decision.escalate).toBe(false);
    });

    it('should clear all rules', () => {
      const manager = new EscalationManager({
        enabled: true,
        rules: [lowConfidenceRule, veryLowConfidenceRule],
        defaultAction: 'fail',
        globalMaxRetries: 3,
      });

      manager.clearRules();

      const response = createResponse({ confidence: 0.1 });
      const context = createContext();

      const decision = manager.shouldEscalate(response, context);

      expect(decision.escalate).toBe(false);
    });
  });

  describe('History Management', () => {
    it('should clear escalation history', () => {
      const manager = new EscalationManager({
        enabled: true,
        rules: [],
        defaultAction: 'fail',
        globalMaxRetries: 3,
      });

      manager.recordEscalation('req-1', 'rule-1', 'retry');
      manager.recordEscalation('req-2', 'rule-2', 'upgrade');

      manager.clearHistory();

      const stats = manager.getStats();

      expect(stats.totalEscalations).toBe(0);
    });

    it('should limit history size', () => {
      const manager = new EscalationManager({
        enabled: true,
        rules: [],
        defaultAction: 'fail',
        globalMaxRetries: 2000,
      });

      // Record more than 1000 escalations
      for (let i = 0; i < 1100; i++) {
        manager.recordEscalation(`req-${i}`, 'rule-1', 'retry');
      }

      const stats = manager.getStats();

      // Should keep only last 1000
      expect(stats.totalEscalations).toBeLessThanOrEqual(1000);
    });
  });

  describe('Different Actions', () => {
    it('should handle retry action', () => {
      const rule: EscalationRule = {
        name: 'retry-rule',
        condition: () => true,
        action: 'retry',
      };

      const manager = new EscalationManager({
        enabled: true,
        rules: [rule],
        defaultAction: 'fail',
        globalMaxRetries: 3,
      });

      const decision = manager.shouldEscalate(
        createResponse(),
        createContext()
      );

      expect(decision.action).toBe('retry');
    });

    it('should handle fallback action', () => {
      const rule: EscalationRule = {
        name: 'fallback-rule',
        condition: () => true,
        action: 'fallback',
        target: 'fallback-provider',
      };

      const manager = new EscalationManager({
        enabled: true,
        rules: [rule],
        defaultAction: 'fail',
        globalMaxRetries: 3,
      });

      const decision = manager.shouldEscalate(
        createResponse(),
        createContext()
      );

      expect(decision.action).toBe('fallback');
      expect(decision.target).toBe('fallback-provider');
    });

    it('should handle upgrade action', () => {
      const rule: EscalationRule = {
        name: 'upgrade-rule',
        condition: () => true,
        action: 'upgrade',
        target: 'better-model',
      };

      const manager = new EscalationManager({
        enabled: true,
        rules: [rule],
        defaultAction: 'fail',
        globalMaxRetries: 3,
      });

      const decision = manager.shouldEscalate(
        createResponse(),
        createContext()
      );

      expect(decision.action).toBe('upgrade');
      expect(decision.target).toBe('better-model');
    });

    it('should handle team action', () => {
      const rule: EscalationRule = {
        name: 'team-rule',
        condition: () => true,
        action: 'team',
        target: 'expert-team',
      };

      const manager = new EscalationManager({
        enabled: true,
        rules: [rule],
        defaultAction: 'fail',
        globalMaxRetries: 3,
      });

      const decision = manager.shouldEscalate(
        createResponse(),
        createContext()
      );

      expect(decision.action).toBe('team');
      expect(decision.target).toBe('expert-team');
    });
  });
});
