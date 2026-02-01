// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - Confidence Calibration Tests
// Comprehensive tests for confidence calibration
// ═══════════════════════════════════════════════════════════════════════════════

import { ConfidenceCalibrator } from '../../../src/runtime/confidence/calibration';
import type { ExecutionContext } from '../../../src/runtime/confidence/types';

describe('ConfidenceCalibrator', () => {
  let calibrator: ConfidenceCalibrator;

  const mockContext: ExecutionContext = {
    personaId: 'test-persona',
    providerId: 'test-provider',
    message: {
      content: 'Test message',
      role: 'user',
    },
    tokens: {
      input: 100,
      output: 50,
    },
    duration: 1000,
    cost: 0.001,
  };

  beforeEach(() => {
    calibrator = new ConfidenceCalibrator();
  });

  describe('initialization', () => {
    it('should create calibrator instance', () => {
      expect(calibrator).toBeDefined();
      expect(calibrator).toBeInstanceOf(ConfidenceCalibrator);
    });

    it('should start with empty calibration data', () => {
      const stats = calibrator.getCalibrationStats('any-persona');
      expect(stats.dataPoints).toBe(0);
      expect(stats.avgError).toBe(0);
      expect(stats.calibrationQuality).toBe(0);
    });
  });

  describe('calibrate', () => {
    it('should return raw confidence with no data', () => {
      const rawConfidence = 0.8;
      const calibrated = calibrator.calibrate(rawConfidence, mockContext);

      expect(calibrated).toBe(rawConfidence);
    });

    it('should return raw confidence with insufficient data', () => {
      calibrator.recordOutcome('test-persona', 0.8, 0.85);
      calibrator.recordOutcome('test-persona', 0.75, 0.8);
      calibrator.recordOutcome('test-persona', 0.9, 0.88);

      const calibrated = calibrator.calibrate(0.8, mockContext);
      expect(calibrated).toBe(0.8); // Need 5+ similar points
    });

    it('should apply calibration correction with sufficient data', () => {
      // Record outcomes showing systematic underconfidence
      for (let i = 0; i < 10; i++) {
        calibrator.recordOutcome('test-persona', 0.8, 0.9);
      }

      const calibrated = calibrator.calibrate(0.8, mockContext);

      // Should adjust upward since actual > predicted
      expect(calibrated).toBeGreaterThan(0.8);
    });

    it('should apply downward correction for overconfidence', () => {
      // Record outcomes showing systematic overconfidence
      for (let i = 0; i < 10; i++) {
        calibrator.recordOutcome('test-persona', 0.9, 0.7);
      }

      const calibrated = calibrator.calibrate(0.9, mockContext);

      // Should adjust downward since actual < predicted
      expect(calibrated).toBeLessThan(0.9);
    });

    it('should clamp calibrated values to [0, 1] range', () => {
      // Create extreme correction scenario
      for (let i = 0; i < 10; i++) {
        calibrator.recordOutcome('test-persona', 0.1, 0.95);
      }

      const calibrated = calibrator.calibrate(0.1, mockContext);

      expect(calibrated).toBeGreaterThanOrEqual(0);
      expect(calibrated).toBeLessThanOrEqual(1);
    });

    it('should use conservative 50% correction factor', () => {
      // Record perfect data: predicted 0.8, actual 0.9 (difference: 0.1)
      for (let i = 0; i < 10; i++) {
        calibrator.recordOutcome('test-persona', 0.8, 0.9);
      }

      const calibrated = calibrator.calibrate(0.8, mockContext);

      // Should apply 50% of 0.1 difference = 0.05
      expect(calibrated).toBeCloseTo(0.85, 1);
    });

    it('should filter by similar confidence ranges', () => {
      // Record data for different confidence ranges
      for (let i = 0; i < 10; i++) {
        calibrator.recordOutcome('test-persona', 0.8, 0.9); // High confidence
        calibrator.recordOutcome('test-persona', 0.3, 0.4); // Low confidence
      }

      // Calibrate high confidence value
      const highCalibrated = calibrator.calibrate(0.8, mockContext);
      expect(highCalibrated).toBeGreaterThan(0.8);

      // Calibrate low confidence value
      const lowCalibrated = calibrator.calibrate(0.3, mockContext);
      expect(lowCalibrated).toBeGreaterThan(0.3);
    });

    it('should be persona-specific', () => {
      const persona1Context: ExecutionContext = {
        ...mockContext,
        personaId: 'persona-1',
      };
      const persona2Context: ExecutionContext = {
        ...mockContext,
        personaId: 'persona-2',
      };

      // Persona 1: underconfident
      for (let i = 0; i < 10; i++) {
        calibrator.recordOutcome('persona-1', 0.8, 0.9);
      }

      // Persona 2: overconfident
      for (let i = 0; i < 10; i++) {
        calibrator.recordOutcome('persona-2', 0.9, 0.7);
      }

      const persona1Calibrated = calibrator.calibrate(0.8, persona1Context);
      const persona2Calibrated = calibrator.calibrate(0.9, persona2Context);

      expect(persona1Calibrated).toBeGreaterThan(0.8);
      expect(persona2Calibrated).toBeLessThan(0.9);
    });
  });

  describe('recordOutcome', () => {
    it('should record single outcome', () => {
      calibrator.recordOutcome('test-persona', 0.8, 0.85);

      const stats = calibrator.getCalibrationStats('test-persona');
      expect(stats.dataPoints).toBe(1);
    });

    it('should record multiple outcomes', () => {
      calibrator.recordOutcome('test-persona', 0.8, 0.85);
      calibrator.recordOutcome('test-persona', 0.75, 0.8);
      calibrator.recordOutcome('test-persona', 0.9, 0.88);

      const stats = calibrator.getCalibrationStats('test-persona');
      expect(stats.dataPoints).toBe(3);
    });

    it('should handle different personas independently', () => {
      calibrator.recordOutcome('persona-1', 0.8, 0.85);
      calibrator.recordOutcome('persona-1', 0.75, 0.8);
      calibrator.recordOutcome('persona-2', 0.9, 0.88);

      const stats1 = calibrator.getCalibrationStats('persona-1');
      const stats2 = calibrator.getCalibrationStats('persona-2');

      expect(stats1.dataPoints).toBe(2);
      expect(stats2.dataPoints).toBe(1);
    });

    it('should limit data points per persona to 1000', () => {
      // Record more than max points
      for (let i = 0; i < 1500; i++) {
        calibrator.recordOutcome('test-persona', 0.8, 0.85);
      }

      const stats = calibrator.getCalibrationStats('test-persona');
      expect(stats.dataPoints).toBeLessThanOrEqual(1000);
    });

    it('should keep most recent points when limit exceeded', () => {
      // Record outcomes with different values
      for (let i = 0; i < 1100; i++) {
        const value = i < 1000 ? 0.5 : 0.9;
        calibrator.recordOutcome('test-persona', value, value);
      }

      const stats = calibrator.getCalibrationStats('test-persona');

      // Should have kept the last 1000 points (which are 0.9)
      // Error should be close to 0 since predicted = actual
      expect(stats.avgError).toBeCloseTo(0, 2);
    });
  });

  describe('getCalibrationStats', () => {
    it('should return zero stats for new persona', () => {
      const stats = calibrator.getCalibrationStats('new-persona');

      expect(stats.dataPoints).toBe(0);
      expect(stats.avgError).toBe(0);
      expect(stats.calibrationQuality).toBe(0);
    });

    it('should compute average error', () => {
      calibrator.recordOutcome('test-persona', 0.8, 0.9); // Error: 0.1
      calibrator.recordOutcome('test-persona', 0.7, 0.8); // Error: 0.1

      const stats = calibrator.getCalibrationStats('test-persona');

      expect(stats.avgError).toBeCloseTo(0.1);
    });

    it('should compute calibration quality', () => {
      // Perfect predictions
      calibrator.recordOutcome('test-persona', 0.8, 0.8); // Error: 0
      calibrator.recordOutcome('test-persona', 0.9, 0.9); // Error: 0

      const stats = calibrator.getCalibrationStats('test-persona');

      expect(stats.calibrationQuality).toBeCloseTo(1); // Perfect quality
    });

    it('should penalize high error in quality score', () => {
      // Poor predictions
      calibrator.recordOutcome('test-persona', 0.8, 0.3); // Error: 0.5
      calibrator.recordOutcome('test-persona', 0.7, 0.2); // Error: 0.5

      const stats = calibrator.getCalibrationStats('test-persona');

      expect(stats.calibrationQuality).toBeLessThan(0.5);
    });

    it('should handle mixed accuracy', () => {
      calibrator.recordOutcome('test-persona', 0.8, 0.85); // Error: 0.05
      calibrator.recordOutcome('test-persona', 0.7, 0.9); // Error: 0.2
      calibrator.recordOutcome('test-persona', 0.9, 0.92); // Error: 0.02

      const stats = calibrator.getCalibrationStats('test-persona');

      expect(stats.dataPoints).toBe(3);
      expect(stats.avgError).toBeGreaterThan(0);
      expect(stats.avgError).toBeLessThan(0.2);
      expect(stats.calibrationQuality).toBeGreaterThan(0);
      expect(stats.calibrationQuality).toBeLessThan(1);
    });

    it('should be persona-specific', () => {
      calibrator.recordOutcome('persona-1', 0.8, 0.8); // Perfect
      calibrator.recordOutcome('persona-2', 0.8, 0.3); // Poor

      const stats1 = calibrator.getCalibrationStats('persona-1');
      const stats2 = calibrator.getCalibrationStats('persona-2');

      expect(stats1.calibrationQuality).toBeGreaterThan(
        stats2.calibrationQuality
      );
    });
  });

  describe('clear', () => {
    beforeEach(() => {
      calibrator.recordOutcome('persona-1', 0.8, 0.85);
      calibrator.recordOutcome('persona-1', 0.75, 0.8);
      calibrator.recordOutcome('persona-2', 0.9, 0.88);
    });

    it('should clear all data when no persona specified', () => {
      calibrator.clear();

      const stats1 = calibrator.getCalibrationStats('persona-1');
      const stats2 = calibrator.getCalibrationStats('persona-2');

      expect(stats1.dataPoints).toBe(0);
      expect(stats2.dataPoints).toBe(0);
    });

    it('should clear specific persona data', () => {
      calibrator.clear('persona-1');

      const stats1 = calibrator.getCalibrationStats('persona-1');
      const stats2 = calibrator.getCalibrationStats('persona-2');

      expect(stats1.dataPoints).toBe(0);
      expect(stats2.dataPoints).toBe(1);
    });

    it('should handle clearing non-existent persona', () => {
      expect(() => {
        calibrator.clear('non-existent');
      }).not.toThrow();

      const stats = calibrator.getCalibrationStats('non-existent');
      expect(stats.dataPoints).toBe(0);
    });

    it('should allow re-recording after clear', () => {
      calibrator.clear('persona-1');
      calibrator.recordOutcome('persona-1', 0.8, 0.85);

      const stats = calibrator.getCalibrationStats('persona-1');
      expect(stats.dataPoints).toBe(1);
    });
  });

  describe('export', () => {
    it('should export empty map for new calibrator', () => {
      const exported = calibrator.export();

      expect(exported).toBeInstanceOf(Map);
      expect(exported.size).toBe(0);
    });

    it('should export calibration data', () => {
      calibrator.recordOutcome('persona-1', 0.8, 0.85);
      calibrator.recordOutcome('persona-2', 0.9, 0.88);

      const exported = calibrator.export();

      expect(exported.size).toBe(2);
      expect(exported.has('persona-1')).toBe(true);
      expect(exported.has('persona-2')).toBe(true);
    });

    it('should export complete calibration points', () => {
      calibrator.recordOutcome('test-persona', 0.8, 0.85);

      const exported = calibrator.export();
      const points = exported.get('test-persona');

      expect(points).toBeDefined();
      expect(points!.length).toBe(1);
      expect(points![0]).toHaveProperty('predicted');
      expect(points![0]).toHaveProperty('actual');
      expect(points![0]).toHaveProperty('timestamp');
      expect(points![0].predicted).toBe(0.8);
      expect(points![0].actual).toBe(0.85);
    });

    it('should create independent copy of data', () => {
      calibrator.recordOutcome('test-persona', 0.8, 0.85);

      const exported = calibrator.export();

      // Modify exported data
      exported.clear();

      // Original should be unchanged
      const stats = calibrator.getCalibrationStats('test-persona');
      expect(stats.dataPoints).toBe(1);
    });
  });

  describe('import', () => {
    it('should import empty data', () => {
      const emptyData = new Map();
      calibrator.import(emptyData);

      const stats = calibrator.getCalibrationStats('any-persona');
      expect(stats.dataPoints).toBe(0);
    });

    it('should import calibration data', () => {
      const data = new Map();
      data.set('persona-1', [
        {
          predicted: 0.8,
          actual: 0.85,
          timestamp: Date.now(),
        },
        {
          predicted: 0.75,
          actual: 0.8,
          timestamp: Date.now(),
        },
      ]);

      calibrator.import(data);

      const stats = calibrator.getCalibrationStats('persona-1');
      expect(stats.dataPoints).toBe(2);
    });

    it('should replace existing data on import', () => {
      calibrator.recordOutcome('persona-1', 0.8, 0.85);
      calibrator.recordOutcome('persona-1', 0.75, 0.8);

      const newData = new Map();
      newData.set('persona-1', [
        {
          predicted: 0.9,
          actual: 0.88,
          timestamp: Date.now(),
        },
      ]);

      calibrator.import(newData);

      const stats = calibrator.getCalibrationStats('persona-1');
      expect(stats.dataPoints).toBe(1);
    });

    it('should work with exported data', () => {
      calibrator.recordOutcome('persona-1', 0.8, 0.85);
      calibrator.recordOutcome('persona-2', 0.9, 0.88);

      const exported = calibrator.export();

      const newCalibrator = new ConfidenceCalibrator();
      newCalibrator.import(exported);

      const stats1 = newCalibrator.getCalibrationStats('persona-1');
      const stats2 = newCalibrator.getCalibrationStats('persona-2');

      expect(stats1.dataPoints).toBe(1);
      expect(stats2.dataPoints).toBe(1);
    });
  });

  describe('round-trip export/import', () => {
    it('should preserve data through export/import cycle', () => {
      // Create calibration data
      for (let i = 0; i < 50; i++) {
        calibrator.recordOutcome('persona-1', 0.8, 0.85);
        calibrator.recordOutcome('persona-2', 0.9, 0.88);
      }

      const originalStats1 = calibrator.getCalibrationStats('persona-1');
      const originalStats2 = calibrator.getCalibrationStats('persona-2');

      // Export and import
      const exported = calibrator.export();
      const newCalibrator = new ConfidenceCalibrator();
      newCalibrator.import(exported);

      const newStats1 = newCalibrator.getCalibrationStats('persona-1');
      const newStats2 = newCalibrator.getCalibrationStats('persona-2');

      expect(newStats1.dataPoints).toBe(originalStats1.dataPoints);
      expect(newStats2.dataPoints).toBe(originalStats2.dataPoints);
      expect(newStats1.avgError).toBeCloseTo(originalStats1.avgError);
      expect(newStats2.avgError).toBeCloseTo(originalStats2.avgError);
    });
  });
});
