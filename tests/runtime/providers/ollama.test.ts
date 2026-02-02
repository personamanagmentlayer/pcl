// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - Ollama Provider Tests
// Comprehensive tests for Ollama local LLM provider
// ═══════════════════════════════════════════════════════════════════════════════

import type { GenerationRequest } from '../../../src/runtime/providers/index';
import { OllamaProvider } from '../../../src/runtime/providers/ollama';

// Mock Ollama SDK
vi.mock('ollama', () => {
  return {
    Ollama: vi.fn().mockImplementation(() => ({
      chat: vi.fn(),
      list: vi.fn(),
      pull: vi.fn(),
    })),
  };
});

describe('OllamaProvider', () => {
  let provider: OllamaProvider;
  let mockChat: any;
  let mockList: any;
  let mockPull: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create provider
    provider = new OllamaProvider();

    // Get references to mocked methods
    const client = (provider as any).client;
    mockChat = client.chat;
    mockList = client.list;
    mockPull = client.pull;
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Initialization
  // ───────────────────────────────────────────────────────────────────────────

  describe('initialization', () => {
    test('should create provider with default config', () => {
      expect(provider.name).toBe('ollama');
      expect(provider.capabilities).toBeDefined();
    });

    test('should use custom default model', () => {
      const customProvider = new OllamaProvider({
        defaultModel: 'mistral',
      });

      expect(customProvider.name).toBe('ollama');
    });

    test('should use custom host', () => {
      const customProvider = new OllamaProvider({
        host: 'http://custom-host:11434',
      });

      expect(customProvider.name).toBe('ollama');
    });

    test('should use custom timeout', () => {
      const customProvider = new OllamaProvider({
        timeout: 60000,
      });

      expect(customProvider.name).toBe('ollama');
    });

    test('should allow empty config', () => {
      const emptyProvider = new OllamaProvider({});
      expect(emptyProvider.name).toBe('ollama');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Capabilities
  // ───────────────────────────────────────────────────────────────────────────

  describe('capabilities', () => {
    test('should have correct capabilities', () => {
      expect(provider.capabilities.streaming).toBe(true);
      expect(provider.capabilities.toolCalling).toBe(false);
      expect(provider.capabilities.vision).toBe(true);
      expect(provider.capabilities.maxTokens).toBe(4096);
      expect(provider.capabilities.maxContextWindow).toBe(8192);
      expect(provider.capabilities.models).toContain('llama2');
      expect(provider.capabilities.models).toContain('mistral');
    });

    test('should support streaming', () => {
      expect(provider.capabilities.streaming).toBe(true);
    });

    test('should not support tool calling', () => {
      expect(provider.capabilities.toolCalling).toBe(false);
    });

    test('should support vision', () => {
      expect(provider.capabilities.vision).toBe(true);
    });

    test('should have multiple models available', () => {
      expect(provider.capabilities.models.length).toBeGreaterThan(3);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Response Generation
  // ───────────────────────────────────────────────────────────────────────────

  describe('generateResponse', () => {
    test('should generate response with mocked API', async () => {
      const mockResponse = {
        model: 'llama2',
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: 'Hello! How can I help you?',
        },
        done: true,
        done_reason: 'stop',
        total_duration: 1000000,
        load_duration: 100000,
        prompt_eval_count: 10,
        eval_count: 20,
      };

      mockChat.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = {
        prompt: 'Hello',
      };

      const response = await provider.generateResponse(request);

      expect(response.content).toBe('Hello! How can I help you?');
      expect(response.finishReason).toBe('stop');
      expect(response.usage.promptTokens).toBeGreaterThan(0);
      expect(response.usage.completionTokens).toBeGreaterThan(0);
      expect(response.usage.totalTokens).toBeGreaterThan(0);
      expect(response.metadata?.model).toBe('llama2');
    });

    test('should use default model when not specified', async () => {
      const mockResponse = {
        model: 'llama2',
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: 'Response',
        },
        done: true,
        done_reason: 'stop',
      };

      mockChat.mockResolvedValueOnce(mockResponse);

      await provider.generateResponse({
        prompt: 'Test',
      });

      expect(mockChat).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'llama2',
        })
      );
    });

    test('should use specified model', async () => {
      const mockResponse = {
        model: 'mistral',
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: 'Mistral response',
        },
        done: true,
        done_reason: 'stop',
      };

      mockChat.mockResolvedValueOnce(mockResponse);

      await provider.generateResponse({
        prompt: 'Test',
        model: 'mistral',
      });

      expect(mockChat).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'mistral',
        })
      );
    });

    test('should handle system prompt', async () => {
      const mockResponse = {
        model: 'llama2',
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: 'Formal response',
        },
        done: true,
        done_reason: 'stop',
      };

      mockChat.mockResolvedValueOnce(mockResponse);

      await provider.generateResponse({
        prompt: 'Hello',
        systemPrompt: 'You are a formal assistant.',
      });

      expect(mockChat).toHaveBeenCalledWith(
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
        model: 'llama2',
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: 'Follow-up response',
        },
        done: true,
        done_reason: 'stop',
      };

      mockChat.mockResolvedValueOnce(mockResponse);

      await provider.generateResponse({
        prompt: 'What did I ask?',
        history: [
          { from: 'user', content: 'Hello' },
          { from: 'assistant', content: 'Hi!' },
        ],
      });

      expect(mockChat).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user', content: 'Hello' }),
            expect.objectContaining({ role: 'assistant', content: 'Hi!' }),
          ]),
        })
      );
    });

    test('should handle temperature parameter', async () => {
      const mockResponse = {
        model: 'llama2',
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: 'Creative response',
        },
        done: true,
        done_reason: 'stop',
      };

      mockChat.mockResolvedValueOnce(mockResponse);

      await provider.generateResponse({
        prompt: 'Be creative',
        temperature: 1.5,
      });

      expect(mockChat).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            temperature: 1.5,
          }),
        })
      );
    });

    test('should handle maxTokens parameter', async () => {
      const mockResponse = {
        model: 'llama2',
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: 'Short',
        },
        done: true,
        done_reason: 'length',
      };

      mockChat.mockResolvedValueOnce(mockResponse);

      await provider.generateResponse({
        prompt: 'Write briefly',
        maxTokens: 100,
      });

      expect(mockChat).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            num_predict: 100,
          }),
        })
      );
    });

    test('should handle topP parameter', async () => {
      const mockResponse = {
        model: 'llama2',
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: 'Focused',
        },
        done: true,
        done_reason: 'stop',
      };

      mockChat.mockResolvedValueOnce(mockResponse);

      await provider.generateResponse({
        prompt: 'Focus',
        topP: 0.9,
      });

      expect(mockChat).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            top_p: 0.9,
          }),
        })
      );
    });

    test('should handle stop sequences', async () => {
      const mockResponse = {
        model: 'llama2',
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: 'Response',
        },
        done: true,
        done_reason: 'stop',
      };

      mockChat.mockResolvedValueOnce(mockResponse);

      await provider.generateResponse({
        prompt: 'Test',
        stopSequences: ['STOP', 'END'],
      });

      expect(mockChat).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            stop: ['STOP', 'END'],
          }),
        })
      );
    });

    test('should handle length finish reason', async () => {
      const mockResponse = {
        model: 'llama2',
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: 'Truncated',
        },
        done: true,
        done_reason: 'length',
      };

      mockChat.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse({
        prompt: 'Long prompt',
      });

      expect(response.finishReason).toBe('length');
    });

    test('should handle load error finish reason', async () => {
      const mockResponse = {
        model: 'llama2',
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: '',
        },
        done: true,
        done_reason: 'load',
      };

      mockChat.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse({
        prompt: 'Test',
      });

      expect(response.finishReason).toBe('error');
    });

    test('should handle API errors', async () => {
      mockChat.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(
        provider.generateResponse({
          prompt: 'Test',
        })
      ).rejects.toThrow('Ollama generation failed');
    });

    test('should include metadata in response', async () => {
      const mockResponse = {
        model: 'llama2',
        created_at: '2024-01-01T00:00:00Z',
        message: {
          role: 'assistant',
          content: 'Response',
        },
        done: true,
        done_reason: 'stop',
        total_duration: 5000000,
        load_duration: 1000000,
        prompt_eval_count: 15,
        eval_count: 25,
      };

      mockChat.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse({
        prompt: 'Test',
      });

      expect(response.metadata).toBeDefined();
      expect(response.metadata?.created_at).toBe('2024-01-01T00:00:00Z');
      expect(response.metadata?.total_duration).toBe(5000000);
    });

    test('should use default temperature when not specified', async () => {
      const mockResponse = {
        model: 'llama2',
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: 'Response',
        },
        done: true,
        done_reason: 'stop',
      };

      mockChat.mockResolvedValueOnce(mockResponse);

      await provider.generateResponse({
        prompt: 'Test',
      });

      expect(mockChat).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            temperature: 0.7,
          }),
        })
      );
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

      expect(tokens).toBe(25);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Model Management
  // ───────────────────────────────────────────────────────────────────────────

  describe('listModels', () => {
    test('should list available models', async () => {
      const mockModels = {
        models: [
          { name: 'llama2' },
          { name: 'mistral' },
          { name: 'codellama' },
        ],
      };

      mockList.mockResolvedValueOnce(mockModels);

      const models = await provider.listModels();

      expect(models).toEqual(['llama2', 'mistral', 'codellama']);
    });

    test('should handle empty model list', async () => {
      mockList.mockResolvedValueOnce({ models: [] });

      const models = await provider.listModels();

      expect(models).toEqual([]);
    });

    test('should handle list error', async () => {
      mockList.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(provider.listModels()).rejects.toThrow(
        'Failed to list Ollama models'
      );
    });
  });

  describe('pullModel', () => {
    test('should pull a model', async () => {
      mockPull.mockResolvedValueOnce({});

      await provider.pullModel('llama2');

      expect(mockPull).toHaveBeenCalledWith({
        model: 'llama2',
        stream: false,
      });
    });

    test('should handle pull error', async () => {
      mockPull.mockRejectedValueOnce(new Error('Download failed'));

      await expect(provider.pullModel('invalid-model')).rejects.toThrow(
        "Failed to pull Ollama model 'invalid-model'"
      );
    });
  });

  describe('isServerRunning', () => {
    test('should return true when server is running', async () => {
      mockList.mockResolvedValueOnce({ models: [] });

      const running = await provider.isServerRunning();

      expect(running).toBe(true);
    });

    test('should return false when server is not running', async () => {
      mockList.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const running = await provider.isServerRunning();

      expect(running).toBe(false);
    });

    test('should handle network errors gracefully', async () => {
      mockList.mockRejectedValueOnce(new Error('Network error'));

      const running = await provider.isServerRunning();

      expect(running).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Streaming (Basic Tests)
  // ───────────────────────────────────────────────────────────────────────────

  describe('streamResponse', () => {
    test('should handle streaming error', async () => {
      mockChat.mockRejectedValueOnce(new Error('Streaming failed'));

      const generator = provider.streamResponse({
        prompt: 'Test',
      });

      await expect(generator.next()).rejects.toThrow('Ollama streaming failed');
    });

    test('should create stream with correct parameters', async () => {
      const mockStream = (async function* () {
        yield {
          message: { content: 'test' },
          done: false,
        };
        yield {
          message: { content: '' },
          done: true,
          done_reason: 'stop',
        };
      })();

      mockChat.mockResolvedValueOnce(mockStream);

      const generator = provider.streamResponse({
        prompt: 'Test',
        temperature: 0.8,
      });

      await generator.next();

      expect(mockChat).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            temperature: 0.8,
          }),
          stream: true,
        })
      );
    });
  });
});
