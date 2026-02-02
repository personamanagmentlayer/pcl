/**
 * Google Provider Family Tests
 * Comprehensive tests for Google Gemini models
 */

import { GoogleProvider } from '../../src/providers/google-provider';
import type { CompletionRequest } from '../../src/providers/provider-interface';

describe('GoogleProvider', () => {
  let provider: GoogleProvider;
  let mockFetch: any;

  beforeEach(() => {
    provider = new GoogleProvider();
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
      expect(provider.name).toBe('google');
      expect(provider.displayName).toBe('Google');
      expect(provider.version).toBe('1.0.0');
    });

    it('should throw error without API key', async () => {
      await expect(provider.initialize({})).rejects.toThrow(
        'Google API key is required'
      );
    });

    it('should accept custom base URL', async () => {
      await provider.initialize({
        apiKey: 'test-key',
        baseUrl: 'https://custom.googleapis.com',
      });
      expect(provider.name).toBe('google');
    });

    it('should use default base URL', async () => {
      await provider.initialize({ apiKey: 'test-key' });
      // Default URL should be used
      expect(provider.name).toBe('google');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Model Information
  // ───────────────────────────────────────────────────────────────────────────

  describe('model management', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should return Gemini models', async () => {
      const models = await provider.getModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models.some((m) => m.id === 'gemini-2.0-flash-exp')).toBe(true);
      expect(models.some((m) => m.id === 'gemini-1.5-pro')).toBe(true);
      expect(models.some((m) => m.id === 'gemini-1.5-flash')).toBe(true);
    });

    it('should include model capabilities', async () => {
      const models = await provider.getModels();
      const pro = models.find((m) => m.id === 'gemini-1.5-pro');

      expect(pro).toBeDefined();
      expect(pro!.capabilities.streaming).toBe(true);
      expect(pro!.capabilities.functionCalling).toBe(true);
      expect(pro!.capabilities.vision).toBe(true);
      expect(pro!.capabilities.jsonMode).toBe(true);
      expect(pro!.capabilities.maxContextTokens).toBe(2000000);
    });

    it('should include experimental models', async () => {
      const models = await provider.getModels();
      const experimental = models.find((m) => m.id === 'gemini-2.0-flash-exp');

      expect(experimental).toBeDefined();
      expect(experimental!.name).toContain('Experimental');
      expect(experimental!.inputTokenCost).toBe(0);
      expect(experimental!.outputTokenCost).toBe(0);
    });

    it('should get specific model', async () => {
      const model = await provider.getModel('gemini-1.5-pro');
      expect(model).not.toBeNull();
      expect(model!.name).toBe('Gemini 1.5 Pro');
    });

    it('should have different context sizes', async () => {
      const models = await provider.getModels();
      const pro = models.find((m) => m.id === 'gemini-1.5-pro');
      const flash = models.find((m) => m.id === 'gemini-1.5-flash');

      expect(pro!.capabilities.maxContextTokens).toBe(2000000);
      expect(flash!.capabilities.maxContextTokens).toBe(1000000);
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
      expect(caps.jsonMode).toBe(true);
      expect(caps.systemMessages).toBe(true);
      expect(caps.temperature).toBe(true);
      expect(caps.topP).toBe(true);
      expect(caps.topK).toBe(true);
      expect(caps.stopSequences).toBe(true);
      expect(caps.chatHistory).toBe(true);
    });

    it('should support large context windows', () => {
      const caps = provider.getCapabilities();
      expect(caps.maxContextTokens).toBeGreaterThanOrEqual(1000000);
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
          candidates: [
            {
              content: {
                parts: [{ text: 'Hello! How can I help you?' }],
              },
              finishReason: 'STOP',
            },
          ],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 8,
            totalTokenCount: 18,
          },
        }),
      });

      const request: CompletionRequest = {
        model: 'gemini-1.5-pro',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.complete(request);
      expect(response.content).toBe('Hello! How can I help you?');
      expect(response.finishReason).toBe('stop');
      expect(response.usage.totalTokens).toBe(18);
    });

    it('should handle system message', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Response' }],
              },
              finishReason: 'STOP',
            },
          ],
          usageMetadata: {
            promptTokenCount: 15,
            candidatesTokenCount: 5,
            totalTokenCount: 20,
          },
        }),
      });

      const request: CompletionRequest = {
        model: 'gemini-1.5-pro',
        system: 'You are a helpful assistant',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.complete(request);
      expect(response).toBeDefined();

      // Verify request structure included system instruction
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.systemInstruction).toBeDefined();
    });

    it('should handle temperature parameter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          candidates: [
            {
              content: { parts: [{ text: 'Response' }] },
              finishReason: 'STOP',
            },
          ],
          usageMetadata: { totalTokenCount: 10 },
        }),
      });

      const request: CompletionRequest = {
        model: 'gemini-1.5-pro',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.generationConfig.temperature).toBe(0.7);
    });

    it('should handle topP parameter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          candidates: [
            {
              content: { parts: [{ text: 'Response' }] },
              finishReason: 'STOP',
            },
          ],
        }),
      });

      const request: CompletionRequest = {
        model: 'gemini-1.5-pro',
        messages: [{ role: 'user', content: 'Hello' }],
        topP: 0.9,
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.generationConfig.topP).toBe(0.9);
    });

    it('should handle topK parameter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          candidates: [
            {
              content: { parts: [{ text: 'Response' }] },
              finishReason: 'STOP',
            },
          ],
        }),
      });

      const request: CompletionRequest = {
        model: 'gemini-1.5-pro',
        messages: [{ role: 'user', content: 'Hello' }],
        topK: 40,
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.generationConfig.topK).toBe(40);
    });

    it('should handle maxTokens parameter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          candidates: [
            {
              content: { parts: [{ text: 'Response' }] },
              finishReason: 'STOP',
            },
          ],
        }),
      });

      const request: CompletionRequest = {
        model: 'gemini-1.5-pro',
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 1024,
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.generationConfig.maxOutputTokens).toBe(1024);
    });

    it('should handle stop sequences', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          candidates: [
            {
              content: { parts: [{ text: 'Response' }] },
              finishReason: 'STOP',
            },
          ],
        }),
      });

      const request: CompletionRequest = {
        model: 'gemini-1.5-pro',
        messages: [{ role: 'user', content: 'Hello' }],
        stopSequences: ['\n\n', 'END'],
      };

      await provider.complete(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.generationConfig.stopSequences).toEqual(['\n\n', 'END']);
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
          const chunks = [
            'data: {"candidates":[{"content":{"parts":[{"text":"Hello"}]}}]}\n',
            'data: {"candidates":[{"content":{"parts":[{"text":" there"}]}}]}\n',
            'data: {"candidates":[{"content":{"parts":[{"text":"!"}]},"finishReason":"STOP"}],"usageMetadata":{"totalTokenCount":10}}\n',
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
        model: 'gemini-1.5-pro',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const chunks = [];
      for await (const chunk of provider.stream(request)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.some((c) => c.content.includes('Hello'))).toBe(true);
      expect(chunks[chunks.length - 1].done).toBe(true);
    });

    it('should handle streaming errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error',
      });

      const request: CompletionRequest = {
        model: 'gemini-1.5-pro',
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

    it('should convert STOP to stop', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          candidates: [
            {
              content: { parts: [{ text: 'Response' }] },
              finishReason: 'STOP',
            },
          ],
          usageMetadata: { totalTokenCount: 10 },
        }),
      });

      const request: CompletionRequest = {
        model: 'gemini-1.5-pro',
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
          candidates: [
            {
              content: { parts: [{ text: 'Response' }] },
              finishReason: 'MAX_TOKENS',
            },
          ],
          usageMetadata: { totalTokenCount: 10 },
        }),
      });

      const request: CompletionRequest = {
        model: 'gemini-1.5-pro',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.complete(request);
      expect(response.finishReason).toBe('length');
    });

    it('should convert SAFETY to content_filter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          candidates: [
            {
              content: { parts: [{ text: '' }] },
              finishReason: 'SAFETY',
            },
          ],
          usageMetadata: { totalTokenCount: 5 },
        }),
      });

      const request: CompletionRequest = {
        model: 'gemini-1.5-pro',
        messages: [{ role: 'user', content: 'Test' }],
      };

      const response = await provider.complete(request);
      expect(response.finishReason).toBe('content_filter');
    });

    it('should convert RECITATION to content_filter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          candidates: [
            {
              content: { parts: [{ text: '' }] },
              finishReason: 'RECITATION',
            },
          ],
          usageMetadata: { totalTokenCount: 5 },
        }),
      });

      const request: CompletionRequest = {
        model: 'gemini-1.5-pro',
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

    it('should handle 401 unauthorized', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ error: { message: 'Invalid API key' } }),
      });

      const request: CompletionRequest = {
        model: 'gemini-1.5-pro',
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
        model: 'gemini-1.5-pro',
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
        model: 'gemini-1.5-pro',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(provider.complete(request)).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const request: CompletionRequest = {
        model: 'gemini-1.5-pro',
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
      const text = 'Hello, world!';
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
          candidates: [
            {
              content: { parts: [{ text: 'Response' }] },
              finishReason: 'STOP',
            },
          ],
          usageMetadata: { totalTokenCount: 20 },
        }),
      });

      const request: CompletionRequest = {
        model: 'gemini-1.5-pro',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
          { role: 'user', content: 'How are you?' },
        ],
      };

      const response = await provider.complete(request);
      expect(response).toBeDefined();

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.contents).toHaveLength(3);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Pricing
  // ───────────────────────────────────────────────────────────────────────────

  describe('pricing', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should have cost information for paid models', async () => {
      const models = await provider.getModels();
      const pro = models.find((m) => m.id === 'gemini-1.5-pro');

      expect(pro!.inputTokenCost).toBeGreaterThan(0);
      expect(pro!.outputTokenCost).toBeGreaterThan(0);
    });

    it('should have zero cost for experimental models', async () => {
      const models = await provider.getModels();
      const experimental = models.find((m) => m.id === 'gemini-2.0-flash-exp');

      expect(experimental!.inputTokenCost).toBe(0);
      expect(experimental!.outputTokenCost).toBe(0);
    });
  });
});
