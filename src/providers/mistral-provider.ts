/**
 * PCL Mistral AI Provider
 *
 * Implementation for Mistral AI models
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
 * Mistral API configuration
 */
interface MistralConfig extends ProviderConfig {
  apiKey: string;
  baseUrl?: string;
}

/**
 * Available Mistral models
 */
const MISTRAL_MODELS: ModelInfo[] = [
  {
    id: 'mistral-large-latest',
    name: 'Mistral Large',
    description: 'Flagship model with top-tier reasoning, 128K context',
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
    inputTokenCost: 2.0 / 1000000, // $2 per million
    outputTokenCost: 6.0 / 1000000, // $6 per million
    version: 'latest',
  },
  {
    id: 'mistral-small-latest',
    name: 'Mistral Small',
    description: 'Cost-efficient model for simple tasks, 128K context',
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
    inputTokenCost: 0.2 / 1000000, // $0.20 per million
    outputTokenCost: 0.6 / 1000000, // $0.60 per million
    version: 'latest',
  },
  {
    id: 'codestral-latest',
    name: 'Codestral',
    description: 'Specialized for code generation and completion, 32K context',
    capabilities: {
      streaming: true,
      functionCalling: false,
      vision: false,
      jsonMode: true,
      systemMessages: true,
      maxContextTokens: 32000,
      maxOutputTokens: 8192,
      temperature: true,
      topP: true,
      topK: false,
      stopSequences: true,
      chatHistory: true,
    },
    inputTokenCost: 0.2 / 1000000, // $0.20 per million
    outputTokenCost: 0.6 / 1000000, // $0.60 per million
    version: 'latest',
  },
  {
    id: 'open-mistral-nemo',
    name: 'Mistral Nemo',
    description: 'Open-weight model, 128K context, multilingual',
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
    inputTokenCost: 0.15 / 1000000, // $0.15 per million
    outputTokenCost: 0.15 / 1000000, // $0.15 per million
    version: '2024-07',
  },
];

/**
 * Mistral AI provider implementation
 */
export class MistralProvider extends BaseProvider {
  readonly name = 'mistral';
  readonly displayName = 'Mistral AI';
  readonly version = '1.0.0';

  private apiKey: string = '';
  private baseUrl: string = 'https://api.mistral.ai/v1';

  protected async doInitialize(config: ProviderConfig): Promise<void> {
    const mistralConfig = config as MistralConfig;
    this.apiKey = mistralConfig.apiKey;
    if (mistralConfig.baseUrl) {
      this.baseUrl = mistralConfig.baseUrl;
    }

    // Cache models
    for (const model of MISTRAL_MODELS) {
      this.models.set(model.id, model);
    }
  }

  protected validateConfig(config: ProviderConfig): void {
    const mistralConfig = config as MistralConfig;
    if (!mistralConfig.apiKey) {
      throw new Error('Mistral API key is required');
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    return MISTRAL_MODELS;
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

  protected async doComplete(
    request: CompletionRequest
  ): Promise<CompletionResponse> {
    const mistralRequest = this.convertRequest(request);

    const response = await this.fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(mistralRequest),
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const mistralResponse = await this.parseJsonResponse<{
      id: string;
      choices: Array<{
        message: {
          role: string;
          content: string;
          tool_calls?: Array<{
            function: {
              name: string;
              arguments: string;
            };
          }>;
        };
        finish_reason: string;
      }>;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    }>(response);

    return this.convertResponse(mistralResponse, request.model);
  }

  protected async *doStream(
    request: CompletionRequest
  ): AsyncIterable<StreamChunk> {
    const mistralRequest = this.convertRequest(request);
    mistralRequest.stream = true;

    const response = await this.fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(mistralRequest),
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
                  tool_calls?: Array<{
                    function?: {
                      name?: string;
                      arguments?: string;
                    };
                  }>;
                };
                finish_reason?: string | null;
              }>;
            };

            const delta = event.choices[0]?.delta;
            const finishReason = event.choices[0]?.finish_reason;

            if (delta?.content) {
              yield {
                content: delta.content,
                done: false,
              };
            }

            if (finishReason) {
              yield {
                content: '',
                done: true,
                finishReason: this.convertFinishReason(finishReason),
              };
            }
          } catch (error) {
            if (this.config.debug) {
              console.error('[mistral] Failed to parse SSE event:', error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async countTokens(text: string, model?: string): Promise<number> {
    // Approximate: Mistral uses similar tokenization to GPT
    return Math.ceil(text.length / 4);
  }

  /**
   * Convert PCL request to Mistral format
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
      messages.push({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content:
          typeof message.content === 'string'
            ? message.content
            : JSON.stringify(message.content),
      });
    }

    const mistralRequest: Record<string, unknown> = {
      model: request.model,
      messages,
      stream: false,
    };

    if (request.maxTokens !== undefined) {
      mistralRequest.max_tokens = request.maxTokens;
    }

    if (request.temperature !== undefined) {
      mistralRequest.temperature = request.temperature;
    }

    if (request.topP !== undefined) {
      mistralRequest.top_p = request.topP;
    }

    if (request.stopSequences) {
      mistralRequest.stop = request.stopSequences;
    }

    if (request.tools) {
      mistralRequest.tools = request.tools.map((tool) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
        },
      }));
    }

    return mistralRequest;
  }

  /**
   * Convert Mistral response to PCL format
   */
  private convertResponse(
    response: {
      choices: Array<{
        message: {
          role: string;
          content: string;
          tool_calls?: Array<{
            function: {
              name: string;
              arguments: string;
            };
          }>;
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

    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      result.functionCall = {
        name: toolCall.function.name,
        arguments: toolCall.function.arguments,
      };
    }

    return result;
  }

  /**
   * Convert Mistral finish reason to PCL format
   */
  private convertFinishReason(
    reason: string
  ): 'stop' | 'length' | 'function_call' | 'content_filter' | 'error' {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'tool_calls':
        return 'function_call';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }
}
