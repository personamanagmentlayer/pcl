// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - OpenAI Provider Tests
// Comprehensive tests for GPT/ChatGPT integration
// ═══════════════════════════════════════════════════════════════════════════════

import { OpenAIProvider } from '../../../src/runtime/providers/openai';
import type { GenerationRequest } from '../../../src/runtime/providers';

// Mock OpenAI SDK
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    })),
  };
});

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  let mockCreate: any;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new OpenAIProvider({
      apiKey: 'test-openai-key',
    });
    mockCreate = (provider as any).client.chat.completions.create;
  });

  describe('initialization', () => {
    it('should initialize with API key', () => {
      const newProvider = new OpenAIProvider({
        apiKey: 'test-key',
      });

      expect(newProvider).toBeDefined();
      expect(newProvider.name).toBe('openai');
    });

    it('should initialize with organization', () => {
      const newProvider = new OpenAIProvider({
        apiKey: 'test-key',
        organization: 'org-123',
      });

      expect(newProvider).toBeDefined();
    });

    it('should initialize with custom base URL', () => {
      const newProvider = new OpenAIProvider({
        apiKey: 'test-key',
        baseURL: 'https://custom.openai.com',
      });

      expect(newProvider).toBeDefined();
    });

    it('should set default model', () => {
      expect(provider.getDefaultModel()).toBe('gpt-4-turbo-preview');
    });

    it('should accept custom default model', () => {
      const newProvider = new OpenAIProvider({
        apiKey: 'test-key',
        defaultModel: 'gpt-3.5-turbo',
      });

      expect(newProvider.getDefaultModel()).toBe('gpt-3.5-turbo');
    });
  });

  describe('capabilities', () => {
    it('should have correct capabilities', () => {
      const { capabilities } = provider;

      expect(capabilities.streaming).toBe(true);
      expect(capabilities.toolCalling).toBe(true);
      expect(capabilities.vision).toBe(true);
      expect(capabilities.maxTokens).toBe(4096);
      expect(capabilities.maxContextWindow).toBe(128000);
    });

    it('should list supported models', () => {
      const { capabilities } = provider;

      expect(capabilities.models).toContain('gpt-4-turbo-preview');
      expect(capabilities.models).toContain('gpt-4');
      expect(capabilities.models).toContain('gpt-3.5-turbo');
    });
  });

  describe('generateResponse', () => {
    const request: GenerationRequest = {
      prompt: 'Hello, GPT!',
      systemPrompt: 'You are a helpful assistant',
    };

    it('should generate response', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        model: 'gpt-4-turbo-preview',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Hello! How can I help you today?',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 15,
          total_tokens: 25,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);

      expect(response.content).toBe('Hello! How can I help you today?');
      expect(response.finishReason).toBe('stop');
      expect(response.usage?.promptTokens).toBe(10);
      expect(response.usage?.completionTokens).toBe(15);
      expect(response.usage?.totalTokens).toBe(25);
    });

    it('should include metadata', async () => {
      const mockResponse = {
        id: 'chatcmpl-456',
        model: 'gpt-4',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Test',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 5,
          total_tokens: 10,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);

      expect(response.metadata?.provider).toBe('openai');
      expect(response.metadata?.model).toBe('gpt-4');
      expect(response.metadata?.id).toBe('chatcmpl-456');
      expect(response.metadata?.finishReason).toBe('stop');
    });

    it('should handle custom parameters', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        model: 'gpt-4-turbo-preview',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Response',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 10,
          total_tokens: 20,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      await provider.generateResponse({
        ...request,
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        frequencyPenalty: 0.5,
        presencePenalty: 0.5,
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 0.9,
          frequency_penalty: 0.5,
          presence_penalty: 0.5,
        })
      );
    });

    it('should build messages with history', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        model: 'gpt-4-turbo-preview',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Follow-up',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 30,
          completion_tokens: 5,
          total_tokens: 35,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      await provider.generateResponse({
        prompt: 'Follow-up question',
        systemPrompt: 'System',
        history: [
          { from: 'user', content: 'First', timestamp: Date.now() },
          { from: 'assistant', content: 'Answer', timestamp: Date.now() },
        ],
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'System' },
            { role: 'user', content: 'First' },
            { role: 'assistant', content: 'Answer' },
            { role: 'user', content: 'Follow-up question' },
          ],
        })
      );
    });

    it('should handle length finish reason', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        model: 'gpt-4-turbo-preview',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Truncated',
            },
            finish_reason: 'length',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 4096,
          total_tokens: 4106,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);

      expect(response.finishReason).toBe('length');
    });

    it('should handle tool_calls finish reason', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        model: 'gpt-4-turbo-preview',
        choices: [
          {
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'get_weather',
                    arguments: '{"location": "NYC"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 15,
          total_tokens: 35,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);

      expect(response.finishReason).toBe('tool_use');
      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls?.[0]).toEqual({
        id: 'call_123',
        name: 'get_weather',
        arguments: { location: 'NYC' },
      });
    });

    it('should handle content_filter finish reason', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        model: 'gpt-4-turbo-preview',
        choices: [
          {
            message: {
              role: 'assistant',
              content: '',
            },
            finish_reason: 'content_filter',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 0,
          total_tokens: 10,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);

      expect(response.finishReason).toBe('error');
    });

    it('should handle API errors', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Rate limit exceeded'));

      await expect(provider.generateResponse(request)).rejects.toThrow(
        'OpenAI API error: Rate limit exceeded'
      );
    });

    it('should throw if no choices in response', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        model: 'gpt-4-turbo-preview',
        choices: [],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 0,
          total_tokens: 10,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      await expect(provider.generateResponse(request)).rejects.toThrow(
        'No response from OpenAI'
      );
    });

    it('should handle stop sequences', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        model: 'gpt-4-turbo-preview',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Response',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      await provider.generateResponse({
        ...request,
        stopSequences: ['\n\n', 'END'],
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          stop: ['\n\n', 'END'],
        })
      );
    });
  });

  describe('streamResponse', () => {
    const request: GenerationRequest = {
      prompt: 'Stream test',
    };

    it('should stream response chunks', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield {
            id: 'chatcmpl-stream-1',
            choices: [
              {
                delta: { content: 'Hello' },
                finish_reason: null,
              },
            ],
          };
          yield {
            id: 'chatcmpl-stream-2',
            choices: [
              {
                delta: { content: ' from' },
                finish_reason: null,
              },
            ],
          };
          yield {
            id: 'chatcmpl-stream-3',
            choices: [
              {
                delta: { content: ' OpenAI!' },
                finish_reason: 'stop',
              },
            ],
          };
        },
      };

      mockCreate.mockResolvedValueOnce(mockStream);

      const chunks: Array<{ content: string; done: boolean }> = [];
      for await (const chunk of provider.streamResponse(request)) {
        chunks.push({ content: chunk.content, done: chunk.done });
      }

      expect(chunks).toHaveLength(4);
      expect(chunks[0]).toEqual({ content: 'Hello', done: false });
      expect(chunks[1]).toEqual({ content: ' from', done: false });
      expect(chunks[2]).toEqual({ content: ' OpenAI!', done: false });
      expect(chunks[3]).toEqual({ content: '', done: true });
    });

    it('should pass stream: true parameter', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield {
            id: 'chatcmpl-stream-1',
            choices: [{ delta: { content: 'test' }, finish_reason: 'stop' }],
          };
        },
      };

      mockCreate.mockResolvedValueOnce(mockStream);

      const iterator = provider.streamResponse(request);
      await iterator.next();

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: true,
        })
      );
    });

    it('should handle empty delta content', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield {
            id: 'chatcmpl-stream-1',
            choices: [
              {
                delta: {},
                finish_reason: null,
              },
            ],
          };
          yield {
            id: 'chatcmpl-stream-2',
            choices: [
              {
                delta: { content: 'Content' },
                finish_reason: 'stop',
              },
            ],
          };
        },
      };

      mockCreate.mockResolvedValueOnce(mockStream);

      const chunks: string[] = [];
      for await (const chunk of provider.streamResponse(request)) {
        chunks.push(chunk.content);
      }

      expect(chunks).toEqual(['Content', '']);
    });

    it('should indicate when stream is done', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield {
            id: 'chatcmpl-stream-1',
            choices: [
              {
                delta: { content: 'Test' },
                finish_reason: null,
              },
            ],
          };
          yield {
            id: 'chatcmpl-stream-2',
            choices: [
              {
                delta: {},
                finish_reason: 'stop',
              },
            ],
          };
        },
      };

      mockCreate.mockResolvedValueOnce(mockStream);

      const chunks: Array<{ done: boolean; finishReason?: string }> = [];
      for await (const chunk of provider.streamResponse(request)) {
        chunks.push({ done: chunk.done, finishReason: chunk.finishReason });
      }

      expect(chunks[0].done).toBe(false);
      expect(chunks[1].done).toBe(true);
      expect(chunks[1].finishReason).toBe('stop');
    });

    it('should handle streaming errors', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Stream connection lost'));

      const iterator = provider.streamResponse(request);
      await expect(iterator.next()).rejects.toThrow(
        'OpenAI streaming error: Stream connection lost'
      );
    });
  });

  describe('countTokens', () => {
    it('should estimate token count', () => {
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
      const text = 'a'.repeat(400);
      const count = provider.countTokens(text);

      expect(count).toBe(100);
    });
  });

  describe('setDefaultModel', () => {
    it('should update default model', () => {
      provider.setDefaultModel('gpt-4');
      expect(provider.getDefaultModel()).toBe('gpt-4');
    });

    it('should throw for unsupported model', () => {
      expect(() => {
        provider.setDefaultModel('unknown-model');
      }).toThrow("Model 'unknown-model' not supported by OpenAI provider");
    });

    it('should accept all supported models', () => {
      const models = ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo-preview'];

      models.forEach((model) => {
        expect(() => provider.setDefaultModel(model)).not.toThrow();
        expect(provider.getDefaultModel()).toBe(model);
      });
    });
  });

  describe('tool calling', () => {
    const request: GenerationRequest = {
      prompt: 'What is the weather?',
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
    };

    it('should pass tools to API', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        model: 'gpt-4-turbo-preview',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Response',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 10,
          total_tokens: 30,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      await provider.generateResponse(request);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: [
            {
              type: 'function',
              function: {
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
            },
          ],
        })
      );
    });

    it('should handle multiple tool calls', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        model: 'gpt-4-turbo-preview',
        choices: [
          {
            message: {
              role: 'assistant',
              content: '',
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function',
                  function: {
                    name: 'get_weather',
                    arguments: '{"location": "NYC"}',
                  },
                },
                {
                  id: 'call_2',
                  type: 'function',
                  function: {
                    name: 'get_weather',
                    arguments: '{"location": "LA"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
        usage: {
          prompt_tokens: 25,
          completion_tokens: 20,
          total_tokens: 45,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);

      expect(response.toolCalls).toHaveLength(2);
      expect(response.toolCalls?.[0].name).toBe('get_weather');
      expect(response.toolCalls?.[1].name).toBe('get_weather');
    });
  });

  describe('edge cases', () => {
    it('should handle very long prompts', async () => {
      const longPrompt = 'a'.repeat(10000);
      const request: GenerationRequest = {
        prompt: longPrompt,
      };

      const mockResponse = {
        id: 'chatcmpl-123',
        model: 'gpt-4-turbo-preview',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Processed',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 2500,
          completion_tokens: 5,
          total_tokens: 2505,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);
      expect(response.content).toBe('Processed');
    });

    it('should handle null content', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        model: 'gpt-4-turbo-preview',
        choices: [
          {
            message: {
              role: 'assistant',
              content: null,
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 0,
          total_tokens: 10,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = { prompt: 'test' };
      const response = await provider.generateResponse(request);
      expect(response.content).toBe('');
    });

    it('should handle custom model in request', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        model: 'gpt-3.5-turbo',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Response',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 10,
          total_tokens: 20,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = {
        prompt: 'test',
        model: 'gpt-3.5-turbo',
      };

      await provider.generateResponse(request);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
        })
      );
    });
  });
});
