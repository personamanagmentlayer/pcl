/**
 * Mistral AI Provider Family Tests
 * Tests for Mistral Large, Small, Codestral, and Nemo models
 */

import { MistralProvider } from '../../src/providers/mistral-provider';
import type { CompletionRequest } from '../../src/providers/provider-interface';

describe('MistralProvider', () => {
  let provider: MistralProvider;
  let mockFetch: any;

  beforeEach(() => {
    provider = new MistralProvider();
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
    it('should initialize with valid API key', async () => {
      await provider.initialize({ apiKey: 'test-key' });
      expect(provider.name).toBe('mistral');
      expect(provider.displayName).toBe('Mistral AI');
    });

    it('should throw without API key', async () => {
      await expect(provider.initialize({})).rejects.toThrow(
        'Mistral API key is required'
      );
    });

    it('should accept custom base URL', async () => {
      await provider.initialize({
        apiKey: 'test-key',
        baseUrl: 'https://custom.mistral.ai',
      });
      expect(provider.name).toBe('mistral');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Models
  // ───────────────────────────────────────────────────────────────────────────

  describe('models', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should return Mistral models', async () => {
      const models = await provider.getModels();
      expect(models.some((m) => m.id === 'mistral-large-latest')).toBe(true);
      expect(models.some((m) => m.id === 'mistral-small-latest')).toBe(true);
      expect(models.some((m) => m.id === 'codestral-latest')).toBe(true);
      expect(models.some((m) => m.id === 'open-mistral-nemo')).toBe(true);
    });

    it('should have function calling support', async () => {
      const models = await provider.getModels();
      const large = models.find((m) => m.id === 'mistral-large-latest');
      const codestral = models.find((m) => m.id === 'codestral-latest');

      expect(large!.capabilities.functionCalling).toBe(true);
      expect(codestral!.capabilities.functionCalling).toBe(false);
    });

    it('should have different context sizes', async () => {
      const models = await provider.getModels();
      const large = models.find((m) => m.id === 'mistral-large-latest');
      const codestral = models.find((m) => m.id === 'codestral-latest');

      expect(large!.capabilities.maxContextTokens).toBe(128000);
      expect(codestral!.capabilities.maxContextTokens).toBe(32000);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Completion
  // ───────────────────────────────────────────────────────────────────────────

  describe('completion', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should complete with simple message', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          id: 'test-id',
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Hello! How can I help?',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 8,
            total_tokens: 18,
          },
        }),
      });

      const request: CompletionRequest = {
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.complete(request);
      expect(response.content).toBe('Hello! How can I help?');
      expect(response.usage.totalTokens).toBe(18);
    });

    it('should handle system message', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          choices: [
            {
              message: { role: 'assistant', content: 'Response' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 15, completion_tokens: 5, total_tokens: 20 },
        }),
      });

      const request: CompletionRequest = {
        model: 'mistral-large-latest',
        system: 'You are helpful',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[0].content).toBe('You are helpful');
    });

    it('should handle temperature', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          choices: [
            {
              message: { role: 'assistant', content: 'Response' },
              finish_reason: 'stop',
            },
          ],
          usage: { total_tokens: 10 },
        }),
      });

      const request: CompletionRequest = {
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.temperature).toBe(0.7);
    });

    it('should handle tools', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Using tool',
                tool_calls: [
                  {
                    function: {
                      name: 'get_weather',
                      arguments: '{"location":"Paris"}',
                    },
                  },
                ],
              },
              finish_reason: 'tool_calls',
            },
          ],
          usage: { total_tokens: 20 },
        }),
      });

      const request: CompletionRequest = {
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: 'Weather in Paris?' }],
        tools: [
          {
            name: 'get_weather',
            description: 'Get weather',
            inputSchema: {
              type: 'object',
              properties: { location: { type: 'string' } },
            },
          },
        ],
      };

      const response = await provider.complete(request);
      expect(response.finishReason).toBe('function_call');
      expect(response.functionCall).toBeDefined();
      expect(response.functionCall!.name).toBe('get_weather');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Streaming
  // ───────────────────────────────────────────────────────────────────────────

  describe('streaming', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should stream response', async () => {
      const mockBody = new ReadableStream({
        start(controller) {
          const chunks = [
            'data: {"choices":[{"delta":{"content":"Hello"}}]}\n',
            'data: {"choices":[{"delta":{"content":" world"}}]}\n',
            'data: {"choices":[{"finish_reason":"stop"}]}\n',
            'data: [DONE]\n',
          ];

          chunks.forEach((chunk) => {
            controller.enqueue(new TextEncoder().encode(chunk));
          });
          controller.close();
        },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        body: mockBody,
      });

      const request: CompletionRequest = {
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const chunks = [];
      for await (const chunk of provider.stream(request)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.done).toBe(true);
    });

    it('should handle streaming errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        text: async () => 'Error',
      });

      const request: CompletionRequest = {
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const stream = provider.stream(request);
      await expect(stream.next()).rejects.toThrow();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Finish Reasons
  // ───────────────────────────────────────────────────────────────────────────

  describe('finish reasons', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should convert stop to stop', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          choices: [
            {
              message: { content: 'Response' },
              finish_reason: 'stop',
            },
          ],
          usage: { total_tokens: 10 },
        }),
      });

      const request: CompletionRequest = {
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: 'Hi' }],
      };

      const response = await provider.complete(request);
      expect(response.finishReason).toBe('stop');
    });

    it('should convert length to length', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          choices: [
            {
              message: { content: 'Truncated' },
              finish_reason: 'length',
            },
          ],
          usage: { total_tokens: 10 },
        }),
      });

      const request: CompletionRequest = {
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: 'Hi' }],
      };

      const response = await provider.complete(request);
      expect(response.finishReason).toBe('length');
    });

    it('should convert tool_calls to function_call', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          choices: [
            {
              message: {
                content: '',
                tool_calls: [
                  {
                    function: { name: 'test', arguments: '{}' },
                  },
                ],
              },
              finish_reason: 'tool_calls',
            },
          ],
          usage: { total_tokens: 10 },
        }),
      });

      const request: CompletionRequest = {
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: 'Hi' }],
      };

      const response = await provider.complete(request);
      expect(response.finishReason).toBe('function_call');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Error Handling
  // ───────────────────────────────────────────────────────────────────────────

  describe('error handling', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should handle 401 unauthorized', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid API key',
      });

      const request: CompletionRequest = {
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: 'Hi' }],
      };

      await expect(provider.complete(request)).rejects.toThrow();
    });

    it('should handle 429 rate limit', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => 'Rate limit',
      });

      const request: CompletionRequest = {
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: 'Hi' }],
      };

      await expect(provider.complete(request)).rejects.toThrow();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Token Counting
  // ───────────────────────────────────────────────────────────────────────────

  describe('token counting', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
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
  // Pricing
  // ───────────────────────────────────────────────────────────────────────────

  describe('pricing', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should have competitive pricing', async () => {
      const models = await provider.getModels();
      const small = models.find((m) => m.id === 'mistral-small-latest');
      const nemo = models.find((m) => m.id === 'open-mistral-nemo');

      expect(small!.inputTokenCost).toBeLessThan(1 / 1000000);
      expect(nemo!.inputTokenCost).toBeLessThan(small!.inputTokenCost!);
    });

    it('should have higher cost for large model', async () => {
      const models = await provider.getModels();
      const large = models.find((m) => m.id === 'mistral-large-latest');
      const small = models.find((m) => m.id === 'mistral-small-latest');

      expect(large!.inputTokenCost).toBeGreaterThan(small!.inputTokenCost!);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Codestral Specialization
  // ───────────────────────────────────────────────────────────────────────────

  describe('codestral model', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should have codestral for coding tasks', async () => {
      const models = await provider.getModels();
      const codestral = models.find((m) => m.id === 'codestral-latest');

      expect(codestral).toBeDefined();
      expect(codestral!.name).toContain('Codestral');
      expect(codestral!.description).toContain('code');
    });

    it('should not support function calling', async () => {
      const models = await provider.getModels();
      const codestral = models.find((m) => m.id === 'codestral-latest');

      expect(codestral!.capabilities.functionCalling).toBe(false);
    });
  });
});
