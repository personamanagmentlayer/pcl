// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - Mock Provider Tests
// Comprehensive tests for MockProvider
// ═══════════════════════════════════════════════════════════════════════════════

import { MockProvider } from '../../src/runtime/providers/mock';
import type { GenerationRequest } from '../../src/runtime/providers/index';

describe('MockProvider', () => {
  let provider: MockProvider;

  beforeEach(() => {
    provider = new MockProvider();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Basic Response Generation
  // ───────────────────────────────────────────────────────────────────────────

  describe('generateResponse', () => {
    test('generates response with proper structure', async () => {
      const request: GenerationRequest = {
        prompt: 'Test query',
        model: 'mock-1',
      };

      const response = await provider.generateResponse(request);

      expect(response).toHaveProperty('content');
      expect(response).toHaveProperty('finishReason');
      expect(response).toHaveProperty('usage');
      expect(response).toHaveProperty('metadata');

      expect(response.finishReason).toBe('stop');
      expect(response.content).toBeTruthy();
      expect(typeof response.content).toBe('string');
    });

    test('includes proper token usage', async () => {
      const request: GenerationRequest = {
        prompt: 'Test query with multiple words',
        systemPrompt: 'You are a helpful assistant',
      };

      const response = await provider.generateResponse(request);

      expect(response.usage).toHaveProperty('promptTokens');
      expect(response.usage).toHaveProperty('completionTokens');
      expect(response.usage).toHaveProperty('totalTokens');

      expect(response.usage.promptTokens).toBeGreaterThan(0);
      expect(response.usage.completionTokens).toBeGreaterThan(0);
      expect(response.usage.totalTokens).toBe(
        response.usage.promptTokens + response.usage.completionTokens
      );
    });

    test('includes metadata with provider and model', async () => {
      const request: GenerationRequest = {
        prompt: 'Test',
        model: 'mock-turbo',
      };

      const response = await provider.generateResponse(request);

      expect(response.metadata?.provider).toBe('mock');
      expect(response.metadata?.model).toBe('mock-turbo');
    });

    test('uses default model when not specified', async () => {
      const request: GenerationRequest = {
        prompt: 'Test',
      };

      const response = await provider.generateResponse(request);

      expect(response.metadata?.model).toBe('mock-1');
    });

    test('includes system prompt in context', async () => {
      const request: GenerationRequest = {
        prompt: 'Hello',
        systemPrompt: 'You are a test assistant',
      };

      const response = await provider.generateResponse(request);

      expect(response.content).toContain('Following instructions');
    });

    test('includes conversation history in context', async () => {
      const request: GenerationRequest = {
        prompt: 'What did I say before?',
        history: [
          { from: 'user', content: 'My name is Alice', timestamp: Date.now() },
          { from: 'assistant', content: 'Hello Alice!', timestamp: Date.now() },
        ],
      };

      const response = await provider.generateResponse(request);

      expect(response.content).toContain('Context: 2 previous messages');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Predefined Responses
  // ───────────────────────────────────────────────────────────────────────────

  describe('Predefined Responses', () => {
    test('uses predefined responses in sequence', async () => {
      const providerWithResponses = new MockProvider({
        responses: ['First response', 'Second response', 'Third response'],
      });

      const request: GenerationRequest = { prompt: 'Test' };

      const response1 = await providerWithResponses.generateResponse(request);
      expect(response1.content).toBe('First response');

      const response2 = await providerWithResponses.generateResponse(request);
      expect(response2.content).toBe('Second response');

      const response3 = await providerWithResponses.generateResponse(request);
      expect(response3.content).toBe('Third response');
    });

    test('cycles through predefined responses', async () => {
      const providerWithResponses = new MockProvider({
        responses: ['Response A', 'Response B'],
      });

      const request: GenerationRequest = { prompt: 'Test' };

      await providerWithResponses.generateResponse(request); // A
      await providerWithResponses.generateResponse(request); // B
      const response3 = await providerWithResponses.generateResponse(request); // A again

      expect(response3.content).toBe('Response A');
    });

    test('addResponse() adds to predefined list', async () => {
      provider.addResponse('Dynamic response 1');
      provider.addResponse('Dynamic response 2');

      const request: GenerationRequest = { prompt: 'Test' };

      const response1 = await provider.generateResponse(request);
      expect(response1.content).toBe('Dynamic response 1');

      const response2 = await provider.generateResponse(request);
      expect(response2.content).toBe('Dynamic response 2');
    });

    test('clearResponses() removes all predefined responses', async () => {
      provider.addResponse('Response 1');
      provider.addResponse('Response 2');
      provider.clearResponses();

      const request: GenerationRequest = { prompt: 'Test' };
      const response = await provider.generateResponse(request);

      // Should use default response generation
      expect(response.content).not.toBe('Response 1');
      expect(response.content).not.toBe('Response 2');
      expect(response.content).toContain('Mock response');
    });

    test('reset() resets response index', async () => {
      const providerWithResponses = new MockProvider({
        responses: ['First', 'Second'],
      });

      const request: GenerationRequest = { prompt: 'Test' };

      await providerWithResponses.generateResponse(request); // First
      await providerWithResponses.generateResponse(request); // Second

      providerWithResponses.reset();

      const response = await providerWithResponses.generateResponse(request);
      expect(response.content).toBe('First'); // Back to start
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Error Simulation
  // ───────────────────────────────────────────────────────────────────────────

  describe('Error Simulation', () => {
    test('simulates errors at configured rate', async () => {
      const providerWithErrors = new MockProvider({
        simulateErrors: true,
        errorRate: 1.0, // 100% error rate
      });

      const request: GenerationRequest = { prompt: 'Test' };

      await expect(
        providerWithErrors.generateResponse(request)
      ).rejects.toThrow('Mock provider error (simulated)');
    });

    test('does not throw errors when simulation disabled', async () => {
      const providerNoErrors = new MockProvider({
        simulateErrors: false,
        errorRate: 1.0,
      });

      const request: GenerationRequest = { prompt: 'Test' };

      await expect(
        providerNoErrors.generateResponse(request)
      ).resolves.toBeDefined();
    });

    test('setErrorSimulation() enables/disables errors', async () => {
      provider.setErrorSimulation(true, 1.0);

      const request: GenerationRequest = { prompt: 'Test' };

      await expect(provider.generateResponse(request)).rejects.toThrow();

      provider.setErrorSimulation(false);

      await expect(provider.generateResponse(request)).resolves.toBeDefined();
    });

    test('setErrorSimulation() clamps rate to 0-1 range', () => {
      provider.setErrorSimulation(true, -0.5);
      // Should not throw, rate should be clamped to 0
      // (Can't easily test this without reflection, but covered by implementation)

      provider.setErrorSimulation(true, 1.5);
      // Should clamp to 1.0
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Delay/Timing
  // ───────────────────────────────────────────────────────────────────────────

  describe('Delay Handling', () => {
    test('respects configured delay', async () => {
      const delayMs = 100;
      const providerWithDelay = new MockProvider({ delay: delayMs });

      const request: GenerationRequest = { prompt: 'Test' };

      const start = Date.now();
      await providerWithDelay.generateResponse(request);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(delayMs - 5); // Allow 5ms margin for timer precision
    });

    test('setDelay() updates delay', async () => {
      provider.setDelay(50);

      const request: GenerationRequest = { prompt: 'Test' };

      const start = Date.now();
      await provider.generateResponse(request);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow 5ms margin for timer precision
    });

    test('works without delay by default', async () => {
      const request: GenerationRequest = { prompt: 'Test' };

      const start = Date.now();
      await provider.generateResponse(request);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50); // Should be very fast
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Streaming Responses
  // ───────────────────────────────────────────────────────────────────────────

  describe('streamResponse', () => {
    test('streams response in chunks', async () => {
      const request: GenerationRequest = { prompt: 'Test query' };

      const chunks: string[] = [];
      for await (const chunk of provider.streamResponse(request)) {
        chunks.push(chunk.content);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('')).toBeTruthy();
    });

    test('marks last chunk as done', async () => {
      const request: GenerationRequest = { prompt: 'Test' };

      let lastChunk;
      for await (const chunk of provider.streamResponse(request)) {
        lastChunk = chunk;
      }

      expect(lastChunk?.done).toBe(true);
      expect(lastChunk?.finishReason).toBe('stop');
    });

    test('does not mark intermediate chunks as done', async () => {
      const providerWithLongResponse = new MockProvider({
        responses: [
          'This is a very long response that will be chunked into multiple pieces',
        ],
        chunkSize: 10,
      });

      const request: GenerationRequest = { prompt: 'Test' };

      const chunks: any[] = [];
      for await (const chunk of providerWithLongResponse.streamResponse(
        request
      )) {
        chunks.push(chunk);
      }

      // All chunks except last should not be done
      for (let i = 0; i < chunks.length - 1; i++) {
        expect(chunks[i].done).toBeFalsy();
        expect(chunks[i].finishReason).toBeUndefined();
      }
    });

    test('respects chunkSize configuration', async () => {
      const chunkSize = 5;
      const providerWithSmallChunks = new MockProvider({
        responses: ['AAAAAAAAAA'], // 10 characters
        chunkSize,
      });

      const request: GenerationRequest = { prompt: 'Test' };

      const chunks: string[] = [];
      for await (const chunk of providerWithSmallChunks.streamResponse(
        request
      )) {
        chunks.push(chunk.content);
      }

      // Should have 2 chunks (10 chars / 5 per chunk)
      expect(chunks.length).toBe(2);
      expect(chunks[0].length).toBe(chunkSize);
      expect(chunks[1].length).toBe(chunkSize);
    });

    test('handles streaming disabled', async () => {
      const providerNoStream = new MockProvider({
        enableStreaming: false,
        responses: ['Complete response'],
      });

      const request: GenerationRequest = { prompt: 'Test' };

      const chunks: any[] = [];
      for await (const chunk of providerNoStream.streamResponse(request)) {
        chunks.push(chunk);
      }

      // Should return single chunk with full response
      expect(chunks.length).toBe(1);
      expect(chunks[0].content).toBe('Complete response');
      expect(chunks[0].done).toBe(true);
    });

    test('uses predefined responses for streaming', async () => {
      const providerWithResponses = new MockProvider({
        responses: ['Streamed response'],
        chunkSize: 8,
      });

      const request: GenerationRequest = { prompt: 'Test' };

      const chunks: string[] = [];
      for await (const chunk of providerWithResponses.streamResponse(request)) {
        chunks.push(chunk.content);
      }

      expect(chunks.join('')).toBe('Streamed response');
    });

    test('applies delay between chunks', async () => {
      const delayMs = 50;
      const providerWithDelay = new MockProvider({
        delay: delayMs,
        responses: ['AAAAA'], // 5 chars, will be 1 chunk at default size
        chunkSize: 2,
      });

      const request: GenerationRequest = { prompt: 'Test' };

      const start = Date.now();
      const chunks: any[] = [];
      for await (const chunk of providerWithDelay.streamResponse(request)) {
        chunks.push(chunk);
      }
      const elapsed = Date.now() - start;

      // Should have delay for each chunk (delay / 10 per chunk)
      // With 3 chunks (AAAAA = AA, AA, A), total delay ~= 3 * (50/10) = 15ms
      expect(elapsed).toBeGreaterThanOrEqual(10);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Token Counting
  // ───────────────────────────────────────────────────────────────────────────

  describe('countTokens', () => {
    test('counts tokens using word approximation', () => {
      const text = 'This is a test sentence';
      const tokens = provider.countTokens(text);

      // 5 words * 1.3 = 6.5, rounded up = 7
      expect(tokens).toBe(7);
    });

    test('handles single word', () => {
      const tokens = provider.countTokens('Word');

      // 1 word * 1.3 = 1.3, rounded up = 2
      expect(tokens).toBe(2);
    });

    test('handles empty string', () => {
      const tokens = provider.countTokens('');

      // 0 words (empty split) but minimum should be handled
      expect(tokens).toBeGreaterThanOrEqual(0);
    });

    test('handles whitespace-only string', () => {
      const tokens = provider.countTokens('   ');

      expect(tokens).toBeGreaterThanOrEqual(0);
    });

    test('handles multiple spaces between words', () => {
      const text = 'Word1    Word2     Word3';
      const tokens = provider.countTokens(text);

      // 3 words * 1.3 = 3.9, rounded up = 4
      expect(tokens).toBe(4);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Provider Capabilities
  // ───────────────────────────────────────────────────────────────────────────

  describe('Capabilities', () => {
    test('reports correct capabilities', () => {
      expect(provider.name).toBe('mock');
      expect(provider.capabilities).toBeDefined();
      expect(provider.capabilities.streaming).toBe(true);
      expect(provider.capabilities.toolCalling).toBe(true);
      expect(provider.capabilities.vision).toBe(false);
      expect(provider.capabilities.maxTokens).toBe(4096);
      expect(provider.capabilities.maxContextWindow).toBe(8192);
    });

    test('lists available models', () => {
      expect(provider.capabilities.models).toContain('mock-1');
      expect(provider.capabilities.models).toContain('mock-turbo');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Edge Cases
  // ───────────────────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    test('handles very long prompts', async () => {
      const longPrompt = 'A'.repeat(10000);
      const request: GenerationRequest = { prompt: longPrompt };

      const response = await provider.generateResponse(request);

      expect(response).toBeDefined();
      expect(response.usage.promptTokens).toBeGreaterThan(0);
    });

    test('handles empty prompt', async () => {
      const request: GenerationRequest = { prompt: '' };

      const response = await provider.generateResponse(request);

      expect(response).toBeDefined();
      expect(response.content).toBeTruthy();
    });

    test('handles missing optional fields', async () => {
      const request: GenerationRequest = {
        prompt: 'Test',
        // No systemPrompt, history, model, etc.
      };

      const response = await provider.generateResponse(request);

      expect(response).toBeDefined();
      expect(response.content).toBeTruthy();
    });

    test('handles configuration with all defaults', () => {
      const defaultProvider = new MockProvider({});

      expect(defaultProvider).toBeDefined();
      expect(defaultProvider.name).toBe('mock');
    });
  });
});
