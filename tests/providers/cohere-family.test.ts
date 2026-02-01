/**
 * Cohere Provider Family Tests
 * Comprehensive tests for Cohere models (Command R+, Command R, Command Light)
 */

import { CohereProvider } from '../../src/providers/cohere-provider';
import type { CompletionRequest } from '../../src/providers/provider-interface';

describe('CohereProvider', () => {
  let provider: CohereProvider;
  let mockFetch: any;

  beforeEach(() => {
    provider = new CohereProvider();
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
      expect(provider.name).toBe('cohere');
      expect(provider.displayName).toBe('Cohere');
    });

    it('should throw error without API key', async () => {
      await expect(provider.initialize({})).rejects.toThrow(
        'Cohere API key is required'
      );
    });

    it('should accept custom base URL', async () => {
      await provider.initialize({
        apiKey: 'test-key',
        baseUrl: 'https://custom.cohere.ai',
      });
      expect(provider.name).toBe('cohere');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Models
  // ───────────────────────────────────────────────────────────────────────────

  describe('models', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should return Cohere models', async () => {
      const models = await provider.getModels();
      expect(models.some((m) => m.id === 'command-r-plus')).toBe(true);
      expect(models.some((m) => m.id === 'command-r')).toBe(true);
      expect(models.some((m) => m.id === 'command-light')).toBe(true);
    });

    it('should have different capabilities per model', async () => {
      const models = await provider.getModels();
      const plus = models.find((m) => m.id === 'command-r-plus');
      const light = models.find((m) => m.id === 'command-light');

      expect(plus!.capabilities.functionCalling).toBe(true);
      expect(light!.capabilities.functionCalling).toBe(false);
    });

    it('should have 128K context for Command R models', async () => {
      const models = await provider.getModels();
      const commandR = models.find((m) => m.id === 'command-r');

      expect(commandR!.capabilities.maxContextTokens).toBe(128000);
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
          text: 'Hello! How can I help you?',
          generation_id: 'test-gen-id',
          finish_reason: 'COMPLETE',
          meta: {
            tokens: {
              input_tokens: 10,
              output_tokens: 8,
            },
          },
        }),
      });

      const request: CompletionRequest = {
        model: 'command-r',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.complete(request);
      expect(response.content).toBe('Hello! How can I help you?');
      expect(response.finishReason).toBe('stop');
      expect(response.usage.inputTokens).toBe(10);
      expect(response.usage.outputTokens).toBe(8);
    });

    it('should handle preamble (system message)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          text: 'Response',
          finish_reason: 'COMPLETE',
          meta: { tokens: { input_tokens: 15, output_tokens: 5 } },
        }),
      });

      const request: CompletionRequest = {
        model: 'command-r',
        system: 'You are helpful',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.preamble).toBe('You are helpful');
    });

    it('should build chat history correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          text: 'Response',
          finish_reason: 'COMPLETE',
          meta: {},
        }),
      });

      const request: CompletionRequest = {
        model: 'command-r',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi!' },
          { role: 'user', content: 'How are you?' },
        ],
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.message).toBe('How are you?');
      expect(body.chat_history).toHaveLength(2);
      expect(body.chat_history[0].role).toBe('USER');
      expect(body.chat_history[1].role).toBe('CHATBOT');
    });

    it('should handle temperature parameter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          text: 'Response',
          finish_reason: 'COMPLETE',
          meta: {},
        }),
      });

      const request: CompletionRequest = {
        model: 'command-r',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.8,
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.temperature).toBe(0.8);
    });

    it('should map topP to p', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          text: 'Response',
          finish_reason: 'COMPLETE',
          meta: {},
        }),
      });

      const request: CompletionRequest = {
        model: 'command-r',
        messages: [{ role: 'user', content: 'Hello' }],
        topP: 0.9,
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.p).toBe(0.9);
    });

    it('should map topK to k', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          text: 'Response',
          finish_reason: 'COMPLETE',
          meta: {},
        }),
      });

      const request: CompletionRequest = {
        model: 'command-r',
        messages: [{ role: 'user', content: 'Hello' }],
        topK: 50,
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.k).toBe(50);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Streaming
  // ───────────────────────────────────────────────────────────────────────────

  describe('streaming', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should stream response chunks', async () => {
      const mockBody = new ReadableStream({
        start(controller) {
          const events = [
            '{"event_type":"text-generation","text":"Hello"}\n',
            '{"event_type":"text-generation","text":" there"}\n',
            '{"event_type":"stream-end","finish_reason":"COMPLETE","response":{"meta":{"tokens":{"input_tokens":10,"output_tokens":5}}}}\n',
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
        model: 'command-r',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const chunks = [];
      for await (const chunk of provider.stream(request)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      const textChunks = chunks.filter((c) => !c.done);
      expect(textChunks.some((c) => c.content.includes('Hello'))).toBe(true);
      expect(chunks[chunks.length - 1].done).toBe(true);
      expect(chunks[chunks.length - 1].usage).toBeDefined();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Function Calling
  // ───────────────────────────────────────────────────────────────────────────

  describe('function calling', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should convert tool definitions', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          text: 'Response',
          finish_reason: 'COMPLETE',
          meta: {},
        }),
      });

      const request: CompletionRequest = {
        model: 'command-r-plus',
        messages: [{ role: 'user', content: 'What is the weather?' }],
        tools: [
          {
            name: 'get_weather',
            description: 'Get weather for a location',
            inputSchema: {
              type: 'object',
              properties: {
                location: { type: 'string', description: 'City name' },
              },
              required: ['location'],
            },
          },
        ],
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.tools).toBeDefined();
      expect(body.tools[0].name).toBe('get_weather');
      expect(body.tools[0].parameter_definitions).toBeDefined();
    });

    it('should handle tool call response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          text: 'Let me check the weather',
          finish_reason: 'TOOL_CALL',
          meta: {},
          tool_calls: [
            {
              name: 'get_weather',
              parameters: { location: 'London' },
            },
          ],
        }),
      });

      const request: CompletionRequest = {
        model: 'command-r-plus',
        messages: [{ role: 'user', content: 'Weather in London?' }],
      };

      const response = await provider.complete(request);
      expect(response.finishReason).toBe('function_call');
      expect(response.functionCall).toBeDefined();
      expect(response.functionCall!.name).toBe('get_weather');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Finish Reasons
  // ───────────────────────────────────────────────────────────────────────────

  describe('finish reasons', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should convert COMPLETE to stop', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          text: 'Response',
          finish_reason: 'COMPLETE',
          meta: {},
        }),
      });

      const request: CompletionRequest = {
        model: 'command-r',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.complete(request);
      expect(response.finishReason).toBe('stop');
    });

    it('should convert MAX_TOKENS to length', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          text: 'Truncated',
          finish_reason: 'MAX_TOKENS',
          meta: {},
        }),
      });

      const request: CompletionRequest = {
        model: 'command-r',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.complete(request);
      expect(response.finishReason).toBe('length');
    });

    it('should convert ERROR_TOXIC to content_filter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          text: '',
          finish_reason: 'ERROR_TOXIC',
          meta: {},
        }),
      });

      const request: CompletionRequest = {
        model: 'command-r',
        messages: [{ role: 'user', content: 'Test' }],
      };

      const response = await provider.complete(request);
      expect(response.finishReason).toBe('content_filter');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Error Handling
  // ───────────────────────────────────────────────────────────────────────────

  describe('error handling', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid request',
      });

      const request: CompletionRequest = {
        model: 'command-r',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(provider.complete(request)).rejects.toThrow();
    });

    it('should handle rate limits', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => 'Rate limit exceeded',
      });

      const request: CompletionRequest = {
        model: 'command-r',
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

  // ───────────────────────────────────────────────────────────────────────────
  // Pricing
  // ───────────────────────────────────────────────────────────────────────────

  describe('pricing', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should have cost-effective pricing', async () => {
      const models = await provider.getModels();
      const commandR = models.find((m) => m.id === 'command-r');

      expect(commandR!.inputTokenCost).toBeLessThan(1 / 1000000);
      expect(commandR!.outputTokenCost).toBeLessThan(1 / 1000000);
    });
  });
});
