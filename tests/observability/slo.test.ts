// ═══════════════════════════════════════════════════════════════════════════════
// PCL Observability - SLO Tracker Tests
// Comprehensive tests for SLO tracking and error budget management
// ═══════════════════════════════════════════════════════════════════════════════

import {
  SLOTracker,
  SLORegistry,
  getSLORegistry,
  setSLORegistry,
  createSLORegistry,
  CommonSLOs,
  type SLOConfig,
  type SLOStatus,
  type SLOTarget,
} from '../../src/observability/slo';

describe('SLOTracker', () => {
  let tracker: SLOTracker;
  let config: SLOConfig;

  beforeEach(() => {
    config = {
      name: 'test-slo',
      target: 0.99, // 99% success rate
      windowSeconds: 60, // 1 minute window for fast tests
      description: 'Test SLO',
    };
    tracker = new SLOTracker(config);
  });

  afterEach(() => {
    tracker.destroy();
  });

  describe('initialization', () => {
    it('should initialize with config', () => {
      expect(tracker).toBeDefined();
    });

    it('should initialize without description', () => {
      const minimalConfig: SLOConfig = {
        name: 'minimal-slo',
        target: 0.95,
        windowSeconds: 60,
      };
      const minimalTracker = new SLOTracker(minimalConfig);
      expect(minimalTracker).toBeDefined();
      minimalTracker.destroy();
    });

    it('should accept target as decimal', () => {
      const highTarget: SLOConfig = {
        name: 'high-slo',
        target: 0.999,
        windowSeconds: 60,
      };
      const highTracker = new SLOTracker(highTarget);
      expect(highTracker).toBeDefined();
      highTracker.destroy();
    });

    it('should accept long window durations', () => {
      const longWindow: SLOConfig = {
        name: 'long-window-slo',
        target: 0.99,
        windowSeconds: 30 * 24 * 60 * 60, // 30 days
      };
      const longTracker = new SLOTracker(longWindow);
      expect(longTracker).toBeDefined();
      longTracker.destroy();
    });
  });

  describe('record', () => {
    it('should record successful request', () => {
      expect(() => tracker.record(true)).not.toThrow();
    });

    it('should record failed request', () => {
      expect(() => tracker.record(false)).not.toThrow();
    });

    it('should record multiple requests', () => {
      expect(() => {
        tracker.record(true);
        tracker.record(true);
        tracker.record(false);
        tracker.record(true);
      }).not.toThrow();
    });
  });

  describe('recordSuccess', () => {
    it('should record success', () => {
      expect(() => tracker.recordSuccess()).not.toThrow();
    });

    it('should record multiple successes', () => {
      expect(() => {
        for (let i = 0; i < 100; i++) {
          tracker.recordSuccess();
        }
      }).not.toThrow();
    });
  });

  describe('recordFailure', () => {
    it('should record failure', () => {
      expect(() => tracker.recordFailure()).not.toThrow();
    });

    it('should record multiple failures', () => {
      expect(() => {
        for (let i = 0; i < 10; i++) {
          tracker.recordFailure();
        }
      }).not.toThrow();
    });
  });

  describe('getStatus', () => {
    it('should return initial status with no records', () => {
      const status = tracker.getStatus();

      expect(status).toBeDefined();
      expect(status.name).toBe('test-slo');
      expect(status.target).toBe(0.99);
      expect(status.current).toBe(1.0); // 100% when no requests
      expect(status.healthy).toBe(true);
    });

    it('should calculate status after successful requests', () => {
      for (let i = 0; i < 100; i++) {
        tracker.recordSuccess();
      }

      const status = tracker.getStatus();
      expect(status.current).toBe(1.0);
      expect(status.metrics.totalRequests).toBe(100);
      expect(status.metrics.successfulRequests).toBe(100);
      expect(status.metrics.failedRequests).toBe(0);
      expect(status.healthy).toBe(true);
    });

    it('should calculate status with some failures', () => {
      for (let i = 0; i < 99; i++) {
        tracker.recordSuccess();
      }
      tracker.recordFailure();

      const status = tracker.getStatus();
      expect(status.current).toBe(0.99);
      expect(status.metrics.totalRequests).toBe(100);
      expect(status.metrics.successfulRequests).toBe(99);
      expect(status.metrics.failedRequests).toBe(1);
    });

    it('should calculate error budget correctly', () => {
      // With 100 requests and 99% target, we can have 1 error
      for (let i = 0; i < 99; i++) {
        tracker.recordSuccess();
      }
      tracker.recordFailure();

      const status = tracker.getStatus();
      expect(status.errorBudget.total).toBe(1); // 1% of 100
      expect(status.errorBudget.consumed).toBe(1);
      expect(status.errorBudget.remaining).toBe(0);
      expect(status.errorBudget.consumedPercent).toBe(100);
    });

    it('should show healthy when within SLO', () => {
      for (let i = 0; i < 100; i++) {
        tracker.recordSuccess();
      }

      const status = tracker.getStatus();
      expect(status.healthy).toBe(true);
    });

    it('should show unhealthy when exceeding SLO', () => {
      // 95% success rate, but target is 99%
      for (let i = 0; i < 95; i++) {
        tracker.recordSuccess();
      }
      for (let i = 0; i < 5; i++) {
        tracker.recordFailure();
      }

      const status = tracker.getStatus();
      expect(status.current).toBe(0.95);
      expect(status.healthy).toBe(false);
    });

    it('should include window information', () => {
      tracker.recordSuccess();

      const status = tracker.getStatus();
      expect(status.window.seconds).toBe(60);
      expect(status.window.startTime).toBeInstanceOf(Date);
      expect(status.window.endTime).toBeInstanceOf(Date);
      expect(status.window.endTime.getTime()).toBeGreaterThan(
        status.window.startTime.getTime()
      );
    });

    it('should handle edge case with zero allowed errors', () => {
      // With target 1.0 (100%), no errors allowed
      const perfectConfig: SLOConfig = {
        name: 'perfect-slo',
        target: 1.0,
        windowSeconds: 60,
      };
      const perfectTracker = new SLOTracker(perfectConfig);

      for (let i = 0; i < 100; i++) {
        perfectTracker.recordSuccess();
      }

      const status = perfectTracker.getStatus();
      expect(status.errorBudget.total).toBe(0);
      expect(status.healthy).toBe(true);

      perfectTracker.destroy();
    });

    it('should handle all failures', () => {
      for (let i = 0; i < 100; i++) {
        tracker.recordFailure();
      }

      const status = tracker.getStatus();
      expect(status.current).toBe(0);
      expect(status.healthy).toBe(false);
    });
  });

  describe('isHealthy', () => {
    it('should return true when healthy', () => {
      for (let i = 0; i < 100; i++) {
        tracker.recordSuccess();
      }

      expect(tracker.isHealthy()).toBe(true);
    });

    it('should return false when unhealthy', () => {
      for (let i = 0; i < 95; i++) {
        tracker.recordSuccess();
      }
      for (let i = 0; i < 5; i++) {
        tracker.recordFailure();
      }

      expect(tracker.isHealthy()).toBe(false);
    });

    it('should return true with no data', () => {
      expect(tracker.isHealthy()).toBe(true);
    });

    it('should update as requests are recorded', () => {
      expect(tracker.isHealthy()).toBe(true);

      for (let i = 0; i < 99; i++) {
        tracker.recordSuccess();
      }
      expect(tracker.isHealthy()).toBe(true);

      tracker.recordFailure();
      expect(tracker.isHealthy()).toBe(true); // Still within budget

      tracker.recordFailure();
      expect(tracker.isHealthy()).toBe(false); // Exceeded budget
    });
  });

  describe('getErrorBudgetRemaining', () => {
    it('should return 100% with no failures', () => {
      for (let i = 0; i < 100; i++) {
        tracker.recordSuccess();
      }

      expect(tracker.getErrorBudgetRemaining()).toBe(100);
    });

    it('should return 0% when budget exhausted', () => {
      for (let i = 0; i < 99; i++) {
        tracker.recordSuccess();
      }
      tracker.recordFailure();

      expect(tracker.getErrorBudgetRemaining()).toBe(0);
    });

    it('should return 50% when half budget consumed', () => {
      // Need 200 requests to have 2 allowed errors
      for (let i = 0; i < 199; i++) {
        tracker.recordSuccess();
      }
      tracker.recordFailure(); // Consumed 1 of 2

      const remaining = tracker.getErrorBudgetRemaining();
      expect(remaining).toBeCloseTo(50, 0);
    });

    it('should return 100% with no data', () => {
      expect(tracker.getErrorBudgetRemaining()).toBe(100);
    });

    it('should handle target 1.0 (100%)', () => {
      const perfectConfig: SLOConfig = {
        name: 'perfect-slo',
        target: 1.0,
        windowSeconds: 60,
      };
      const perfectTracker = new SLOTracker(perfectConfig);

      for (let i = 0; i < 100; i++) {
        perfectTracker.recordSuccess();
      }

      expect(perfectTracker.getErrorBudgetRemaining()).toBe(100);
      perfectTracker.destroy();
    });
  });

  describe('reset', () => {
    it('should clear all records', () => {
      for (let i = 0; i < 100; i++) {
        tracker.recordSuccess();
      }

      tracker.reset();

      const status = tracker.getStatus();
      expect(status.metrics.totalRequests).toBe(0);
      expect(status.current).toBe(1.0);
    });

    it('should allow recording after reset', () => {
      tracker.recordSuccess();
      tracker.reset();
      tracker.recordSuccess();

      const status = tracker.getStatus();
      expect(status.metrics.totalRequests).toBe(1);
    });
  });

  describe('destroy', () => {
    it('should cleanup resources', () => {
      expect(() => tracker.destroy()).not.toThrow();
    });

    it('should clear records on destroy', () => {
      tracker.recordSuccess();
      tracker.destroy();

      // After destroy, status should still work but with no data
      const status = tracker.getStatus();
      expect(status.metrics.totalRequests).toBe(0);
    });

    it('should be idempotent', () => {
      tracker.destroy();
      expect(() => tracker.destroy()).not.toThrow();
    });
  });

  describe('window rolling behavior', () => {
    it('should only include records within window', async () => {
      const shortConfig: SLOConfig = {
        name: 'short-window',
        target: 0.99,
        windowSeconds: 0.5, // 500ms window
      };
      const shortTracker = new SLOTracker(shortConfig);

      shortTracker.recordSuccess();
      shortTracker.recordSuccess();

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 600));

      shortTracker.recordFailure();

      const status = shortTracker.getStatus();
      // Should only see the failure (old successes expired)
      expect(status.metrics.totalRequests).toBe(1);
      expect(status.metrics.failedRequests).toBe(1);

      shortTracker.destroy();
    }, 10000);
  });
});

describe('SLORegistry', () => {
  let registry: SLORegistry;

  beforeEach(() => {
    registry = new SLORegistry();
  });

  afterEach(() => {
    registry.clear();
  });

  describe('register', () => {
    it('should register new SLO', () => {
      const config: SLOConfig = {
        name: 'test-slo',
        target: 0.99,
        windowSeconds: 60,
      };

      const tracker = registry.register(config);
      expect(tracker).toBeDefined();
      expect(tracker).toBeInstanceOf(SLOTracker);
    });

    it('should register multiple SLOs', () => {
      const tracker1 = registry.register({
        name: 'slo-1',
        target: 0.99,
        windowSeconds: 60,
      });

      const tracker2 = registry.register({
        name: 'slo-2',
        target: 0.95,
        windowSeconds: 120,
      });

      expect(tracker1).toBeDefined();
      expect(tracker2).toBeDefined();
      expect(tracker1).not.toBe(tracker2);
    });

    it('should replace existing SLO with same name', () => {
      const tracker1 = registry.register({
        name: 'test-slo',
        target: 0.99,
        windowSeconds: 60,
      });

      const tracker2 = registry.register({
        name: 'test-slo',
        target: 0.95,
        windowSeconds: 120,
      });

      expect(tracker2).toBeDefined();
      expect(tracker2).not.toBe(tracker1);
    });
  });

  describe('get', () => {
    it('should retrieve registered SLO', () => {
      const config: SLOConfig = {
        name: 'test-slo',
        target: 0.99,
        windowSeconds: 60,
      };

      const registered = registry.register(config);
      const retrieved = registry.get('test-slo');

      expect(retrieved).toBe(registered);
    });

    it('should return undefined for non-existent SLO', () => {
      const tracker = registry.get('non-existent');
      expect(tracker).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return empty map initially', () => {
      const all = registry.getAll();
      expect(all.size).toBe(0);
    });

    it('should return all registered SLOs', () => {
      registry.register({
        name: 'slo-1',
        target: 0.99,
        windowSeconds: 60,
      });

      registry.register({
        name: 'slo-2',
        target: 0.95,
        windowSeconds: 60,
      });

      const all = registry.getAll();
      expect(all.size).toBe(2);
      expect(all.has('slo-1')).toBe(true);
      expect(all.has('slo-2')).toBe(true);
    });
  });

  describe('getAllStatuses', () => {
    it('should return empty object initially', () => {
      const statuses = registry.getAllStatuses();
      expect(Object.keys(statuses)).toHaveLength(0);
    });

    it('should return status for all SLOs', () => {
      const tracker1 = registry.register({
        name: 'slo-1',
        target: 0.99,
        windowSeconds: 60,
      });

      const tracker2 = registry.register({
        name: 'slo-2',
        target: 0.95,
        windowSeconds: 60,
      });

      tracker1.recordSuccess();
      tracker2.recordFailure();

      const statuses = registry.getAllStatuses();
      expect(Object.keys(statuses)).toHaveLength(2);
      expect(statuses['slo-1']).toBeDefined();
      expect(statuses['slo-2']).toBeDefined();
      expect(statuses['slo-1'].metrics.totalRequests).toBe(1);
      expect(statuses['slo-2'].metrics.totalRequests).toBe(1);
    });
  });

  describe('isHealthy', () => {
    it('should return true when all SLOs healthy', () => {
      const tracker1 = registry.register({
        name: 'slo-1',
        target: 0.99,
        windowSeconds: 60,
      });

      const tracker2 = registry.register({
        name: 'slo-2',
        target: 0.99,
        windowSeconds: 60,
      });

      for (let i = 0; i < 100; i++) {
        tracker1.recordSuccess();
        tracker2.recordSuccess();
      }

      expect(registry.isHealthy()).toBe(true);
    });

    it('should return false when any SLO unhealthy', () => {
      const tracker1 = registry.register({
        name: 'slo-1',
        target: 0.99,
        windowSeconds: 60,
      });

      const tracker2 = registry.register({
        name: 'slo-2',
        target: 0.99,
        windowSeconds: 60,
      });

      // tracker1 healthy
      for (let i = 0; i < 100; i++) {
        tracker1.recordSuccess();
      }

      // tracker2 unhealthy
      for (let i = 0; i < 90; i++) {
        tracker2.recordSuccess();
      }
      for (let i = 0; i < 10; i++) {
        tracker2.recordFailure();
      }

      expect(registry.isHealthy()).toBe(false);
    });

    it('should return true with no SLOs', () => {
      expect(registry.isHealthy()).toBe(true);
    });
  });

  describe('unregister', () => {
    it('should unregister existing SLO', () => {
      registry.register({
        name: 'test-slo',
        target: 0.99,
        windowSeconds: 60,
      });

      const result = registry.unregister('test-slo');
      expect(result).toBe(true);
      expect(registry.get('test-slo')).toBeUndefined();
    });

    it('should return false for non-existent SLO', () => {
      const result = registry.unregister('non-existent');
      expect(result).toBe(false);
    });

    it('should destroy tracker on unregister', () => {
      const tracker = registry.register({
        name: 'test-slo',
        target: 0.99,
        windowSeconds: 60,
      });

      tracker.recordSuccess();
      registry.unregister('test-slo');

      // Tracker should be destroyed
      const status = tracker.getStatus();
      expect(status.metrics.totalRequests).toBe(0);
    });
  });

  describe('clear', () => {
    it('should remove all SLOs', () => {
      registry.register({
        name: 'slo-1',
        target: 0.99,
        windowSeconds: 60,
      });

      registry.register({
        name: 'slo-2',
        target: 0.95,
        windowSeconds: 60,
      });

      registry.clear();

      expect(registry.getAll().size).toBe(0);
    });

    it('should destroy all trackers', () => {
      const tracker1 = registry.register({
        name: 'slo-1',
        target: 0.99,
        windowSeconds: 60,
      });

      const tracker2 = registry.register({
        name: 'slo-2',
        target: 0.95,
        windowSeconds: 60,
      });

      tracker1.recordSuccess();
      tracker2.recordSuccess();

      registry.clear();

      // Trackers should be destroyed
      expect(tracker1.getStatus().metrics.totalRequests).toBe(0);
      expect(tracker2.getStatus().metrics.totalRequests).toBe(0);
    });
  });
});

describe('SLORegistry Factory Functions', () => {
  beforeEach(() => {
    setSLORegistry(new SLORegistry());
  });

  afterEach(() => {
    getSLORegistry().clear();
  });

  describe('getSLORegistry', () => {
    it('should return default registry', () => {
      const registry = getSLORegistry();
      expect(registry).toBeDefined();
      expect(registry).toBeInstanceOf(SLORegistry);
    });

    it('should return same instance on multiple calls', () => {
      const registry1 = getSLORegistry();
      const registry2 = getSLORegistry();
      expect(registry1).toBe(registry2);
    });
  });

  describe('setSLORegistry', () => {
    it('should set custom registry as default', () => {
      const customRegistry = new SLORegistry();
      setSLORegistry(customRegistry);

      const retrieved = getSLORegistry();
      expect(retrieved).toBe(customRegistry);
    });

    it('should replace existing default registry', () => {
      const registry1 = getSLORegistry();
      const registry2 = new SLORegistry();

      setSLORegistry(registry2);
      const retrieved = getSLORegistry();

      expect(retrieved).toBe(registry2);
      expect(retrieved).not.toBe(registry1);
    });
  });

  describe('createSLORegistry', () => {
    it('should create new registry', () => {
      const registry = createSLORegistry();
      expect(registry).toBeDefined();
      expect(registry).toBeInstanceOf(SLORegistry);
    });

    it('should create independent instances', () => {
      const registry1 = createSLORegistry();
      const registry2 = createSLORegistry();

      expect(registry1).not.toBe(registry2);
      expect(registry1).not.toBe(getSLORegistry());
    });
  });
});

describe('CommonSLOs', () => {
  it('should provide HIGH_AVAILABILITY config', () => {
    expect(CommonSLOs.HIGH_AVAILABILITY).toBeDefined();
    expect(CommonSLOs.HIGH_AVAILABILITY.name).toBe('high-availability');
    expect(CommonSLOs.HIGH_AVAILABILITY.target).toBe(0.999);
    expect(CommonSLOs.HIGH_AVAILABILITY.windowSeconds).toBe(30 * 24 * 60 * 60);
    expect(CommonSLOs.HIGH_AVAILABILITY.description).toContain('99.9%');
  });

  it('should provide STANDARD_AVAILABILITY config', () => {
    expect(CommonSLOs.STANDARD_AVAILABILITY).toBeDefined();
    expect(CommonSLOs.STANDARD_AVAILABILITY.name).toBe('standard-availability');
    expect(CommonSLOs.STANDARD_AVAILABILITY.target).toBe(0.995);
    expect(CommonSLOs.STANDARD_AVAILABILITY.description).toContain('99.5%');
  });

  it('should provide BASIC_AVAILABILITY config', () => {
    expect(CommonSLOs.BASIC_AVAILABILITY).toBeDefined();
    expect(CommonSLOs.BASIC_AVAILABILITY.name).toBe('basic-availability');
    expect(CommonSLOs.BASIC_AVAILABILITY.target).toBe(0.99);
    expect(CommonSLOs.BASIC_AVAILABILITY.description).toContain('99%');
  });

  it('should provide AI_OPERATION_SUCCESS config', () => {
    expect(CommonSLOs.AI_OPERATION_SUCCESS).toBeDefined();
    expect(CommonSLOs.AI_OPERATION_SUCCESS.name).toBe('ai-operation-success');
    expect(CommonSLOs.AI_OPERATION_SUCCESS.target).toBe(0.95);
    expect(CommonSLOs.AI_OPERATION_SUCCESS.windowSeconds).toBe(24 * 60 * 60);
    expect(CommonSLOs.AI_OPERATION_SUCCESS.description).toContain('95%');
  });

  it('should be usable with SLOTracker', () => {
    const tracker = new SLOTracker(CommonSLOs.HIGH_AVAILABILITY);
    expect(tracker).toBeDefined();

    tracker.recordSuccess();
    expect(tracker.isHealthy()).toBe(true);

    tracker.destroy();
  });

  it('should be usable with SLORegistry', () => {
    const registry = new SLORegistry();

    registry.register(CommonSLOs.HIGH_AVAILABILITY);
    registry.register(CommonSLOs.STANDARD_AVAILABILITY);
    registry.register(CommonSLOs.BASIC_AVAILABILITY);
    registry.register(CommonSLOs.AI_OPERATION_SUCCESS);

    const all = registry.getAll();
    expect(all.size).toBe(4);

    registry.clear();
  });
});
