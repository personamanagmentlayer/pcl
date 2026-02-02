// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - Confidence Scorer Tests
// Comprehensive tests for confidence scoring engine
// ═══════════════════════════════════════════════════════════════════════════════

import { ConfidenceScorer } from '../../../src/runtime/confidence/scorer';
import type {
  ConfidenceConfig,
  ExecutionContext,
  ScoredResponse,
} from '../../../src/runtime/confidence/types';
import { DEFAULT_CONFIDENCE_WEIGHTS } from '../../../src/runtime/confidence/types';
import type { PerformanceDataPoint } from '../../../src/runtime/analytics/types';

describe('ConfidenceScorer', () => {
  let scorer: ConfidenceScorer;
  let config: ConfidenceConfig;

  // Mock response data
  const mockResponse: ScoredResponse = {
    content: 'This is a test response with reasonable length and structure.',
    providerConfidence: 0.9,
    metadata: {},
  };

  // Mock context data
  const mockContext: ExecutionContext = {
    personaId: 'test-persona',
    providerId: 'test-provider',
    domain: 'general',
    complexity: 0.5,
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

  // Mock history
  const mockHistory: PerformanceDataPoint[] = [
    {
      timestamp: Date.now() - 3600000,
      personaId: 'test-persona',
      providerId: 'test-provider',
      confidence: 0.85,
      latency: 1200,
      tokensUsed: 150,
      cost: 0.0015,
      success: true,
      context: {
        messageType: 'general',
        complexity: 0.5,
      },
    },
  ];

  beforeEach(() => {
    config = {
      enabled: true,
      signals: [],
      calibration: false,
      weights: DEFAULT_CONFIDENCE_WEIGHTS,
    };
    scorer = new ConfidenceScorer(config);
  });

  describe('initialization', () => {
    it('should create scorer with config', () => {
      expect(scorer).toBeDefined();
      expect(scorer).toBeInstanceOf(ConfidenceScorer);
    });

    it('should accept enabled config', () => {
      const enabledConfig: ConfidenceConfig = {
        enabled: true,
        signals: [],
        calibration: false,
        weights: DEFAULT_CONFIDENCE_WEIGHTS,
      };
      const enabledScorer = new ConfidenceScorer(enabledConfig);
      expect(enabledScorer).toBeDefined();
    });

    it('should accept disabled config', () => {
      const disabledConfig: ConfidenceConfig = {
        enabled: false,
        signals: [],
        calibration: false,
        weights: DEFAULT_CONFIDENCE_WEIGHTS,
      };
      const disabledScorer = new ConfidenceScorer(disabledConfig);
      expect(disabledScorer).toBeDefined();
    });

    it('should accept calibration enabled', () => {
      const calibrationConfig: ConfidenceConfig = {
        enabled: true,
        signals: [],
        calibration: true,
        weights: DEFAULT_CONFIDENCE_WEIGHTS,
      };
      const calibrationScorer = new ConfidenceScorer(calibrationConfig);
      expect(calibrationScorer).toBeDefined();
    });
  });

  describe('computeConfidence', () => {
    it('should return default confidence when disabled', () => {
      const disabledScorer = new ConfidenceScorer({
        enabled: false,
        signals: [],
        calibration: false,
        weights: DEFAULT_CONFIDENCE_WEIGHTS,
      });

      const confidence = disabledScorer.computeConfidence(
        mockResponse,
        mockContext,
        mockHistory
      );

      expect(confidence).toBe(0.8);
    });

    it('should compute confidence from signals when enabled', () => {
      const confidence = scorer.computeConfidence(
        mockResponse,
        mockContext,
        mockHistory
      );

      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should handle responses with high provider confidence', () => {
      const highConfResponse: ScoredResponse = {
        ...mockResponse,
        providerConfidence: 0.95,
      };

      const confidence = scorer.computeConfidence(
        highConfResponse,
        mockContext,
        mockHistory
      );

      expect(confidence).toBeGreaterThan(0.7);
    });

    it('should normalize confidence to [0, 1] range', () => {
      const confidence = scorer.computeConfidence(
        mockResponse,
        mockContext,
        mockHistory
      );

      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should handle responses with low provider confidence', () => {
      const lowConfResponse: ScoredResponse = {
        ...mockResponse,
        providerConfidence: 0.3,
      };

      const confidence = scorer.computeConfidence(
        lowConfResponse,
        mockContext,
        mockHistory
      );

      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThan(0.8);
    });

    it('should handle very short responses', () => {
      const shortResponse: ScoredResponse = {
        content: 'OK',
        providerConfidence: 0.9,
        metadata: {},
      };

      const confidence = scorer.computeConfidence(
        shortResponse,
        mockContext,
        mockHistory
      );

      expect(confidence).toBeGreaterThan(0);
    });

    it('should handle very long responses', () => {
      const longResponse: ScoredResponse = {
        content: 'A'.repeat(10000),
        providerConfidence: 0.9,
        metadata: {},
      };

      const confidence = scorer.computeConfidence(
        longResponse,
        mockContext,
        mockHistory
      );

      expect(confidence).toBeGreaterThan(0);
    });
  });

  describe('recordOutcome', () => {
    it('should record outcome when calibration enabled', () => {
      const calibrationScorer = new ConfidenceScorer({
        enabled: true,
        signals: [],
        calibration: true,
        weights: DEFAULT_CONFIDENCE_WEIGHTS,
      });

      expect(() => {
        calibrationScorer.recordOutcome('test-persona', 0.8, 0.85);
      }).not.toThrow();
    });

    it('should handle multiple outcomes', () => {
      const calibrationScorer = new ConfidenceScorer({
        enabled: true,
        signals: [],
        calibration: true,
        weights: DEFAULT_CONFIDENCE_WEIGHTS,
      });

      expect(() => {
        calibrationScorer.recordOutcome('test-persona', 0.8, 0.85);
        calibrationScorer.recordOutcome('test-persona', 0.75, 0.8);
        calibrationScorer.recordOutcome('test-persona', 0.9, 0.88);
      }).not.toThrow();
    });
  });

  describe('getCalibrationStats', () => {
    it('should return calibration stats', () => {
      const stats = scorer.getCalibrationStats('test-persona');

      expect(stats).toHaveProperty('dataPoints');
      expect(stats).toHaveProperty('avgError');
      expect(stats).toHaveProperty('calibrationQuality');
      expect(typeof stats.dataPoints).toBe('number');
      expect(typeof stats.avgError).toBe('number');
      expect(typeof stats.calibrationQuality).toBe('number');
    });

    it('should return zero stats for new persona', () => {
      const stats = scorer.getCalibrationStats('new-persona');

      expect(stats.dataPoints).toBe(0);
      expect(stats.avgError).toBe(0);
      expect(stats.calibrationQuality).toBe(0);
    });

    it('should handle stats after recording outcomes', () => {
      const calibrationScorer = new ConfidenceScorer({
        enabled: true,
        signals: [],
        calibration: true,
        weights: DEFAULT_CONFIDENCE_WEIGHTS,
      });

      calibrationScorer.recordOutcome('test-persona', 0.8, 0.85);
      calibrationScorer.recordOutcome('test-persona', 0.75, 0.8);

      const stats = calibrationScorer.getCalibrationStats('test-persona');
      expect(stats.dataPoints).toBeGreaterThan(0);
    });
  });

  describe('clearCalibration', () => {
    it('should clear all calibration data', () => {
      const calibrationScorer = new ConfidenceScorer({
        enabled: true,
        signals: [],
        calibration: true,
        weights: DEFAULT_CONFIDENCE_WEIGHTS,
      });

      calibrationScorer.recordOutcome('persona1', 0.8, 0.85);
      calibrationScorer.recordOutcome('persona2', 0.75, 0.8);

      calibrationScorer.clearCalibration();

      const stats1 = calibrationScorer.getCalibrationStats('persona1');
      const stats2 = calibrationScorer.getCalibrationStats('persona2');

      expect(stats1.dataPoints).toBe(0);
      expect(stats2.dataPoints).toBe(0);
    });

    it('should clear calibration for specific persona', () => {
      const calibrationScorer = new ConfidenceScorer({
        enabled: true,
        signals: [],
        calibration: true,
        weights: DEFAULT_CONFIDENCE_WEIGHTS,
      });

      calibrationScorer.recordOutcome('persona1', 0.8, 0.85);
      calibrationScorer.recordOutcome('persona2', 0.75, 0.8);

      calibrationScorer.clearCalibration('persona1');

      const stats1 = calibrationScorer.getCalibrationStats('persona1');
      const stats2 = calibrationScorer.getCalibrationStats('persona2');

      expect(stats1.dataPoints).toBe(0);
      expect(stats2.dataPoints).toBeGreaterThan(0);
    });

    it('should handle clearing non-existent persona', () => {
      expect(() => {
        scorer.clearCalibration('non-existent');
      }).not.toThrow();
    });
  });

  describe('exportCalibration', () => {
    it('should export calibration data', () => {
      const data = scorer.exportCalibration();
      expect(data).toBeDefined();
      expect(data instanceof Map).toBe(true);
    });

    it('should export empty data for new scorer', () => {
      const data = scorer.exportCalibration();
      expect(data.size).toBe(0);
    });

    it('should export data after recording', () => {
      const calibrationScorer = new ConfidenceScorer({
        enabled: true,
        signals: [],
        calibration: true,
        weights: DEFAULT_CONFIDENCE_WEIGHTS,
      });

      calibrationScorer.recordOutcome('test-persona', 0.8, 0.85);
      const data = calibrationScorer.exportCalibration();

      expect(data.size).toBeGreaterThan(0);
    });
  });

  describe('importCalibration', () => {
    it('should import calibration data', () => {
      const exportData = new Map();
      exportData.set('test-persona', [
        {
          predicted: 0.8,
          actual: 0.85,
          timestamp: Date.now(),
        },
      ]);

      expect(() => {
        scorer.importCalibration(exportData);
      }).not.toThrow();

      const stats = scorer.getCalibrationStats('test-persona');
      expect(stats.dataPoints).toBeGreaterThan(0);
    });

    it('should handle empty import', () => {
      const emptyData = new Map();

      expect(() => {
        scorer.importCalibration(emptyData);
      }).not.toThrow();
    });
  });

  describe('signal weighting', () => {
    it('should use custom weights when provided', () => {
      const customWeights = {
        providerConfidence: 0.5,
        responseLength: 0.05,
        structureQuality: 0.05,
        coherenceScore: 0.05,
        providerReliability: 0.05,
        similarTaskPerformance: 0.05,
        tokenEfficiency: 0.05,
        latencyScore: 0.05,
        costScore: 0.05,
        messageComplexity: 0.05,
        domainMatch: 0.05,
      };

      const customScorer = new ConfidenceScorer({
        enabled: true,
        signals: [],
        calibration: false,
        weights: customWeights,
      });

      const confidence = customScorer.computeConfidence(
        mockResponse,
        mockContext,
        mockHistory
      );

      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should handle responses with structured content', () => {
      const structuredResponse: ScoredResponse = {
        content: '```json\n{"status": "success"}\n```',
        providerConfidence: 0.9,
        metadata: {},
      };

      const confidence = scorer.computeConfidence(
        structuredResponse,
        mockContext,
        mockHistory
      );

      expect(confidence).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty history', () => {
      const confidence = scorer.computeConfidence(
        mockResponse,
        mockContext,
        []
      );

      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should handle high message complexity', () => {
      const complexContext: ExecutionContext = {
        ...mockContext,
        complexity: 0.9,
        message: {
          content: '```typescript\nconst x = 1;\n```\n\nComplex message',
          role: 'user',
        },
      };

      const confidence = scorer.computeConfidence(
        mockResponse,
        complexContext,
        mockHistory
      );

      expect(confidence).toBeGreaterThan(0);
    });

    it('should handle missing optional context fields', () => {
      const minimalContext: ExecutionContext = {
        personaId: 'test',
        providerId: 'test',
        message: {
          content: 'test',
          role: 'user',
        },
        tokens: {
          input: 10,
          output: 5,
        },
        duration: 100,
        cost: 0.0001,
      };

      const confidence = scorer.computeConfidence(
        mockResponse,
        minimalContext,
        []
      );

      expect(confidence).toBeGreaterThan(0);
    });

    it('should handle zero tokens input', () => {
      const zeroTokenContext: ExecutionContext = {
        ...mockContext,
        tokens: {
          input: 0,
          output: 100,
        },
      };

      const confidence = scorer.computeConfidence(
        mockResponse,
        zeroTokenContext,
        mockHistory
      );

      expect(confidence).toBeGreaterThan(0);
    });

    it('should handle very high latency', () => {
      const highLatencyContext: ExecutionContext = {
        ...mockContext,
        duration: 50000,
      };

      const confidence = scorer.computeConfidence(
        mockResponse,
        highLatencyContext,
        mockHistory
      );

      expect(confidence).toBeGreaterThan(0);
    });

    it('should handle very high cost', () => {
      const highCostContext: ExecutionContext = {
        ...mockContext,
        cost: 5,
      };

      const confidence = scorer.computeConfidence(
        mockResponse,
        highCostContext,
        mockHistory
      );

      expect(confidence).toBeGreaterThan(0);
    });
  });

  describe('calibration mode', () => {
    it('should apply calibration when enabled', () => {
      const calibrationScorer = new ConfidenceScorer({
        enabled: true,
        signals: [],
        calibration: true,
        weights: DEFAULT_CONFIDENCE_WEIGHTS,
      });

      // Record some outcomes
      calibrationScorer.recordOutcome('test-persona', 0.8, 0.9);
      calibrationScorer.recordOutcome('test-persona', 0.75, 0.85);
      calibrationScorer.recordOutcome('test-persona', 0.85, 0.92);
      calibrationScorer.recordOutcome('test-persona', 0.78, 0.88);
      calibrationScorer.recordOutcome('test-persona', 0.82, 0.91);

      const confidence = calibrationScorer.computeConfidence(
        mockResponse,
        mockContext,
        mockHistory
      );

      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should not apply calibration when disabled', () => {
      const confidence1 = scorer.computeConfidence(
        mockResponse,
        mockContext,
        mockHistory
      );

      scorer.recordOutcome('test-persona', 0.8, 0.9);

      const confidence2 = scorer.computeConfidence(
        mockResponse,
        mockContext,
        mockHistory
      );

      // Should be similar since calibration is disabled
      expect(Math.abs(confidence1 - confidence2)).toBeLessThan(0.01);
    });
  });
});
