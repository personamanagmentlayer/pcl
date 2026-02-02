/**
 * OpenAI Provider Unit Tests
 * Mocked tests that don't require real API calls
 */

import { OpenAIProvider } from '../../src/providers/openai-provider';
import type { CompletionRequest } from '../../src/providers/provider-interface';

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  let mockFetch: any;

  beforeEach(() => {
    provider = new OpenAIProvider();
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as any;
    mockFetch.mockClear();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Initialization
  // ───────────────────────────────────────────────────────────────────────────

  describe('initialization', () => {
    it('should initialize with valid API key', async () => {
      await provider.initialize({ apiKey: 'test-key' });
      expect(provider.name).toBe('openai');
      expect(provider.displayName).toBe('OpenAI');
    });

    it('should throw error without API key', async () => {
      await expect(provider.initialize({})).rejects.toThrow(
        'OpenAI API key is required'
      );
    });

    it('should accept custom base URL', async () => {
      await provider.initialize({
        apiKey: 'test-key',
        baseUrl: 'https://custom.example.com',
      });
      expect(provider.name).toBe('openai');
    });

    it('should accept organization parameter', async () => {
      await provider.initialize({
        apiKey: 'test-key',
        organization: 'org-123',
      });
      expect(provider.name).toBe('openai');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Model Management
  // ───────────────────────────────────────────────────────────────────────────

  describe('getModels', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should return list of GPT models', async () => {
      const models = await provider.getModels();

      expect(models).toBeDefined();
      expect(models.length).toBeGreaterThan(0);
      expect(models.some((m) => m.id === 'gpt-4o')).toBe(true);
      expect(models.some((m) => m.id === 'gpt-4o-mini')).toBe(true);
    });

    it('should include model capabilities', async () => {
      const models = await provider.getModels();
      const gpt4o = models.find((m) => m.id === 'gpt-4o');

      expect(gpt4o).toBeDefined();
      expect(gpt4o!.capabilities).toBeDefined();
      expect(gpt4o!.capabilities.streaming).toBe(true);
      expect(gpt4o!.capabilities.functionCalling).toBe(true);
      expect(gpt4o!.capabilities.vision).toBe(true);
      expect(gpt4o!.capabilities.maxContextTokens).toBe(128000);
    });

    it('should include pricing information', async () => {
      const models = await provider.getModels();
      const gpt4o = models.find((m) => m.id === 'gpt-4o');

      expect(gpt4o).toBeDefined();
      expect(gpt4o!.inputTokenCost).toBeDefined();
      expect(gpt4o!.outputTokenCost).toBeDefined();
      expect(gpt4o!.inputTokenCost).toBeGreaterThan(0);
      expect(gpt4o!.outputTokenCost).toBeGreaterThan(0);
    });
  });

  describe('getModel', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should get specific model by ID', async () => {
      const model = await provider.getModel('gpt-4o');

      expect(model).toBeDefined();
      expect(model!.id).toBe('gpt-4o');
      expect(model!.name).toBe('GPT-4o');
    });

    it('should return null for unknown model', async () => {
      const model = await provider.getModel('claude-3-opus');
      expect(model).toBeNull();
    });
  });

  describe('hasModel', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should return true for supported models', async () => {
      const has = await provider.hasModel('gpt-4o');
      expect(has).toBe(true);
    });

    it('should return false for unsupported models', async () => {
      const has = await provider.hasModel('claude-3-opus');
      expect(has).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Capabilities
  // ───────────────────────────────────────────────────────────────────────────

  describe('getCapabilities', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should return provider capabilities', () => {
      const caps = provider.getCapabilities();

      expect(caps.streaming).toBe(true);
      expect(caps.functionCalling).toBe(true);
      expect(caps.vision).toBe(true);
      expect(caps.jsonMode).toBe(true);
      expect(caps.systemMessages).toBe(true);
      expect(caps.maxContextTokens).toBe(128000);
      expect(caps.maxOutputTokens).toBe(16384);
      expect(caps.temperature).toBe(true);
      expect(caps.topP).toBe(true);
      expect(caps.topK).toBe(false);
      expect(caps.stopSequences).toBe(true);
      expect(caps.chatHistory).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Token Counting
  // ───────────────────────────────────────────────────────────────────────────

  describe('countTokens', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should estimate tokens using 4 chars per token', async () => {
      const text = 'This is a test sentence with multiple words';
      const tokens = await provider.countTokens(text);

      expect(tokens).toBe(Math.ceil(text.length / 4));
      expect(tokens).toBe(11);
    });

    it('should handle empty string', async () => {
      const tokens = await provider.countTokens('');
      expect(tokens).toBe(0);
    });

    it('should handle single character', async () => {
      const tokens = await provider.countTokens('a');
      expect(tokens).toBe(1);
    });

    it('should round up partial tokens', async () => {
      const tokens = await provider.countTokens('Hello');
      expect(tokens).toBe(2);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Completion (Non-streaming)
  // ───────────────────────────────────────────────────────────────────────────

  describe('complete', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should generate completion with mocked API', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello! How can I help you?',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.complete(request);

      expect(response).toBeDefined();
      expect(response.content).toBe('Hello! How can I help you?');
      expect(response.finishReason).toBe('stop');
      expect(response.usage.inputTokens).toBe(10);
      expect(response.usage.outputTokens).toBe(20);
      expect(response.usage.totalTokens).toBe(30);
      expect(response.model).toBe('gpt-4o');
    });

    it('should handle system messages via request.system', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Response' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
        system: 'You are helpful',
      };

      await provider.complete(request);

      expect(mockFetch).toHaveBeenCalled();
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[0].content).toBe('You are helpful');
      expect(body.messages[1].role).toBe('user');
    });

    it('should handle system messages in messages array', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Response' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'System prompt' },
          { role: 'user', content: 'User message' },
        ],
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.messages.length).toBe(2);
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[1].role).toBe('user');
    });

    it('should include temperature parameter', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Response' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: 0.7,
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.temperature).toBe(0.7);
    });

    it('should include topP parameter', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Response' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
        topP: 0.9,
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.top_p).toBe(0.9);
    });

    it('should include stop sequences', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Response' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
        stopSequences: ['STOP', 'END'],
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.stop).toEqual(['STOP', 'END']);
    });

    it('should handle function calls in response', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: null,
              function_call: {
                name: 'get_weather',
                arguments: '{"location":"Paris"}',
              },
            },
            finish_reason: 'function_call',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'What is the weather in Paris?' }],
        tools: [
          {
            name: 'get_weather',
            description: 'Get weather',
            inputSchema: { type: 'object', properties: {} },
          },
        ],
      };

      const response = await provider.complete(request);

      expect(response.finishReason).toBe('function_call');
      expect(response.functionCall).toBeDefined();
      expect(response.functionCall!.name).toBe('get_weather');
      expect(response.functionCall!.arguments).toBe('{"location":"Paris"}');
    });

    it('should convert length finish reason', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Truncated...' },
            finish_reason: 'length',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 50, total_tokens: 60 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Write a long story' }],
        maxTokens: 50,
      };

      const response = await provider.complete(request);

      expect(response.finishReason).toBe('length');
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
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid API key',
      });

      const request: CompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
      };

      await expect(provider.complete(request)).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockFetch.mockRejectedValueOnce(networkError);

      const request: CompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
      };

      await expect(provider.complete(request)).rejects.toThrow();
    });

    it('should require initialization before use', async () => {
      const uninitializedProvider = new OpenAIProvider();

      const request: CompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
      };

      await expect(uninitializedProvider.complete(request)).rejects.toThrow();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Request Validation
  // ───────────────────────────────────────────────────────────────────────────

  describe('request validation', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should validate empty messages array', async () => {
      const request: CompletionRequest = {
        model: 'gpt-4o',
        messages: [],
      };

      await expect(provider.complete(request)).rejects.toThrow();
    });

    it('should convert tools to functions format', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Response' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
        tools: [
          {
            name: 'test_function',
            description: 'Test',
            inputSchema: { type: 'object', properties: {} },
          },
        ],
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.functions).toBeDefined();
      expect(body.functions[0].name).toBe('test_function');
      expect(body.function_call).toBe('auto');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // API Requests
  // ───────────────────────────────────────────────────────────────────────────

  describe('API requests', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should include correct headers', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Response' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toBe('Bearer test-key');
    });

    it('should include organization header if provided', async () => {
      const orgProvider = new OpenAIProvider();
      await orgProvider.initialize({
        apiKey: 'test-key',
        organization: 'org-123',
      });

      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Response' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
      };

      await orgProvider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(headers['OpenAI-Organization']).toBe('org-123');
    });

    it('should use correct API endpoint', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Response' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toBe('https://api.openai.com/v1/chat/completions');
    });

    it('should use custom base URL if provided', async () => {
      const customProvider = new OpenAIProvider();
      await customProvider.initialize({
        apiKey: 'test-key',
        baseUrl: 'https://custom.example.com',
      });

      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Response' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
      };

      await customProvider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toBe('https://custom.example.com/chat/completions');
    });
  });
});
