// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - Anthropic Provider Tests
// Comprehensive tests for Claude AI integration
// ═══════════════════════════════════════════════════════════════════════════════

import { AnthropicProvider } from '../../../src/runtime/providers/anthropic';
import type { GenerationRequest } from '../../../src/runtime/providers';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn(),
        stream: vi.fn(),
      },
    })),
  };
});

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;
  let mockCreate: any;
  let mockStream: any;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new AnthropicProvider({
      apiKey: 'test-anthropic-key',
    });
    mockCreate = (provider as any).client.messages.create;
    mockStream = (provider as any).client.messages.stream;
  });

  describe('initialization', () => {
    it('should initialize with API key', () => {
      const newProvider = new AnthropicProvider({
        apiKey: 'test-key',
      });

      expect(newProvider).toBeDefined();
      expect(newProvider.name).toBe('anthropic');
    });

    it('should initialize with custom model', () => {
      const newProvider = new AnthropicProvider({
        apiKey: 'test-key',
        defaultModel: 'claude-3-opus-20240229',
      });

      expect(newProvider.getDefaultModel()).toBe('claude-3-opus-20240229');
    });

    it('should initialize with custom base URL', () => {
      const newProvider = new AnthropicProvider({
        apiKey: 'test-key',
        baseURL: 'https://custom.endpoint.com',
      });

      expect(newProvider).toBeDefined();
    });

    it('should set default model', () => {
      expect(provider.getDefaultModel()).toBe('claude-3-7-sonnet-20250219');
    });
  });

  describe('capabilities', () => {
    it('should have correct capabilities', () => {
      const { capabilities } = provider;

      expect(capabilities.streaming).toBe(true);
      expect(capabilities.toolCalling).toBe(true);
      expect(capabilities.vision).toBe(true);
      expect(capabilities.maxTokens).toBe(8192);
      expect(capabilities.maxContextWindow).toBe(200000);
    });

    it('should list supported models', () => {
      const { capabilities } = provider;

      expect(capabilities.models).toContain('claude-3-7-sonnet-20250219');
      expect(capabilities.models).toContain('claude-3-5-sonnet-20241022');
      expect(capabilities.models).toContain('claude-3-opus-20240229');
    });
  });

  describe('generateResponse', () => {
    const request: GenerationRequest = {
      prompt: 'Hello, Claude!',
      systemPrompt: 'You are a helpful assistant',
    };

    it('should generate response', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        model: 'claude-3-7-sonnet-20250219',
        content: [
          {
            type: 'text',
            text: 'Hello! How can I assist you today?',
          },
        ],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 10,
          output_tokens: 15,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);

      expect(response.content).toBe('Hello! How can I assist you today?');
      expect(response.finishReason).toBe('stop');
      expect(response.usage?.promptTokens).toBe(10);
      expect(response.usage?.completionTokens).toBe(15);
      expect(response.usage?.totalTokens).toBe(25);
    });

    it('should include metadata', async () => {
      const mockResponse = {
        id: 'msg_456',
        type: 'message',
        role: 'assistant',
        model: 'claude-3-opus-20240229',
        content: [{ type: 'text', text: 'Test' }],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 5,
          output_tokens: 5,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);

      expect(response.metadata?.provider).toBe('anthropic');
      expect(response.metadata?.model).toBe('claude-3-opus-20240229');
      expect(response.metadata?.id).toBe('msg_456');
      expect(response.metadata?.stopReason).toBe('end_turn');
    });

    it('should handle custom parameters', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        model: 'claude-3-7-sonnet-20250219',
        content: [{ type: 'text', text: 'Response' }],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 10,
          output_tokens: 10,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      await provider.generateResponse({
        ...request,
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 0.9,
        })
      );
    });

    it('should handle conversation history', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        model: 'claude-3-7-sonnet-20250219',
        content: [{ type: 'text', text: 'Follow-up response' }],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 30,
          output_tokens: 10,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      await provider.generateResponse({
        prompt: 'Follow-up question',
        systemPrompt: 'You are helpful',
        history: [
          { from: 'user', content: 'First question', timestamp: Date.now() },
          { from: 'assistant', content: 'First answer', timestamp: Date.now() },
        ],
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'user', content: 'First question' },
            { role: 'assistant', content: 'First answer' },
            { role: 'user', content: 'Follow-up question' },
          ],
        })
      );
    });

    it('should handle max_tokens finish reason', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        model: 'claude-3-7-sonnet-20250219',
        content: [{ type: 'text', text: 'Truncated response' }],
        stop_reason: 'max_tokens',
        usage: {
          input_tokens: 10,
          output_tokens: 4096,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);

      expect(response.finishReason).toBe('length');
    });

    it('should handle tool_use finish reason', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        model: 'claude-3-7-sonnet-20250219',
        content: [
          {
            type: 'tool_use',
            id: 'tool_123',
            name: 'get_weather',
            input: { location: 'San Francisco' },
          },
        ],
        stop_reason: 'tool_use',
        usage: {
          input_tokens: 20,
          output_tokens: 10,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse({
        ...request,
        tools: [
          {
            name: 'get_weather',
            description: 'Get weather',
            parameters: {
              type: 'object',
              properties: {
                location: { type: 'string' },
              },
              required: ['location'],
            },
          },
        ],
      });

      expect(response.finishReason).toBe('tool_use');
      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls?.[0]).toEqual({
        id: 'tool_123',
        name: 'get_weather',
        arguments: { location: 'San Francisco' },
      });
    });

    it('should handle multiple content blocks', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        model: 'claude-3-7-sonnet-20250219',
        content: [
          { type: 'text', text: 'First part ' },
          { type: 'text', text: 'second part' },
        ],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 10,
          output_tokens: 10,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);

      expect(response.content).toBe('First part second part');
    });

    it('should handle API errors', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API rate limit exceeded'));

      await expect(provider.generateResponse(request)).rejects.toThrow(
        'Anthropic API error: API rate limit exceeded'
      );
    });

    it('should handle stop sequences', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        model: 'claude-3-7-sonnet-20250219',
        content: [{ type: 'text', text: 'Response' }],
        stop_reason: 'stop_sequence',
        usage: {
          input_tokens: 10,
          output_tokens: 10,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      await provider.generateResponse({
        ...request,
        stopSequences: ['\n\n', 'END'],
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          stop_sequences: ['\n\n', 'END'],
        })
      );
    });
  });

  describe('streamResponse', () => {
    const request: GenerationRequest = {
      prompt: 'Stream test',
    };

    it('should stream response chunks', async () => {
      const mockStreamEvents = {
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'content_block_delta',
            delta: {
              type: 'text_delta',
              text: 'Hello',
            },
          };
          yield {
            type: 'content_block_delta',
            delta: {
              type: 'text_delta',
              text: ' from',
            },
          };
          yield {
            type: 'content_block_delta',
            delta: {
              type: 'text_delta',
              text: ' Claude!',
            },
          };
          yield {
            type: 'message_stop',
          };
        },
      };

      mockStream.mockResolvedValueOnce(mockStreamEvents);

      const chunks: Array<{ content: string; done: boolean }> = [];
      for await (const chunk of provider.streamResponse(request)) {
        chunks.push({ content: chunk.content, done: chunk.done });
      }

      expect(chunks).toHaveLength(4);
      expect(chunks[0]).toEqual({ content: 'Hello', done: false });
      expect(chunks[1]).toEqual({ content: ' from', done: false });
      expect(chunks[2]).toEqual({ content: ' Claude!', done: false });
      expect(chunks[3]).toEqual({ content: '', done: true });
    });

    it('should call stream API with correct parameters', async () => {
      const mockStreamEvents = {
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'message_stop',
          };
        },
      };

      mockStream.mockResolvedValueOnce(mockStreamEvents);

      await provider
        .streamResponse({
          prompt: 'Test',
          systemPrompt: 'System',
          temperature: 0.8,
        })
        .next();

      expect(mockStream).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: 'user', content: 'Test' }],
          system: 'System',
          temperature: 0.8,
        })
      );
    });

    it('should handle empty deltas', async () => {
      const mockStreamEvents = {
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'content_block_start',
          };
          yield {
            type: 'content_block_delta',
            delta: {
              type: 'text_delta',
              text: 'Content',
            },
          };
          yield {
            type: 'message_stop',
          };
        },
      };

      mockStream.mockResolvedValueOnce(mockStreamEvents);

      const chunks: string[] = [];
      for await (const chunk of provider.streamResponse(request)) {
        chunks.push(chunk.content);
      }

      expect(chunks).toEqual(['Content', '']);
    });

    it('should handle streaming errors', async () => {
      mockStream.mockRejectedValueOnce(new Error('Stream connection lost'));

      const iterator = provider.streamResponse(request);
      await expect(iterator.next()).rejects.toThrow(
        'Anthropic streaming error: Stream connection lost'
      );
    });

    it('should indicate when stream is done', async () => {
      const mockStreamEvents = {
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'content_block_delta',
            delta: {
              type: 'text_delta',
              text: 'Test',
            },
          };
          yield {
            type: 'message_stop',
          };
        },
      };

      mockStream.mockResolvedValueOnce(mockStreamEvents);

      const chunks: Array<{ done: boolean; finishReason?: string }> = [];
      for await (const chunk of provider.streamResponse(request)) {
        chunks.push({
          done: chunk.done,
          finishReason: chunk.finishReason,
        });
      }

      expect(chunks[0].done).toBe(false);
      expect(chunks[1].done).toBe(true);
      expect(chunks[1].finishReason).toBe('stop');
    });
  });

  describe('countTokens', () => {
    it('should estimate token count for text', () => {
      const text = 'Hello, this is a test message for token counting';
      const count = provider.countTokens(text);

      expect(count).toBeGreaterThan(0);
      expect(typeof count).toBe('number');
    });

    it('should handle empty text', () => {
      const count = provider.countTokens('');
      expect(count).toBe(0);
    });

    it('should use ~4 chars per token approximation', () => {
      const text = 'a'.repeat(400); // 400 characters
      const count = provider.countTokens(text);

      // Should be ~100 tokens (400 / 4)
      expect(count).toBe(100);
    });

    it('should handle Unicode characters', () => {
      const text = '你好世界 Hello World';
      const count = provider.countTokens(text);

      expect(count).toBeGreaterThan(0);
    });
  });

  describe('setDefaultModel', () => {
    it('should update default model', () => {
      provider.setDefaultModel('claude-3-opus-20240229');
      expect(provider.getDefaultModel()).toBe('claude-3-opus-20240229');
    });

    it('should throw for unsupported model', () => {
      expect(() => {
        provider.setDefaultModel('unknown-model');
      }).toThrow("Model 'unknown-model' not supported by Anthropic provider");
    });

    it('should accept all supported models', () => {
      const models = [
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229',
      ];

      models.forEach((model) => {
        expect(() => provider.setDefaultModel(model)).not.toThrow();
        expect(provider.getDefaultModel()).toBe(model);
      });
    });
  });

  describe('tool calling', () => {
    const request: GenerationRequest = {
      prompt: 'What is the weather in NYC?',
      tools: [
        {
          name: 'get_weather',
          description: 'Get current weather',
          parameters: {
            type: 'object',
            properties: {
              location: { type: 'string' },
              unit: { type: 'string' },
            },
            required: ['location'],
          },
        },
      ],
    };

    it('should pass tools to API', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        model: 'claude-3-7-sonnet-20250219',
        content: [{ type: 'text', text: 'Response' }],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 20,
          output_tokens: 10,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      await provider.generateResponse(request);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: [
            {
              name: 'get_weather',
              description: 'Get current weather',
              input_schema: {
                type: 'object',
                properties: {
                  location: { type: 'string' },
                  unit: { type: 'string' },
                },
                required: ['location'],
              },
            },
          ],
        })
      );
    });

    it('should handle tool use in response', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        model: 'claude-3-7-sonnet-20250219',
        content: [
          {
            type: 'tool_use',
            id: 'tool_abc',
            name: 'get_weather',
            input: {
              location: 'New York City',
              unit: 'fahrenheit',
            },
          },
        ],
        stop_reason: 'tool_use',
        usage: {
          input_tokens: 25,
          output_tokens: 15,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);

      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls?.[0]).toEqual({
        id: 'tool_abc',
        name: 'get_weather',
        arguments: {
          location: 'New York City',
          unit: 'fahrenheit',
        },
      });
    });

    it('should handle mixed text and tool use', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        model: 'claude-3-7-sonnet-20250219',
        content: [
          {
            type: 'text',
            text: 'Let me check the weather for you. ',
          },
          {
            type: 'tool_use',
            id: 'tool_123',
            name: 'get_weather',
            input: { location: 'NYC' },
          },
        ],
        stop_reason: 'tool_use',
        usage: {
          input_tokens: 20,
          output_tokens: 20,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);

      expect(response.content).toBe('Let me check the weather for you. ');
      expect(response.toolCalls).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('should handle very long prompts', async () => {
      const longPrompt = 'a'.repeat(10000);
      const request: GenerationRequest = {
        prompt: longPrompt,
      };

      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        model: 'claude-3-7-sonnet-20250219',
        content: [{ type: 'text', text: 'Processed' }],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 2500,
          output_tokens: 5,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);
      expect(response.content).toBe('Processed');
    });

    it('should handle special characters', async () => {
      const request: GenerationRequest = {
        prompt: 'Special chars: \n\t"\'\\',
      };

      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        model: 'claude-3-7-sonnet-20250219',
        content: [{ type: 'text', text: 'Handled' }],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 15,
          output_tokens: 5,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);
      expect(response.content).toBeDefined();
    });

    it('should handle empty content array', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        model: 'claude-3-7-sonnet-20250219',
        content: [],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 5,
          output_tokens: 0,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = { prompt: 'test' };
      const response = await provider.generateResponse(request);
      expect(response.content).toBe('');
    });

    it('should handle custom model in request', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        model: 'claude-3-opus-20240229',
        content: [{ type: 'text', text: 'Response' }],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 10,
          output_tokens: 10,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = {
        prompt: 'test',
        model: 'claude-3-opus-20240229',
      };

      await provider.generateResponse(request);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-opus-20240229',
        })
      );
    });
  });
});
