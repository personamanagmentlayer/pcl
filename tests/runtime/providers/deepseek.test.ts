// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - DeepSeek Provider Tests
// Comprehensive tests for DeepSeek AI provider
// ═══════════════════════════════════════════════════════════════════════════════

import type { GenerationRequest } from '../../../src/runtime/providers/index';
import { DeepSeekProvider } from '../../../src/runtime/providers/deepseek';

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

describe('DeepSeekProvider', () => {
  let provider: DeepSeekProvider;
  let mockCreate: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create provider with test API key
    provider = new DeepSeekProvider({
      apiKey: 'test-deepseek-key',
    });

    // Get reference to mocked create function
    mockCreate = (provider as any).client.chat.completions.create;
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Initialization
  // ───────────────────────────────────────────────────────────────────────────

  describe('initialization', () => {
    test('should create provider with valid API key', () => {
      expect(provider.name).toBe('deepseek');
      expect(provider.capabilities).toBeDefined();
    });

    test('should throw error when API key is missing', () => {
      expect(() => {
        new DeepSeekProvider({} as any);
      }).toThrow('DeepSeek API key is required');
    });

    test('should use default configuration', () => {
      const defaultProvider = new DeepSeekProvider({
        apiKey: 'test-key',
      });

      expect(defaultProvider.name).toBe('deepseek');
    });

    test('should accept custom base URL', () => {
      const customProvider = new DeepSeekProvider({
        apiKey: 'test-key',
        baseUrl: 'https://custom.deepseek.com',
      });

      expect(customProvider.name).toBe('deepseek');
    });

    test('should accept custom default model', () => {
      const customProvider = new DeepSeekProvider({
        apiKey: 'test-key',
        defaultModel: 'deepseek-coder',
      });

      expect(customProvider.name).toBe('deepseek');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Capabilities
  // ───────────────────────────────────────────────────────────────────────────

  describe('capabilities', () => {
    test('should have correct capabilities', () => {
      expect(provider.capabilities.streaming).toBe(true);
      expect(provider.capabilities.toolCalling).toBe(true);
      expect(provider.capabilities.vision).toBe(false);
      expect(provider.capabilities.maxTokens).toBe(8192);
      expect(provider.capabilities.maxContextWindow).toBe(64_000);
      expect(provider.capabilities.models).toEqual([
        'deepseek-chat',
        'deepseek-coder',
      ]);
    });

    test('should support streaming', () => {
      expect(provider.capabilities.streaming).toBe(true);
    });

    test('should support tool calling', () => {
      expect(provider.capabilities.toolCalling).toBe(true);
    });

    test('should not support vision', () => {
      expect(provider.capabilities.vision).toBe(false);
    });

    test('should have high context window', () => {
      expect(provider.capabilities.maxContextWindow).toBeGreaterThan(60000);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Response Generation
  // ───────────────────────────────────────────────────────────────────────────

  describe('generateResponse', () => {
    test('should generate response with mocked API', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        model: 'deepseek-chat',
        choices: [
          {
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

      mockCreate.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = {
        prompt: 'Hello',
      };

      const response = await provider.generateResponse(request);

      expect(response.content).toBe('Hello! How can I help you?');
      expect(response.finishReason).toBe('stop');
      expect(response.usage.promptTokens).toBe(10);
      expect(response.usage.completionTokens).toBe(20);
      expect(response.usage.totalTokens).toBe(30);
      expect(response.metadata?.model).toBe('deepseek-chat');
      expect(response.metadata?.id).toBe('chatcmpl-123');
    });

    test('should use default model when not specified', async () => {
      const mockResponse = {
        id: 'chatcmpl-456',
        model: 'deepseek-chat',
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
          prompt_tokens: 5,
          completion_tokens: 10,
          total_tokens: 15,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = {
        prompt: 'Test',
      };

      await provider.generateResponse(request);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'deepseek-chat',
        })
      );
    });

    test('should use specified model', async () => {
      const mockResponse = {
        id: 'chatcmpl-789',
        model: 'deepseek-coder',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Code response',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 10,
          total_tokens: 15,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = {
        prompt: 'Write code',
        model: 'deepseek-coder',
      };

      await provider.generateResponse(request);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'deepseek-coder',
        })
      );
    });

    test('should handle system prompt', async () => {
      const mockResponse = {
        id: 'chatcmpl-sys',
        model: 'deepseek-chat',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Formal response',
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

      const request: GenerationRequest = {
        prompt: 'Hello',
        systemPrompt: 'You are a formal assistant.',
      };

      await provider.generateResponse(request);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: 'You are a formal assistant.',
            }),
          ]),
        })
      );
    });

    test('should handle conversation history', async () => {
      const mockResponse = {
        id: 'chatcmpl-hist',
        model: 'deepseek-chat',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Follow-up response',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 25,
          completion_tokens: 10,
          total_tokens: 35,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = {
        prompt: 'What did I just ask?',
        history: [
          { from: 'user', content: 'Hello' },
          { from: 'assistant', content: 'Hi there!' },
        ],
      };

      await provider.generateResponse(request);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user', content: 'Hello' }),
            expect.objectContaining({
              role: 'assistant',
              content: 'Hi there!',
            }),
          ]),
        })
      );
    });

    test('should handle temperature parameter', async () => {
      const mockResponse = {
        id: 'chatcmpl-temp',
        model: 'deepseek-chat',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Creative response',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 10,
          total_tokens: 15,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = {
        prompt: 'Be creative',
        temperature: 1.5,
      };

      await provider.generateResponse(request);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 1.5,
        })
      );
    });

    test('should handle maxTokens parameter', async () => {
      const mockResponse = {
        id: 'chatcmpl-max',
        model: 'deepseek-chat',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Short',
            },
            finish_reason: 'length',
          },
        ],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 100,
          total_tokens: 105,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = {
        prompt: 'Write briefly',
        maxTokens: 100,
      };

      await provider.generateResponse(request);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 100,
        })
      );
    });

    test('should handle topP parameter', async () => {
      const mockResponse = {
        id: 'chatcmpl-top',
        model: 'deepseek-chat',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Focused response',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 10,
          total_tokens: 15,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = {
        prompt: 'Focus',
        topP: 0.9,
      };

      await provider.generateResponse(request);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          top_p: 0.9,
        })
      );
    });

    test('should handle stop sequences', async () => {
      const mockResponse = {
        id: 'chatcmpl-stop',
        model: 'deepseek-chat',
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
          prompt_tokens: 5,
          completion_tokens: 5,
          total_tokens: 10,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = {
        prompt: 'Test',
        stopSequences: ['STOP', 'END'],
      };

      await provider.generateResponse(request);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          stop: ['STOP', 'END'],
        })
      );
    });

    test('should handle frequency penalty', async () => {
      const mockResponse = {
        id: 'chatcmpl-freq',
        model: 'deepseek-chat',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Varied response',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 10,
          total_tokens: 15,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = {
        prompt: 'Be varied',
        frequencyPenalty: 0.5,
      };

      await provider.generateResponse(request);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          frequency_penalty: 0.5,
        })
      );
    });

    test('should handle presence penalty', async () => {
      const mockResponse = {
        id: 'chatcmpl-pres',
        model: 'deepseek-chat',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Novel response',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 10,
          total_tokens: 15,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = {
        prompt: 'Be novel',
        presencePenalty: 0.8,
      };

      await provider.generateResponse(request);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          presence_penalty: 0.8,
        })
      );
    });

    test('should handle tool calls', async () => {
      const mockResponse = {
        id: 'chatcmpl-tools',
        model: 'deepseek-chat',
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
                    arguments: '{"city":"London"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = {
        prompt: 'What is the weather in London?',
        tools: [
          {
            name: 'get_weather',
            description: 'Get current weather',
            parameters: {
              type: 'object',
              properties: {
                city: { type: 'string' },
              },
            },
          },
        ],
      };

      const response = await provider.generateResponse(request);

      expect(response.toolCalls).toBeDefined();
      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls?.[0].name).toBe('get_weather');
      expect(response.toolCalls?.[0].arguments).toEqual({ city: 'London' });
      expect(response.toolCalls?.[0].id).toBe('call_123');
      expect(response.finishReason).toBe('tool_use');
    });

    test('should handle length finish reason', async () => {
      const mockResponse = {
        id: 'chatcmpl-length',
        model: 'deepseek-chat',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Truncated...',
            },
            finish_reason: 'length',
          },
        ],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 100,
          total_tokens: 105,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse({
        prompt: 'Long prompt',
      });

      expect(response.finishReason).toBe('length');
    });

    test('should handle API errors', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API error'));

      await expect(
        provider.generateResponse({
          prompt: 'Test',
        })
      ).rejects.toThrow('DeepSeek generation failed');
    });

    test('should handle null content', async () => {
      const mockResponse = {
        id: 'chatcmpl-null',
        model: 'deepseek-chat',
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
          prompt_tokens: 5,
          completion_tokens: 0,
          total_tokens: 5,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse({
        prompt: 'Test',
      });

      expect(response.content).toBe('');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Token Counting
  // ───────────────────────────────────────────────────────────────────────────

  describe('countTokens', () => {
    test('should count tokens approximately', () => {
      const text = 'Hello world';
      const tokens = provider.countTokens(text);

      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBe(Math.ceil(text.length / 4));
    });

    test('should handle empty string', () => {
      const tokens = provider.countTokens('');
      expect(tokens).toBe(0);
    });

    test('should handle long text', () => {
      const longText = 'word '.repeat(1000);
      const tokens = provider.countTokens(longText);

      expect(tokens).toBeGreaterThan(1000);
    });

    test('should use 4 characters per token approximation', () => {
      const text = 'a'.repeat(100);
      const tokens = provider.countTokens(text);

      expect(tokens).toBe(25); // 100 / 4
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Streaming (Basic Tests)
  // ───────────────────────────────────────────────────────────────────────────

  describe('streamResponse', () => {
    test('should handle streaming error', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Streaming failed'));

      const generator = provider.streamResponse({
        prompt: 'Test',
      });

      await expect(generator.next()).rejects.toThrow(
        'DeepSeek streaming failed'
      );
    });

    test('should create stream with correct parameters', async () => {
      // Mock empty stream
      const mockStream = (async function* () {
        yield {
          choices: [
            {
              delta: { content: 'test' },
              finish_reason: 'stop',
            },
          ],
        };
      })();

      mockCreate.mockResolvedValueOnce(mockStream);

      const request: GenerationRequest = {
        prompt: 'Test',
        temperature: 0.8,
      };

      const generator = provider.streamResponse(request);
      await generator.next(); // Consume first chunk

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: true,
          temperature: 0.8,
        })
      );
    });
  });
});
