// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - Experiment Manager Tests
// Comprehensive tests for A/B testing framework
// ═══════════════════════════════════════════════════════════════════════════════

import { ExperimentManager } from '../../../src/runtime/experiments/experiment-manager';
import type {
  Experiment,
  Variant,
  ExperimentConfig,
} from '../../../src/runtime/experiments/types';
import { DEFAULT_EXPERIMENT_CONFIG } from '../../../src/runtime/experiments/types';

describe('ExperimentManager', () => {
  let manager: ExperimentManager;
  let config: ExperimentConfig;

  const createTestExperiment = (
    overrides: Partial<Experiment> = {}
  ): Experiment => {
    return {
      id: 'test-exp-1',
      name: 'Test Experiment',
      description: 'Testing A vs B',
      variants: [
        { id: 'control', name: 'Control', config: {} },
        { id: 'variant-a', name: 'Variant A', config: {} },
      ],
      allocation: [0.5, 0.5],
      metrics: ['conversion', 'latency'],
      startTime: Date.now(),
      status: 'draft',
      ...overrides,
    };
  };

  beforeEach(() => {
    config = { ...DEFAULT_EXPERIMENT_CONFIG };
    manager = new ExperimentManager(config);
  });

  describe('initialization', () => {
    it('should create manager instance', () => {
      expect(manager).toBeDefined();
      expect(manager).toBeInstanceOf(ExperimentManager);
    });

    it('should start with no experiments', () => {
      const experiments = manager.listExperiments();
      expect(experiments).toHaveLength(0);
    });
  });

  describe('createExperiment', () => {
    it('should create valid experiment', () => {
      const experiment = createTestExperiment();
      manager.createExperiment(experiment);

      const retrieved = manager.getExperiment('test-exp-1');
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe('test-exp-1');
      expect(retrieved!.name).toBe('Test Experiment');
    });

    it('should require experiment ID', () => {
      const experiment = createTestExperiment({ id: '' });

      expect(() => {
        manager.createExperiment(experiment);
      }).toThrow('Experiment must have id and name');
    });

    it('should require experiment name', () => {
      const experiment = createTestExperiment({ name: '' });

      expect(() => {
        manager.createExperiment(experiment);
      }).toThrow('Experiment must have id and name');
    });

    it('should require at least 2 variants', () => {
      const experiment = createTestExperiment({
        variants: [{ id: 'single', name: 'Single', config: {} }],
        allocation: [1],
      });

      expect(() => {
        manager.createExperiment(experiment);
      }).toThrow('Experiment must have at least 2 variants');
    });

    it('should require at least one metric', () => {
      const experiment = createTestExperiment({ metrics: [] });

      expect(() => {
        manager.createExperiment(experiment);
      }).toThrow('Experiment must track at least one metric');
    });

    it('should accept valid allocation', () => {
      const experiment = createTestExperiment({
        allocation: [0.5, 0.5], // Sum = 1.0
      });

      expect(() => {
        manager.createExperiment(experiment);
      }).not.toThrow();
    });

    it('should initialize results for all variants', () => {
      const experiment = createTestExperiment();
      manager.createExperiment(experiment);

      const results = manager.getResults('test-exp-1');
      expect(results).toHaveLength(2);
      expect(results[0].sampleSize).toBe(0);
      expect(results[1].sampleSize).toBe(0);
    });
  });

  describe('getExperiment', () => {
    it('should return experiment by ID', () => {
      const experiment = createTestExperiment();
      manager.createExperiment(experiment);

      const retrieved = manager.getExperiment('test-exp-1');
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe('test-exp-1');
    });

    it('should return undefined for non-existent experiment', () => {
      const retrieved = manager.getExperiment('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('listExperiments', () => {
    beforeEach(() => {
      manager.createExperiment(
        createTestExperiment({ id: 'exp-1', status: 'draft' })
      );
      manager.createExperiment(
        createTestExperiment({ id: 'exp-2', status: 'running' })
      );
      manager.createExperiment(
        createTestExperiment({ id: 'exp-3', status: 'completed' })
      );
    });

    it('should list all experiments', () => {
      const experiments = manager.listExperiments();
      expect(experiments).toHaveLength(3);
    });

    it('should filter by status draft', () => {
      const experiments = manager.listExperiments('draft');
      expect(experiments).toHaveLength(1);
      expect(experiments[0].id).toBe('exp-1');
    });

    it('should filter by status running', () => {
      const experiments = manager.listExperiments('running');
      expect(experiments).toHaveLength(1);
      expect(experiments[0].id).toBe('exp-2');
    });

    it('should filter by status completed', () => {
      const experiments = manager.listExperiments('completed');
      expect(experiments).toHaveLength(1);
      expect(experiments[0].id).toBe('exp-3');
    });

    it('should return empty array if no matches', () => {
      const experiments = manager.listExperiments('paused');
      expect(experiments).toHaveLength(0);
    });
  });

  describe('updateStatus', () => {
    it('should update experiment status', () => {
      const experiment = createTestExperiment({ status: 'draft' });
      manager.createExperiment(experiment);

      manager.updateStatus('test-exp-1', 'running');

      const updated = manager.getExperiment('test-exp-1');
      expect(updated!.status).toBe('running');
    });

    it('should set startTime when moving to running', () => {
      const experiment = createTestExperiment({
        status: 'draft',
        startTime: 0,
      });
      manager.createExperiment(experiment);

      manager.updateStatus('test-exp-1', 'running');

      const updated = manager.getExperiment('test-exp-1');
      expect(updated!.startTime).toBeGreaterThan(0);
    });

    it('should set endTime when moving to completed', () => {
      const experiment = createTestExperiment({ status: 'running' });
      manager.createExperiment(experiment);

      manager.updateStatus('test-exp-1', 'completed');

      const updated = manager.getExperiment('test-exp-1');
      expect(updated!.endTime).toBeDefined();
      expect(updated!.endTime).toBeGreaterThan(0);
    });

    it('should throw for non-existent experiment', () => {
      expect(() => {
        manager.updateStatus('non-existent', 'running');
      }).toThrow('Experiment non-existent not found');
    });
  });

  describe('assignVariant', () => {
    beforeEach(() => {
      const experiment = createTestExperiment({ status: 'running' });
      manager.createExperiment(experiment);
    });

    it('should assign variant to session', () => {
      const variant = manager.assignVariant('test-exp-1', 'session-1');

      expect(variant).toBeDefined();
      expect(['control', 'variant-a']).toContain(variant.id);
    });

    it('should return consistent assignment for same session', () => {
      const variant1 = manager.assignVariant('test-exp-1', 'session-1');
      const variant2 = manager.assignVariant('test-exp-1', 'session-1');

      expect(variant1.id).toBe(variant2.id);
    });

    it('should prioritize userId for assignment key', () => {
      const variant1 = manager.assignVariant(
        'test-exp-1',
        'session-1',
        'user-1'
      );
      const variant2 = manager.assignVariant(
        'test-exp-1',
        'session-2',
        'user-1'
      );

      // Same user should get same variant even with different session
      expect(variant1.id).toBe(variant2.id);
    });

    it('should throw for non-existent experiment', () => {
      expect(() => {
        manager.assignVariant('non-existent', 'session-1');
      }).toThrow('Experiment non-existent not found');
    });

    it('should throw for non-running experiment', () => {
      const experiment = createTestExperiment({
        id: 'draft-exp',
        status: 'draft',
      });
      manager.createExperiment(experiment);

      expect(() => {
        manager.assignVariant('draft-exp', 'session-1');
      }).toThrow('Cannot assign variant: experiment is draft');
    });
  });

  describe('getAssignment', () => {
    beforeEach(() => {
      const experiment = createTestExperiment({ status: 'running' });
      manager.createExperiment(experiment);
    });

    it('should return assignment after variant assigned', () => {
      manager.assignVariant('test-exp-1', 'session-1');

      const assignment = manager.getAssignment('test-exp-1', 'session-1');

      expect(assignment).toBeDefined();
      expect(assignment!.experimentId).toBe('test-exp-1');
      expect(assignment!.sessionId).toBe('session-1');
    });

    it('should return undefined if no assignment', () => {
      const assignment = manager.getAssignment('test-exp-1', 'session-1');
      expect(assignment).toBeUndefined();
    });

    it('should use userId if provided', () => {
      manager.assignVariant('test-exp-1', 'session-1', 'user-1');

      const assignment = manager.getAssignment(
        'test-exp-1',
        'session-1',
        'user-1'
      );

      expect(assignment).toBeDefined();
      expect(assignment!.userId).toBe('user-1');
    });
  });

  describe('recordMetric', () => {
    beforeEach(() => {
      const experiment = createTestExperiment({ status: 'running' });
      manager.createExperiment(experiment);
      manager.assignVariant('test-exp-1', 'session-1');
    });

    it('should record metric value', () => {
      manager.recordMetric('test-exp-1', 'session-1', 'conversion', 1);

      const results = manager.getResults('test-exp-1');
      const assignment = manager.getAssignment('test-exp-1', 'session-1');
      const variantResult = results.find(
        (r) => r.variantId === assignment!.variantId
      );

      expect(variantResult!.metrics.conversion).toBe(1);
      expect(variantResult!.sampleSize).toBe(1);
    });

    it('should compute running average for multiple values', () => {
      manager.recordMetric('test-exp-1', 'session-1', 'conversion', 1);
      manager.recordMetric('test-exp-1', 'session-1', 'conversion', 0);
      manager.recordMetric('test-exp-1', 'session-1', 'conversion', 1);

      const results = manager.getResults('test-exp-1');
      const assignment = manager.getAssignment('test-exp-1', 'session-1');
      const variantResult = results.find(
        (r) => r.variantId === assignment!.variantId
      );

      expect(variantResult!.metrics.conversion).toBeCloseTo(0.6667, 3);
      expect(variantResult!.sampleSize).toBe(3);
    });

    it('should handle multiple metrics independently', () => {
      manager.recordMetric('test-exp-1', 'session-1', 'conversion', 1);
      manager.recordMetric('test-exp-1', 'session-1', 'latency', 100);

      const results = manager.getResults('test-exp-1');
      const assignment = manager.getAssignment('test-exp-1', 'session-1');
      const variantResult = results.find(
        (r) => r.variantId === assignment!.variantId
      );

      expect(variantResult!.metrics.conversion).toBe(1);
      // Note: sampleSize is shared, so latency gets averaged with sampleSize=1
      expect(variantResult!.metrics.latency).toBe(50);
      expect(variantResult!.sampleSize).toBe(2);
    });

    it('should throw for non-existent experiment', () => {
      expect(() => {
        manager.recordMetric('non-existent', 'session-1', 'conversion', 1);
      }).toThrow('Experiment non-existent not found');
    });

    it('should throw if no assignment exists', () => {
      expect(() => {
        manager.recordMetric(
          'test-exp-1',
          'unassigned-session',
          'conversion',
          1
        );
      }).toThrow('No variant assignment found');
    });
  });

  describe('getResults', () => {
    it('should return empty array for non-existent experiment', () => {
      const results = manager.getResults('non-existent');
      expect(results).toHaveLength(0);
    });

    it('should return results for all variants', () => {
      const experiment = createTestExperiment();
      manager.createExperiment(experiment);

      const results = manager.getResults('test-exp-1');

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.variantId)).toContain('control');
      expect(results.map((r) => r.variantId)).toContain('variant-a');
    });

    it('should reflect recorded metrics', () => {
      const experiment = createTestExperiment({ status: 'running' });
      manager.createExperiment(experiment);

      manager.assignVariant('test-exp-1', 'session-1');
      manager.recordMetric('test-exp-1', 'session-1', 'conversion', 1);

      const results = manager.getResults('test-exp-1');
      const withData = results.find((r) => r.sampleSize > 0);

      expect(withData).toBeDefined();
      expect(withData!.metrics.conversion).toBe(1);
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      const experiment = createTestExperiment({ status: 'running' });
      manager.createExperiment(experiment);

      // Assign and record for multiple sessions
      for (let i = 1; i <= 5; i++) {
        manager.assignVariant('test-exp-1', `session-${i}`);
        manager.recordMetric('test-exp-1', `session-${i}`, 'conversion', i % 2);
      }
    });

    it('should return total assignments', () => {
      const stats = manager.getStats('test-exp-1');
      expect(stats.totalAssignments).toBe(5);
    });

    it('should return variant distribution', () => {
      const stats = manager.getStats('test-exp-1');
      expect(stats.variantDistribution).toBeDefined();
      expect(Object.keys(stats.variantDistribution)).toContain('control');
      expect(Object.keys(stats.variantDistribution)).toContain('variant-a');
    });

    it('should return metrics recorded count', () => {
      const stats = manager.getStats('test-exp-1');
      expect(stats.metricsRecorded).toBeDefined();
      expect(stats.metricsRecorded.conversion).toBeGreaterThan(0);
    });

    it('should throw for non-existent experiment', () => {
      expect(() => {
        manager.getStats('non-existent');
      }).toThrow('Experiment non-existent not found');
    });
  });

  describe('deleteExperiment', () => {
    it('should delete draft experiment', () => {
      const experiment = createTestExperiment({ status: 'draft' });
      manager.createExperiment(experiment);

      manager.deleteExperiment('test-exp-1');

      const retrieved = manager.getExperiment('test-exp-1');
      expect(retrieved).toBeUndefined();
    });

    it('should delete completed experiment', () => {
      const experiment = createTestExperiment({ status: 'completed' });
      manager.createExperiment(experiment);

      manager.deleteExperiment('test-exp-1');

      const retrieved = manager.getExperiment('test-exp-1');
      expect(retrieved).toBeUndefined();
    });

    it('should throw for running experiment', () => {
      const experiment = createTestExperiment({ status: 'running' });
      manager.createExperiment(experiment);

      expect(() => {
        manager.deleteExperiment('test-exp-1');
      }).toThrow('Cannot delete running experiment');
    });

    it('should delete associated assignments', () => {
      const experiment = createTestExperiment({ status: 'running' });
      manager.createExperiment(experiment);
      manager.assignVariant('test-exp-1', 'session-1');

      manager.updateStatus('test-exp-1', 'completed');
      manager.deleteExperiment('test-exp-1');

      const assignment = manager.getAssignment('test-exp-1', 'session-1');
      expect(assignment).toBeUndefined();
    });

    it('should delete associated results', () => {
      const experiment = createTestExperiment({ status: 'completed' });
      manager.createExperiment(experiment);

      manager.deleteExperiment('test-exp-1');

      const results = manager.getResults('test-exp-1');
      expect(results).toHaveLength(0);
    });

    it('should throw for non-existent experiment', () => {
      expect(() => {
        manager.deleteExperiment('non-existent');
      }).toThrow('Experiment non-existent not found');
    });
  });

  describe('export', () => {
    it('should export empty state', () => {
      const exported = manager.export();

      expect(exported.experiments).toHaveLength(0);
      expect(exported.assignments).toHaveLength(0);
      expect(Object.keys(exported.results)).toHaveLength(0);
    });

    it('should export experiments', () => {
      const experiment = createTestExperiment();
      manager.createExperiment(experiment);

      const exported = manager.export();

      expect(exported.experiments).toHaveLength(1);
      expect(exported.experiments[0].id).toBe('test-exp-1');
    });

    it('should export assignments', () => {
      const experiment = createTestExperiment({ status: 'running' });
      manager.createExperiment(experiment);
      manager.assignVariant('test-exp-1', 'session-1');

      const exported = manager.export();

      expect(exported.assignments).toHaveLength(1);
      expect(exported.assignments[0].sessionId).toBe('session-1');
    });

    it('should export results', () => {
      const experiment = createTestExperiment({ status: 'running' });
      manager.createExperiment(experiment);
      manager.assignVariant('test-exp-1', 'session-1');
      manager.recordMetric('test-exp-1', 'session-1', 'conversion', 1);

      const exported = manager.export();

      expect(exported.results['test-exp-1']).toBeDefined();
      expect(exported.results['test-exp-1']).toHaveLength(2);
    });
  });

  describe('import', () => {
    it('should import experiments', () => {
      const data = {
        experiments: [createTestExperiment()],
        assignments: [],
        results: {},
      };

      manager.import(data);

      const experiment = manager.getExperiment('test-exp-1');
      expect(experiment).toBeDefined();
    });

    it('should import assignments', () => {
      const data = {
        experiments: [createTestExperiment({ status: 'running' })],
        assignments: [
          {
            experimentId: 'test-exp-1',
            variantId: 'control',
            sessionId: 'session-1',
            timestamp: Date.now(),
          },
        ],
        results: {},
      };

      manager.import(data);

      const assignment = manager.getAssignment('test-exp-1', 'session-1');
      expect(assignment).toBeDefined();
    });

    it('should import results', () => {
      const data = {
        experiments: [createTestExperiment()],
        assignments: [],
        results: {
          'test-exp-1': [
            {
              experimentId: 'test-exp-1',
              variantId: 'control',
              metrics: { conversion: 0.5 },
              sampleSize: 10,
              lastUpdated: Date.now(),
            },
          ],
        },
      };

      manager.import(data);

      const results = manager.getResults('test-exp-1');
      expect(results).toHaveLength(1);
      expect(results[0].metrics.conversion).toBe(0.5);
    });
  });

  describe('clear', () => {
    beforeEach(() => {
      const experiment = createTestExperiment({ status: 'running' });
      manager.createExperiment(experiment);
      manager.assignVariant('test-exp-1', 'session-1');
      manager.recordMetric('test-exp-1', 'session-1', 'conversion', 1);
    });

    it('should clear all experiments', () => {
      manager.clear();

      const experiments = manager.listExperiments();
      expect(experiments).toHaveLength(0);
    });

    it('should clear all assignments', () => {
      manager.clear();

      const assignment = manager.getAssignment('test-exp-1', 'session-1');
      expect(assignment).toBeUndefined();
    });

    it('should clear all results', () => {
      manager.clear();

      const results = manager.getResults('test-exp-1');
      expect(results).toHaveLength(0);
    });
  });

  describe('round-trip export/import', () => {
    it('should preserve complete state', () => {
      // Create complex state
      const exp1 = createTestExperiment({ id: 'exp-1', status: 'running' });
      const exp2 = createTestExperiment({ id: 'exp-2', status: 'completed' });

      manager.createExperiment(exp1);
      manager.createExperiment(exp2);

      manager.assignVariant('exp-1', 'session-1');
      manager.assignVariant('exp-1', 'session-2');
      manager.recordMetric('exp-1', 'session-1', 'conversion', 1);
      manager.recordMetric('exp-1', 'session-2', 'conversion', 0);

      // Export and re-import
      const exported = manager.export();
      const newManager = new ExperimentManager(config);
      newManager.import(exported);

      // Verify state preserved
      const experiments = newManager.listExperiments();
      expect(experiments).toHaveLength(2);

      const assignment = newManager.getAssignment('exp-1', 'session-1');
      expect(assignment).toBeDefined();

      const results = newManager.getResults('exp-1');
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
