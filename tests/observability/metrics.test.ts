// ═══════════════════════════════════════════════════════════════════════════════
// PCL Observability - Metrics Collector Tests
// Comprehensive tests for Prometheus-style metrics collection
// ═══════════════════════════════════════════════════════════════════════════════

import {
  MetricsCollector,
  getMetricsCollector,
  setMetricsCollector,
  createMetricsCollector,
  type MetricsCollectorOptions,
} from '../../src/observability/metrics';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  describe('initialization', () => {
    it('should initialize with default prefix', () => {
      expect(collector).toBeDefined();
    });

    it('should initialize with custom prefix', () => {
      const customCollector = new MetricsCollector({ prefix: 'custom' });
      expect(customCollector).toBeDefined();
    });

    it('should initialize with empty options', () => {
      const emptyCollector = new MetricsCollector({});
      expect(emptyCollector).toBeDefined();
    });
  });

  describe('persona metrics', () => {
    describe('recordPersonaActivation', () => {
      it('should record persona activation', () => {
        expect(() => {
          collector.recordPersonaActivation('persona-1');
        }).not.toThrow();
      });

      it('should record multiple activations', () => {
        expect(() => {
          collector.recordPersonaActivation('persona-1');
          collector.recordPersonaActivation('persona-2');
          collector.recordPersonaActivation('persona-1');
        }).not.toThrow();
      });

      it('should handle empty persona ID', () => {
        expect(() => {
          collector.recordPersonaActivation('');
        }).not.toThrow();
      });

      it('should handle special characters in persona ID', () => {
        expect(() => {
          collector.recordPersonaActivation('persona-with-special-chars-!@#');
        }).not.toThrow();
      });

      it('should handle very long persona ID', () => {
        const longId = 'persona-' + 'x'.repeat(1000);
        expect(() => {
          collector.recordPersonaActivation(longId);
        }).not.toThrow();
      });
    });

    describe('recordPersonaDeactivation', () => {
      it('should record persona deactivation', () => {
        expect(() => {
          collector.recordPersonaActivation('persona-1');
          collector.recordPersonaDeactivation('persona-1');
        }).not.toThrow();
      });

      it('should handle deactivation without activation', () => {
        expect(() => {
          collector.recordPersonaDeactivation('persona-1');
        }).not.toThrow();
      });

      it('should handle multiple deactivations', () => {
        expect(() => {
          collector.recordPersonaDeactivation('persona-1');
          collector.recordPersonaDeactivation('persona-1');
        }).not.toThrow();
      });
    });

    describe('recordPersonaMessage', () => {
      it('should record persona message with duration', () => {
        expect(() => {
          collector.recordPersonaMessage('persona-1', 100);
        }).not.toThrow();
      });

      it('should record persona message with tokens', () => {
        expect(() => {
          collector.recordPersonaMessage('persona-1', 100, 500);
        }).not.toThrow();
      });

      it('should record persona message without tokens', () => {
        expect(() => {
          collector.recordPersonaMessage('persona-1', 100);
        }).not.toThrow();
      });

      it('should handle zero duration', () => {
        expect(() => {
          collector.recordPersonaMessage('persona-1', 0, 100);
        }).not.toThrow();
      });

      it('should handle zero tokens', () => {
        expect(() => {
          collector.recordPersonaMessage('persona-1', 100, 0);
        }).not.toThrow();
      });

      it('should handle negative duration (edge case)', () => {
        expect(() => {
          collector.recordPersonaMessage('persona-1', -100);
        }).not.toThrow();
      });

      it('should handle large duration values', () => {
        expect(() => {
          collector.recordPersonaMessage('persona-1', 999999999);
        }).not.toThrow();
      });

      it('should handle large token counts', () => {
        expect(() => {
          collector.recordPersonaMessage('persona-1', 100, 1000000);
        }).not.toThrow();
      });

      it('should handle multiple messages from same persona', () => {
        expect(() => {
          for (let i = 0; i < 100; i++) {
            collector.recordPersonaMessage('persona-1', 100 + i, 500 + i);
          }
        }).not.toThrow();
      });
    });
  });

  describe('team metrics', () => {
    describe('recordTeamActivation', () => {
      it('should record team activation', () => {
        expect(() => {
          collector.recordTeamActivation('team-1');
        }).not.toThrow();
      });

      it('should record multiple team activations', () => {
        expect(() => {
          collector.recordTeamActivation('team-1');
          collector.recordTeamActivation('team-2');
        }).not.toThrow();
      });
    });

    describe('recordTeamDeactivation', () => {
      it('should record team deactivation', () => {
        expect(() => {
          collector.recordTeamActivation('team-1');
          collector.recordTeamDeactivation('team-1');
        }).not.toThrow();
      });

      it('should handle deactivation without activation', () => {
        expect(() => {
          collector.recordTeamDeactivation('team-1');
        }).not.toThrow();
      });
    });

    describe('recordTeamMerge', () => {
      it('should record team merge with debate mode', () => {
        expect(() => {
          collector.recordTeamMerge('team-1', 'debate', 500);
        }).not.toThrow();
      });

      it('should record team merge with chain mode', () => {
        expect(() => {
          collector.recordTeamMerge('team-1', 'chain', 300);
        }).not.toThrow();
      });

      it('should record team merge with parallel mode', () => {
        expect(() => {
          collector.recordTeamMerge('team-1', 'parallel', 200);
        }).not.toThrow();
      });

      it('should handle zero duration', () => {
        expect(() => {
          collector.recordTeamMerge('team-1', 'debate', 0);
        }).not.toThrow();
      });

      it('should handle custom merge mode', () => {
        expect(() => {
          collector.recordTeamMerge('team-1', 'custom-merge', 400);
        }).not.toThrow();
      });
    });
  });

  describe('workflow metrics', () => {
    describe('recordWorkflowStart', () => {
      it('should record workflow start', () => {
        expect(() => {
          collector.recordWorkflowStart('analysis-workflow');
        }).not.toThrow();
      });

      it('should record multiple workflow starts', () => {
        expect(() => {
          collector.recordWorkflowStart('workflow-1');
          collector.recordWorkflowStart('workflow-2');
        }).not.toThrow();
      });
    });

    describe('recordWorkflowEnd', () => {
      it('should record successful workflow end', () => {
        expect(() => {
          collector.recordWorkflowStart('workflow-1');
          collector.recordWorkflowEnd('workflow-1', 1000, 'success');
        }).not.toThrow();
      });

      it('should record failed workflow end', () => {
        expect(() => {
          collector.recordWorkflowStart('workflow-1');
          collector.recordWorkflowEnd('workflow-1', 500, 'failure');
        }).not.toThrow();
      });

      it('should handle workflow end without start', () => {
        expect(() => {
          collector.recordWorkflowEnd('workflow-1', 500, 'success');
        }).not.toThrow();
      });

      it('should handle zero duration', () => {
        expect(() => {
          collector.recordWorkflowEnd('workflow-1', 0, 'success');
        }).not.toThrow();
      });
    });

    describe('recordWorkflowStep', () => {
      it('should record workflow step', () => {
        expect(() => {
          collector.recordWorkflowStep('workflow-1', 'step-1');
        }).not.toThrow();
      });

      it('should record multiple workflow steps', () => {
        expect(() => {
          collector.recordWorkflowStep('workflow-1', 'step-1');
          collector.recordWorkflowStep('workflow-1', 'step-2');
          collector.recordWorkflowStep('workflow-1', 'step-3');
        }).not.toThrow();
      });

      it('should handle empty step name', () => {
        expect(() => {
          collector.recordWorkflowStep('workflow-1', '');
        }).not.toThrow();
      });
    });
  });

  describe('provider metrics', () => {
    describe('recordProviderRequest', () => {
      it('should record provider request', () => {
        expect(() => {
          collector.recordProviderRequest(
            'anthropic',
            'claude-3-5-sonnet',
            150
          );
        }).not.toThrow();
      });

      it('should record multiple provider requests', () => {
        expect(() => {
          collector.recordProviderRequest(
            'anthropic',
            'claude-3-5-sonnet',
            150
          );
          collector.recordProviderRequest('openai', 'gpt-4', 200);
          collector.recordProviderRequest('anthropic', 'claude-3-opus', 300);
        }).not.toThrow();
      });

      it('should handle zero latency', () => {
        expect(() => {
          collector.recordProviderRequest('anthropic', 'claude-3-5-sonnet', 0);
        }).not.toThrow();
      });

      it('should handle large latency values', () => {
        expect(() => {
          collector.recordProviderRequest(
            'anthropic',
            'claude-3-5-sonnet',
            999999
          );
        }).not.toThrow();
      });
    });

    describe('recordProviderError', () => {
      it('should record provider error', () => {
        expect(() => {
          collector.recordProviderError('anthropic', 'rate_limit');
        }).not.toThrow();
      });

      it('should record different error types', () => {
        expect(() => {
          collector.recordProviderError('anthropic', 'rate_limit');
          collector.recordProviderError('anthropic', 'timeout');
          collector.recordProviderError('openai', 'invalid_request');
        }).not.toThrow();
      });

      it('should handle empty error type', () => {
        expect(() => {
          collector.recordProviderError('anthropic', '');
        }).not.toThrow();
      });
    });

    describe('recordProviderTokens', () => {
      it('should record input tokens', () => {
        expect(() => {
          collector.recordProviderTokens(
            'anthropic',
            'claude-3-5-sonnet',
            100,
            'input'
          );
        }).not.toThrow();
      });

      it('should record output tokens', () => {
        expect(() => {
          collector.recordProviderTokens(
            'anthropic',
            'claude-3-5-sonnet',
            200,
            'output'
          );
        }).not.toThrow();
      });

      it('should record both input and output tokens', () => {
        expect(() => {
          collector.recordProviderTokens(
            'anthropic',
            'claude-3-5-sonnet',
            100,
            'input'
          );
          collector.recordProviderTokens(
            'anthropic',
            'claude-3-5-sonnet',
            200,
            'output'
          );
        }).not.toThrow();
      });

      it('should handle zero tokens', () => {
        expect(() => {
          collector.recordProviderTokens(
            'anthropic',
            'claude-3-5-sonnet',
            0,
            'input'
          );
        }).not.toThrow();
      });

      it('should handle large token counts', () => {
        expect(() => {
          collector.recordProviderTokens(
            'anthropic',
            'claude-3-5-sonnet',
            1000000,
            'input'
          );
        }).not.toThrow();
      });
    });

    describe('recordProviderCost', () => {
      it('should record provider cost', () => {
        expect(() => {
          collector.recordProviderCost('anthropic', 'claude-3-5-sonnet', 0.015);
        }).not.toThrow();
      });

      it('should record multiple costs', () => {
        expect(() => {
          collector.recordProviderCost('anthropic', 'claude-3-5-sonnet', 0.015);
          collector.recordProviderCost('openai', 'gpt-4', 0.03);
        }).not.toThrow();
      });

      it('should handle zero cost', () => {
        expect(() => {
          collector.recordProviderCost('anthropic', 'claude-3-5-sonnet', 0);
        }).not.toThrow();
      });

      it('should handle fractional costs', () => {
        expect(() => {
          collector.recordProviderCost(
            'anthropic',
            'claude-3-5-sonnet',
            0.0001
          );
        }).not.toThrow();
      });

      it('should handle large cost values', () => {
        expect(() => {
          collector.recordProviderCost(
            'anthropic',
            'claude-3-5-sonnet',
            999.99
          );
        }).not.toThrow();
      });
    });
  });

  describe('scheduler metrics', () => {
    describe('recordTaskQueued', () => {
      it('should record high priority task queued', () => {
        expect(() => {
          collector.recordTaskQueued('high');
        }).not.toThrow();
      });

      it('should record normal priority task queued', () => {
        expect(() => {
          collector.recordTaskQueued('normal');
        }).not.toThrow();
      });

      it('should record low priority task queued', () => {
        expect(() => {
          collector.recordTaskQueued('low');
        }).not.toThrow();
      });

      it('should record multiple queued tasks', () => {
        expect(() => {
          for (let i = 0; i < 50; i++) {
            collector.recordTaskQueued('normal');
          }
        }).not.toThrow();
      });
    });

    describe('recordTaskDequeued', () => {
      it('should record task dequeued', () => {
        expect(() => {
          collector.recordTaskQueued('high');
          collector.recordTaskDequeued('high');
        }).not.toThrow();
      });

      it('should handle dequeue without queue', () => {
        expect(() => {
          collector.recordTaskDequeued('high');
        }).not.toThrow();
      });
    });

    describe('recordTaskStarted', () => {
      it('should record task started', () => {
        expect(() => {
          collector.recordTaskStarted('high');
        }).not.toThrow();
      });

      it('should record multiple tasks started', () => {
        expect(() => {
          collector.recordTaskStarted('high');
          collector.recordTaskStarted('normal');
          collector.recordTaskStarted('low');
        }).not.toThrow();
      });
    });

    describe('recordTaskCompleted', () => {
      it('should record task completed', () => {
        expect(() => {
          collector.recordTaskCompleted('high', 50, 200);
        }).not.toThrow();
      });

      it('should record task with zero wait time', () => {
        expect(() => {
          collector.recordTaskCompleted('high', 0, 200);
        }).not.toThrow();
      });

      it('should record task with zero execution time', () => {
        expect(() => {
          collector.recordTaskCompleted('high', 50, 0);
        }).not.toThrow();
      });

      it('should record multiple completed tasks', () => {
        expect(() => {
          for (let i = 0; i < 100; i++) {
            collector.recordTaskCompleted('normal', 10 + i, 100 + i);
          }
        }).not.toThrow();
      });
    });

    describe('recordTaskFailed', () => {
      it('should record task failed', () => {
        expect(() => {
          collector.recordTaskFailed('high', 50);
        }).not.toThrow();
      });

      it('should record task failed with zero wait time', () => {
        expect(() => {
          collector.recordTaskFailed('high', 0);
        }).not.toThrow();
      });

      it('should record multiple failed tasks', () => {
        expect(() => {
          collector.recordTaskFailed('high', 50);
          collector.recordTaskFailed('normal', 30);
          collector.recordTaskFailed('low', 100);
        }).not.toThrow();
      });
    });
  });

  describe('complex scenarios', () => {
    it('should handle complete persona lifecycle', () => {
      expect(() => {
        collector.recordPersonaActivation('persona-1');
        collector.recordPersonaMessage('persona-1', 150, 600);
        collector.recordPersonaMessage('persona-1', 200, 800);
        collector.recordPersonaDeactivation('persona-1');
      }).not.toThrow();
    });

    it('should handle complete team workflow', () => {
      expect(() => {
        collector.recordTeamActivation('team-1');
        collector.recordPersonaActivation('persona-1');
        collector.recordPersonaActivation('persona-2');
        collector.recordTeamMerge('team-1', 'debate', 500);
        collector.recordPersonaDeactivation('persona-1');
        collector.recordPersonaDeactivation('persona-2');
        collector.recordTeamDeactivation('team-1');
      }).not.toThrow();
    });

    it('should handle complete workflow execution', () => {
      expect(() => {
        collector.recordWorkflowStart('workflow-1');
        collector.recordWorkflowStep('workflow-1', 'step-1');
        collector.recordWorkflowStep('workflow-1', 'step-2');
        collector.recordWorkflowStep('workflow-1', 'step-3');
        collector.recordWorkflowEnd('workflow-1', 1500, 'success');
      }).not.toThrow();
    });

    it('should handle complete provider request cycle', () => {
      expect(() => {
        collector.recordProviderRequest('anthropic', 'claude-3-5-sonnet', 150);
        collector.recordProviderTokens(
          'anthropic',
          'claude-3-5-sonnet',
          100,
          'input'
        );
        collector.recordProviderTokens(
          'anthropic',
          'claude-3-5-sonnet',
          200,
          'output'
        );
        collector.recordProviderCost('anthropic', 'claude-3-5-sonnet', 0.015);
      }).not.toThrow();
    });

    it('should handle scheduler task lifecycle', () => {
      expect(() => {
        collector.recordTaskQueued('high');
        collector.recordTaskDequeued('high');
        collector.recordTaskStarted('high');
        collector.recordTaskCompleted('high', 25, 150);
      }).not.toThrow();
    });

    it('should handle concurrent operations', () => {
      expect(() => {
        // Simulate concurrent personas
        collector.recordPersonaActivation('persona-1');
        collector.recordPersonaActivation('persona-2');
        collector.recordPersonaActivation('persona-3');

        // Simulate concurrent messages
        collector.recordPersonaMessage('persona-1', 100, 500);
        collector.recordPersonaMessage('persona-2', 150, 600);
        collector.recordPersonaMessage('persona-3', 200, 700);

        // Simulate deactivations in different order
        collector.recordPersonaDeactivation('persona-2');
        collector.recordPersonaDeactivation('persona-1');
        collector.recordPersonaDeactivation('persona-3');
      }).not.toThrow();
    });

    it('should handle high-frequency metrics recording', () => {
      expect(() => {
        for (let i = 0; i < 1000; i++) {
          collector.recordPersonaMessage('persona-1', 100, 500);
          collector.recordProviderRequest(
            'anthropic',
            'claude-3-5-sonnet',
            150
          );
          collector.recordWorkflowStep('workflow-1', `step-${i}`);
        }
      }).not.toThrow();
    });
  });
});

describe('MetricsCollector Factory Functions', () => {
  beforeEach(() => {
    // Reset default collector
    setMetricsCollector(new MetricsCollector());
  });

  describe('getMetricsCollector', () => {
    it('should return default collector instance', () => {
      const collector = getMetricsCollector();
      expect(collector).toBeDefined();
      expect(collector).toBeInstanceOf(MetricsCollector);
    });

    it('should return same instance on multiple calls', () => {
      const collector1 = getMetricsCollector();
      const collector2 = getMetricsCollector();
      expect(collector1).toBe(collector2);
    });
  });

  describe('setMetricsCollector', () => {
    it('should set custom collector as default', () => {
      const customCollector = new MetricsCollector({ prefix: 'custom' });
      setMetricsCollector(customCollector);

      const retrieved = getMetricsCollector();
      expect(retrieved).toBe(customCollector);
    });

    it('should replace existing default collector', () => {
      const collector1 = getMetricsCollector();
      const collector2 = new MetricsCollector({ prefix: 'new' });

      setMetricsCollector(collector2);
      const retrieved = getMetricsCollector();

      expect(retrieved).toBe(collector2);
      expect(retrieved).not.toBe(collector1);
    });
  });

  describe('createMetricsCollector', () => {
    it('should create new collector with default options', () => {
      const collector = createMetricsCollector();
      expect(collector).toBeDefined();
      expect(collector).toBeInstanceOf(MetricsCollector);
    });

    it('should create new collector with custom options', () => {
      const options: MetricsCollectorOptions = {
        prefix: 'test-prefix',
      };
      const collector = createMetricsCollector(options);
      expect(collector).toBeDefined();
    });

    it('should create independent instances', () => {
      const collector1 = createMetricsCollector();
      const collector2 = createMetricsCollector();

      expect(collector1).not.toBe(collector2);
      expect(collector1).not.toBe(getMetricsCollector());
    });
  });
});
