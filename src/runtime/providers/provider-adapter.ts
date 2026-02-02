/**
 * PCL Runtime - Provider Adapter
 *
 * Bridges the new provider system (src/providers/) with the runtime interface
 * Allows the runtime to use the new 8-provider system with all its features
 */

import type {
  Provider,
  CompletionRequest,
  CompletionResponse,
  StreamChunk,
  Message as NewMessage,
  ToolDefinition,
} from '../../providers/provider-interface';

import type {
  AIProvider,
  GenerationRequest,
  GenerationResponse,
  GenerationChunk,
  ProviderCapabilities as RuntimeCapabilities,
  Tool as RuntimeTool,
  ToolCall,
  TokenUsage,
  FinishReason,
} from './index';

// Import Message from runtime (it's imported in providers/index.ts from ../index)
import type { Message as RuntimeMessage } from '../index';

/**
 * Adapter that wraps a new Provider to work with the runtime AIProvider interface
 */
export class ProviderAdapter implements AIProvider {
  constructor(private readonly provider: Provider) {}

  get name(): string {
    return this.provider.name;
  }

  get capabilities(): RuntimeCapabilities {
    const caps = this.provider.getCapabilities();

    // Get all models to find the one with the largest context window
    let maxContextWindow = caps.maxContextTokens;
    let maxTokens = caps.maxOutputTokens;
    const models: string[] = [];

    // Async call in sync context - we'll use a cached value
    // The provider should have been initialized with models already
    this.provider.getModels().then((modelList) => {
      modelList.forEach((model) => {
        models.push(model.id);
        maxContextWindow = Math.max(
          maxContextWindow,
          model.capabilities.maxContextTokens
        );
        maxTokens = Math.max(maxTokens, model.capabilities.maxOutputTokens);
      });
    });

    return {
      streaming: caps.streaming,
      toolCalling: caps.functionCalling,
      vision: caps.vision,
      maxTokens,
      maxContextWindow,
      models,
    };
  }

  async generateResponse(
    request: GenerationRequest
  ): Promise<GenerationResponse> {
    // Convert runtime GenerationRequest to provider CompletionRequest
    const completionRequest = this.convertToCompletionRequest(request);

    // Call the provider
    const response = await this.provider.complete(completionRequest);

    // Convert provider CompletionResponse to runtime GenerationResponse
    return this.convertToGenerationResponse(response);
  }

  async *streamResponse(
    request: GenerationRequest
  ): AsyncIterable<GenerationChunk> {
    // Convert runtime GenerationRequest to provider CompletionRequest
    const completionRequest = this.convertToCompletionRequest(request);

    // Stream from the provider
    for await (const chunk of this.provider.stream(completionRequest)) {
      yield this.convertToGenerationChunk(chunk);
    }
  }

  countTokens(text: string): number {
    // This is async in the provider but sync in runtime
    // We'll use a rough estimate for now (4 chars per token)
    // The provider's countTokens will be called async if needed
    return Math.ceil(text.length / 4);
  }

  /**
   * Convert runtime GenerationRequest to provider CompletionRequest
   */
  private convertToCompletionRequest(
    request: GenerationRequest
  ): CompletionRequest {
    // Build messages array from prompt and history
    const messages: NewMessage[] = [];

    // Add history messages
    // Note: Runtime Message has from/to/id/metadata, but provider Message needs role
    // We'll map from -> role (assistant if from persona, user otherwise)
    if (request.history) {
      for (const msg of request.history) {
        // Runtime Message uses from/to, provider Message uses role
        // Assume messages from a persona are 'assistant', others are 'user'
        const role: 'user' | 'assistant' = msg.from ? 'assistant' : 'user';
        messages.push({
          role,
          content: msg.content,
        });
      }
    }

    // Add current prompt as user message
    messages.push({
      role: 'user',
      content: request.prompt,
    });

    // Convert tools if present
    const tools: ToolDefinition[] | undefined = request.tools?.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: {
        type: 'object' as const,
        properties: tool.parameters.properties,
        required: tool.parameters.required
          ? [...tool.parameters.required]
          : undefined,
      },
    }));

    return {
      model: request.model || 'default',
      messages,
      system: request.systemPrompt,
      maxTokens: request.maxTokens,
      temperature: request.temperature,
      topP: request.topP,
      stopSequences: request.stopSequences
        ? [...request.stopSequences]
        : undefined,
      tools,
    };
  }

  /**
   * Convert provider CompletionResponse to runtime GenerationResponse
   */
  private convertToGenerationResponse(
    response: CompletionResponse
  ): GenerationResponse {
    // Convert function call to tool calls array
    const toolCalls: ToolCall[] | undefined = response.functionCall
      ? [
          {
            name: response.functionCall.name,
            arguments: JSON.parse(response.functionCall.arguments),
            id: `call_${Date.now()}`,
          },
        ]
      : undefined;

    return {
      content: response.content,
      finishReason: this.convertFinishReason(response.finishReason),
      usage: this.convertTokenUsage(response.usage),
      toolCalls,
      metadata: response.metadata,
    };
  }

  /**
   * Convert provider StreamChunk to runtime GenerationChunk
   */
  private convertToGenerationChunk(chunk: StreamChunk): GenerationChunk {
    return {
      content: chunk.content,
      done: chunk.done,
      finishReason: chunk.finishReason
        ? this.convertFinishReason(chunk.finishReason)
        : undefined,
    };
  }

  /**
   * Convert provider finish reason to runtime finish reason
   */
  private convertFinishReason(
    reason: 'stop' | 'length' | 'function_call' | 'content_filter' | 'error'
  ): FinishReason {
    switch (reason) {
      case 'function_call':
        return 'tool_use';
      case 'content_filter':
      case 'error':
        return 'error';
      default:
        return reason; // 'stop', 'length'
    }
  }

  /**
   * Convert provider token usage to runtime token usage
   */
  private convertTokenUsage(usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  }): TokenUsage {
    return {
      promptTokens: usage.inputTokens,
      completionTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
    };
  }
}

/**
 * Create an AIProvider adapter from a new Provider instance
 */
export function createProviderAdapter(provider: Provider): AIProvider {
  return new ProviderAdapter(provider);
}
