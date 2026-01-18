// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - Anthropic Provider
// Claude AI integration for persona execution
// ═══════════════════════════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';
import type {
  AIProvider,
  ProviderCapabilities,
  GenerationRequest,
  GenerationResponse,
  GenerationChunk,
  Tool,
  ToolCall,
} from './index';

// ─────────────────────────────────────────────────────────────────────────────
// Anthropic Provider Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface AnthropicProviderConfig {
  /** API key for Anthropic */
  apiKey: string;

  /** Default model to use */
  defaultModel?: string;

  /** Max retries on rate limit */
  maxRetries?: number;

  /** Base URL (for custom endpoints) */
  baseURL?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Anthropic Provider Implementation
// ─────────────────────────────────────────────────────────────────────────────

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';

  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    toolCalling: true,
    vision: true,
    maxTokens: 8192,
    maxContextWindow: 200_000, // Claude 3 context window
    models: [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-3-7-sonnet-20250219', // Latest Sonnet 3.7
    ],
  };

  private client: Anthropic;
  private defaultModel: string;

  constructor(config: AnthropicProviderConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      maxRetries: config.maxRetries ?? 2,
      baseURL: config.baseURL,
    });

    this.defaultModel = config.defaultModel || 'claude-3-7-sonnet-20250219';
  }

  /**
   * Generate a complete response
   */
  async generateResponse(request: GenerationRequest): Promise<GenerationResponse> {
    const messages = this.buildMessages(request);
    const system = request.systemPrompt || undefined;
    const tools = request.tools ? this.convertTools(request.tools) : undefined;

    try {
      const response = await this.client.messages.create({
        model: request.model || this.defaultModel,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature,
        top_p: request.topP,
        system,
        messages,
        tools,
        stop_sequences: request.stopSequences ? [...request.stopSequences] : undefined,
      });

      return this.parseResponse(response);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Anthropic API error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Stream response chunks
   */
  async *streamResponse(request: GenerationRequest): AsyncIterable<GenerationChunk> {
    const messages = this.buildMessages(request);
    const system = request.systemPrompt || undefined;
    const tools = request.tools ? this.convertTools(request.tools) : undefined;

    try {
      const stream = await this.client.messages.stream({
        model: request.model || this.defaultModel,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature,
        top_p: request.topP,
        system,
        messages,
        tools,
        stop_sequences: request.stopSequences ? [...request.stopSequences] : undefined,
      });

      let fullContent = '';

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const content = event.delta.text;
          fullContent += content;

          yield {
            content,
            done: false,
          };
        } else if (event.type === 'message_stop') {
          yield {
            content: '',
            done: true,
            finishReason: 'stop',
          };
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Anthropic streaming error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Count tokens (approximate using Claude's estimation)
   */
  countTokens(text: string): number {
    // Claude uses ~4 characters per token on average
    // This is an approximation; use the official API for exact counts
    return Math.ceil(text.length / 4);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private Helper Methods
  // ───────────────────────────────────────────────────────────────────────────

  private buildMessages(request: GenerationRequest): Anthropic.MessageParam[] {
    const messages: Anthropic.MessageParam[] = [];

    // Add conversation history
    if (request.history) {
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

  private convertTools(tools: readonly Tool[]): Anthropic.Tool[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters as Anthropic.Tool.InputSchema,
    }));
  }

  private parseResponse(response: Anthropic.Message): GenerationResponse {
    // Extract text content
    let content = '';
    const toolCalls: ToolCall[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          name: block.name,
          arguments: block.input as Record<string, unknown>,
          id: block.id,
        });
      }
    }

    // Determine finish reason
    let finishReason: GenerationResponse['finishReason'] = 'stop';
    if (response.stop_reason === 'max_tokens') {
      finishReason = 'length';
    } else if (response.stop_reason === 'tool_use') {
      finishReason = 'tool_use';
    }

    // Extract token usage
    const usage = {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    };

    return {
      content,
      finishReason,
      usage,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      metadata: {
        provider: 'anthropic',
        model: response.model,
        stopReason: response.stop_reason,
        id: response.id,
      },
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Configuration Methods
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Update the default model
   */
  setDefaultModel(model: string): void {
    if (!this.capabilities.models.includes(model)) {
      throw new Error(`Model '${model}' not supported by Anthropic provider`);
    }
    this.defaultModel = model;
  }

  /**
   * Get the current default model
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }
}
