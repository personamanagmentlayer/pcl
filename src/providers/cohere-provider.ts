/**
 * PCL Cohere Provider
 *
 * Implementation for Cohere models
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
 * Cohere API configuration
 */
interface CohereConfig extends ProviderConfig {
  apiKey: string;
  baseUrl?: string;
}

/**
 * Available Cohere models
 */
const COHERE_MODELS: ModelInfo[] = [
  {
    id: 'command-r-plus',
    name: 'Command R+',
    description: 'Most powerful model for complex tasks, 128K context',
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: false,
      jsonMode: false,
      systemMessages: true,
      maxContextTokens: 128000,
      maxOutputTokens: 4096,
      temperature: true,
      topP: true,
      topK: true,
      stopSequences: true,
      chatHistory: true,
    },
    inputTokenCost: 2.5 / 1000000, // $2.50 per million
    outputTokenCost: 10.0 / 1000000, // $10.00 per million
    version: '1.0',
  },
  {
    id: 'command-r',
    name: 'Command R',
    description: 'Balanced model for most tasks, 128K context',
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: false,
      jsonMode: false,
      systemMessages: true,
      maxContextTokens: 128000,
      maxOutputTokens: 4096,
      temperature: true,
      topP: true,
      topK: true,
      stopSequences: true,
      chatHistory: true,
    },
    inputTokenCost: 0.15 / 1000000, // $0.15 per million
    outputTokenCost: 0.60 / 1000000, // $0.60 per million
    version: '1.0',
  },
  {
    id: 'command-light',
    name: 'Command Light',
    description: 'Fast and efficient for simple tasks',
    capabilities: {
      streaming: true,
      functionCalling: false,
      vision: false,
      jsonMode: false,
      systemMessages: true,
      maxContextTokens: 4096,
      maxOutputTokens: 4096,
      temperature: true,
      topP: true,
      topK: true,
      stopSequences: true,
      chatHistory: true,
    },
    inputTokenCost: 0.30 / 1000000, // $0.30 per million
    outputTokenCost: 0.60 / 1000000, // $0.60 per million
    version: '1.0',
  },
];

/**
 * Cohere provider implementation
 */
export class CohereProvider extends BaseProvider {
  readonly name = 'cohere';
  readonly displayName = 'Cohere';
  readonly version = '1.0.0';

  private apiKey: string = '';
  private baseUrl: string = 'https://api.cohere.ai/v1';

  protected async doInitialize(config: ProviderConfig): Promise<void> {
    const cohereConfig = config as CohereConfig;
    this.apiKey = cohereConfig.apiKey;
    if (cohereConfig.baseUrl) {
      this.baseUrl = cohereConfig.baseUrl;
    }

    // Cache models
    for (const model of COHERE_MODELS) {
      this.models.set(model.id, model);
    }
  }

  protected validateConfig(config: ProviderConfig): void {
    const cohereConfig = config as CohereConfig;
    if (!cohereConfig.apiKey) {
      throw new Error('Cohere API key is required');
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    return COHERE_MODELS;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      streaming: true,
      functionCalling: true,
      vision: false,
      jsonMode: false,
      systemMessages: true,
      maxContextTokens: 128000,
      maxOutputTokens: 4096,
      temperature: true,
      topP: true,
      topK: true,
      stopSequences: true,
      chatHistory: true,
    };
  }

  protected async doComplete(request: CompletionRequest): Promise<CompletionResponse> {
    const cohereRequest = this.convertRequest(request);

    const response = await this.fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(cohereRequest),
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const cohereResponse = await this.parseJsonResponse<{
      text: string;
      generation_id: string;
      finish_reason: string;
      meta: {
        tokens?: {
          input_tokens: number;
          output_tokens: number;
        };
      };
      tool_calls?: Array<{
        name: string;
        parameters: Record<string, unknown>;
      }>;
    }>(response);

    return this.convertResponse(cohereResponse, request.model);
  }

  protected async *doStream(request: CompletionRequest): AsyncIterable<StreamChunk> {
    const cohereRequest = this.convertRequest(request);
    cohereRequest.stream = true;

    const response = await this.fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(cohereRequest),
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
    let inputTokens = 0;
    let outputTokens = 0;

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
          if (!line.trim()) {
            continue;
          }

          try {
            const event = JSON.parse(line) as {
              event_type: string;
              text?: string;
              finish_reason?: string;
              response?: {
                meta?: {
                  tokens?: {
                    input_tokens: number;
                    output_tokens: number;
                  };
                };
              };
            };

            if (event.event_type === 'text-generation' && event.text) {
              yield {
                content: event.text,
                done: false,
              };
            }

            if (event.event_type === 'stream-end') {
              if (event.response?.meta?.tokens) {
                inputTokens = event.response.meta.tokens.input_tokens;
                outputTokens = event.response.meta.tokens.output_tokens;
              }

              yield {
                content: '',
                done: true,
                finishReason: this.convertFinishReason(event.finish_reason || 'COMPLETE'),
                usage: {
                  inputTokens,
                  outputTokens,
                  totalTokens: inputTokens + outputTokens,
                },
              };
            }
          } catch (error) {
            if (this.config.debug) {
              console.error('[cohere] Failed to parse event:', error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async countTokens(text: string, model?: string): Promise<number> {
    // Approximate: Cohere uses similar tokenization
    return Math.ceil(text.length / 4);
  }

  /**
   * Convert PCL request to Cohere format
   */
  private convertRequest(request: CompletionRequest) {
    // Cohere uses a different format: message as string + chat_history
    let message = '';
    const chatHistory = [];

    // Build chat history from messages
    for (let i = 0; i < request.messages.length; i++) {
      const msg = request.messages[i];
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);

      if (i === request.messages.length - 1) {
        // Last message is the current message
        message = content;
      } else {
        // Previous messages go into chat history
        chatHistory.push({
          role: msg.role === 'assistant' ? 'CHATBOT' : 'USER',
          message: content,
        });
      }
    }

    const cohereRequest: Record<string, unknown> = {
      model: request.model,
      message,
      stream: false,
    };

    if (chatHistory.length > 0) {
      cohereRequest.chat_history = chatHistory;
    }

    if (request.system) {
      cohereRequest.preamble = request.system;
    }

    if (request.maxTokens !== undefined) {
      cohereRequest.max_tokens = request.maxTokens;
    }

    if (request.temperature !== undefined) {
      cohereRequest.temperature = request.temperature;
    }

    if (request.topP !== undefined) {
      cohereRequest.p = request.topP;
    }

    if (request.topK !== undefined) {
      cohereRequest.k = request.topK;
    }

    if (request.stopSequences) {
      cohereRequest.stop_sequences = request.stopSequences;
    }

    if (request.tools) {
      cohereRequest.tools = request.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameter_definitions: this.convertToolSchema(tool.inputSchema),
      }));
    }

    return cohereRequest;
  }

  /**
   * Convert JSON schema to Cohere parameter definitions
   */
  private convertToolSchema(schema: Record<string, unknown>): Record<string, unknown> {
    const properties = schema.properties as Record<string, Record<string, unknown>>;
    const required = (schema.required as string[]) || [];
    const paramDefs: Record<string, unknown> = {};

    for (const [name, prop] of Object.entries(properties || {})) {
      paramDefs[name] = {
        description: prop.description || '',
        type: prop.type || 'string',
        required: required.includes(name),
      };
    }

    return paramDefs;
  }

  /**
   * Convert Cohere response to PCL format
   */
  private convertResponse(
    response: {
      text: string;
      finish_reason: string;
      meta: {
        tokens?: {
          input_tokens: number;
          output_tokens: number;
        };
      };
      tool_calls?: Array<{
        name: string;
        parameters: Record<string, unknown>;
      }>;
    },
    model: string
  ): CompletionResponse {
    const result: CompletionResponse = {
      content: response.text,
      finishReason: this.convertFinishReason(response.finish_reason),
      usage: {
        inputTokens: response.meta.tokens?.input_tokens || 0,
        outputTokens: response.meta.tokens?.output_tokens || 0,
        totalTokens:
          (response.meta.tokens?.input_tokens || 0) + (response.meta.tokens?.output_tokens || 0),
      },
      model,
    };

    if (response.tool_calls && response.tool_calls.length > 0) {
      const toolCall = response.tool_calls[0];
      result.functionCall = {
        name: toolCall.name,
        arguments: JSON.stringify(toolCall.parameters),
      };
    }

    return result;
  }

  /**
   * Convert Cohere finish reason to PCL format
   */
  private convertFinishReason(reason: string): 'stop' | 'length' | 'function_call' | 'content_filter' | 'error' {
    switch (reason) {
      case 'COMPLETE':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'TOOL_CALL':
        return 'function_call';
      case 'ERROR':
      case 'ERROR_TOXIC':
        return 'content_filter';
      default:
        return 'stop';
    }
  }
}
