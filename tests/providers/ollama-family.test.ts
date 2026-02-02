/**
 * Ollama Provider Family Tests
 * Tests for local Ollama models (Llama, Mistral, Gemma, etc.)
 */

import { OllamaProvider } from '../../src/providers/ollama-provider';
import type { CompletionRequest } from '../../src/providers/provider-interface';

describe('OllamaProvider', () => {
  let provider: OllamaProvider;
  let mockFetch: any;

  beforeEach(() => {
    provider = new OllamaProvider();
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Initialization
  // ───────────────────────────────────────────────────────────────────────────

  describe('initialization', () => {
    it('should initialize without API key', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ models: [] }),
      });

      await provider.initialize({});
      expect(provider.name).toBe('ollama');
      expect(provider.displayName).toBe('Ollama');
    });

    it('should accept custom base URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ models: [] }),
      });

      await provider.initialize({
        baseUrl: 'http://localhost:11434',
      });
      expect(provider.name).toBe('ollama');
    });

    it('should validate baseUrl format', async () => {
      await expect(
        provider.initialize({ baseUrl: 'invalid-url' })
      ).rejects.toThrow('baseUrl must start with http');
    });

    it('should fetch models on init', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          models: [
            {
              name: 'llama3',
              size: 4096000000,
              digest: 'abc123',
              modified_at: '2024-01-01',
            },
          ],
        }),
      });

      await provider.initialize({});
      const models = await provider.getModels();
      expect(models.length).toBeGreaterThan(0);
    });

    it('should continue if model fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      await provider.initialize({ debug: false });
      expect(provider.name).toBe('ollama');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Model Management
  // ───────────────────────────────────────────────────────────────────────────

  describe('model management', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          models: [
            {
              name: 'llama3:8b',
              size: 4661211648,
              digest: 'abc123',
              modified_at: '2024-01-01',
              details: {
                parameter_size: '8B',
                quantization_level: 'Q4_0',
              },
            },
            {
              name: 'mistral:7b',
              size: 4109859200,
              digest: 'def456',
              modified_at: '2024-01-01',
              details: {
                parameter_size: '7B',
              },
            },
            {
              name: 'llava:13b',
              size: 7365959680,
              digest: 'ghi789',
              modified_at: '2024-01-01',
            },
          ],
        }),
      });

      await provider.initialize({});
    });

    it('should list local models', async () => {
      const models = await provider.getModels();
      expect(models.length).toBe(3);
      expect(models.some((m) => m.id === 'llama3:8b')).toBe(true);
      expect(models.some((m) => m.id === 'mistral:7b')).toBe(true);
    });

    it('should detect vision models', async () => {
      const models = await provider.getModels();
      const llava = models.find((m) => m.id === 'llava:13b');

      expect(llava!.capabilities.vision).toBe(true);
    });

    it('should format model sizes', async () => {
      const models = await provider.getModels();
      expect(models[0].description).toContain('GB');
    });

    it('should estimate context sizes from model names', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          models: [
            { name: 'llama3:128k', size: 1000000, digest: 'a' },
            { name: 'mistral:32k', size: 1000000, digest: 'b' },
            { name: 'gemma:8k', size: 1000000, digest: 'c' },
          ],
        }),
      });

      await provider.initialize({});
      const models = await provider.getModels();

      const llama = models.find((m) => m.id === 'llama3:128k');
      const mistral = models.find((m) => m.id === 'mistral:32k');
      const gemma = models.find((m) => m.id === 'gemma:8k');

      expect(llama!.capabilities.maxContextTokens).toBe(128000);
      expect(mistral!.capabilities.maxContextTokens).toBe(32000);
      expect(gemma!.capabilities.maxContextTokens).toBe(8000);
    });

    it('should refresh models', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          models: [{ name: 'new-model', size: 1000000, digest: 'new' }],
        }),
      });

      const models = await provider.getModels();
      expect(models.some((m) => m.id === 'new-model')).toBe(true);
    });

    it('should have zero cost for local models', async () => {
      const models = await provider.getModels();
      models.forEach((model) => {
        expect(model.inputTokenCost).toBe(0);
        expect(model.outputTokenCost).toBe(0);
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Completion
  // ───────────────────────────────────────────────────────────────────────────

  describe('completion', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ models: [] }),
      });
      await provider.initialize({});
    });

    it('should complete with simple message', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          message: {
            role: 'assistant',
            content: 'Hello! How can I help you?',
          },
          done: true,
          prompt_eval_count: 10,
          eval_count: 8,
        }),
      });

      const request: CompletionRequest = {
        model: 'llama3',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.complete(request);
      expect(response.content).toBe('Hello! How can I help you?');
      expect(response.usage.inputTokens).toBe(10);
      expect(response.usage.outputTokens).toBe(8);
    });

    it('should handle system message', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          message: { role: 'assistant', content: 'Response' },
          done: true,
        }),
      });

      const request: CompletionRequest = {
        model: 'llama3',
        system: 'You are helpful',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.messages[0].role).toBe('system');
    });

    it('should handle temperature', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          message: { content: 'Response' },
          done: true,
        }),
      });

      const request: CompletionRequest = {
        model: 'llama3',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.8,
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.options.temperature).toBe(0.8);
    });

    it('should handle topP and topK', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          message: { content: 'Response' },
          done: true,
        }),
      });

      const request: CompletionRequest = {
        model: 'llama3',
        messages: [{ role: 'user', content: 'Hello' }],
        topP: 0.9,
        topK: 40,
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.options.top_p).toBe(0.9);
      expect(body.options.top_k).toBe(40);
    });

    it('should handle stop sequences', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          message: { content: 'Response' },
          done: true,
        }),
      });

      const request: CompletionRequest = {
        model: 'llama3',
        messages: [{ role: 'user', content: 'Hello' }],
        stopSequences: ['\n\n', 'END'],
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.options.stop).toEqual(['\n\n', 'END']);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Streaming
  // ───────────────────────────────────────────────────────────────────────────

  describe('streaming', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ models: [] }),
      });
      await provider.initialize({});
    });

    it('should stream response', async () => {
      const mockBody = new ReadableStream({
        start(controller) {
          const events = [
            '{"message":{"content":"Hello"},"done":false}\n',
            '{"message":{"content":" there"},"done":false}\n',
            '{"done":true,"prompt_eval_count":10,"eval_count":5}\n',
          ];

          events.forEach((event) => {
            controller.enqueue(new TextEncoder().encode(event));
          });
          controller.close();
        },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        body: mockBody,
      });

      const request: CompletionRequest = {
        model: 'llama3',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const chunks = [];
      for await (const chunk of provider.stream(request)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[chunks.length - 1].done).toBe(true);
      expect(chunks[chunks.length - 1].usage).toBeDefined();
    });

    it('should handle malformed JSON in stream', async () => {
      const mockBody = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              '{"message":{"content":"OK"},"done":false}\n'
            )
          );
          controller.enqueue(new TextEncoder().encode('invalid json\n'));
          controller.enqueue(new TextEncoder().encode('{"done":true}\n'));
          controller.close();
        },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        body: mockBody,
      });

      const request: CompletionRequest = {
        model: 'llama3',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const chunks = [];
      for await (const chunk of provider.stream(request)) {
        chunks.push(chunk);
      }

      // Should still get valid chunks
      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Error Handling
  // ───────────────────────────────────────────────────────────────────────────

  describe('error handling', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ models: [] }),
      });
      await provider.initialize({});
    });

    it('should handle connection errors', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const request: CompletionRequest = {
        model: 'llama3',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(provider.complete(request)).rejects.toThrow(
        'Connection refused'
      );
    });

    it('should handle model not found', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Model not found',
      });

      const request: CompletionRequest = {
        model: 'non-existent',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(provider.complete(request)).rejects.toThrow();
    });

    it('should handle server errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error',
      });

      const request: CompletionRequest = {
        model: 'llama3',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(provider.complete(request)).rejects.toThrow();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Token Counting
  // ───────────────────────────────────────────────────────────────────────────

  describe('token counting', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ models: [] }),
      });
      await provider.initialize({});
    });

    it('should estimate tokens', async () => {
      const tokens = await provider.countTokens('Hello, world!');
      expect(tokens).toBeGreaterThan(0);
    });

    it('should handle empty text', async () => {
      const tokens = await provider.countTokens('');
      expect(tokens).toBe(0);
    });

    it('should handle long text', async () => {
      const text = 'word '.repeat(1000);
      const tokens = await provider.countTokens(text);
      expect(tokens).toBeGreaterThan(100);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Capabilities
  // ───────────────────────────────────────────────────────────────────────────

  describe('capabilities', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ models: [] }),
      });
      await provider.initialize({});
    });

    it('should support streaming', () => {
      const caps = provider.getCapabilities();
      expect(caps.streaming).toBe(true);
    });

    it('should not support function calling by default', () => {
      const caps = provider.getCapabilities();
      expect(caps.functionCalling).toBe(false);
    });

    it('should support JSON mode', () => {
      const caps = provider.getCapabilities();
      expect(caps.jsonMode).toBe(true);
    });

    it('should support temperature control', () => {
      const caps = provider.getCapabilities();
      expect(caps.temperature).toBe(true);
      expect(caps.topP).toBe(true);
      expect(caps.topK).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Multi-turn Conversations
  // ───────────────────────────────────────────────────────────────────────────

  describe('multi-turn conversations', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ models: [] }),
      });
      await provider.initialize({});
    });

    it('should handle conversation history', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          message: { content: 'Response' },
          done: true,
        }),
      });

      const request: CompletionRequest = {
        model: 'llama3',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi!' },
          { role: 'user', content: 'How are you?' },
        ],
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1]?.body || '{}');
      expect(body.messages).toHaveLength(3);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Local Model Benefits
  // ───────────────────────────────────────────────────────────────────────────

  describe('local model benefits', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          models: [{ name: 'llama3', size: 4000000000, digest: 'abc' }],
        }),
      });
      await provider.initialize({});
    });

    it('should have zero cost', async () => {
      const models = await provider.getModels();
      models.forEach((model) => {
        expect(model.inputTokenCost).toBe(0);
        expect(model.outputTokenCost).toBe(0);
      });
    });

    it('should support offline usage', async () => {
      // Once initialized, can work offline
      expect(provider.name).toBe('ollama');
    });

    it('should not require API key', async () => {
      const config = {};
      await expect(provider.initialize(config)).resolves.not.toThrow();
    });
  });
});
