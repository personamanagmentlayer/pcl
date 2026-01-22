// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - Azure OpenAI Provider
// Azure-hosted OpenAI models with enterprise features
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
// Azure OpenAI Provider Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface AzureOpenAIProviderConfig {
  /** Azure OpenAI API key */
  apiKey: string;

  /** Azure resource name (e.g., 'my-resource' from my-resource.openai.azure.com) */
  resourceName: string;

  /** Deployment name for the model */
  deployment: string;

  /** API version (defaults to latest stable) */
  apiVersion?: string;

  /** Default model name (for metadata/cost tracking) */
  defaultModel?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Azure OpenAI Provider
// ─────────────────────────────────────────────────────────────────────────────

export class AzureOpenAIProvider implements AIProvider {
  readonly name = 'azure';

  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    toolCalling: true,
    vision: true, // GPT-4V available on Azure
    maxTokens: 16384, // Depends on deployment
    maxContextWindow: 128_000, // GPT-4 Turbo on Azure supports 128K
    models: [
      'gpt-4-turbo',
      'gpt-4',
      'gpt-4-32k',
      'gpt-35-turbo',
      'gpt-35-turbo-16k',
      'gpt-4-vision',
    ],
  };

  private readonly client: OpenAI;
  private readonly config: AzureOpenAIProviderConfig;

  constructor(config: AzureOpenAIProviderConfig) {
    if (!config.apiKey) {
      throw new Error('Azure OpenAI API key is required');
    }
    if (!config.resourceName) {
      throw new Error('Azure OpenAI resource name is required');
    }
    if (!config.deployment) {
      throw new Error('Azure OpenAI deployment name is required');
    }

    this.config = {
      apiVersion: '2024-02-15-preview',
      defaultModel: 'gpt-4-turbo',
      ...config,
    };

    // Use OpenAI SDK with Azure configuration
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: `https://${config.resourceName}.openai.azure.com/openai/deployments/${config.deployment}`,
      defaultQuery: { 'api-version': this.config.apiVersion },
      defaultHeaders: { 'api-key': config.apiKey },
    });
  }

  /**
   * Generate a complete response
   */
  async generateResponse(request: GenerationRequest): Promise<GenerationResponse> {
    // For Azure, we use the deployment which is already in the base URL
    const model = this.config.deployment;

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
          model: this.config.defaultModel || this.config.deployment,
          deployment: this.config.deployment,
          id: completion.id,
        },
      };
    } catch (error) {
      throw new Error(`Azure OpenAI generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Stream response chunks
   */
  async *streamResponse(request: GenerationRequest): AsyncIterable<GenerationChunk> {
    // For Azure, we use the deployment which is already in the base URL
    const model = this.config.deployment;

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
      throw new Error(`Azure OpenAI streaming failed: ${(error as Error).message}`);
    }
  }

  /**
   * Count tokens in text (approximate)
   */
  countTokens(text: string): number {
    // GPT models use ~4 characters per token on average
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
