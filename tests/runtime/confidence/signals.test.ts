// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - Signal Extractor Tests
// Comprehensive tests for quality signal extraction
// ═══════════════════════════════════════════════════════════════════════════════

import { SignalExtractor } from '../../../src/runtime/confidence/signals';
import type {
  ExecutionContext,
  ScoredResponse,
} from '../../../src/runtime/confidence/types';
import type { PerformanceDataPoint } from '../../../src/runtime/analytics/types';

describe('SignalExtractor', () => {
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

  describe('extractSignals', () => {
    it('should extract all signals from response and context', () => {
      const signals = SignalExtractor.extractSignals(
        mockResponse,
        mockContext,
        mockHistory
      );

      expect(signals).toHaveProperty('providerConfidence');
      expect(signals).toHaveProperty('responseLength');
      expect(signals).toHaveProperty('structureQuality');
      expect(signals).toHaveProperty('coherenceScore');
      expect(signals).toHaveProperty('providerReliability');
      expect(signals).toHaveProperty('similarTaskPerformance');
      expect(signals).toHaveProperty('tokenEfficiency');
      expect(signals).toHaveProperty('latencyScore');
      expect(signals).toHaveProperty('costScore');
      expect(signals).toHaveProperty('messageComplexity');
      expect(signals).toHaveProperty('domainMatch');
    });

    it('should include provider confidence from response', () => {
      const signals = SignalExtractor.extractSignals(
        mockResponse,
        mockContext,
        mockHistory
      );

      expect(signals.providerConfidence).toBe(0.9);
    });

    it('should compute signals within [0, 1] range', () => {
      const signals = SignalExtractor.extractSignals(
        mockResponse,
        mockContext,
        mockHistory
      );

      Object.entries(signals).forEach(([key, value]) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('response length scoring', () => {
    it('should score optimal length responses highly', () => {
      const optimalResponse: ScoredResponse = {
        content: 'A'.repeat(500), // Optimal range: 100-2000 chars
        providerConfidence: 0.9,
        metadata: {},
      };

      const signals = SignalExtractor.extractSignals(
        optimalResponse,
        mockContext,
        mockHistory
      );

      expect(signals.responseLength).toBeGreaterThan(0.9);
    });

    it('should penalize very short responses', () => {
      const shortResponse: ScoredResponse = {
        content: 'OK',
        providerConfidence: 0.9,
        metadata: {},
      };

      const signals = SignalExtractor.extractSignals(
        shortResponse,
        mockContext,
        mockHistory
      );

      expect(signals.responseLength).toBeLessThan(0.8);
    });

    it('should penalize very long responses', () => {
      const longResponse: ScoredResponse = {
        content: 'A'.repeat(10000),
        providerConfidence: 0.9,
        metadata: {},
      };

      const signals = SignalExtractor.extractSignals(
        longResponse,
        mockContext,
        mockHistory
      );

      expect(signals.responseLength).toBeLessThan(0.9);
    });
  });

  describe('structure quality assessment', () => {
    it('should detect valid JSON structure', () => {
      const jsonResponse: ScoredResponse = {
        content: '{"status": "success", "data": [1, 2, 3]}',
        providerConfidence: 0.9,
        metadata: {},
      };

      const signals = SignalExtractor.extractSignals(
        jsonResponse,
        mockContext,
        mockHistory
      );

      expect(signals.structureQuality).toBeGreaterThan(0.7);
    });

    it('should detect markdown formatting', () => {
      const markdownResponse: ScoredResponse = {
        content: '# Title\n\n**Bold text** and `code` example.',
        providerConfidence: 0.9,
        metadata: {},
      };

      const signals = SignalExtractor.extractSignals(
        markdownResponse,
        mockContext,
        mockHistory
      );

      expect(signals.structureQuality).toBeGreaterThan(0.5);
    });

    it('should detect code blocks', () => {
      const codeResponse: ScoredResponse = {
        content: '```typescript\nconst x = 1;\n```',
        providerConfidence: 0.9,
        metadata: {},
      };

      const signals = SignalExtractor.extractSignals(
        codeResponse,
        mockContext,
        mockHistory
      );

      expect(signals.structureQuality).toBeGreaterThan(0.5);
    });

    it('should handle plain text', () => {
      const plainResponse: ScoredResponse = {
        content: 'This is plain text without any special formatting.',
        providerConfidence: 0.9,
        metadata: {},
      };

      const signals = SignalExtractor.extractSignals(
        plainResponse,
        mockContext,
        mockHistory
      );

      expect(signals.structureQuality).toBeGreaterThan(0);
      expect(signals.structureQuality).toBeLessThanOrEqual(1);
    });
  });

  describe('coherence assessment', () => {
    it('should detect complete sentences', () => {
      const coherentResponse: ScoredResponse = {
        content:
          'This is a complete sentence. Here is another one. And a third sentence.',
        providerConfidence: 0.9,
        metadata: {},
      };

      const signals = SignalExtractor.extractSignals(
        coherentResponse,
        mockContext,
        mockHistory
      );

      expect(signals.coherenceScore).toBeGreaterThan(0.5);
    });

    it('should detect logical connectors', () => {
      const logicalResponse: ScoredResponse = {
        content:
          'The first point is valid. However, we must consider alternatives. Therefore, the conclusion is clear.',
        providerConfidence: 0.9,
        metadata: {},
      };

      const signals = SignalExtractor.extractSignals(
        logicalResponse,
        mockContext,
        mockHistory
      );

      expect(signals.coherenceScore).toBeGreaterThan(0.6);
    });

    it('should detect paragraph structure', () => {
      const paragraphResponse: ScoredResponse = {
        content:
          'First paragraph with sufficient content to be meaningful.\n\nSecond paragraph also has enough content.',
        providerConfidence: 0.9,
        metadata: {},
      };

      const signals = SignalExtractor.extractSignals(
        paragraphResponse,
        mockContext,
        mockHistory
      );

      expect(signals.coherenceScore).toBeGreaterThan(0.6);
    });

    it('should penalize excessive repetition', () => {
      const repetitiveResponse: ScoredResponse = {
        content: 'test test test test test test test test test test',
        providerConfidence: 0.9,
        metadata: {},
      };

      const signals = SignalExtractor.extractSignals(
        repetitiveResponse,
        mockContext,
        mockHistory
      );

      expect(signals.coherenceScore).toBeLessThan(0.8);
    });
  });

  describe('provider reliability from history', () => {
    it('should return neutral score with no history', () => {
      const signals = SignalExtractor.extractSignals(
        mockResponse,
        mockContext,
        []
      );

      expect(signals.providerReliability).toBe(0.7);
    });

    it('should compute average from provider history', () => {
      const history: PerformanceDataPoint[] = [
        {
          timestamp: Date.now(),
          personaId: 'test',
          providerId: 'test-provider',
          confidence: 0.9,
          latency: 1000,
          tokensUsed: 100,
          cost: 0.001,
          success: true,
          context: { messageType: 'general' },
        },
        {
          timestamp: Date.now(),
          personaId: 'test',
          providerId: 'test-provider',
          confidence: 0.8,
          latency: 1000,
          tokensUsed: 100,
          cost: 0.001,
          success: true,
          context: { messageType: 'general' },
        },
      ];

      const signals = SignalExtractor.extractSignals(
        mockResponse,
        mockContext,
        history
      );

      expect(signals.providerReliability).toBeCloseTo(0.85);
    });

    it('should filter by provider ID', () => {
      const history: PerformanceDataPoint[] = [
        {
          timestamp: Date.now(),
          personaId: 'test',
          providerId: 'test-provider',
          confidence: 0.9,
          latency: 1000,
          tokensUsed: 100,
          cost: 0.001,
          success: true,
          context: { messageType: 'general' },
        },
        {
          timestamp: Date.now(),
          personaId: 'test',
          providerId: 'other-provider',
          confidence: 0.3,
          latency: 1000,
          tokensUsed: 100,
          cost: 0.001,
          success: true,
          context: { messageType: 'general' },
        },
      ];

      const signals = SignalExtractor.extractSignals(
        mockResponse,
        mockContext,
        history
      );

      expect(signals.providerReliability).toBeCloseTo(0.9);
    });
  });

  describe('similar task performance', () => {
    it('should return neutral score with no similar tasks', () => {
      const signals = SignalExtractor.extractSignals(
        mockResponse,
        mockContext,
        []
      );

      expect(signals.similarTaskPerformance).toBe(0.6);
    });

    it('should filter by domain/message type', () => {
      const history: PerformanceDataPoint[] = [
        {
          timestamp: Date.now(),
          personaId: 'test',
          providerId: 'test',
          confidence: 0.9,
          latency: 1000,
          tokensUsed: 100,
          cost: 0.001,
          success: true,
          context: { messageType: 'general', complexity: 0.5 },
        },
        {
          timestamp: Date.now(),
          personaId: 'test',
          providerId: 'test',
          confidence: 0.3,
          latency: 1000,
          tokensUsed: 100,
          cost: 0.001,
          success: true,
          context: { messageType: 'other', complexity: 0.5 },
        },
      ];

      const signals = SignalExtractor.extractSignals(
        mockResponse,
        mockContext,
        history
      );

      expect(signals.similarTaskPerformance).toBeCloseTo(0.9);
    });

    it('should filter by complexity range', () => {
      const history: PerformanceDataPoint[] = [
        {
          timestamp: Date.now(),
          personaId: 'test',
          providerId: 'test',
          confidence: 0.9,
          latency: 1000,
          tokensUsed: 100,
          cost: 0.001,
          success: true,
          context: { messageType: 'general', complexity: 0.5 },
        },
        {
          timestamp: Date.now(),
          personaId: 'test',
          providerId: 'test',
          confidence: 0.3,
          latency: 1000,
          tokensUsed: 100,
          cost: 0.001,
          success: true,
          context: { messageType: 'general', complexity: 0.9 },
        },
      ];

      const signals = SignalExtractor.extractSignals(
        mockResponse,
        mockContext,
        history
      );

      expect(signals.similarTaskPerformance).toBeCloseTo(0.9);
    });
  });

  describe('token efficiency', () => {
    it('should score optimal ratio highly', () => {
      const optimalContext: ExecutionContext = {
        ...mockContext,
        tokens: {
          input: 100,
          output: 150, // Ratio: 1.5 (optimal range: 0.5-3.0)
        },
      };

      const signals = SignalExtractor.extractSignals(
        mockResponse,
        optimalContext,
        mockHistory
      );

      expect(signals.tokenEfficiency).toBe(1);
    });

    it('should penalize very low output', () => {
      const lowOutputContext: ExecutionContext = {
        ...mockContext,
        tokens: {
          input: 100,
          output: 5, // Ratio: 0.05
        },
      };

      const signals = SignalExtractor.extractSignals(
        mockResponse,
        lowOutputContext,
        mockHistory
      );

      expect(signals.tokenEfficiency).toBeLessThan(0.5);
    });

    it('should penalize excessive output', () => {
      const highOutputContext: ExecutionContext = {
        ...mockContext,
        tokens: {
          input: 100,
          output: 1500, // Ratio: 15
        },
      };

      const signals = SignalExtractor.extractSignals(
        mockResponse,
        highOutputContext,
        mockHistory
      );

      expect(signals.tokenEfficiency).toBeLessThan(0.8);
    });

    it('should handle zero input gracefully', () => {
      const zeroInputContext: ExecutionContext = {
        ...mockContext,
        tokens: {
          input: 0,
          output: 100,
        },
      };

      const signals = SignalExtractor.extractSignals(
        mockResponse,
        zeroInputContext,
        mockHistory
      );

      expect(signals.tokenEfficiency).toBe(0.5);
    });
  });

  describe('latency normalization', () => {
    it('should score optimal latency highly', () => {
      const optimalContext: ExecutionContext = {
        ...mockContext,
        duration: 2000, // 2s (optimal: 100ms-5s)
      };

      const signals = SignalExtractor.extractSignals(
        mockResponse,
        optimalContext,
        mockHistory
      );

      expect(signals.latencyScore).toBe(1);
    });

    it('should penalize very fast responses as suspicious', () => {
      const fastContext: ExecutionContext = {
        ...mockContext,
        duration: 10, // 10ms
      };

      const signals = SignalExtractor.extractSignals(
        mockResponse,
        fastContext,
        mockHistory
      );

      expect(signals.latencyScore).toBeLessThan(1);
    });

    it('should penalize very slow responses', () => {
      const slowContext: ExecutionContext = {
        ...mockContext,
        duration: 40000, // 40s
      };

      const signals = SignalExtractor.extractSignals(
        mockResponse,
        slowContext,
        mockHistory
      );

      expect(signals.latencyScore).toBeLessThan(0.5);
    });
  });

  describe('cost normalization', () => {
    it('should score low cost highly', () => {
      const lowCostContext: ExecutionContext = {
        ...mockContext,
        cost: 0.001, // $0.001
      };

      const signals = SignalExtractor.extractSignals(
        mockResponse,
        lowCostContext,
        mockHistory
      );

      expect(signals.costScore).toBeGreaterThan(0.8);
    });

    it('should penalize very high cost', () => {
      const highCostContext: ExecutionContext = {
        ...mockContext,
        cost: 15, // $15
      };

      const signals = SignalExtractor.extractSignals(
        mockResponse,
        highCostContext,
        mockHistory
      );

      expect(signals.costScore).toBeLessThan(0.5);
    });

    it('should handle suspiciously cheap responses', () => {
      const freeCostContext: ExecutionContext = {
        ...mockContext,
        cost: 0.00001, // Too cheap
      };

      const signals = SignalExtractor.extractSignals(
        mockResponse,
        freeCostContext,
        mockHistory
      );

      expect(signals.costScore).toBeLessThan(1);
    });
  });

  describe('message complexity assessment', () => {
    it('should detect code blocks in message', () => {
      const complexContext: ExecutionContext = {
        ...mockContext,
        message: {
          content: '```typescript\nconst x = 1;\n```',
          role: 'user',
        },
      };

      const signals = SignalExtractor.extractSignals(
        mockResponse,
        complexContext,
        mockHistory
      );

      expect(signals.messageComplexity).toBeGreaterThan(0);
    });

    it('should detect math expressions', () => {
      const mathContext: ExecutionContext = {
        ...mockContext,
        message: {
          content: 'Calculate $x^2 + y^2 = z^2$',
          role: 'user',
        },
      };

      const signals = SignalExtractor.extractSignals(
        mockResponse,
        mathContext,
        mockHistory
      );

      expect(signals.messageComplexity).toBeGreaterThan(0);
    });

    it('should detect long content', () => {
      const longContext: ExecutionContext = {
        ...mockContext,
        message: {
          content: 'A'.repeat(3000),
          role: 'user',
        },
      };

      const signals = SignalExtractor.extractSignals(
        mockResponse,
        longContext,
        mockHistory
      );

      expect(signals.messageComplexity).toBeGreaterThan(0);
    });

    it('should detect structured data', () => {
      const structuredContext: ExecutionContext = {
        ...mockContext,
        message: {
          content: '{"key": "value"}',
          role: 'user',
        },
      };

      const signals = SignalExtractor.extractSignals(
        mockResponse,
        structuredContext,
        mockHistory
      );

      expect(signals.messageComplexity).toBeGreaterThan(0);
    });

    it('should handle simple messages', () => {
      const simpleContext: ExecutionContext = {
        ...mockContext,
        message: {
          content: 'Hello',
          role: 'user',
        },
      };

      const signals = SignalExtractor.extractSignals(
        mockResponse,
        simpleContext,
        mockHistory
      );

      expect(signals.messageComplexity).toBeGreaterThanOrEqual(0);
      expect(signals.messageComplexity).toBeLessThanOrEqual(1);
    });
  });

  describe('domain matching', () => {
    it('should score higher when domain is specified', () => {
      const domainContext: ExecutionContext = {
        ...mockContext,
        domain: 'code-review',
      };

      const signals = SignalExtractor.extractSignals(
        mockResponse,
        domainContext,
        mockHistory
      );

      expect(signals.domainMatch).toBe(0.8);
    });

    it('should score neutral when domain is missing', () => {
      const noDomainContext: ExecutionContext = {
        ...mockContext,
        domain: undefined,
      };

      const signals = SignalExtractor.extractSignals(
        mockResponse,
        noDomainContext,
        mockHistory
      );

      expect(signals.domainMatch).toBe(0.6);
    });
  });
});
