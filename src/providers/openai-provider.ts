/**
 * PCL OpenAI Provider
 *
 * Implementation for OpenAI GPT models
 */

import { BaseProvider } from './base-provider';
import type {
  ProviderConfig,
  ProviderCapabilities,
  ModelInfo,
  CompletionRequest,
  CompletionResponse,
  StreamChunk,
  Message,
} from './provider-interface';

/**
 * OpenAI API configuration
 */
interface OpenAIConfig extends ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  organization?: string;
}

/**
 * OpenAI message format
 */
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string | null;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

/**
 * OpenAI completion request
 */
interface OpenAICompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stop?: string | string[];
  stream?: boolean;
  functions?: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
  function_call?: 'auto' | 'none' | { name: string };
  response_format?: { type: 'json_object' | 'text' };
}

/**
 * OpenAI completion response
 */
interface OpenAICompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      function_call?: {
        name: string;
        arguments: string;
      };
    };
    finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter' | null;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Available OpenAI models
 */
const OPENAI_MODELS: ModelInfo[] = [
  {
    id: 'gpt-4-turbo-2024-04-09',
    name: 'GPT-4 Turbo',
    description: 'Most capable GPT-4 model, 128K context',
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      jsonMode: true,
      systemMessages: true,
      maxContextTokens: 128000,
      maxOutputTokens: 4096,
      temperature: true,
      topP: true,
      topK: false,
      stopSequences: true,
      chatHistory: true,
    },
    inputTokenCost: 10.0 / 1000000, // $10 per million
    outputTokenCost: 30.0 / 1000000, // $30 per million
    version: '2024-04-09',
  },
  {
    id: 'gpt-4-0125-preview',
    name: 'GPT-4 0125',
    description: 'GPT-4 with improved instruction following',
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: false,
      jsonMode: true,
      systemMessages: true,
      maxContextTokens: 128000,
      maxOutputTokens: 4096,
      temperature: true,
      topP: true,
      topK: false,
      stopSequences: true,
      chatHistory: true,
    },
    inputTokenCost: 10.0 / 1000000,
    outputTokenCost: 30.0 / 1000000,
    version: '2024-01-25',
  },
  {
    id: 'gpt-3.5-turbo-0125',
    name: 'GPT-3.5 Turbo',
    description: 'Fast and cost-effective model',
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: false,
      jsonMode: true,
      systemMessages: true,
      maxContextTokens: 16385,
      maxOutputTokens: 4096,
      temperature: true,
      topP: true,
      topK: false,
      stopSequences: true,
      chatHistory: true,
    },
    inputTokenCost: 0.5 / 1000000, // $0.50 per million
    outputTokenCost: 1.5 / 1000000, // $1.50 per million
    version: '2024-01-25',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'High intelligence flagship model, multimodal',
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      jsonMode: true,
      systemMessages: true,
      maxContextTokens: 128000,
      maxOutputTokens: 4096,
      temperature: true,
      topP: true,
      topK: false,
      stopSequences: true,
      chatHistory: true,
    },
    inputTokenCost: 2.5 / 1000000, // $2.50 per million
    outputTokenCost: 10.0 / 1000000, // $10.00 per million
    version: '2024-05-13',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Affordable small model for fast tasks',
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      jsonMode: true,
      systemMessages: true,
      maxContextTokens: 128000,
      maxOutputTokens: 16384,
      temperature: true,
      topP: true,
      topK: false,
      stopSequences: true,
      chatHistory: true,
    },
    inputTokenCost: 0.15 / 1000000, // $0.15 per million
    outputTokenCost: 0.6 / 1000000, // $0.60 per million
    version: '2024-07-18',
  },
];

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider extends BaseProvider {
  readonly name = 'openai';
  readonly displayName = 'OpenAI';
  readonly version = '1.0.0';

  private apiKey: string = '';
  private organization?: string;
  private baseUrl: string = 'https://api.openai.com/v1';

  protected async doInitialize(config: ProviderConfig): Promise<void> {
    const openaiConfig = config as OpenAIConfig;
    this.apiKey = openaiConfig.apiKey;
    this.organization = openaiConfig.organization;
    if (openaiConfig.baseUrl) {
      this.baseUrl = openaiConfig.baseUrl;
    }

    // Cache models
    for (const model of OPENAI_MODELS) {
      this.models.set(model.id, model);
    }
  }

  protected validateConfig(config: ProviderConfig): void {
    const openaiConfig = config as OpenAIConfig;
    if (!openaiConfig.apiKey) {
      throw new Error('OpenAI API key is required');
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    return OPENAI_MODELS;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      streaming: true,
      functionCalling: true,
      vision: true,
      jsonMode: true,
      systemMessages: true,
      maxContextTokens: 128000,
      maxOutputTokens: 16384,
      temperature: true,
      topP: true,
      topK: false,
      stopSequences: true,
      chatHistory: true,
    };
  }

  protected async doComplete(request: CompletionRequest): Promise<CompletionResponse> {
    const openaiRequest = this.convertRequest(request);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }

    const response = await this.fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(openaiRequest),
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const openaiResponse = await this.parseJsonResponse<OpenAICompletionResponse>(response);
    return this.convertResponse(openaiResponse);
  }

  protected async *doStream(request: CompletionRequest): AsyncIterable<StreamChunk> {
    const openaiRequest = this.convertRequest(request);
    openaiRequest.stream = true;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }

    const response = await this.fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(openaiRequest),
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
                      inputTokens: 0, // OpenAI doesn't split in stream
                      outputTokens: 0,
                      totalTokens,
                    }
                  : undefined,
              };
            }
          } catch (error) {
            if (this.config.debug) {
              console.error('[openai] Failed to parse SSE event:', error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async countTokens(text: string, model?: string): Promise<number> {
    // OpenAI uses approximately 4 characters per token
    // For precise counting, you would need to use tiktoken library
    return Math.ceil(text.length / 4);
  }

  /**
   * Convert PCL request to OpenAI format
   */
  private convertRequest(request: CompletionRequest): OpenAICompletionRequest {
    const messages: OpenAIMessage[] = [];

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
      } else if (message.role === 'function' && message.functionResponse) {
        messages.push({
          role: 'function',
          name: message.functionResponse.name,
          content: message.functionResponse.content,
        });
      }
    }

    const openaiRequest: OpenAICompletionRequest = {
      model: request.model,
      messages,
    };

    if (request.maxTokens !== undefined) {
      openaiRequest.max_tokens = request.maxTokens;
    }

    if (request.temperature !== undefined) {
      openaiRequest.temperature = request.temperature;
    }

    if (request.topP !== undefined) {
      openaiRequest.top_p = request.topP;
    }

    if (request.stopSequences) {
      openaiRequest.stop = request.stopSequences;
    }

    if (request.tools) {
      openaiRequest.functions = request.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      }));
      openaiRequest.function_call = 'auto';
    }

    return openaiRequest;
  }

  /**
   * Convert OpenAI response to PCL format
   */
  private convertResponse(response: OpenAICompletionResponse): CompletionResponse {
    const choice = response.choices[0];

    const result: CompletionResponse = {
      content: choice.message.content || '',
      finishReason: this.convertFinishReason(choice.finish_reason || 'stop'),
      usage: {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
      model: response.model,
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
   * Convert OpenAI finish reason to PCL format
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
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }
}
