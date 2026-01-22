// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - DeepSeek Provider
// DeepSeek AI models with OpenAI-compatible API
// ═══════════════════════════════════════════════════════════════════════════════

import OpenAI from 'openai';
import type {
  AIProvider,
  ProviderCapabilities,
  GenerationRequest,
  GenerationResponse,
  GenerationChunk,
  FinishReason,
  TokenUsage,
  ToolCall,
} from './index';

// ─────────────────────────────────────────────────────────────────────────────
// DeepSeek Provider Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface DeepSeekProviderConfig {
  /** DeepSeek API key (get from https://platform.deepseek.com/) */
  apiKey: string;

  /** Default model to use */
  defaultModel?: string;

  /** Base URL (defaults to DeepSeek's API endpoint) */
  baseUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DeepSeek Provider
// ─────────────────────────────────────────────────────────────────────────────

export class DeepSeekProvider implements AIProvider {
  readonly name = 'deepseek';

  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    toolCalling: true,
    vision: false, // DeepSeek doesn't support vision yet
    maxTokens: 8192,
    maxContextWindow: 64_000, // 64K tokens for DeepSeek
    models: [
      'deepseek-chat',
      'deepseek-coder',
    ],
  };

  private readonly client: OpenAI;
  private readonly config: DeepSeekProviderConfig;

  constructor(config: DeepSeekProviderConfig) {
    if (!config.apiKey) {
      throw new Error('DeepSeek API key is required');
    }

    this.config = {
      defaultModel: 'deepseek-chat',
      baseUrl: 'https://api.deepseek.com/v1',
      ...config,
    };

    // DeepSeek uses OpenAI-compatible API
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: this.config.baseUrl,
    });
  }

  /**
   * Generate a complete response
   */
  async generateResponse(request: GenerationRequest): Promise<GenerationResponse> {
    const model = request.model || this.config.defaultModel || 'deepseek-chat';

    // Build messages array
    const messages = this.buildMessages(request);

    try {
      const completion = await this.client.chat.completions.create({
        model,
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        top_p: request.topP,
        frequency_penalty: request.frequencyPenalty,
        presence_penalty: request.presencePenalty,
        stop: request.stopSequences as string[] | undefined,
        tools: request.tools ? this.convertTools(request.tools) : undefined,
      });

      const choice = completion.choices[0];
      const content = choice.message.content || '';
      const finishReason = this.mapFinishReason(choice.finish_reason);

      // Extract tool calls if present
      const toolCalls = choice.message.tool_calls?.map((tc) => ({
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
        id: tc.id,
      })) as ToolCall[] | undefined;

      // Get token usage
      const usage: TokenUsage = {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      };

      return {
        content,
        finishReason,
        usage,
        toolCalls,
        metadata: {
          model: completion.model,
          id: completion.id,
        },
      };
    } catch (error) {
      throw new Error(`DeepSeek generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Stream response chunks
   */
  async *streamResponse(request: GenerationRequest): AsyncIterable<GenerationChunk> {
    const model = request.model || this.config.defaultModel || 'deepseek-chat';

    // Build messages array
    const messages = this.buildMessages(request);

    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        top_p: request.topP,
        frequency_penalty: request.frequencyPenalty,
        presence_penalty: request.presencePenalty,
        stop: request.stopSequences as string[] | undefined,
        tools: request.tools ? this.convertTools(request.tools) : undefined,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        const content = delta?.content || '';
        const finishReason = chunk.choices[0]?.finish_reason;

        yield {
          content,
          done: finishReason !== null && finishReason !== undefined,
          finishReason: finishReason ? this.mapFinishReason(finishReason) : undefined,
        };
      }
    } catch (error) {
      throw new Error(`DeepSeek streaming failed: ${(error as Error).message}`);
    }
  }

  /**
   * Count tokens in text (approximate)
   */
  countTokens(text: string): number {
    // DeepSeek uses similar tokenization to GPT models
    // Approximation: ~4 characters per token on average
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

  private convertTools(tools: readonly import('./index').Tool[]) {
    return tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  private mapFinishReason(reason: string | null): FinishReason {
    if (!reason) {
      return 'stop';
    }

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
}
