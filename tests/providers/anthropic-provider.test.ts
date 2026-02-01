/**
 * Anthropic Provider Unit Tests
 * Mocked tests that don't require real API calls
 */

import { AnthropicProvider } from '../../src/providers/anthropic-provider';
import type { CompletionRequest } from '../../src/providers/provider-interface';

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;
  let mockFetch: any;

  beforeEach(() => {
    provider = new AnthropicProvider();
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
      expect(provider.name).toBe('anthropic');
      expect(provider.displayName).toBe('Anthropic');
    });

    it('should throw error without API key', async () => {
      await expect(provider.initialize({})).rejects.toThrow(
        'Anthropic API key is required'
      );
    });

    it('should accept custom base URL', async () => {
      await provider.initialize({
        apiKey: 'test-key',
        baseUrl: 'https://custom.example.com',
      });
      expect(provider.name).toBe('anthropic');
    });

    it('should set default timeout and retry config', async () => {
      await provider.initialize({ apiKey: 'test-key' });
      // Initialization should succeed with defaults
      expect(provider.name).toBe('anthropic');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Model Management
  // ───────────────────────────────────────────────────────────────────────────

  describe('getModels', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should return list of Claude models', async () => {
      const models = await provider.getModels();

      expect(models).toBeDefined();
      expect(models.length).toBeGreaterThan(0);
      expect(models.some((m) => m.id === 'claude-3-5-sonnet-20241022')).toBe(
        true
      );
      expect(models.some((m) => m.id === 'claude-3-5-haiku-20241022')).toBe(
        true
      );
    });

    it('should include model capabilities', async () => {
      const models = await provider.getModels();
      const sonnet = models.find((m) => m.id === 'claude-3-5-sonnet-20241022');

      expect(sonnet).toBeDefined();
      expect(sonnet!.capabilities).toBeDefined();
      expect(sonnet!.capabilities.streaming).toBe(true);
      expect(sonnet!.capabilities.functionCalling).toBe(true);
      expect(sonnet!.capabilities.vision).toBe(true);
      expect(sonnet!.capabilities.maxContextTokens).toBe(200000);
    });

    it('should include pricing information', async () => {
      const models = await provider.getModels();
      const sonnet = models.find((m) => m.id === 'claude-3-5-sonnet-20241022');

      expect(sonnet).toBeDefined();
      expect(sonnet!.inputTokenCost).toBeDefined();
      expect(sonnet!.outputTokenCost).toBeDefined();
      expect(sonnet!.inputTokenCost).toBeGreaterThan(0);
      expect(sonnet!.outputTokenCost).toBeGreaterThan(0);
    });
  });

  describe('getModel', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should get specific model by ID', async () => {
      const model = await provider.getModel('claude-3-5-sonnet-20241022');

      expect(model).toBeDefined();
      expect(model!.id).toBe('claude-3-5-sonnet-20241022');
      expect(model!.name).toBe('Claude 3.5 Sonnet');
    });

    it('should return null for unknown model', async () => {
      const model = await provider.getModel('gpt-4');
      expect(model).toBeNull();
    });
  });

  describe('hasModel', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should return true for supported models', async () => {
      const has = await provider.hasModel('claude-3-5-sonnet-20241022');
      expect(has).toBe(true);
    });

    it('should return false for unsupported models', async () => {
      const has = await provider.hasModel('gpt-4');
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
      expect(caps.jsonMode).toBe(false);
      expect(caps.systemMessages).toBe(true);
      expect(caps.maxContextTokens).toBe(200000);
      expect(caps.maxOutputTokens).toBe(8192);
      expect(caps.temperature).toBe(true);
      expect(caps.topP).toBe(true);
      expect(caps.topK).toBe(true);
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

      // 44 characters / 4 = 11 tokens
      expect(tokens).toBe(Math.ceil(text.length / 4));
      expect(tokens).toBe(11);
    });

    it('should handle empty string', async () => {
      const tokens = await provider.countTokens('');
      expect(tokens).toBe(0);
    });

    it('should handle single character', async () => {
      const tokens = await provider.countTokens('a');
      expect(tokens).toBe(1); // ceil(1/4) = 1
    });

    it('should round up partial tokens', async () => {
      const tokens = await provider.countTokens('Hello'); // 5 chars / 4 = 1.25
      expect(tokens).toBe(2); // Rounded up
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
        id: 'msg-123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello! How can I help you?' }],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.complete(request);

      expect(response).toBeDefined();
      expect(response.content).toBe('Hello! How can I help you?');
      expect(response.finishReason).toBe('stop');
      expect(response.usage.inputTokens).toBe(10);
      expect(response.usage.outputTokens).toBe(20);
      expect(response.usage.totalTokens).toBe(30);
      expect(response.model).toBe('claude-3-5-sonnet-20241022');
    });

    it('should handle system messages', async () => {
      const mockResponse = {
        id: 'msg-123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hi' }],
        system: 'You are helpful',
      };

      await provider.complete(request);

      expect(mockFetch).toHaveBeenCalled();
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.system).toBe('You are helpful');
    });

    it('should include temperature parameter', async () => {
      const mockResponse = {
        id: 'msg-123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: 0.7,
      };

      await provider.complete(request);

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.temperature).toBe(0.7);
    });

    it('should include topP and topK parameters', async () => {
      const mockResponse = {
        id: 'msg-123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hi' }],
        topP: 0.9,
        topK: 50,
      };

      await provider.complete(request);

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.top_p).toBe(0.9);
      expect(body.top_k).toBe(50);
    });

    it('should include stop sequences', async () => {
      const mockResponse = {
        id: 'msg-123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'stop_sequence',
        usage: { input_tokens: 10, output_tokens: 5 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hi' }],
        stopSequences: ['STOP', 'END'],
      };

      await provider.complete(request);

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.stop_sequences).toEqual(['STOP', 'END']);
    });

    it('should handle tool use in response', async () => {
      const mockResponse = {
        id: 'msg-123',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'tool-123',
            name: 'get_weather',
            input: { location: 'Paris' },
          },
        ],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'tool_use',
        usage: { input_tokens: 10, output_tokens: 5 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
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
      expect(JSON.parse(response.functionCall!.arguments)).toEqual({
        location: 'Paris',
      });
    });

    it('should convert max_tokens finish reason to length', async () => {
      const mockResponse = {
        id: 'msg-123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Truncated response...' }],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'max_tokens',
        usage: { input_tokens: 10, output_tokens: 50 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
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
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hi' }],
      };

      await expect(provider.complete(request)).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockFetch.mockRejectedValueOnce(networkError);

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hi' }],
      };

      await expect(provider.complete(request)).rejects.toThrow();
    });

    it('should require initialization before use', async () => {
      const uninitializedProvider = new AnthropicProvider();

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
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
        model: 'claude-3-5-sonnet-20241022',
        messages: [],
      };

      await expect(provider.complete(request)).rejects.toThrow();
    });

    it('should filter system messages from messages array', async () => {
      const mockResponse = {
        id: 'msg-123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          { role: 'system', content: 'System prompt' },
          { role: 'user', content: 'User message' },
        ],
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      // System messages in messages array are filtered out but not extracted
      // They should be passed via request.system instead
      expect(body.messages.length).toBe(1);
      expect(body.messages[0].role).toBe('user');
      expect(body.system).toBeUndefined(); // No system field since request.system wasn't set
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Message Content Conversion
  // ───────────────────────────────────────────────────────────────────────────

  describe('message content conversion', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should handle string content', async () => {
      const mockResponse = {
        id: 'msg-123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await provider.complete(request);

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.messages[0].content).toBe('Hello');
    });

    it('should handle text content object', async () => {
      const mockResponse = {
        id: 'msg-123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: { type: 'text', text: 'Hello' } }],
      };

      await provider.complete(request);

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.messages[0].content).toBe('Hello');
    });

    it('should handle array content with text and images', async () => {
      const mockResponse = {
        id: 'msg-123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'user',
            content: [
              'What is in this image?',
              {
                type: 'image',
                source: {
                  type: 'base64',
                  data: 'iVBORw0KG...',
                  mediaType: 'image/png',
                },
              },
            ],
          },
        ],
      };

      await provider.complete(request);

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(Array.isArray(body.messages[0].content)).toBe(true);
      expect(body.messages[0].content[0]).toEqual({
        type: 'text',
        text: 'What is in this image?',
      });
      expect(body.messages[0].content[1].type).toBe('image');
      expect(body.messages[0].content[1].source.type).toBe('base64');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Metadata and Headers
  // ───────────────────────────────────────────────────────────────────────────

  describe('API requests', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should include correct headers', async () => {
      const mockResponse = {
        id: 'msg-123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hi' }],
      };

      await provider.complete(request);

      const fetchCall = (global.fetch as any).mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['x-api-key']).toBe('test-key');
      expect(headers['anthropic-version']).toBe('2023-06-01');
    });

    it('should use correct API endpoint', async () => {
      const mockResponse = {
        id: 'msg-123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hi' }],
      };

      await provider.complete(request);

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('https://api.anthropic.com/v1/messages');
    });

    it('should use custom base URL if provided', async () => {
      const customProvider = new AnthropicProvider();
      await customProvider.initialize({
        apiKey: 'test-key',
        baseUrl: 'https://custom.example.com/v1',
      });

      const mockResponse = {
        id: 'msg-123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hi' }],
      };

      await customProvider.complete(request);

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('https://custom.example.com/v1/messages');
    });
  });
});
