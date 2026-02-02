/**
 * Outcome Tracker Tests
 *
 * Basic tests for merge outcome tracking
 * Target: 0% → 50%+ coverage (initial pass)
 */

import { OutcomeTracker } from '../../../src/runtime/teams/outcome-tracker';
import type {
  MergeOutcome,
  MemberResponse,
} from '../../../src/runtime/teams/types';

describe('OutcomeTracker', () => {
  describe('Construction', () => {
    it('should create tracker', () => {
      const tracker = new OutcomeTracker();

      expect(tracker).toBeDefined();
    });
  });

  describe('Recording Outcomes', () => {
    let tracker: OutcomeTracker;

    beforeEach(() => {
      tracker = new OutcomeTracker();
    });

    it('should record merge outcome', () => {
      const outcome: MergeOutcome = {
        teamId: 'team-1',
        timestamp: Date.now(),
        mergeStrategy: 'weighted',
        memberResponses: [
          {
            personaId: 'persona-1',
            content: 'Response 1',
            confidence: 0.9,
            metadata: {},
          },
        ],
        selectedResponse: {
          personaId: 'persona-1',
          content: 'Response 1',
          confidence: 0.9,
          metadata: {},
        },
        qualityScore: 0.85,
      };

      tracker.recordOutcome(outcome);

      const history = tracker.getHistory('team-1');

      expect(history.length).toBe(1);
      expect(history[0]).toEqual(outcome);
    });

    it('should handle multiple outcomes', () => {
      const outcome1: MergeOutcome = {
        teamId: 'team-1',
        timestamp: Date.now(),
        mergeStrategy: 'weighted',
        memberResponses: [
          {
            personaId: 'persona-1',
            content: 'Response 1',
            confidence: 0.8,
            metadata: {},
          },
        ],
        selectedResponse: {
          personaId: 'persona-1',
          content: 'Response 1',
          confidence: 0.8,
          metadata: {},
        },
        qualityScore: 0.7,
      };

      const outcome2: MergeOutcome = {
        teamId: 'team-1',
        timestamp: Date.now() + 1000,
        mergeStrategy: 'weighted',
        memberResponses: [
          {
            personaId: 'persona-2',
            content: 'Response 2',
            confidence: 0.9,
            metadata: {},
          },
        ],
        selectedResponse: {
          personaId: 'persona-2',
          content: 'Response 2',
          confidence: 0.9,
          metadata: {},
        },
        qualityScore: 0.85,
      };

      tracker.recordOutcome(outcome1);
      tracker.recordOutcome(outcome2);

      const history = tracker.getHistory('team-1');

      expect(history.length).toBe(2);
    });

    it('should handle multiple teams', () => {
      const outcome1: MergeOutcome = {
        teamId: 'team-1',
        timestamp: Date.now(),
        mergeStrategy: 'weighted',
        memberResponses: [
          {
            personaId: 'persona-1',
            content: 'Response 1',
            confidence: 0.8,
            metadata: {},
          },
        ],
        selectedResponse: {
          personaId: 'persona-1',
          content: 'Response 1',
          confidence: 0.8,
          metadata: {},
        },
        qualityScore: 0.7,
      };

      const outcome2: MergeOutcome = {
        teamId: 'team-2',
        timestamp: Date.now(),
        mergeStrategy: 'weighted',
        memberResponses: [
          {
            personaId: 'persona-2',
            content: 'Response 2',
            confidence: 0.9,
            metadata: {},
          },
        ],
        selectedResponse: {
          personaId: 'persona-2',
          content: 'Response 2',
          confidence: 0.9,
          metadata: {},
        },
        qualityScore: 0.85,
      };

      tracker.recordOutcome(outcome1);
      tracker.recordOutcome(outcome2);

      const history1 = tracker.getHistory('team-1');
      const history2 = tracker.getHistory('team-2');

      expect(history1.length).toBe(1);
      expect(history2.length).toBe(1);
    });
  });

  describe('History Retrieval', () => {
    let tracker: OutcomeTracker;

    beforeEach(() => {
      tracker = new OutcomeTracker();
    });

    it('should return empty history for unknown team', () => {
      const history = tracker.getHistory('unknown-team');

      expect(history).toEqual([]);
    });

    it('should limit history by specified limit', () => {
      const outcomes: MergeOutcome[] = Array.from({ length: 10 }, (_, i) => ({
        teamId: 'team-1',
        timestamp: Date.now() + i,
        mergeStrategy: 'weighted' as const,
        memberResponses: [
          {
            personaId: 'persona-1',
            content: `Response ${i}`,
            confidence: 0.8,
            metadata: {},
          },
        ],
        selectedResponse: {
          personaId: 'persona-1',
          content: `Response ${i}`,
          confidence: 0.8,
          metadata: {},
        },
        qualityScore: 0.7,
      }));

      outcomes.forEach((outcome) => tracker.recordOutcome(outcome));

      const history = tracker.getHistory('team-1', 5);

      expect(history.length).toBe(5);
    });

    it('should return most recent outcomes', () => {
      const outcomes: MergeOutcome[] = Array.from({ length: 10 }, (_, i) => ({
        teamId: 'team-1',
        timestamp: Date.now() + i * 1000,
        mergeStrategy: 'weighted' as const,
        memberResponses: [
          {
            personaId: 'persona-1',
            content: `Response ${i}`,
            confidence: 0.8,
            metadata: {},
          },
        ],
        selectedResponse: {
          personaId: 'persona-1',
          content: `Response ${i}`,
          confidence: 0.8,
          metadata: {},
        },
        qualityScore: 0.7,
      }));

      outcomes.forEach((outcome) => tracker.recordOutcome(outcome));

      const history = tracker.getHistory('team-1', 3);

      expect(history[0].selectedResponse.content).toBe('Response 7');
      expect(history[2].selectedResponse.content).toBe('Response 9');
    });
  });

  describe('Member Performance Analysis', () => {
    let tracker: OutcomeTracker;

    beforeEach(() => {
      tracker = new OutcomeTracker();
    });

    it('should analyze member performance', () => {
      const outcome: MergeOutcome = {
        teamId: 'team-1',
        timestamp: Date.now(),
        mergeStrategy: 'weighted',
        memberResponses: [
          {
            personaId: 'persona-1',
            content: 'Response 1',
            confidence: 0.9,
            metadata: {},
          },
        ],
        selectedResponse: {
          personaId: 'persona-1',
          content: 'Response 1',
          confidence: 0.9,
          metadata: {},
        },
        qualityScore: 0.85,
      };

      tracker.recordOutcome(outcome);

      const performance = tracker.analyzeMemberPerformance(
        'team-1',
        'persona-1'
      );

      expect(performance).toBeDefined();
      expect(performance.totalResponses).toBeGreaterThan(0);
    });

    it('should return default performance for unknown member', () => {
      const performance = tracker.analyzeMemberPerformance('team-1', 'unknown');

      expect(performance.totalResponses).toBe(0);
      expect(performance.avgConfidence).toBe(0.5);
      expect(performance.selectionRate).toBe(0);
      expect(performance.avgQuality).toBe(0.5);
    });

    it('should analyze all member performances', () => {
      const outcome: MergeOutcome = {
        teamId: 'team-1',
        timestamp: Date.now(),
        mergeStrategy: 'weighted',
        memberResponses: [
          {
            personaId: 'persona-1',
            content: 'Response 1',
            confidence: 0.9,
            metadata: {},
          },
          {
            personaId: 'persona-2',
            content: 'Response 2',
            confidence: 0.8,
            metadata: {},
          },
        ],
        selectedResponse: {
          personaId: 'persona-1',
          content: 'Response 1',
          confidence: 0.9,
          metadata: {},
        },
        qualityScore: 0.85,
      };

      tracker.recordOutcome(outcome);

      const performances = tracker.getAllMemberPerformances('team-1');

      expect(performances.size).toBe(2);
      expect(performances.has('persona-1')).toBe(true);
      expect(performances.has('persona-2')).toBe(true);
    });

    it('should calculate confidence metrics', () => {
      const outcomes: MergeOutcome[] = [
        {
          teamId: 'team-1',
          timestamp: Date.now(),
          mergeStrategy: 'weighted',
          memberResponses: [
            {
              personaId: 'persona-1',
              content: 'Response 1',
              confidence: 0.9,
              metadata: {},
            },
          ],
          selectedResponse: {
            personaId: 'persona-1',
            content: 'Response 1',
            confidence: 0.9,
            metadata: {},
          },
          qualityScore: 0.85,
        },
        {
          teamId: 'team-1',
          timestamp: Date.now() + 1000,
          mergeStrategy: 'weighted',
          memberResponses: [
            {
              personaId: 'persona-1',
              content: 'Response 2',
              confidence: 0.7,
              metadata: {},
            },
          ],
          selectedResponse: {
            personaId: 'persona-1',
            content: 'Response 2',
            confidence: 0.7,
            metadata: {},
          },
          qualityScore: 0.6,
        },
      ];

      outcomes.forEach((o) => tracker.recordOutcome(o));

      const performance = tracker.analyzeMemberPerformance(
        'team-1',
        'persona-1'
      );

      expect(performance.avgConfidence).toBeCloseTo(0.8, 1);
    });
  });

  describe('Edge Cases', () => {
    let tracker: OutcomeTracker;

    beforeEach(() => {
      tracker = new OutcomeTracker();
    });

    it('should handle empty member responses', () => {
      const outcome: MergeOutcome = {
        teamId: 'team-1',
        timestamp: Date.now(),
        mergeStrategy: 'weighted',
        memberResponses: [],
        selectedResponse: {
          personaId: 'persona-1',
          content: 'Default',
          confidence: 0.5,
          metadata: {},
        },
        qualityScore: 0.5,
      };

      tracker.recordOutcome(outcome);

      const performances = tracker.getAllMemberPerformances('team-1');

      expect(performances.size).toBe(0);
    });

    it('should handle max outcomes limit', () => {
      // Record more than max outcomes (1000)
      for (let i = 0; i < 1050; i++) {
        tracker.recordOutcome({
          teamId: 'team-1',
          timestamp: Date.now() + i,
          mergeStrategy: 'weighted',
          memberResponses: [
            {
              personaId: 'persona-1',
              content: `Response ${i}`,
              confidence: 0.8,
              metadata: {},
            },
          ],
          selectedResponse: {
            personaId: 'persona-1',
            content: `Response ${i}`,
            confidence: 0.8,
            metadata: {},
          },
          qualityScore: 0.7,
        });
      }

      const history = tracker.getHistory('team-1');

      // Should keep only 1000 most recent
      expect(history.length).toBeLessThanOrEqual(1000);
    });
  });
});
