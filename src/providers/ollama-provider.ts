/**
 * PCL Ollama Provider
 *
 * Implementation for Ollama local models
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
 * Ollama API configuration
 */
interface OllamaConfig extends ProviderConfig {
  baseUrl?: string; // Default: http://localhost:11434
}

/**
 * Ollama provider implementation
 * Supports any locally installed Ollama model
 */
export class OllamaProvider extends BaseProvider {
  readonly name = 'ollama';
  readonly displayName = 'Ollama';
  readonly version = '1.0.0';

  private baseUrl: string = 'http://localhost:11434';
  private availableModels: ModelInfo[] = [];

  protected async doInitialize(config: ProviderConfig): Promise<void> {
    const ollamaConfig = config as OllamaConfig;
    if (ollamaConfig.baseUrl) {
      this.baseUrl = ollamaConfig.baseUrl;
    }

    // Fetch available models from Ollama
    try {
      await this.refreshModels();
    } catch (error) {
      if (this.config.debug) {
        console.warn('[ollama] Failed to fetch models:', error);
      }
      // Continue anyway - models can be added later
    }
  }

  protected validateConfig(config: ProviderConfig): void {
    // Ollama doesn't require API key
    // Just validate baseUrl if provided
    const ollamaConfig = config as OllamaConfig;
    if (ollamaConfig.baseUrl && !ollamaConfig.baseUrl.startsWith('http')) {
      throw new Error('Ollama baseUrl must start with http:// or https://');
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    // Refresh models from Ollama
    try {
      await this.refreshModels();
    } catch {
      // Return cached models if refresh fails
    }
    return this.availableModels;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      streaming: true,
      functionCalling: false, // Most local models don't support this
      vision: false, // Depends on model
      jsonMode: true,
      systemMessages: true,
      maxContextTokens: 4096, // Varies by model
      maxOutputTokens: 2048, // Varies by model
      temperature: true,
      topP: true,
      topK: true,
      stopSequences: true,
      chatHistory: true,
    };
  }

  protected async doComplete(
    request: CompletionRequest
  ): Promise<CompletionResponse> {
    const ollamaRequest = this.convertRequest(request);

    const response = await this.fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ollamaRequest),
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const ollamaResponse = await this.parseJsonResponse<{
      message: {
        role: string;
        content: string;
      };
      done: boolean;
      total_duration?: number;
      load_duration?: number;
      prompt_eval_count?: number;
      eval_count?: number;
    }>(response);

    return this.convertResponse(ollamaResponse, request.model);
  }

  protected async *doStream(
    request: CompletionRequest
  ): AsyncIterable<StreamChunk> {
    const ollamaRequest = this.convertRequest(request);
    ollamaRequest.stream = true;

    const response = await this.fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ollamaRequest),
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
          if (!line.trim()) {
            continue;
          }

          try {
            const event = JSON.parse(line) as {
              message?: {
                content: string;
              };
              done: boolean;
              prompt_eval_count?: number;
              eval_count?: number;
            };

            if (event.message?.content) {
              yield {
                content: event.message.content,
                done: false,
              };
            }

            if (event.done) {
              if (event.prompt_eval_count) {
                totalInputTokens = event.prompt_eval_count;
              }
              if (event.eval_count) {
                totalOutputTokens = event.eval_count;
              }

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
              console.error('[ollama] Failed to parse JSON line:', error);
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
   * Refresh available models from Ollama
   */
  private async refreshModels(): Promise<void> {
    const response = await this.fetch(`${this.baseUrl}/api/tags`);

    if (!response.ok) {
      throw new Error(`Failed to fetch Ollama models: ${response.statusText}`);
    }

    const data = await this.parseJsonResponse<{
      models: Array<{
        name: string;
        modified_at: string;
        size: number;
        digest: string;
        details?: {
          parameter_size?: string;
          quantization_level?: string;
        };
      }>;
    }>(response);

    this.availableModels = data.models.map((model) => ({
      id: model.name,
      name: model.name,
      description: `Ollama local model (${this.formatSize(model.size)})`,
      capabilities: {
        streaming: true,
        functionCalling: false,
        vision: model.name.includes('llava') || model.name.includes('vision'),
        jsonMode: true,
        systemMessages: true,
        maxContextTokens: this.estimateContextSize(model.name),
        maxOutputTokens: 2048,
        temperature: true,
        topP: true,
        topK: true,
        stopSequences: true,
        chatHistory: true,
      },
      inputTokenCost: 0, // Local models are free
      outputTokenCost: 0,
      version: model.details?.parameter_size || 'unknown',
    }));

    // Cache models
    for (const model of this.availableModels) {
      this.models.set(model.id, model);
    }
  }

  /**
   * Format model size for display
   */
  private formatSize(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)}GB`;
  }

  /**
   * Estimate context size based on model name
   */
  private estimateContextSize(modelName: string): number {
    const lower = modelName.toLowerCase();

    // Check for context size in name
    if (lower.includes('128k')) return 128000;
    if (lower.includes('64k')) return 64000;
    if (lower.includes('32k')) return 32000;
    if (lower.includes('16k')) return 16000;
    if (lower.includes('8k')) return 8000;

    // Defaults for common model families
    if (lower.includes('llama3')) return 8000;
    if (lower.includes('llama2')) return 4096;
    if (lower.includes('mistral')) return 8000;
    if (lower.includes('gemma')) return 8000;
    if (lower.includes('phi')) return 4096;
    if (lower.includes('qwen')) return 32000;

    return 4096; // Default fallback
  }

  /**
   * Convert PCL request to Ollama format
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

    const ollamaRequest: Record<string, unknown> = {
      model: request.model,
      messages,
      stream: false,
    };

    const options: Record<string, unknown> = {};

    if (request.temperature !== undefined) {
      options.temperature = request.temperature;
    }

    if (request.topP !== undefined) {
      options.top_p = request.topP;
    }

    if (request.topK !== undefined) {
      options.top_k = request.topK;
    }

    if (request.stopSequences) {
      options.stop = request.stopSequences;
    }

    if (Object.keys(options).length > 0) {
      ollamaRequest.options = options;
    }

    return ollamaRequest;
  }

  /**
   * Convert Ollama response to PCL format
   */
  private convertResponse(
    response: {
      message: {
        role: string;
        content: string;
      };
      done: boolean;
      prompt_eval_count?: number;
      eval_count?: number;
    },
    model: string
  ): CompletionResponse {
    return {
      content: response.message.content,
      finishReason: 'stop',
      usage: {
        inputTokens: response.prompt_eval_count || 0,
        outputTokens: response.eval_count || 0,
        totalTokens:
          (response.prompt_eval_count || 0) + (response.eval_count || 0),
      },
      model,
    };
  }
}
