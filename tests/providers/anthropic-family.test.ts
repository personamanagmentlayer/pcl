/**
 * Anthropic Provider Family Tests
 * Comprehensive tests for Claude models (Sonnet, Haiku, Opus)
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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Initialization & Configuration
  // ───────────────────────────────────────────────────────────────────────────

  describe('initialization', () => {
    it('should initialize with valid API key', async () => {
      await provider.initialize({ apiKey: 'test-key' });
      expect(provider.name).toBe('anthropic');
      expect(provider.displayName).toBe('Anthropic');
      expect(provider.version).toBe('1.0.0');
    });

    it('should throw error without API key', async () => {
      await expect(provider.initialize({})).rejects.toThrow(
        'Anthropic API key is required'
      );
    });

    it('should accept custom base URL', async () => {
      await provider.initialize({
        apiKey: 'test-key',
        baseUrl: 'https://custom.anthropic.com',
      });
      expect(provider.name).toBe('anthropic');
    });

    it('should use default API version', async () => {
      await provider.initialize({ apiKey: 'test-key' });
      // Provider should be initialized with API version
      expect(provider.name).toBe('anthropic');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Model Information
  // ───────────────────────────────────────────────────────────────────────────

  describe('model management', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should return Claude models', async () => {
      const models = await provider.getModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models.some((m) => m.id === 'claude-3-5-sonnet-20241022')).toBe(
        true
      );
      expect(models.some((m) => m.id === 'claude-3-5-haiku-20241022')).toBe(
        true
      );
      expect(models.some((m) => m.id === 'claude-3-opus-20240229')).toBe(true);
    });

    it('should include comprehensive capabilities for Sonnet', async () => {
      const models = await provider.getModels();
      const sonnet = models.find((m) => m.id === 'claude-3-5-sonnet-20241022');

      expect(sonnet).toBeDefined();
      expect(sonnet!.capabilities.streaming).toBe(true);
      expect(sonnet!.capabilities.functionCalling).toBe(true);
      expect(sonnet!.capabilities.vision).toBe(true);
      expect(sonnet!.capabilities.systemMessages).toBe(true);
      expect(sonnet!.capabilities.maxContextTokens).toBe(200000);
      expect(sonnet!.capabilities.topK).toBe(true);
    });

    it('should have different characteristics for Haiku', async () => {
      const models = await provider.getModels();
      const haiku = models.find((m) => m.id === 'claude-3-5-haiku-20241022');

      expect(haiku).toBeDefined();
      expect(haiku!.name).toContain('Haiku');
      expect(haiku!.capabilities.vision).toBe(false);
      expect(haiku!.inputTokenCost).toBeLessThan(
        models.find((m) => m.id === 'claude-3-5-sonnet-20241022')!
          .inputTokenCost!
      );
    });

    it('should include pricing information', async () => {
      const models = await provider.getModels();
      const sonnet = models.find((m) => m.id === 'claude-3-5-sonnet-20241022');

      expect(sonnet!.inputTokenCost).toBeDefined();
      expect(sonnet!.outputTokenCost).toBeDefined();
      expect(sonnet!.inputTokenCost).toBeGreaterThan(0);
      expect(sonnet!.outputTokenCost).toBeGreaterThan(0);
    });

    it('should get specific model by ID', async () => {
      const model = await provider.getModel('claude-3-5-sonnet-20241022');
      expect(model).not.toBeNull();
      expect(model!.name).toBe('Claude 3.5 Sonnet');
    });

    it('should return null for non-existent model', async () => {
      const model = await provider.getModel('non-existent-model');
      expect(model).toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Capabilities
  // ───────────────────────────────────────────────────────────────────────────

  describe('capabilities', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should report comprehensive capabilities', () => {
      const caps = provider.getCapabilities();

      expect(caps.streaming).toBe(true);
      expect(caps.functionCalling).toBe(true);
      expect(caps.vision).toBe(true);
      expect(caps.jsonMode).toBe(false);
      expect(caps.systemMessages).toBe(true);
      expect(caps.temperature).toBe(true);
      expect(caps.topP).toBe(true);
      expect(caps.topK).toBe(true);
      expect(caps.stopSequences).toBe(true);
      expect(caps.chatHistory).toBe(true);
    });

    it('should support large context windows', () => {
      const caps = provider.getCapabilities();
      expect(caps.maxContextTokens).toBe(200000);
      expect(caps.maxOutputTokens).toBe(8192);
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
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello! How can I help you today?' }],
          model: 'claude-3-5-sonnet-20241022',
          stop_reason: 'end_turn',
          usage: {
            input_tokens: 10,
            output_tokens: 8,
          },
        }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.complete(request);
      expect(response.content).toBe('Hello! How can I help you today?');
      expect(response.finishReason).toBe('stop');
      expect(response.usage.inputTokens).toBe(10);
      expect(response.usage.outputTokens).toBe(8);
      expect(response.usage.totalTokens).toBe(18);
    });

    it('should handle system message separately', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          content: [{ type: 'text', text: 'Response' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 15, output_tokens: 5 },
        }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        system: 'You are a helpful assistant',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.system).toBe('You are a helpful assistant');
      expect(body.messages.every((m: any) => m.role !== 'system')).toBe(true);
    });

    it('should handle temperature parameter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          content: [{ type: 'text', text: 'Response' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.temperature).toBe(0.7);
    });

    it('should handle topP parameter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          content: [{ type: 'text', text: 'Response' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }],
        topP: 0.9,
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.top_p).toBe(0.9);
    });

    it('should handle topK parameter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          content: [{ type: 'text', text: 'Response' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }],
        topK: 40,
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.top_k).toBe(40);
    });

    it('should handle maxTokens parameter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          content: [{ type: 'text', text: 'Response' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 1024,
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.max_tokens).toBe(1024);
    });

    it('should handle stop sequences', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          content: [{ type: 'text', text: 'Response' }],
          stop_reason: 'stop_sequence',
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }],
        stopSequences: ['\n\n', 'END'],
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.stop_sequences).toEqual(['\n\n', 'END']);
    });

    it('should handle metadata', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          content: [{ type: 'text', text: 'Response' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }],
        metadata: { user_id: 'user123' },
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.metadata).toEqual({ user_id: 'user123' });
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
            'data: {"type":"message_start","message":{"usage":{"input_tokens":10}}}\n',
            'data: {"type":"content_block_delta","delta":{"text":"Hello"}}\n',
            'data: {"type":"content_block_delta","delta":{"text":" there"}}\n',
            'data: {"type":"message_delta","usage":{"output_tokens":5}}\n',
            'data: {"type":"message_stop"}\n',
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
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const chunks = [];
      for await (const chunk of provider.stream(request)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      const textChunks = chunks.filter((c) => !c.done && c.content);
      expect(textChunks.some((c) => c.content.includes('Hello'))).toBe(true);
      expect(chunks[chunks.length - 1].done).toBe(true);
      expect(chunks[chunks.length - 1].usage).toBeDefined();
    });

    it('should handle streaming errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error',
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const stream = provider.stream(request);
      await expect(stream.next()).rejects.toThrow();
    });

    it('should handle malformed SSE events', async () => {
      const mockBody = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"type":"content_block_delta","delta":{"text":"OK"}}\n'
            )
          );
          controller.enqueue(new TextEncoder().encode('invalid json\n'));
          controller.enqueue(
            new TextEncoder().encode('data: {"type":"message_stop"}\n')
          );
          controller.close();
        },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        body: mockBody,
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
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
  // Tool/Function Calling
  // ───────────────────────────────────────────────────────────────────────────

  describe('tool calling', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should convert tool definitions', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          content: [{ type: 'text', text: 'Using tool' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'What is the weather?' }],
        tools: [
          {
            name: 'get_weather',
            description: 'Get weather for a location',
            inputSchema: {
              type: 'object',
              properties: {
                location: { type: 'string' },
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
      expect(body.tools[0].input_schema).toBeDefined();
    });

    it('should handle tool use response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          content: [
            { type: 'text', text: 'Let me check the weather' },
            {
              type: 'tool_use',
              id: 'tool_123',
              name: 'get_weather',
              input: { location: 'Paris' },
            },
          ],
          stop_reason: 'tool_use',
          usage: { input_tokens: 20, output_tokens: 10 },
        }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Weather in Paris?' }],
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

    it('should convert end_turn to stop', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          content: [{ type: 'text', text: 'Response' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.complete(request);
      expect(response.finishReason).toBe('stop');
    });

    it('should convert max_tokens to length', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          content: [{ type: 'text', text: 'Truncated...' }],
          stop_reason: 'max_tokens',
          usage: { input_tokens: 10, output_tokens: 1024 },
        }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.complete(request);
      expect(response.finishReason).toBe('length');
    });

    it('should convert tool_use to function_call', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          content: [
            {
              type: 'tool_use',
              name: 'test_tool',
              input: {},
            },
          ],
          stop_reason: 'tool_use',
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Test' }],
      };

      const response = await provider.complete(request);
      expect(response.finishReason).toBe('function_call');
    });

    it('should convert stop_sequence to stop', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          content: [{ type: 'text', text: 'Response' }],
          stop_reason: 'stop_sequence',
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.complete(request);
      expect(response.finishReason).toBe('stop');
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
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          error: { message: 'Invalid API key' },
        }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
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
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(provider.complete(request)).rejects.toThrow();
    });

    it('should handle 500 server error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error',
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(provider.complete(request)).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(provider.complete(request)).rejects.toThrow('Network error');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Token Counting
  // ───────────────────────────────────────────────────────────────────────────

  describe('token counting', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should estimate token count', async () => {
      const text = 'Hello, world! How are you today?';
      const tokens = await provider.countTokens(text);
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(text.length);
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

    it('should approximate 4 chars per token', async () => {
      const text = 'abcd'.repeat(100);
      const tokens = await provider.countTokens(text);
      expect(tokens).toBeCloseTo(100, 0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Multi-turn Conversations
  // ───────────────────────────────────────────────────────────────────────────

  describe('multi-turn conversations', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should handle conversation history', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          content: [{ type: 'text', text: 'Response' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 30, output_tokens: 10 },
        }),
      });

      const request: CompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
          { role: 'user', content: 'How are you?' },
        ],
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.messages).toHaveLength(3);
      expect(body.messages[0].role).toBe('user');
      expect(body.messages[1].role).toBe('assistant');
      expect(body.messages[2].role).toBe('user');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Pricing & Model Selection
  // ───────────────────────────────────────────────────────────────────────────

  describe('pricing and model selection', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should have different pricing tiers', async () => {
      const models = await provider.getModels();
      const sonnet = models.find((m) => m.id === 'claude-3-5-sonnet-20241022');
      const haiku = models.find((m) => m.id === 'claude-3-5-haiku-20241022');
      const opus = models.find((m) => m.id === 'claude-3-opus-20240229');

      expect(haiku!.inputTokenCost).toBeLessThan(sonnet!.inputTokenCost!);
      expect(sonnet!.inputTokenCost).toBeLessThan(opus!.inputTokenCost!);
    });

    it('should recommend model based on task', async () => {
      const models = await provider.getModels();
      const sonnet = models.find((m) => m.id === 'claude-3-5-sonnet-20241022');
      const haiku = models.find((m) => m.id === 'claude-3-5-haiku-20241022');

      expect(sonnet!.description).toContain('intelligent');
      expect(haiku!.description).toContain('fast');
    });
  });
});
