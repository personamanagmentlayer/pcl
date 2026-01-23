/**
 * PCL Groq Provider
 *
 * Implementation for Groq ultra-fast inference
 * OpenAI-compatible API
 */

import { BaseProvider } from './base-provider';
import type {
  ProviderConfig,
  ProviderCapabilities,
  ModelInfo,
  CompletionRequest,
  CompletionResponse,
  StreamChunk,
} from './provider-interface';

/**
 * Groq API configuration
 */
interface GroqConfig extends ProviderConfig {
  apiKey: string;
  baseUrl?: string;
}

/**
 * Available Groq models
 */
const GROQ_MODELS: ModelInfo[] = [
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B',
    description: 'Meta Llama 3.3 70B with ultra-fast inference',
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: false,
      jsonMode: true,
      systemMessages: true,
      maxContextTokens: 8192,
      maxOutputTokens: 8192,
      temperature: true,
      topP: true,
      topK: false,
      stopSequences: true,
      chatHistory: true,
    },
    inputTokenCost: 0.59 / 1000000, // $0.59 per million
    outputTokenCost: 0.79 / 1000000, // $0.79 per million
    version: '3.3',
  },
  {
    id: 'llama-3.1-70b-versatile',
    name: 'Llama 3.1 70B',
    description: 'Meta Llama 3.1 70B with 128K context',
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: false,
      jsonMode: true,
      systemMessages: true,
      maxContextTokens: 128000,
      maxOutputTokens: 8192,
      temperature: true,
      topP: true,
      topK: false,
      stopSequences: true,
      chatHistory: true,
    },
    inputTokenCost: 0.59 / 1000000,
    outputTokenCost: 0.79 / 1000000,
    version: '3.1',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    description: 'Ultra-fast Llama 3.1 8B for quick responses',
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: false,
      jsonMode: true,
      systemMessages: true,
      maxContextTokens: 128000,
      maxOutputTokens: 8192,
      temperature: true,
      topP: true,
      topK: false,
      stopSequences: true,
      chatHistory: true,
    },
    inputTokenCost: 0.05 / 1000000, // $0.05 per million
    outputTokenCost: 0.08 / 1000000, // $0.08 per million
    version: '3.1',
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B',
    description: 'Mistral Mixtral 8x7B with 32K context',
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: false,
      jsonMode: true,
      systemMessages: true,
      maxContextTokens: 32768,
      maxOutputTokens: 8192,
      temperature: true,
      topP: true,
      topK: false,
      stopSequences: true,
      chatHistory: true,
    },
    inputTokenCost: 0.24 / 1000000, // $0.24 per million
    outputTokenCost: 0.24 / 1000000, // $0.24 per million
    version: '0.1',
  },
  {
    id: 'gemma2-9b-it',
    name: 'Gemma 2 9B',
    description: 'Google Gemma 2 9B instruction-tuned',
    capabilities: {
      streaming: true,
      functionCalling: false,
      vision: false,
      jsonMode: true,
      systemMessages: true,
      maxContextTokens: 8192,
      maxOutputTokens: 8192,
      temperature: true,
      topP: true,
      topK: false,
      stopSequences: true,
      chatHistory: true,
    },
    inputTokenCost: 0.2 / 1000000, // $0.20 per million
    outputTokenCost: 0.2 / 1000000, // $0.20 per million
    version: '2',
  },
];

/**
 * Groq provider implementation
 * Uses OpenAI-compatible API for ultra-fast inference
 */
export class GroqProvider extends BaseProvider {
  readonly name = 'groq';
  readonly displayName = 'Groq';
  readonly version = '1.0.0';

  private apiKey: string = '';
  private baseUrl: string = 'https://api.groq.com/openai/v1';

  protected async doInitialize(config: ProviderConfig): Promise<void> {
    const groqConfig = config as GroqConfig;
    this.apiKey = groqConfig.apiKey;
    if (groqConfig.baseUrl) {
      this.baseUrl = groqConfig.baseUrl;
    }

    // Cache models
    for (const model of GROQ_MODELS) {
      this.models.set(model.id, model);
    }
  }

  protected validateConfig(config: ProviderConfig): void {
    const groqConfig = config as GroqConfig;
    if (!groqConfig.apiKey) {
      throw new Error('Groq API key is required');
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    return GROQ_MODELS;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      streaming: true,
      functionCalling: true,
      vision: false,
      jsonMode: true,
      systemMessages: true,
      maxContextTokens: 128000,
      maxOutputTokens: 8192,
      temperature: true,
      topP: true,
      topK: false,
      stopSequences: true,
      chatHistory: true,
    };
  }

  protected async doComplete(request: CompletionRequest): Promise<CompletionResponse> {
    const groqRequest = this.convertRequest(request);

    const response = await this.fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(groqRequest),
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const groqResponse = await this.parseJsonResponse<{
      id: string;
      choices: Array<{
        message: {
          role: string;
          content: string;
          function_call?: {
            name: string;
            arguments: string;
          };
        };
        finish_reason: string;
      }>;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    }>(response);

    return this.convertResponse(groqResponse, request.model);
  }

  protected async *doStream(request: CompletionRequest): AsyncIterable<StreamChunk> {
    const groqRequest = this.convertRequest(request);
    groqRequest.stream = true;

    const response = await this.fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(groqRequest),
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let totalTokens = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) {
            continue;
          }

          const data = line.slice(6);
          if (data === '[DONE]') {
            continue;
          }

          try {
            const event = JSON.parse(data) as {
              choices: Array<{
                delta: {
                  content?: string;
                  function_call?: { name?: string; arguments?: string };
                };
                finish_reason?: string | null;
              }>;
              usage?: {
                total_tokens: number;
              };
            };

            const delta = event.choices[0]?.delta;
            const finishReason = event.choices[0]?.finish_reason;

            if (delta?.content) {
              yield {
                content: delta.content,
                done: false,
              };
            }

            if (event.usage) {
              totalTokens = event.usage.total_tokens;
            }

            if (finishReason) {
              yield {
                content: '',
                done: true,
                finishReason: this.convertFinishReason(finishReason),
                usage: totalTokens
                  ? {
                      inputTokens: 0, // Groq doesn't split in stream
                      outputTokens: 0,
                      totalTokens,
                    }
                  : undefined,
              };
            }
          } catch (error) {
            if (this.config.debug) {
              console.error('[groq] Failed to parse SSE event:', error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async countTokens(text: string, model?: string): Promise<number> {
    // Approximate: similar to OpenAI tokenization
    return Math.ceil(text.length / 4);
  }

  /**
   * Convert PCL request to Groq (OpenAI-compatible) format
   */
  private convertRequest(request: CompletionRequest) {
    const messages = [];

    // Add system message if present
    if (request.system) {
      messages.push({
        role: 'system',
        content: request.system,
      });
    }

    // Convert messages
    for (const message of request.messages) {
      if (message.role === 'system') {
        messages.push({
          role: 'system',
          content: typeof message.content === 'string' ? message.content : '',
        });
      } else if (message.role === 'user' || message.role === 'assistant') {
        messages.push({
          role: message.role,
          content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
        });
      }
    }

    const groqRequest: Record<string, unknown> = {
      model: request.model,
      messages,
      stream: false,
    };

    if (request.maxTokens !== undefined) {
      groqRequest.max_tokens = request.maxTokens;
    }

    if (request.temperature !== undefined) {
      groqRequest.temperature = request.temperature;
    }

    if (request.topP !== undefined) {
      groqRequest.top_p = request.topP;
    }

    if (request.stopSequences) {
      groqRequest.stop = request.stopSequences;
    }

    if (request.tools) {
      groqRequest.functions = request.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      }));
      groqRequest.function_call = 'auto';
    }

    return groqRequest;
  }

  /**
   * Convert Groq response to PCL format
   */
  private convertResponse(
    response: {
      choices: Array<{
        message: {
          role: string;
          content: string;
          function_call?: {
            name: string;
            arguments: string;
          };
        };
        finish_reason: string;
      }>;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    },
    model: string
  ): CompletionResponse {
    const choice = response.choices[0];

    const result: CompletionResponse = {
      content: choice.message.content || '',
      finishReason: this.convertFinishReason(choice.finish_reason),
      usage: {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
      model,
    };

    if (choice.message.function_call) {
      result.functionCall = {
        name: choice.message.function_call.name,
        arguments: choice.message.function_call.arguments,
      };
    }

    return result;
  }

  /**
   * Convert Groq finish reason to PCL format
   */
  private convertFinishReason(reason: string): 'stop' | 'length' | 'function_call' | 'content_filter' | 'error' {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'function_call':
        return 'function_call';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }
}
