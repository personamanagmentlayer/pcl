// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - Bedrock Provider Tests
// Comprehensive tests for AWS Bedrock integration
// ═══════════════════════════════════════════════════════════════════════════════

import { BedrockProvider } from '../../../src/runtime/providers/bedrock';
import type { GenerationRequest } from '../../../src/runtime/providers';

// Mock AWS SDK
vi.mock('@aws-sdk/client-bedrock-runtime', () => {
  return {
    BedrockRuntimeClient: vi.fn().mockImplementation(() => ({
      send: vi.fn(),
    })),
    InvokeModelCommand: vi.fn(),
    InvokeModelWithResponseStreamCommand: vi.fn(),
  };
});

describe('BedrockProvider', () => {
  let provider: BedrockProvider;
  let mockSend: any;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new BedrockProvider({
      region: 'us-east-1',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
    });
    mockSend = (provider as any).client.send;
  });

  describe('initialization', () => {
    it('should initialize with region', () => {
      const newProvider = new BedrockProvider({
        region: 'us-west-2',
      });

      expect(newProvider).toBeDefined();
      expect(newProvider.name).toBe('bedrock');
    });

    it('should initialize with credentials', () => {
      const newProvider = new BedrockProvider({
        region: 'us-east-1',
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
      });

      expect(newProvider).toBeDefined();
    });

    it('should throw without region', () => {
      expect(() => {
        new BedrockProvider({
          region: '',
        } as any);
      }).toThrow('AWS Bedrock region is required');
    });

    it('should set default model', () => {
      const newProvider = new BedrockProvider({
        region: 'us-east-1',
        defaultModel: 'anthropic.claude-3-opus-20240229-v1:0',
      });

      expect(newProvider).toBeDefined();
    });
  });

  describe('capabilities', () => {
    it('should have correct capabilities', () => {
      const { capabilities } = provider;

      expect(capabilities.streaming).toBe(true);
      expect(capabilities.toolCalling).toBe(true);
      expect(capabilities.vision).toBe(true);
      expect(capabilities.maxTokens).toBe(4096);
      expect(capabilities.maxContextWindow).toBe(200000);
    });

    it('should list supported models', () => {
      const { capabilities } = provider;

      expect(capabilities.models).toContain(
        'anthropic.claude-3-sonnet-20240229-v1:0'
      );
      expect(capabilities.models).toContain(
        'anthropic.claude-3-haiku-20240307-v1:0'
      );
      expect(capabilities.models).toContain('amazon.titan-text-express-v1');
      expect(capabilities.models).toContain('meta.llama2-70b-chat-v1');
    });
  });

  describe('generateResponse - Claude models', () => {
    const request: GenerationRequest = {
      prompt: 'Hello, Bedrock!',
      systemPrompt: 'You are a helpful assistant',
    };

    it('should generate response with Claude model', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [
              { text: 'Hello! How can I assist you with AWS Bedrock today?' },
            ],
            stop_reason: 'end_turn',
            usage: {
              input_tokens: 10,
              output_tokens: 20,
            },
          })
        ),
        $metadata: {
          requestId: 'test-request-id',
        },
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse({
        ...request,
        model: 'anthropic.claude-3-haiku-20240307-v1:0',
      });

      expect(response.content).toBe(
        'Hello! How can I assist you with AWS Bedrock today?'
      );
      expect(response.finishReason).toBe('stop');
      expect(response.usage?.promptTokens).toBe(10);
      expect(response.usage?.completionTokens).toBe(20);
      expect(response.usage?.totalTokens).toBe(30);
    });

    it('should use default model if not specified', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ text: 'Default model response' }],
            stop_reason: 'end_turn',
            usage: {
              input_tokens: 5,
              output_tokens: 5,
            },
          })
        ),
        $metadata: {
          requestId: 'test-request-id',
        },
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);

      expect(response.content).toBe('Default model response');
      expect(response.metadata?.model).toBe(
        'anthropic.claude-3-haiku-20240307-v1:0'
      );
    });

    it('should handle Claude messages with history', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ text: 'Response with history' }],
            stop_reason: 'end_turn',
            usage: {
              input_tokens: 30,
              output_tokens: 10,
            },
          })
        ),
        $metadata: {
          requestId: 'test-request-id',
        },
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      await provider.generateResponse({
        prompt: 'Follow-up question',
        history: [
          { from: 'user', content: 'First question', timestamp: Date.now() },
          { from: 'assistant', content: 'First answer', timestamp: Date.now() },
        ],
      });

      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle max_tokens finish reason', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ text: 'Truncated response' }],
            stop_reason: 'max_tokens',
            usage: {
              input_tokens: 10,
              output_tokens: 4096,
            },
          })
        ),
        $metadata: {
          requestId: 'test-request-id',
        },
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);

      expect(response.finishReason).toBe('length');
    });

    it('should handle tool_use finish reason', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ text: '' }],
            stop_reason: 'tool_use',
            usage: {
              input_tokens: 20,
              output_tokens: 10,
            },
          })
        ),
        $metadata: {
          requestId: 'test-request-id',
        },
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);

      expect(response.finishReason).toBe('tool_use');
    });

    it('should handle API errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('Bedrock API error'));

      await expect(provider.generateResponse(request)).rejects.toThrow(
        'AWS Bedrock generation failed: Bedrock API error'
      );
    });
  });

  describe('generateResponse - Titan models', () => {
    const request: GenerationRequest = {
      prompt: 'Hello, Titan!',
      systemPrompt: 'You are a helpful assistant',
      model: 'amazon.titan-text-express-v1',
    };

    it('should generate response with Titan model', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            inputTextTokenCount: 15,
            results: [
              {
                outputText: 'Hello from Titan!',
                tokenCount: 5,
              },
            ],
          })
        ),
        $metadata: {
          requestId: 'test-request-id',
        },
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);

      expect(response.content).toBe('Hello from Titan!');
      expect(response.finishReason).toBe('stop');
      expect(response.usage?.promptTokens).toBe(15);
      expect(response.usage?.completionTokens).toBe(5);
      expect(response.usage?.totalTokens).toBe(20);
    });

    it('should handle empty Titan response', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            inputTextTokenCount: 10,
            results: [
              {
                outputText: '',
                tokenCount: 0,
              },
            ],
          })
        ),
        $metadata: {
          requestId: 'test-request-id',
        },
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);

      expect(response.content).toBe('');
    });
  });

  describe('generateResponse - Llama models', () => {
    const request: GenerationRequest = {
      prompt: 'Hello, Llama!',
      systemPrompt: 'You are a helpful assistant',
      model: 'meta.llama2-70b-chat-v1',
    };

    it('should generate response with Llama model', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            generation: 'Hello from Llama!',
            prompt_token_count: 25,
            generation_token_count: 10,
            stop_reason: 'stop_sequence',
          })
        ),
        $metadata: {
          requestId: 'test-request-id',
        },
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);

      expect(response.content).toBe('Hello from Llama!');
      expect(response.finishReason).toBe('stop');
      expect(response.usage?.promptTokens).toBe(25);
      expect(response.usage?.completionTokens).toBe(10);
      expect(response.usage?.totalTokens).toBe(35);
    });

    it('should handle Llama length finish reason', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            generation: 'Truncated',
            prompt_token_count: 10,
            generation_token_count: 4096,
            stop_reason: 'max_tokens',
          })
        ),
        $metadata: {
          requestId: 'test-request-id',
        },
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);

      expect(response.finishReason).toBe('length');
    });
  });

  describe('streamResponse - Claude models', () => {
    const request: GenerationRequest = {
      prompt: 'Stream test',
      model: 'anthropic.claude-3-haiku-20240307-v1:0',
    };

    it('should stream response chunks', async () => {
      const mockStream = {
        body: {
          async *[Symbol.asyncIterator]() {
            yield {
              chunk: {
                bytes: new TextEncoder().encode(
                  JSON.stringify({
                    type: 'content_block_delta',
                    delta: { text: 'Hello' },
                  })
                ),
              },
            };
            yield {
              chunk: {
                bytes: new TextEncoder().encode(
                  JSON.stringify({
                    type: 'content_block_delta',
                    delta: { text: ' from' },
                  })
                ),
              },
            };
            yield {
              chunk: {
                bytes: new TextEncoder().encode(
                  JSON.stringify({
                    type: 'content_block_delta',
                    delta: { text: ' Bedrock!' },
                  })
                ),
              },
            };
            yield {
              chunk: {
                bytes: new TextEncoder().encode(
                  JSON.stringify({
                    type: 'message_stop',
                  })
                ),
              },
            };
          },
        },
      };

      mockSend.mockResolvedValueOnce(mockStream);

      const chunks: Array<{ content: string; done: boolean }> = [];
      for await (const chunk of provider.streamResponse(request)) {
        chunks.push({ content: chunk.content, done: chunk.done });
      }

      expect(chunks).toHaveLength(4);
      expect(chunks[0]).toEqual({ content: 'Hello', done: false });
      expect(chunks[1]).toEqual({ content: ' from', done: false });
      expect(chunks[2]).toEqual({ content: ' Bedrock!', done: false });
      expect(chunks[3]).toEqual({ content: '', done: true });
    });

    it('should handle empty chunks', async () => {
      const mockStream = {
        body: {
          async *[Symbol.asyncIterator]() {
            yield {
              chunk: {
                bytes: new TextEncoder().encode(
                  JSON.stringify({
                    type: 'content_block_delta',
                    delta: {},
                  })
                ),
              },
            };
            yield {
              chunk: {
                bytes: new TextEncoder().encode(
                  JSON.stringify({
                    type: 'message_stop',
                  })
                ),
              },
            };
          },
        },
      };

      mockSend.mockResolvedValueOnce(mockStream);

      const chunks: string[] = [];
      for await (const chunk of provider.streamResponse(request)) {
        chunks.push(chunk.content);
      }

      expect(chunks).toContain('');
    });

    it('should handle missing response body', async () => {
      mockSend.mockResolvedValueOnce({});

      const iterator = provider.streamResponse(request);
      await expect(iterator.next()).rejects.toThrow(
        'No response body from Bedrock'
      );
    });

    it('should handle streaming errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('Stream error'));

      const iterator = provider.streamResponse(request);
      await expect(iterator.next()).rejects.toThrow(
        'AWS Bedrock streaming failed: Stream error'
      );
    });
  });

  describe('streamResponse - Titan models', () => {
    const request: GenerationRequest = {
      prompt: 'Stream test',
      model: 'amazon.titan-text-express-v1',
    };

    it('should stream Titan chunks', async () => {
      const mockStream = {
        body: {
          async *[Symbol.asyncIterator]() {
            yield {
              chunk: {
                bytes: new TextEncoder().encode(
                  JSON.stringify({
                    outputText: 'Titan ',
                    completionReason: null,
                  })
                ),
              },
            };
            yield {
              chunk: {
                bytes: new TextEncoder().encode(
                  JSON.stringify({
                    outputText: 'response',
                    completionReason: 'FINISH',
                  })
                ),
              },
            };
          },
        },
      };

      mockSend.mockResolvedValueOnce(mockStream);

      const chunks: Array<{ content: string; done: boolean }> = [];
      for await (const chunk of provider.streamResponse(request)) {
        chunks.push({ content: chunk.content, done: chunk.done });
      }

      expect(chunks[0]).toEqual({ content: 'Titan ', done: false });
      expect(chunks[1]).toEqual({ content: 'response', done: true });
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

  describe('edge cases', () => {
    it('should handle very long prompts', async () => {
      const longPrompt = 'a'.repeat(10000);
      const request: GenerationRequest = {
        prompt: longPrompt,
      };

      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ text: 'Processed long message' }],
            stop_reason: 'end_turn',
            usage: {
              input_tokens: 2500,
              output_tokens: 10,
            },
          })
        ),
        $metadata: {
          requestId: 'test-request-id',
        },
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);
      expect(response.content).toBe('Processed long message');
    });

    it('should handle special characters', async () => {
      const request: GenerationRequest = {
        prompt: 'Special chars: \n\t"\'\\',
      };

      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ text: 'Handled special characters' }],
            stop_reason: 'end_turn',
            usage: {
              input_tokens: 15,
              output_tokens: 5,
            },
          })
        ),
        $metadata: {
          requestId: 'test-request-id',
        },
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse(request);
      expect(response.content).toBeDefined();
    });

    it('should handle unknown model with default response', async () => {
      const request: GenerationRequest = {
        prompt: 'Test',
        model: 'unknown.model-v1',
      };

      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            some: 'response',
          })
        ),
        $metadata: {
          requestId: 'test-request-id',
        },
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      // Unknown models default to empty content and error finish reason
      const response = await provider.generateResponse(request);
      expect(response.content).toBe('');
      expect(response.finishReason).toBe('error');
      expect(response.usage?.totalTokens).toBe(0);
    });

    it('should handle null finish reason', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ text: 'Test' }],
            stop_reason: null,
            usage: {
              input_tokens: 5,
              output_tokens: 5,
            },
          })
        ),
        $metadata: {
          requestId: 'test-request-id',
        },
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = { prompt: 'test' };
      const response = await provider.generateResponse(request);
      expect(response.finishReason).toBe('stop');
    });

    it('should handle missing content in Claude response', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [],
            stop_reason: 'end_turn',
            usage: {
              input_tokens: 5,
              output_tokens: 0,
            },
          })
        ),
        $metadata: {
          requestId: 'test-request-id',
        },
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = { prompt: 'test' };
      const response = await provider.generateResponse(request);
      expect(response.content).toBe('');
    });

    it('should handle missing results in Titan response', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            inputTextTokenCount: 10,
            results: [],
          })
        ),
        $metadata: {
          requestId: 'test-request-id',
        },
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = {
        prompt: 'test',
        model: 'amazon.titan-text-express-v1',
      };
      const response = await provider.generateResponse(request);
      expect(response.content).toBe('');
    });
  });

  describe('configuration options', () => {
    it('should handle custom temperature', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ text: 'Response' }],
            stop_reason: 'end_turn',
            usage: {
              input_tokens: 5,
              output_tokens: 5,
            },
          })
        ),
        $metadata: {
          requestId: 'test-request-id',
        },
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      await provider.generateResponse({
        prompt: 'Test',
        temperature: 0.9,
      });

      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle custom max tokens', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ text: 'Response' }],
            stop_reason: 'end_turn',
            usage: {
              input_tokens: 5,
              output_tokens: 5,
            },
          })
        ),
        $metadata: {
          requestId: 'test-request-id',
        },
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      await provider.generateResponse({
        prompt: 'Test',
        maxTokens: 2000,
      });

      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle stop sequences', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ text: 'Response' }],
            stop_reason: 'stop_sequence',
            usage: {
              input_tokens: 5,
              output_tokens: 5,
            },
          })
        ),
        $metadata: {
          requestId: 'test-request-id',
        },
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateResponse({
        prompt: 'Test',
        stopSequences: ['\n\n', 'END'],
      });

      expect(mockSend).toHaveBeenCalled();
      expect(response.finishReason).toBe('stop');
    });
  });

  describe('metadata', () => {
    it('should include request ID in metadata', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ text: 'Test' }],
            stop_reason: 'end_turn',
            usage: {
              input_tokens: 5,
              output_tokens: 5,
            },
          })
        ),
        $metadata: {
          requestId: 'unique-request-id-12345',
        },
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = { prompt: 'test' };
      const response = await provider.generateResponse(request);

      expect(response.metadata?.requestId).toBe('unique-request-id-12345');
    });

    it('should include model in metadata', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ text: 'Test' }],
            stop_reason: 'end_turn',
            usage: {
              input_tokens: 5,
              output_tokens: 5,
            },
          })
        ),
        $metadata: {
          requestId: 'test-id',
        },
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const request: GenerationRequest = {
        prompt: 'test',
        model: 'anthropic.claude-3-opus-20240229-v1:0',
      };
      const response = await provider.generateResponse(request);

      expect(response.metadata?.model).toBe(
        'anthropic.claude-3-opus-20240229-v1:0'
      );
    });
  });
});
