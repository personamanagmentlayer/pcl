// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - Google Gemini Provider Tests
// Comprehensive tests for Google Gemini AI provider
// ═══════════════════════════════════════════════════════════════════════════════

import type { GenerationRequest } from '../../../src/runtime/providers/index';
import { GeminiProvider } from '../../../src/runtime/providers/gemini';

// Mock Google Generative AI SDK
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: vi.fn(),
        generateContentStream: vi.fn(),
      }),
    })),
  };
});

describe('GeminiProvider', () => {
  let provider: GeminiProvider;
  let mockModel: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create provider with test API key
    provider = new GeminiProvider({
      apiKey: 'test-gemini-key',
    });

    // Get reference to mocked model
    mockModel = (provider as any).client.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Initialization
  // ───────────────────────────────────────────────────────────────────────────

  describe('initialization', () => {
    test('should create provider with valid API key', () => {
      expect(provider.name).toBe('gemini');
      expect(provider.capabilities).toBeDefined();
    });

    test('should throw error when API key is missing', () => {
      expect(() => {
        new GeminiProvider({} as any);
      }).toThrow('Gemini API key is required');
    });

    test('should use default configuration', () => {
      const defaultProvider = new GeminiProvider({
        apiKey: 'test-key',
      });

      expect(defaultProvider.name).toBe('gemini');
    });

    test('should accept custom default model', () => {
      const customProvider = new GeminiProvider({
        apiKey: 'test-key',
        defaultModel: 'gemini-1.5-pro',
      });

      expect(customProvider.name).toBe('gemini');
    });

    test('should accept custom base URL', () => {
      const customProvider = new GeminiProvider({
        apiKey: 'test-key',
        baseUrl: 'https://custom.googleapis.com',
      });

      expect(customProvider.name).toBe('gemini');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Capabilities
  // ───────────────────────────────────────────────────────────────────────────

  describe('capabilities', () => {
    test('should have correct capabilities', () => {
      expect(provider.capabilities.streaming).toBe(true);
      expect(provider.capabilities.toolCalling).toBe(true);
      expect(provider.capabilities.vision).toBe(true);
      expect(provider.capabilities.maxTokens).toBe(8192);
      expect(provider.capabilities.maxContextWindow).toBe(1_000_000);
      expect(provider.capabilities.models).toEqual([
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-1.0-pro',
      ]);
    });

    test('should support streaming', () => {
      expect(provider.capabilities.streaming).toBe(true);
    });

    test('should support tool calling', () => {
      expect(provider.capabilities.toolCalling).toBe(true);
    });

    test('should support vision', () => {
      expect(provider.capabilities.vision).toBe(true);
    });

    test('should have very large context window', () => {
      expect(provider.capabilities.maxContextWindow).toBeGreaterThan(500000);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Response Generation
  // ───────────────────────────────────────────────────────────────────────────

  describe('generateResponse', () => {
    test('should generate response with mocked API', async () => {
      const mockResponse = {
        response: {
          text: () => 'Hello! How can I help you?',
          candidates: [
            {
              finishReason: 'STOP',
            },
          ],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 20,
            totalTokenCount: 30,
          },
        },
      };

      mockModel.generateContent.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = {
        prompt: 'Hello',
      };

      const response = await provider.generateResponse(request);

      expect(response.content).toBe('Hello! How can I help you?');
      expect(response.finishReason).toBe('stop');
      expect(response.usage.promptTokens).toBe(10);
      expect(response.usage.completionTokens).toBe(20);
      expect(response.usage.totalTokens).toBe(30);
    });

    test('should use default model when not specified', async () => {
      const mockResponse = {
        response: {
          text: () => 'Response',
          candidates: [{ finishReason: 'STOP' }],
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 10,
            totalTokenCount: 15,
          },
        },
      };

      mockModel.generateContent.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = {
        prompt: 'Test',
      };

      const response = await provider.generateResponse(request);

      expect(response.metadata?.model).toBe('gemini-1.5-flash');
    });

    test('should use specified model', async () => {
      const mockResponse = {
        response: {
          text: () => 'Pro response',
          candidates: [{ finishReason: 'STOP' }],
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 10,
            totalTokenCount: 15,
          },
        },
      };

      mockModel.generateContent.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = {
        prompt: 'Test',
        model: 'gemini-1.5-pro',
      };

      const response = await provider.generateResponse(request);

      expect(response.metadata?.model).toBe('gemini-1.5-pro');
    });

    test('should handle system prompt', async () => {
      const mockResponse = {
        response: {
          text: () => 'Formal response',
          candidates: [{ finishReason: 'STOP' }],
          usageMetadata: {
            promptTokenCount: 15,
            candidatesTokenCount: 5,
            totalTokenCount: 20,
          },
        },
      };

      mockModel.generateContent.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = {
        prompt: 'Hello',
        systemPrompt: 'You are a formal assistant.',
      };

      await provider.generateResponse(request);

      // Check that system prompt was included in contents
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.arrayContaining([
            expect.objectContaining({
              parts: expect.arrayContaining([
                expect.objectContaining({
                  text: expect.stringContaining('You are a formal assistant.'),
                }),
              ]),
            }),
          ]),
        })
      );
    });

    test('should handle conversation history', async () => {
      const mockResponse = {
        response: {
          text: () => 'Follow-up response',
          candidates: [{ finishReason: 'STOP' }],
          usageMetadata: {
            promptTokenCount: 25,
            candidatesTokenCount: 10,
            totalTokenCount: 35,
          },
        },
      };

      mockModel.generateContent.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = {
        prompt: 'What did I just ask?',
        history: [
          { from: 'user', content: 'Hello' },
          { from: 'assistant', content: 'Hi there!' },
        ],
      };

      await provider.generateResponse(request);

      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.arrayContaining([
            expect.objectContaining({ role: 'user' }),
            expect.objectContaining({ role: 'model' }),
          ]),
        })
      );
    });

    test('should handle temperature parameter', async () => {
      const mockResponse = {
        response: {
          text: () => 'Creative response',
          candidates: [{ finishReason: 'STOP' }],
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 10,
            totalTokenCount: 15,
          },
        },
      };

      mockModel.generateContent.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = {
        prompt: 'Be creative',
        temperature: 1.5,
      };

      await provider.generateResponse(request);

      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          generationConfig: expect.objectContaining({
            temperature: 1.5,
          }),
        })
      );
    });

    test('should handle maxTokens parameter', async () => {
      const mockResponse = {
        response: {
          text: () => 'Short',
          candidates: [{ finishReason: 'MAX_TOKENS' }],
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 100,
            totalTokenCount: 105,
          },
        },
      };

      mockModel.generateContent.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = {
        prompt: 'Write briefly',
        maxTokens: 100,
      };

      await provider.generateResponse(request);

      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          generationConfig: expect.objectContaining({
            maxOutputTokens: 100,
          }),
        })
      );
    });

    test('should handle topP parameter', async () => {
      const mockResponse = {
        response: {
          text: () => 'Focused response',
          candidates: [{ finishReason: 'STOP' }],
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 10,
            totalTokenCount: 15,
          },
        },
      };

      mockModel.generateContent.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = {
        prompt: 'Focus',
        topP: 0.9,
      };

      await provider.generateResponse(request);

      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          generationConfig: expect.objectContaining({
            topP: 0.9,
          }),
        })
      );
    });

    test('should handle stop sequences', async () => {
      const mockResponse = {
        response: {
          text: () => 'Response',
          candidates: [{ finishReason: 'STOP' }],
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 5,
            totalTokenCount: 10,
          },
        },
      };

      mockModel.generateContent.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = {
        prompt: 'Test',
        stopSequences: ['STOP', 'END'],
      };

      await provider.generateResponse(request);

      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          generationConfig: expect.objectContaining({
            stopSequences: ['STOP', 'END'],
          }),
        })
      );
    });

    test('should handle MAX_TOKENS finish reason', async () => {
      const mockResponse = {
        response: {
          text: () => 'Truncated...',
          candidates: [{ finishReason: 'MAX_TOKENS' }],
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 100,
            totalTokenCount: 105,
          },
        },
      };

      mockModel.generateContent.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse({
        prompt: 'Long prompt',
      });

      expect(response.finishReason).toBe('length');
    });

    test('should handle SAFETY finish reason', async () => {
      const mockResponse = {
        response: {
          text: () => '',
          candidates: [{ finishReason: 'SAFETY' }],
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 0,
            totalTokenCount: 5,
          },
        },
      };

      mockModel.generateContent.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse({
        prompt: 'Inappropriate content',
      });

      expect(response.finishReason).toBe('error');
    });

    test('should handle RECITATION finish reason', async () => {
      const mockResponse = {
        response: {
          text: () => '',
          candidates: [{ finishReason: 'RECITATION' }],
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 0,
            totalTokenCount: 5,
          },
        },
      };

      mockModel.generateContent.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse({
        prompt: 'Copyrighted content',
      });

      expect(response.finishReason).toBe('error');
    });

    test('should handle missing usage metadata', async () => {
      const mockResponse = {
        response: {
          text: () => 'Response without metadata',
          candidates: [{ finishReason: 'STOP' }],
          usageMetadata: null,
        },
      };

      mockModel.generateContent.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse({
        prompt: 'Test',
      });

      expect(response.usage).toBeDefined();
      expect(response.usage.totalTokens).toBeGreaterThan(0);
    });

    test('should handle API errors', async () => {
      mockModel.generateContent.mockRejectedValueOnce(new Error('API error'));

      await expect(
        provider.generateResponse({
          prompt: 'Test',
        })
      ).rejects.toThrow('Gemini generation failed');
    });

    test('should handle candidate count in metadata', async () => {
      const mockResponse = {
        response: {
          text: () => 'Response',
          candidates: [{ finishReason: 'STOP' }, { finishReason: 'STOP' }],
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 10,
            totalTokenCount: 15,
          },
        },
      };

      mockModel.generateContent.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse({
        prompt: 'Test',
      });

      expect(response.metadata?.candidateCount).toBe(2);
    });

    test('should use default maxTokens when not specified', async () => {
      const mockResponse = {
        response: {
          text: () => 'Response',
          candidates: [{ finishReason: 'STOP' }],
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 10,
            totalTokenCount: 15,
          },
        },
      };

      mockModel.generateContent.mockResolvedValueOnce(mockResponse);

      await provider.generateResponse({
        prompt: 'Test',
      });

      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          generationConfig: expect.objectContaining({
            maxOutputTokens: 2048, // Default value
          }),
        })
      );
    });

    test('should use default temperature when not specified', async () => {
      const mockResponse = {
        response: {
          text: () => 'Response',
          candidates: [{ finishReason: 'STOP' }],
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 10,
            totalTokenCount: 15,
          },
        },
      };

      mockModel.generateContent.mockResolvedValueOnce(mockResponse);

      await provider.generateResponse({
        prompt: 'Test',
      });

      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          generationConfig: expect.objectContaining({
            temperature: 0.7, // Default value
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

      expect(tokens).toBe(25); // 100 / 4
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Streaming (Basic Tests)
  // ───────────────────────────────────────────────────────────────────────────

  describe('streamResponse', () => {
    test('should handle streaming error', async () => {
      mockModel.generateContentStream.mockRejectedValueOnce(
        new Error('Streaming failed')
      );

      const generator = provider.streamResponse({
        prompt: 'Test',
      });

      await expect(generator.next()).rejects.toThrow('Gemini streaming failed');
    });

    test('should create stream with correct parameters', async () => {
      // Mock stream
      const mockStream = {
        stream: (async function* () {
          yield {
            text: () => 'test',
            candidates: [{ finishReason: undefined }],
          };
        })(),
      };

      mockModel.generateContentStream.mockResolvedValueOnce(mockStream);

      const request: GenerationRequest = {
        prompt: 'Test',
        temperature: 0.8,
      };

      const generator = provider.streamResponse(request);
      await generator.next(); // Consume first chunk

      expect(mockModel.generateContentStream).toHaveBeenCalledWith(
        expect.objectContaining({
          generationConfig: expect.objectContaining({
            temperature: 0.8,
          }),
        })
      );
    });
  });
});
