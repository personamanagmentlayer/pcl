// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - Azure Provider Tests
// Comprehensive tests for Azure OpenAI integration
// ═══════════════════════════════════════════════════════════════════════════════

import { AzureOpenAIProvider } from '../../../src/runtime/providers/azure';
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

describe('AzureOpenAIProvider', () => {
  let provider: AzureOpenAIProvider;
  let mockCreate: any;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new AzureOpenAIProvider({
      apiKey: 'test-azure-key',
      resourceName: 'test-resource',
      deployment: 'gpt-4',
    });
    mockCreate = (provider as any).client.chat.completions.create;
  });

  describe('initialization', () => {
    it('should initialize with required config', () => {
      const newProvider = new AzureOpenAIProvider({
        apiKey: 'test-key',
        resourceName: 'test-resource',
        deployment: 'gpt-4',
      });

      expect(newProvider).toBeDefined();
      expect(newProvider.name).toBe('azure');
    });

    it('should initialize with custom API version', () => {
      const newProvider = new AzureOpenAIProvider({
        apiKey: 'test-key',
        resourceName: 'test-resource',
        deployment: 'gpt-4',
        apiVersion: '2024-03-01-preview',
      });

      expect(newProvider).toBeDefined();
    });

    it('should throw without apiKey', () => {
      expect(() => {
        new AzureOpenAIProvider({
          apiKey: '',
          resourceName: 'test-resource',
          deployment: 'gpt-4',
        } as any);
      }).toThrow('Azure OpenAI API key is required');
    });

    it('should throw without resourceName', () => {
      expect(() => {
        new AzureOpenAIProvider({
          apiKey: 'test-key',
          resourceName: '',
          deployment: 'gpt-4',
        } as any);
      }).toThrow('Azure OpenAI resource name is required');
    });

    it('should throw without deployment', () => {
      expect(() => {
        new AzureOpenAIProvider({
          apiKey: 'test-key',
          resourceName: 'test-resource',
          deployment: '',
        } as any);
      }).toThrow('Azure OpenAI deployment name is required');
    });
  });

  describe('capabilities', () => {
    it('should have correct capabilities', () => {
      const { capabilities } = provider;

      expect(capabilities.streaming).toBe(true);
      expect(capabilities.toolCalling).toBe(true);
      expect(capabilities.vision).toBe(true);
      expect(capabilities.maxTokens).toBe(16384);
      expect(capabilities.maxContextWindow).toBe(128000);
      expect(capabilities.models).toContain('gpt-4');
    });

    it('should list supported models', () => {
      const { capabilities } = provider;

      expect(capabilities.models).toContain('gpt-4-turbo');
      expect(capabilities.models).toContain('gpt-4');
      expect(capabilities.models).toContain('gpt-35-turbo');
    });
  });

  describe('generateResponse', () => {
    const request: GenerationRequest = {
      prompt: 'Hello, Azure!',
      systemPrompt: 'You are a helpful assistant',
    };

    it('should generate response with mocked API', async () => {
      const mockResponse = {
        id: 'chatcmpl-azure-123',
        model: 'gpt-4',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Hello! How can I assist you with Azure today?',
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

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);

      expect(response.content).toBe(
        'Hello! How can I assist you with Azure today?'
      );
      expect(response.finishReason).toBe('stop');
      expect(response.usage?.promptTokens).toBe(10);
      expect(response.usage?.completionTokens).toBe(20);
      expect(response.usage?.totalTokens).toBe(30);
    });

    it('should include deployment in metadata', async () => {
      const mockResponse = {
        id: 'chatcmpl-azure-123',
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

      expect(response.metadata?.deployment).toBe('gpt-4');
      expect(response.metadata?.id).toBe('chatcmpl-azure-123');
    });

    it('should handle custom parameters', async () => {
      const mockResponse = {
        id: 'chatcmpl-azure-123',
        model: 'gpt-4',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Response with custom params',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 25,
          total_tokens: 40,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      await provider.generateResponse({
        ...request,
        temperature: 0.7,
        maxTokens: 500,
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
          max_tokens: 500,
        })
      );
    });

    it('should build messages correctly', async () => {
      const mockResponse = {
        id: 'chatcmpl-azure-123',
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
          prompt_tokens: 20,
          completion_tokens: 5,
          total_tokens: 25,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      await provider.generateResponse({
        prompt: 'Current message',
        systemPrompt: 'System instructions',
        history: [
          { from: 'user', content: 'Previous question', timestamp: Date.now() },
          {
            from: 'assistant',
            content: 'Previous answer',
            timestamp: Date.now(),
          },
        ],
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'System instructions' },
            { role: 'user', content: 'Previous question' },
            { role: 'assistant', content: 'Previous answer' },
            { role: 'user', content: 'Current message' },
          ],
        })
      );
    });

    it('should handle empty response content', async () => {
      const mockResponse = {
        id: 'chatcmpl-azure-123',
        model: 'gpt-4',
        choices: [
          {
            message: {
              role: 'assistant',
              content: '',
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

      const response = await provider.generateResponse(request);
      expect(response.content).toBe('');
    });

    it('should handle API errors', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Azure API error'));

      await expect(provider.generateResponse(request)).rejects.toThrow(
        'Azure OpenAI generation failed: Azure API error'
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
            id: 'chatcmpl-azure-stream-1',
            choices: [
              {
                delta: { content: 'Hello' },
                finish_reason: null,
              },
            ],
          };
          yield {
            id: 'chatcmpl-azure-stream-2',
            choices: [
              {
                delta: { content: ' from' },
                finish_reason: null,
              },
            ],
          };
          yield {
            id: 'chatcmpl-azure-stream-3',
            choices: [
              {
                delta: { content: ' Azure!' },
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

      expect(chunks).toEqual(['Hello', ' from', ' Azure!']);
    });

    it('should pass stream: true parameter', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield {
            id: 'chatcmpl-azure-stream-1',
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
            id: 'chatcmpl-azure-stream-1',
            choices: [
              {
                delta: {},
                finish_reason: null,
              },
            ],
          };
          yield {
            id: 'chatcmpl-azure-stream-2',
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

      expect(chunks).toEqual(['', 'Content']);
    });

    it('should indicate when stream is done', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield {
            id: 'chatcmpl-azure-stream-1',
            choices: [
              {
                delta: { content: 'Hello' },
                finish_reason: null,
              },
            ],
          };
          yield {
            id: 'chatcmpl-azure-stream-2',
            choices: [
              {
                delta: { content: ' there' },
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

      expect(chunks[0].done).toBe(false);
      expect(chunks[1].done).toBe(true);
    });

    it('should handle streaming errors', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Stream error'));

      const iterator = provider.streamResponse(request);
      await expect(iterator.next()).rejects.toThrow(
        'Azure OpenAI streaming failed: Stream error'
      );
    });
  });

  describe('tool calling', () => {
    const request: GenerationRequest = {
      prompt: 'What is the weather?',
      tools: [
        {
          name: 'get_weather',
          description: 'Get weather for a location',
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

    it('should handle tool calls in response', async () => {
      const mockResponse = {
        id: 'chatcmpl-azure-tool-123',
        model: 'gpt-4',
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
                    arguments: '{"location": "San Francisco"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 20,
          total_tokens: 70,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);

      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls?.[0]).toEqual({
        id: 'call_123',
        name: 'get_weather',
        arguments: { location: 'San Francisco' },
      });
    });

    it('should map tool_calls finish reason to tool_use', async () => {
      const mockResponse = {
        id: 'chatcmpl-azure-tool-123',
        model: 'gpt-4',
        choices: [
          {
            message: {
              role: 'assistant',
              content: '',
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
          prompt_tokens: 50,
          completion_tokens: 20,
          total_tokens: 70,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);

      expect(response.finishReason).toBe('tool_use');
    });

    it('should pass tools to API', async () => {
      const mockResponse = {
        id: 'chatcmpl-azure-123',
        model: 'gpt-4',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Using tools',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 30,
          completion_tokens: 10,
          total_tokens: 40,
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
                description: 'Get weather for a location',
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

  describe('finish reasons', () => {
    const request: GenerationRequest = {
      prompt: 'Test finish reasons',
    };

    it('should handle stop finish reason', async () => {
      const mockResponse = {
        id: 'chatcmpl-azure-stop',
        model: 'gpt-4',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Complete response',
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

      const response = await provider.generateResponse(request);
      expect(response.finishReason).toBe('stop');
    });

    it('should handle length finish reason', async () => {
      const mockResponse = {
        id: 'chatcmpl-azure-length',
        model: 'gpt-4',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Truncated due to',
            },
            finish_reason: 'length',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 100,
          total_tokens: 110,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);
      expect(response.finishReason).toBe('length');
    });

    it('should map content_filter to error', async () => {
      const mockResponse = {
        id: 'chatcmpl-azure-filter',
        model: 'gpt-4',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Filtered content',
            },
            finish_reason: 'content_filter',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);
      expect(response.finishReason).toBe('error');
    });
  });

  describe('edge cases', () => {
    it('should handle very long prompts', async () => {
      const longPrompt = 'a'.repeat(10000);
      const request: GenerationRequest = {
        prompt: longPrompt,
      };

      const mockResponse = {
        id: 'chatcmpl-azure-long',
        model: 'gpt-4',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Processed long message',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 2500,
          completion_tokens: 10,
          total_tokens: 2510,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);
      expect(response.content).toBe('Processed long message');
    });

    it('should handle special characters', async () => {
      const request: GenerationRequest = {
        prompt: 'Special chars: \n\t"\'\\',
      };

      const mockResponse = {
        id: 'chatcmpl-azure-special',
        model: 'gpt-4',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Handled special characters',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 5,
          total_tokens: 20,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);
      expect(response.content).toBeDefined();
    });

    it('should handle null finish reason', async () => {
      const mockResponse = {
        id: 'chatcmpl-azure-null',
        model: 'gpt-4',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Test',
            },
            finish_reason: null,
          },
        ],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 5,
          total_tokens: 10,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = { prompt: 'test' };
      const response = await provider.generateResponse(request);
      expect(response.finishReason).toBe('stop');
    });
  });
});
