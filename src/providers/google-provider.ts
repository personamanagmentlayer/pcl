/**
 * PCL Google Provider
 *
 * Implementation for Google Gemini models
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
 * Google API configuration
 */
interface GoogleConfig extends ProviderConfig {
  apiKey: string;
  baseUrl?: string;
}

/**
 * Available Google models
 */
const GOOGLE_MODELS: ModelInfo[] = [
  {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash (Experimental)',
    description: 'Next generation multimodal model',
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      jsonMode: true,
      systemMessages: true,
      maxContextTokens: 1000000, // 1M context
      maxOutputTokens: 8192,
      temperature: true,
      topP: true,
      topK: true,
      stopSequences: true,
      chatHistory: true,
    },
    inputTokenCost: 0.0, // Free during experimental
    outputTokenCost: 0.0,
    version: '2.0',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Most capable model with 2M context',
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      jsonMode: true,
      systemMessages: true,
      maxContextTokens: 2000000, // 2M context
      maxOutputTokens: 8192,
      temperature: true,
      topP: true,
      topK: true,
      stopSequences: true,
      chatHistory: true,
    },
    inputTokenCost: 1.25 / 1000000, // $1.25 per million (128K and below)
    outputTokenCost: 5.0 / 1000000, // $5.00 per million
    version: '1.5',
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    description: 'Fast and cost-effective model',
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      jsonMode: true,
      systemMessages: true,
      maxContextTokens: 1000000, // 1M context
      maxOutputTokens: 8192,
      temperature: true,
      topP: true,
      topK: true,
      stopSequences: true,
      chatHistory: true,
    },
    inputTokenCost: 0.075 / 1000000, // $0.075 per million (128K and below)
    outputTokenCost: 0.30 / 1000000, // $0.30 per million
    version: '1.5',
  },
];

/**
 * Google provider implementation
 */
export class GoogleProvider extends BaseProvider {
  readonly name = 'google';
  readonly displayName = 'Google';
  readonly version = '1.0.0';

  private apiKey: string = '';
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta';

  protected async doInitialize(config: ProviderConfig): Promise<void> {
    const googleConfig = config as GoogleConfig;
    this.apiKey = googleConfig.apiKey;
    if (googleConfig.baseUrl) {
      this.baseUrl = googleConfig.baseUrl;
    }

    // Cache models
    for (const model of GOOGLE_MODELS) {
      this.models.set(model.id, model);
    }
  }

  protected validateConfig(config: ProviderConfig): void {
    const googleConfig = config as GoogleConfig;
    if (!googleConfig.apiKey) {
      throw new Error('Google API key is required');
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    return GOOGLE_MODELS;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      streaming: true,
      functionCalling: true,
      vision: true,
      jsonMode: true,
      systemMessages: true,
      maxContextTokens: 2000000,
      maxOutputTokens: 8192,
      temperature: true,
      topP: true,
      topK: true,
      stopSequences: true,
      chatHistory: true,
    };
  }

  protected async doComplete(request: CompletionRequest): Promise<CompletionResponse> {
    const googleRequest = this.convertRequest(request);

    const response = await this.fetch(
      `${this.baseUrl}/models/${request.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleRequest),
      }
    );

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const googleResponse = await this.parseJsonResponse<{
      candidates: Array<{
        content: {
          parts: Array<{ text?: string }>;
        };
        finishReason: string;
      }>;
      usageMetadata?: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount: number;
      };
    }>(response);

    return this.convertResponse(googleResponse, request.model);
  }

  protected async *doStream(request: CompletionRequest): AsyncIterable<StreamChunk> {
    const googleRequest = this.convertRequest(request);

    const response = await this.fetch(
      `${this.baseUrl}/models/${request.model}:streamGenerateContent?key=${this.apiKey}&alt=sse`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleRequest),
      }
    );

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

          try {
            const event = JSON.parse(data) as {
              candidates: Array<{
                content: {
                  parts: Array<{ text?: string }>;
                };
                finishReason?: string;
              }>;
              usageMetadata?: {
                totalTokenCount: number;
              };
            };

            const candidate = event.candidates?.[0];
            if (candidate) {
              const text = candidate.content?.parts?.[0]?.text;

              if (text) {
                yield {
                  content: text,
                  done: false,
                };
              }

              if (candidate.finishReason) {
                if (event.usageMetadata) {
                  totalTokens = event.usageMetadata.totalTokenCount;
                }

                yield {
                  content: '',
                  done: true,
                  finishReason: this.convertFinishReason(candidate.finishReason),
                  usage: totalTokens
                    ? {
                        inputTokens: 0, // Google doesn't split in stream
                        outputTokens: 0,
                        totalTokens,
                      }
                    : undefined,
                };
              }
            }
          } catch (error) {
            if (this.config.debug) {
              console.error('[google] Failed to parse SSE event:', error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async countTokens(text: string, model?: string): Promise<number> {
    // Google uses approximately 4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Convert PCL request to Google format
   */
  private convertRequest(request: CompletionRequest) {
    const contents = [];

    // Add system instruction if present
    let systemInstruction;
    if (request.system) {
      systemInstruction = {
        parts: [{ text: request.system }],
      };
    }

    // Convert messages
    for (const message of request.messages) {
      if (message.role === 'system') {
        continue; // Already handled above
      }

      const role = message.role === 'assistant' ? 'model' : 'user';
      const text = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);

      contents.push({
        role,
        parts: [{ text }],
      });
    }

    const googleRequest: Record<string, unknown> = {
      contents,
    };

    if (systemInstruction) {
      googleRequest.systemInstruction = systemInstruction;
    }

    const generationConfig: Record<string, unknown> = {};

    if (request.maxTokens !== undefined) {
      generationConfig.maxOutputTokens = request.maxTokens;
    }

    if (request.temperature !== undefined) {
      generationConfig.temperature = request.temperature;
    }

    if (request.topP !== undefined) {
      generationConfig.topP = request.topP;
    }

    if (request.topK !== undefined) {
      generationConfig.topK = request.topK;
    }

    if (request.stopSequences) {
      generationConfig.stopSequences = request.stopSequences;
    }

    if (Object.keys(generationConfig).length > 0) {
      googleRequest.generationConfig = generationConfig;
    }

    return googleRequest;
  }

  /**
   * Convert Google response to PCL format
   */
  private convertResponse(
    response: {
      candidates: Array<{
        content: {
          parts: Array<{ text?: string }>;
        };
        finishReason: string;
      }>;
      usageMetadata?: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount: number;
      };
    },
    model: string
  ): CompletionResponse {
    const candidate = response.candidates[0];
    const text = candidate.content.parts.map((p) => p.text || '').join('');

    return {
      content: text,
      finishReason: this.convertFinishReason(candidate.finishReason),
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount || 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0,
      },
      model,
    };
  }

  /**
   * Convert Google finish reason to PCL format
   */
  private convertFinishReason(
    reason: string
  ): 'stop' | 'length' | 'function_call' | 'content_filter' | 'error' {
    switch (reason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'SAFETY':
        return 'content_filter';
      case 'RECITATION':
        return 'content_filter';
      default:
        return 'stop';
    }
  }
}
