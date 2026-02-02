// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - Ollama Provider
// Local LLM inference with Ollama
// ═══════════════════════════════════════════════════════════════════════════════

import { Ollama } from 'ollama';
import type {
  AIProvider,
  ProviderCapabilities,
  GenerationRequest,
  GenerationResponse,
  GenerationChunk,
  FinishReason,
  TokenUsage,
} from './index';

// ─────────────────────────────────────────────────────────────────────────────
// Ollama Provider Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface OllamaProviderConfig {
  /** Default model to use (e.g., 'llama2', 'mistral', 'codellama') */
  defaultModel?: string;

  /** Ollama host URL (defaults to http://localhost:11434) */
  host?: string;

  /** Request timeout in milliseconds */
  timeout?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ollama Provider
// ─────────────────────────────────────────────────────────────────────────────

export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';

  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    toolCalling: false, // Ollama doesn't support native tool calling yet
    vision: true, // Some Ollama models support vision (llava, bakllava)
    maxTokens: 4096, // Varies by model
    maxContextWindow: 8192, // Varies by model
    models: [
      'llama2',
      'mistral',
      'codellama',
      'llama3',
      'phi',
      'gemma',
      'qwen',
      'llava', // Vision model
    ],
  };

  private readonly client: Ollama;
  private readonly config: OllamaProviderConfig;

  constructor(config: OllamaProviderConfig = {}) {
    this.config = {
      defaultModel: 'llama2',
      host: 'http://localhost:11434',
      timeout: 120000, // 2 minutes
      ...config,
    };

    this.client = new Ollama({
      host: this.config.host,
    });
  }

  /**
   * Generate a complete response
   */
  async generateResponse(
    request: GenerationRequest
  ): Promise<GenerationResponse> {
    const model = request.model || this.config.defaultModel || 'llama2';

    // Build messages array
    const messages = this.buildMessages(request);

    try {
      const response = await this.client.chat({
        model,
        messages,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens,
          top_p: request.topP,
          stop: request.stopSequences as string[] | undefined,
        },
      });

      const content = response.message.content;

      // Ollama doesn't provide token counts by default, so we approximate
      const promptTokens = this.countTokens(this.stringifyMessages(messages));
      const completionTokens = this.countTokens(content);
      const usage: TokenUsage = {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      };

      return {
        content,
        finishReason: this.mapFinishReason(response.done_reason),
        usage,
        metadata: {
          model: response.model,
          created_at: response.created_at,
          total_duration: response.total_duration,
          load_duration: response.load_duration,
          prompt_eval_count: response.prompt_eval_count,
          eval_count: response.eval_count,
        },
      };
    } catch (error) {
      throw new Error(`Ollama generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Stream response chunks
   */
  async *streamResponse(
    request: GenerationRequest
  ): AsyncIterable<GenerationChunk> {
    const model = request.model || this.config.defaultModel || 'llama2';

    // Build messages array
    const messages = this.buildMessages(request);

    try {
      const stream = await this.client.chat({
        model,
        messages,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens,
          top_p: request.topP,
          stop: request.stopSequences as string[] | undefined,
        },
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.message.content;
        const done = chunk.done;

        yield {
          content,
          done,
          finishReason: done
            ? this.mapFinishReason(chunk.done_reason)
            : undefined,
        };
      }
    } catch (error) {
      throw new Error(`Ollama streaming failed: ${(error as Error).message}`);
    }
  }

  /**
   * Count tokens in text (approximate)
   */
  countTokens(text: string): number {
    // Approximate token count for Llama-style models
    // ~4 characters per token on average
    return Math.ceil(text.length / 4);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ───────────────────────────────────────────────────────────────────────────

  private buildMessages(request: GenerationRequest) {
    const messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }> = [];

    // Add system prompt if provided
    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt,
      });
    }

    // Add history
    if (request.history && request.history.length > 0) {
      for (const msg of request.history) {
        messages.push({
          role: msg.from === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }

    // Add current prompt
    messages.push({
      role: 'user',
      content: request.prompt,
    });

    return messages;
  }

  private stringifyMessages(
    messages: Array<{ role: string; content: string }>
  ): string {
    return messages.map((m) => m.content).join(' ');
  }

  private mapFinishReason(reason?: string): FinishReason {
    if (!reason) {
      return 'stop';
    }

    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'load':
        return 'error';
      default:
        return 'stop';
    }
  }

  /**
   * List available models from Ollama server
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.list();
      return response.models.map((m) => m.name);
    } catch (error) {
      throw new Error(
        `Failed to list Ollama models: ${(error as Error).message}`
      );
    }
  }

  /**
   * Pull a model from Ollama registry
   */
  async pullModel(model: string): Promise<void> {
    try {
      await this.client.pull({ model, stream: false });
    } catch (error) {
      throw new Error(
        `Failed to pull Ollama model '${model}': ${(error as Error).message}`
      );
    }
  }

  /**
   * Check if Ollama server is running
   */
  async isServerRunning(): Promise<boolean> {
    try {
      await this.client.list();
      return true;
    } catch {
      return false;
    }
  }
}
