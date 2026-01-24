/**
 * PCL DeepSeek Provider
 *
 * Implementation for DeepSeek models (OpenAI-compatible API)
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
 * DeepSeek API configuration
 */
interface DeepSeekConfig extends ProviderConfig {
  apiKey: string;
  baseUrl?: string;
}

/**
 * Available DeepSeek models
 */
const DEEPSEEK_MODELS: ModelInfo[] = [
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    description: 'High performance chat model',
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: false,
      jsonMode: true,
      systemMessages: true,
      maxContextTokens: 32000,
      maxOutputTokens: 4096,
      temperature: true,
      topP: true,
      topK: false,
      stopSequences: true,
      chatHistory: true,
    },
    inputTokenCost: 0.14 / 1000000, // $0.14 per million
    outputTokenCost: 0.28 / 1000000, // $0.28 per million
    version: '1.0',
  },
  {
    id: 'deepseek-coder',
    name: 'DeepSeek Coder',
    description: 'Specialized coding model',
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: false,
      jsonMode: true,
      systemMessages: true,
      maxContextTokens: 32000,
      maxOutputTokens: 4096,
      temperature: true,
      topP: true,
      topK: false,
      stopSequences: true,
      chatHistory: true,
    },
    inputTokenCost: 0.14 / 1000000,
    outputTokenCost: 0.28 / 1000000,
    version: '1.0',
  },
];

/**
 * DeepSeek provider implementation
 * Uses OpenAI-compatible API format
 */
export class DeepSeekProvider extends BaseProvider {
  readonly name = 'deepseek';
  readonly displayName = 'DeepSeek';
  readonly version = '1.0.0';

  private apiKey: string = '';
  private baseUrl: string = 'https://api.deepseek.com/v1';

  protected async doInitialize(config: ProviderConfig): Promise<void> {
    const deepseekConfig = config as DeepSeekConfig;
    this.apiKey = deepseekConfig.apiKey;
    if (deepseekConfig.baseUrl) {
      this.baseUrl = deepseekConfig.baseUrl;
    }

    // Cache models
    for (const model of DEEPSEEK_MODELS) {
      this.models.set(model.id, model);
    }
  }

  protected validateConfig(config: ProviderConfig): void {
    const deepseekConfig = config as DeepSeekConfig;
    if (!deepseekConfig.apiKey) {
      throw new Error('DeepSeek API key is required');
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    return DEEPSEEK_MODELS;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      streaming: true,
      functionCalling: true,
      vision: false,
      jsonMode: true,
      systemMessages: true,
      maxContextTokens: 32000,
      maxOutputTokens: 4096,
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
    const deepseekRequest = this.convertRequest(request);

    const response = await this.fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(deepseekRequest),
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const deepseekResponse = await this.parseJsonResponse<{
      choices: Array<{
        message: {
          content: string;
          role: string;
        };
        finish_reason: string;
      }>;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    }>(response);

    return this.convertResponse(deepseekResponse, request.model);
  }

  protected async *doStream(
    request: CompletionRequest
  ): AsyncIterable<StreamChunk> {
    const deepseekRequest = this.convertRequest(request);
    deepseekRequest.stream = true;

    const response = await this.fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(deepseekRequest),
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
                };
                finish_reason?: string;
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
              console.error('[deepseek] Failed to parse SSE event:', error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async countTokens(text: string, model?: string): Promise<number> {
    // Approximate token count
    return Math.ceil(text.length / 4);
  }

  /**
   * Convert PCL request to DeepSeek format (OpenAI-compatible)
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

    const deepseekRequest: Record<string, unknown> = {
      model: request.model,
      messages,
    };

    if (request.maxTokens !== undefined) {
      deepseekRequest.max_tokens = request.maxTokens;
    }

    if (request.temperature !== undefined) {
      deepseekRequest.temperature = request.temperature;
    }

    if (request.topP !== undefined) {
      deepseekRequest.top_p = request.topP;
    }

    if (request.stopSequences) {
      deepseekRequest.stop = request.stopSequences;
    }

    return deepseekRequest;
  }

  /**
   * Convert DeepSeek response to PCL format
   */
  private convertResponse(
    response: {
      choices: Array<{
        message: {
          content: string;
          role: string;
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

    return {
      content: choice.message.content,
      finishReason: this.convertFinishReason(choice.finish_reason),
      usage: {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
      model,
    };
  }

  /**
   * Convert DeepSeek finish reason to PCL format
   */
  private convertFinishReason(
    reason: string
  ): 'stop' | 'length' | 'function_call' | 'content_filter' | 'error' {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'function_call':
        return 'function_call';
      default:
        return 'stop';
    }
  }
}
