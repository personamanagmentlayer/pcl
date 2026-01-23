/**
 * PCL Anthropic Provider
 *
 * Implementation for Anthropic Claude models
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
  ToolDefinition,
} from './provider-interface';

/**
 * Anthropic API configuration
 */
interface AnthropicConfig extends ProviderConfig {
  apiKey: string;
  baseUrl?: string;
}

/**
 * Anthropic message format
 */
interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image';
    text?: string;
    source?: {
      type: 'base64' | 'url';
      media_type: string;
      data: string;
    };
  }>;
}

/**
 * Anthropic completion request
 */
interface AnthropicCompletionRequest {
  model: string;
  messages: AnthropicMessage[];
  system?: string;
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  stream?: boolean;
  tools?: Array<{
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }>;
  metadata?: Record<string, unknown>;
}

/**
 * Anthropic completion response
 */
interface AnthropicCompletionResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text' | 'tool_use';
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
  }>;
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
  stop_sequence?: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Available Anthropic models
 */
const ANTHROPIC_MODELS: ModelInfo[] = [
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    description: 'Most intelligent model, excellent for complex tasks',
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      jsonMode: false,
      systemMessages: true,
      maxContextTokens: 200000,
      maxOutputTokens: 8192,
      temperature: true,
      topP: true,
      topK: true,
      stopSequences: true,
      chatHistory: true,
    },
    inputTokenCost: 3.0 / 1000000, // $3 per million
    outputTokenCost: 15.0 / 1000000, // $15 per million
    version: '2024-10-22',
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    description: 'Fastest model, great for quick responses',
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: false,
      jsonMode: false,
      systemMessages: true,
      maxContextTokens: 200000,
      maxOutputTokens: 8192,
      temperature: true,
      topP: true,
      topK: true,
      stopSequences: true,
      chatHistory: true,
    },
    inputTokenCost: 1.0 / 1000000, // $1 per million
    outputTokenCost: 5.0 / 1000000, // $5 per million
    version: '2024-10-22',
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    description: 'Previous generation, powerful model',
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      jsonMode: false,
      systemMessages: true,
      maxContextTokens: 200000,
      maxOutputTokens: 4096,
      temperature: true,
      topP: true,
      topK: true,
      stopSequences: true,
      chatHistory: true,
    },
    inputTokenCost: 15.0 / 1000000,
    outputTokenCost: 75.0 / 1000000,
    version: '2024-02-29',
  },
];

/**
 * Anthropic provider implementation
 */
export class AnthropicProvider extends BaseProvider {
  readonly name = 'anthropic';
  readonly displayName = 'Anthropic';
  readonly version = '1.0.0';

  private apiKey: string = '';
  private baseUrl: string = 'https://api.anthropic.com/v1';
  private readonly apiVersion = '2023-06-01';

  protected async doInitialize(config: ProviderConfig): Promise<void> {
    const anthropicConfig = config as AnthropicConfig;
    this.apiKey = anthropicConfig.apiKey;
    if (anthropicConfig.baseUrl) {
      this.baseUrl = anthropicConfig.baseUrl;
    }

    // Cache models
    for (const model of ANTHROPIC_MODELS) {
      this.models.set(model.id, model);
    }
  }

  protected validateConfig(config: ProviderConfig): void {
    const anthropicConfig = config as AnthropicConfig;
    if (!anthropicConfig.apiKey) {
      throw new Error('Anthropic API key is required');
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    return ANTHROPIC_MODELS;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      streaming: true,
      functionCalling: true,
      vision: true,
      jsonMode: false,
      systemMessages: true,
      maxContextTokens: 200000,
      maxOutputTokens: 8192,
      temperature: true,
      topP: true,
      topK: true,
      stopSequences: true,
      chatHistory: true,
    };
  }

  protected async doComplete(request: CompletionRequest): Promise<CompletionResponse> {
    const anthropicRequest = this.convertRequest(request);

    const response = await this.fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.apiVersion,
      },
      body: JSON.stringify(anthropicRequest),
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const anthropicResponse = await this.parseJsonResponse<AnthropicCompletionResponse>(response);
    return this.convertResponse(anthropicResponse);
  }

  protected async *doStream(request: CompletionRequest): AsyncIterable<StreamChunk> {
    const anthropicRequest = this.convertRequest(request);
    anthropicRequest.stream = true;

    const response = await this.fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.apiVersion,
      },
      body: JSON.stringify(anthropicRequest),
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
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

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
            const event = JSON.parse(data);

            if (event.type === 'content_block_delta' && event.delta?.text) {
              yield {
                content: event.delta.text,
                done: false,
              };
            } else if (event.type === 'message_start' && event.message?.usage) {
              totalInputTokens = event.message.usage.input_tokens;
            } else if (event.type === 'message_delta' && event.usage) {
              totalOutputTokens = event.usage.output_tokens;
            } else if (event.type === 'message_stop') {
              yield {
                content: '',
                done: true,
                finishReason: 'stop',
                usage: {
                  inputTokens: totalInputTokens,
                  outputTokens: totalOutputTokens,
                  totalTokens: totalInputTokens + totalOutputTokens,
                },
              };
            }
          } catch (error) {
            if (this.config.debug) {
              console.error('[anthropic] Failed to parse SSE event:', error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async countTokens(text: string, model?: string): Promise<number> {
    // Anthropic uses approximately 4 characters per token
    // This is a rough estimate - for precise counting, use the Anthropic tokenizer API
    return Math.ceil(text.length / 4);
  }

  /**
   * Convert PCL request to Anthropic format
   */
  private convertRequest(request: CompletionRequest): AnthropicCompletionRequest {
    const messages: AnthropicMessage[] = [];

    for (const message of request.messages) {
      if (message.role === 'system') {
        // System messages handled separately in Anthropic
        continue;
      }

      const content = Array.isArray(message.content)
        ? message.content.map((c) => {
            if (typeof c === 'string') {
              return { type: 'text' as const, text: c };
            } else if (c.type === 'text') {
              return { type: 'text' as const, text: c.text };
            } else if (c.type === 'image' && c.source) {
              return {
                type: 'image' as const,
                source: {
                  type: c.source.type === 'base64' ? ('base64' as const) : ('url' as const),
                  media_type: c.source.mediaType || 'image/png',
                  data: c.source.data || c.source.url || '',
                },
              };
            }
            return { type: 'text' as const, text: '' };
          })
        : typeof message.content === 'string'
          ? message.content
          : message.content.type === 'text'
            ? message.content.text
            : '';

      messages.push({
        role: message.role === 'user' ? 'user' : 'assistant',
        content,
      });
    }

    const anthropicRequest: AnthropicCompletionRequest = {
      model: request.model,
      messages,
      max_tokens: request.maxTokens || 4096,
    };

    if (request.system) {
      anthropicRequest.system = request.system;
    }

    if (request.temperature !== undefined) {
      anthropicRequest.temperature = request.temperature;
    }

    if (request.topP !== undefined) {
      anthropicRequest.top_p = request.topP;
    }

    if (request.topK !== undefined) {
      anthropicRequest.top_k = request.topK;
    }

    if (request.stopSequences) {
      anthropicRequest.stop_sequences = request.stopSequences;
    }

    if (request.tools) {
      anthropicRequest.tools = request.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      }));
    }

    if (request.metadata) {
      anthropicRequest.metadata = request.metadata;
    }

    return anthropicRequest;
  }

  /**
   * Convert Anthropic response to PCL format
   */
  private convertResponse(response: AnthropicCompletionResponse): CompletionResponse {
    // Extract text content
    const textContent = response.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text || '')
      .join('');

    // Extract tool use if present
    const toolUse = response.content.find((c) => c.type === 'tool_use');

    const result: CompletionResponse = {
      content: textContent,
      finishReason: this.convertFinishReason(response.stop_reason),
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      model: response.model,
    };

    if (toolUse) {
      result.functionCall = {
        name: toolUse.name || '',
        arguments: JSON.stringify(toolUse.input || {}),
      };
    }

    return result;
  }

  /**
   * Convert Anthropic finish reason to PCL format
   */
  private convertFinishReason(
    reason: string
  ): 'stop' | 'length' | 'function_call' | 'content_filter' | 'error' {
    switch (reason) {
      case 'end_turn':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'tool_use':
        return 'function_call';
      case 'stop_sequence':
        return 'stop';
      default:
        return 'stop';
    }
  }
}
