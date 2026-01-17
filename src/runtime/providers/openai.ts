// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - OpenAI Provider
// GPT/ChatGPT integration for persona execution
// ═══════════════════════════════════════════════════════════════════════════════

import OpenAI from 'openai';
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
// OpenAI Provider Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface OpenAIProviderConfig {
  /** API key for OpenAI */
  apiKey: string;

  /** Default model to use */
  defaultModel?: string;

  /** Organization ID (optional) */
  organization?: string;

  /** Base URL (for custom endpoints) */
  baseURL?: string;

  /** Max retries on rate limit */
  maxRetries?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI Provider Implementation
// ─────────────────────────────────────────────────────────────────────────────

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';

  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    toolCalling: true,
    vision: true,
    maxTokens: 4096,
    maxContextWindow: 128_000, // GPT-4 Turbo context window
    models: [
      'gpt-4-turbo-preview',
      'gpt-4-0125-preview',
      'gpt-4-1106-preview',
      'gpt-4',
      'gpt-4-0613',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-0125',
      'gpt-3.5-turbo-1106',
    ],
  };

  private client: OpenAI;
  private defaultModel: string;

  constructor(config: OpenAIProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
      baseURL: config.baseURL,
      maxRetries: config.maxRetries ?? 2,
    });

    this.defaultModel = config.defaultModel || 'gpt-4-turbo-preview';
  }

  /**
   * Generate a complete response
   */
  async generateResponse(request: GenerationRequest): Promise<GenerationResponse> {
    const messages = this.buildMessages(request);
    const tools = request.tools ? this.convertTools(request.tools) : undefined;

    try {
      const response = await this.client.chat.completions.create({
        model: request.model || this.defaultModel,
        messages,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        top_p: request.topP,
        frequency_penalty: request.frequencyPenalty,
        presence_penalty: request.presencePenalty,
        stop: request.stopSequences as string[] | undefined,
        tools: tools as OpenAI.Chat.ChatCompletionTool[] | undefined,
      });

      return this.parseResponse(response);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Stream response chunks
   */
  async *streamResponse(request: GenerationRequest): AsyncIterable<GenerationChunk> {
    const messages = this.buildMessages(request);
    const tools = request.tools ? this.convertTools(request.tools) : undefined;

    try {
      const stream = await this.client.chat.completions.create({
        model: request.model || this.defaultModel,
        messages,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        top_p: request.topP,
        frequency_penalty: request.frequencyPenalty,
        presence_penalty: request.presencePenalty,
        stop: request.stopSequences as string[] | undefined,
        tools: tools as OpenAI.Chat.ChatCompletionTool[] | undefined,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        const finishReason = chunk.choices[0]?.finish_reason;

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
            finishReason: this.mapFinishReason(finishReason),
          };
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI streaming error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Count tokens using tiktoken (approximate)
   */
  countTokens(text: string): number {
    // GPT uses ~4 characters per token on average
    // For exact counts, use the tiktoken library
    return Math.ceil(text.length / 4);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private Helper Methods
  // ───────────────────────────────────────────────────────────────────────────

  private buildMessages(
    request: GenerationRequest
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    // Add system prompt if present
    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt,
      });
    }

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

  private convertTools(tools: readonly Tool[]): OpenAI.Chat.ChatCompletionTool[] {
    return tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  private parseResponse(
    response: OpenAI.Chat.ChatCompletion
  ): GenerationResponse {
    const choice = response.choices[0];
    if (!choice) {
      throw new Error('No response from OpenAI');
    }

    // Extract content
    const content = choice.message.content || '';

    // Extract tool calls
    const toolCalls: ToolCall[] = [];
    if (choice.message.tool_calls) {
      for (const toolCall of choice.message.tool_calls) {
        if (toolCall.type === 'function') {
          toolCalls.push({
            name: toolCall.function.name,
            arguments: JSON.parse(toolCall.function.arguments),
            id: toolCall.id,
          });
        }
      }
    }

    // Map finish reason
    const finishReason = this.mapFinishReason(choice.finish_reason);

    // Extract token usage
    const usage = {
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    };

    return {
      content,
      finishReason,
      usage,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      metadata: {
        provider: 'openai',
        model: response.model,
        finishReason: choice.finish_reason,
        id: response.id,
      },
    };
  }

  private mapFinishReason(
    reason: string | null
  ): GenerationResponse['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'tool_calls':
      case 'function_call':
        return 'tool_use';
      case 'content_filter':
        return 'error';
      default:
        return 'stop';
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Configuration Methods
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Update the default model
   */
  setDefaultModel(model: string): void {
    if (!this.capabilities.models.includes(model)) {
      throw new Error(`Model '${model}' not supported by OpenAI provider`);
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
