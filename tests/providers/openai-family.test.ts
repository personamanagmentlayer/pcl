/**
 * OpenAI Provider Family Tests
 * Comprehensive tests for OpenAI, Groq, and DeepSeek (OpenAI-compatible APIs)
 */

import { OpenAIProvider } from '../../src/providers/openai-provider';
import { GroqProvider } from '../../src/providers/groq-provider';
import { DeepSeekProvider } from '../../src/providers/deepseek-provider';
import type { CompletionRequest } from '../../src/providers/provider-interface';

describe('OpenAI Provider Family', () => {
  describe('OpenAIProvider', () => {
    let provider: OpenAIProvider;
    let mockFetch: any;

    beforeEach(() => {
      provider = new OpenAIProvider();
      mockFetch = vi.fn();
      globalThis.fetch = mockFetch as any;
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Initialization
    // ─────────────────────────────────────────────────────────────────────────

    describe('initialization', () => {
      it('should initialize with valid API key', async () => {
        await provider.initialize({ apiKey: 'test-key' });
        expect(provider.name).toBe('openai');
        expect(provider.displayName).toBe('OpenAI');
      });

      it('should throw without API key', async () => {
        await expect(provider.initialize({})).rejects.toThrow(
          'OpenAI API key is required'
        );
      });

      it('should accept organization', async () => {
        await provider.initialize({
          apiKey: 'test-key',
          organization: 'org-123',
        });
        expect(provider.name).toBe('openai');
      });

      it('should accept custom base URL', async () => {
        await provider.initialize({
          apiKey: 'test-key',
          baseUrl: 'https://custom.openai.com',
        });
        expect(provider.name).toBe('openai');
      });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Models
    // ─────────────────────────────────────────────────────────────────────────

    describe('models', () => {
      beforeEach(async () => {
        await provider.initialize({ apiKey: 'test-key' });
      });

      it('should return GPT models', async () => {
        const models = await provider.getModels();
        expect(models.some((m) => m.id === 'gpt-4o')).toBe(true);
        expect(models.some((m) => m.id === 'gpt-4o-mini')).toBe(true);
        expect(models.some((m) => m.id === 'gpt-3.5-turbo-0125')).toBe(true);
      });

      it('should include GPT-4 Turbo', async () => {
        const models = await provider.getModels();
        const turbo = models.find((m) => m.id === 'gpt-4-turbo-2024-04-09');

        expect(turbo).toBeDefined();
        expect(turbo!.capabilities.vision).toBe(true);
        expect(turbo!.capabilities.maxContextTokens).toBe(128000);
      });

      it('should have vision support for multimodal models', async () => {
        const models = await provider.getModels();
        const gpt4o = models.find((m) => m.id === 'gpt-4o');

        expect(gpt4o!.capabilities.vision).toBe(true);
      });

      it('should support function calling', async () => {
        const models = await provider.getModels();
        models.forEach((model) => {
          expect(model.capabilities.functionCalling).toBe(true);
        });
      });

      it('should support JSON mode', async () => {
        const models = await provider.getModels();
        models.forEach((model) => {
          expect(model.capabilities.jsonMode).toBe(true);
        });
      });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Completion
    // ─────────────────────────────────────────────────────────────────────────

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
            object: 'chat.completion',
            created: Date.now(),
            model: 'gpt-4o',
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: 'Hello! How can I assist you?',
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
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
        };

        const response = await provider.complete(request);
        expect(response.content).toBe('Hello! How can I assist you?');
        expect(response.usage.totalTokens).toBe(18);
      });

      it('should handle system message', async () => {
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
          model: 'gpt-4o',
          system: 'You are helpful',
          messages: [{ role: 'user', content: 'Hello' }],
        };

        await provider.complete(request);

        const fetchCall = mockFetch.mock.calls[0];
        const body = JSON.parse(fetchCall[1].body);
        expect(body.messages[0].role).toBe('system');
        expect(body.messages[0].content).toBe('You are helpful');
      });

      it('should include organization header', async () => {
        await provider.initialize({
          apiKey: 'test-key',
          organization: 'org-123',
        });

        mockFetch.mockResolvedValue({
          ok: true,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({
            choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }],
            usage: { total_tokens: 5 },
          }),
        });

        const request: CompletionRequest = {
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hi' }],
        };

        await provider.complete(request);

        const fetchCall = mockFetch.mock.calls[0];
        expect(fetchCall[1].headers['OpenAI-Organization']).toBe('org-123');
      });

      it('should handle function calls', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({
            choices: [
              {
                message: {
                  content: null,
                  function_call: {
                    name: 'get_weather',
                    arguments: '{"location":"Paris"}',
                  },
                },
                finish_reason: 'function_call',
              },
            ],
            usage: { total_tokens: 20 },
          }),
        });

        const request: CompletionRequest = {
          model: 'gpt-4o',
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

    // ─────────────────────────────────────────────────────────────────────────
    // Streaming
    // ─────────────────────────────────────────────────────────────────────────

    describe('streaming', () => {
      beforeEach(async () => {
        await provider.initialize({ apiKey: 'test-key' });
      });

      it('should stream response', async () => {
        const mockBody = new ReadableStream({
          start(controller) {
            const chunks = [
              'data: {"choices":[{"delta":{"content":"Hello"}}]}\n',
              'data: {"choices":[{"delta":{"content":" there"}}]}\n',
              'data: {"choices":[{"finish_reason":"stop"}],"usage":{"total_tokens":10}}\n',
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
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
        };

        const chunks = [];
        for await (const chunk of provider.stream(request)) {
          chunks.push(chunk);
        }

        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks[chunks.length - 1].done).toBe(true);
      });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Error Handling
    // ─────────────────────────────────────────────────────────────────────────

    describe('error handling', () => {
      beforeEach(async () => {
        await provider.initialize({ apiKey: 'test-key' });
      });

      it('should handle 401 unauthorized', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({
            error: { message: 'Invalid API key' },
          }),
        });

        const request: CompletionRequest = {
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
        };

        await expect(provider.complete(request)).rejects.toThrow();
      });

      it('should handle 429 rate limit', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          text: async () => 'Rate limit exceeded',
        });

        const request: CompletionRequest = {
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
        };

        await expect(provider.complete(request)).rejects.toThrow();
      });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Token Counting
    // ─────────────────────────────────────────────────────────────────────────

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
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Groq Provider (OpenAI-compatible)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GroqProvider', () => {
    let provider: GroqProvider;
    let mockFetch: any;

    beforeEach(() => {
      provider = new GroqProvider();
      mockFetch = vi.fn();
      globalThis.fetch = mockFetch as any;
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    describe('initialization', () => {
      it('should initialize with API key', async () => {
        await provider.initialize({ apiKey: 'test-key' });
        expect(provider.name).toBe('groq');
        expect(provider.displayName).toBe('Groq');
      });

      it('should throw without API key', async () => {
        await expect(provider.initialize({})).rejects.toThrow(
          'Groq API key is required'
        );
      });
    });

    describe('models', () => {
      beforeEach(async () => {
        await provider.initialize({ apiKey: 'test-key' });
      });

      it('should return Groq models', async () => {
        const models = await provider.getModels();
        expect(models.some((m) => m.id === 'llama-3.3-70b-versatile')).toBe(
          true
        );
        expect(models.some((m) => m.id === 'llama-3.1-8b-instant')).toBe(true);
        expect(models.some((m) => m.id === 'mixtral-8x7b-32768')).toBe(true);
      });

      it('should have ultra-fast inference models', async () => {
        const models = await provider.getModels();
        const instant = models.find((m) => m.id === 'llama-3.1-8b-instant');

        expect(instant).toBeDefined();
        expect(instant!.name).toContain('Instant');
      });

      it('should have competitive pricing', async () => {
        const models = await provider.getModels();
        const instant = models.find((m) => m.id === 'llama-3.1-8b-instant');

        expect(instant!.inputTokenCost).toBeLessThan(0.1 / 1000000);
        expect(instant!.outputTokenCost).toBeLessThan(0.1 / 1000000);
      });
    });

    describe('completion', () => {
      beforeEach(async () => {
        await provider.initialize({ apiKey: 'test-key' });
      });

      it('should complete with Groq API', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({
            choices: [
              {
                message: { content: 'Fast response!' },
                finish_reason: 'stop',
              },
            ],
            usage: { total_tokens: 10 },
          }),
        });

        const request: CompletionRequest = {
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: 'Hello' }],
        };

        const response = await provider.complete(request);
        expect(response.content).toBe('Fast response!');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DeepSeek Provider (OpenAI-compatible)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DeepSeekProvider', () => {
    let provider: DeepSeekProvider;
    let mockFetch: any;

    beforeEach(() => {
      provider = new DeepSeekProvider();
      mockFetch = vi.fn();
      globalThis.fetch = mockFetch as any;
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    describe('initialization', () => {
      it('should initialize with API key', async () => {
        await provider.initialize({ apiKey: 'test-key' });
        expect(provider.name).toBe('deepseek');
        expect(provider.displayName).toBe('DeepSeek');
      });

      it('should throw without API key', async () => {
        await expect(provider.initialize({})).rejects.toThrow(
          'DeepSeek API key is required'
        );
      });
    });

    describe('models', () => {
      beforeEach(async () => {
        await provider.initialize({ apiKey: 'test-key' });
      });

      it('should return DeepSeek models', async () => {
        const models = await provider.getModels();
        expect(models.some((m) => m.id === 'deepseek-chat')).toBe(true);
        expect(models.some((m) => m.id === 'deepseek-coder')).toBe(true);
      });

      it('should have coding-specialized model', async () => {
        const models = await provider.getModels();
        const coder = models.find((m) => m.id === 'deepseek-coder');

        expect(coder).toBeDefined();
        expect(coder!.description).toContain('coding');
      });

      it('should have very competitive pricing', async () => {
        const models = await provider.getModels();
        const chat = models.find((m) => m.id === 'deepseek-chat');

        expect(chat!.inputTokenCost).toBeLessThan(0.2 / 1000000);
        expect(chat!.outputTokenCost).toBeLessThan(0.3 / 1000000);
      });
    });

    describe('completion', () => {
      beforeEach(async () => {
        await provider.initialize({ apiKey: 'test-key' });
      });

      it('should complete with DeepSeek API', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({
            choices: [
              {
                message: {
                  content: 'DeepSeek response',
                  role: 'assistant',
                },
                finish_reason: 'stop',
              },
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 5,
              total_tokens: 15,
            },
          }),
        });

        const request: CompletionRequest = {
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: 'Hello' }],
        };

        const response = await provider.complete(request);
        expect(response.content).toBe('DeepSeek response');
        expect(response.usage.totalTokens).toBe(15);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Cross-Provider Compatibility Tests
  // ═══════════════════════════════════════════════════════════════════════════

  describe('OpenAI-compatible API consistency', () => {
    it('should have consistent message format across providers', async () => {
      const providers = [
        new OpenAIProvider(),
        new GroqProvider(),
        new DeepSeekProvider(),
      ];

      for (const provider of providers) {
        await provider.initialize({ apiKey: 'test-key' });
        const caps = provider.getCapabilities();

        expect(caps.streaming).toBe(true);
        expect(caps.systemMessages).toBe(true);
        expect(caps.chatHistory).toBe(true);
        expect(caps.temperature).toBe(true);
        expect(caps.topP).toBe(true);
      }
    });

    it('should handle same request format', async () => {
      const mockFetch = vi.fn();
      globalThis.fetch = mockFetch as any;

      const providers = [
        new OpenAIProvider(),
        new GroqProvider(),
        new DeepSeekProvider(),
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }],
          usage: { total_tokens: 5 },
        }),
      });

      const request: CompletionRequest = {
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        maxTokens: 100,
      };

      for (const provider of providers) {
        await provider.initialize({ apiKey: 'test-key' });
        mockFetch.mockClear();

        await provider.complete(request);

        const fetchCall = mockFetch.mock.calls[0];
        const body = JSON.parse(fetchCall[1].body);

        expect(body.model).toBe('test-model');
        expect(body.messages).toHaveLength(1);
        expect(body.temperature).toBe(0.7);
        expect(body.max_tokens).toBe(100);
      }
    });
  });
});
