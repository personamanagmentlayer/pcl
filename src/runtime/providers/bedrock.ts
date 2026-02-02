// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - AWS Bedrock Provider
// AWS Bedrock foundation models (Claude, Titan, Llama, etc.)
// ═══════════════════════════════════════════════════════════════════════════════

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
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
// AWS Bedrock Provider Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface BedrockProviderConfig {
  /** AWS region (e.g., 'us-east-1') */
  region: string;

  /** AWS access key ID (optional, can use environment variables or IAM roles) */
  accessKeyId?: string;

  /** AWS secret access key (optional, can use environment variables or IAM roles) */
  secretAccessKey?: string;

  /** Default model to use */
  defaultModel?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AWS Bedrock Provider
// ─────────────────────────────────────────────────────────────────────────────

export class BedrockProvider implements AIProvider {
  readonly name = 'bedrock';

  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    toolCalling: true, // Claude on Bedrock supports tool calling
    vision: true, // Claude 3 on Bedrock supports vision
    maxTokens: 4096, // Varies by model
    maxContextWindow: 200_000, // Claude 3 on Bedrock supports 200K
    models: [
      'anthropic.claude-3-sonnet-20240229-v1:0',
      'anthropic.claude-3-haiku-20240307-v1:0',
      'anthropic.claude-3-opus-20240229-v1:0',
      'anthropic.claude-v2:1',
      'amazon.titan-text-express-v1',
      'meta.llama2-70b-chat-v1',
    ],
  };

  private readonly client: BedrockRuntimeClient;
  private readonly config: BedrockProviderConfig;

  constructor(config: BedrockProviderConfig) {
    if (!config.region) {
      throw new Error('AWS Bedrock region is required');
    }

    this.config = {
      defaultModel: 'anthropic.claude-3-haiku-20240307-v1:0',
      ...config,
    };

    this.client = new BedrockRuntimeClient({
      region: config.region,
      credentials:
        config.accessKeyId && config.secretAccessKey
          ? {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            }
          : undefined,
    });
  }

  /**
   * Generate a complete response
   */
  async generateResponse(
    request: GenerationRequest
  ): Promise<GenerationResponse> {
    const modelId =
      request.model ||
      this.config.defaultModel ||
      'anthropic.claude-3-haiku-20240307-v1:0';

    // Build request payload (format varies by model)
    const payload = this.buildPayload(request, modelId);

    try {
      const command = new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // Parse response based on model type
      const { content, finishReason, usage } = this.parseResponse(
        responseBody,
        modelId
      );

      return {
        content,
        finishReason,
        usage,
        metadata: {
          model: modelId,
          requestId: response.$metadata.requestId,
        },
      };
    } catch (error) {
      throw new Error(
        `AWS Bedrock generation failed: ${(error as Error).message}`
      );
    }
  }

  /**
   * Stream response chunks
   */
  async *streamResponse(
    request: GenerationRequest
  ): AsyncIterable<GenerationChunk> {
    const modelId =
      request.model ||
      this.config.defaultModel ||
      'anthropic.claude-3-haiku-20240307-v1:0';

    // Build request payload
    const payload = this.buildPayload(request, modelId);

    try {
      const command = new InvokeModelWithResponseStreamCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      });

      const response = await this.client.send(command);

      if (!response.body) {
        throw new Error('No response body from Bedrock');
      }

      for await (const event of response.body) {
        if (event.chunk) {
          const chunkBody = JSON.parse(
            new TextDecoder().decode(event.chunk.bytes)
          );

          // Parse chunk based on model type
          const { content, done, finishReason } = this.parseChunk(
            chunkBody,
            modelId
          );

          yield {
            content,
            done,
            finishReason,
          };
        }
      }
    } catch (error) {
      throw new Error(
        `AWS Bedrock streaming failed: ${(error as Error).message}`
      );
    }
  }

  /**
   * Count tokens in text (approximate)
   */
  countTokens(text: string): number {
    // Approximation varies by model
    // Claude uses ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ───────────────────────────────────────────────────────────────────────────

  private buildPayload(request: GenerationRequest, modelId: string): any {
    // Different models have different payload formats
    if (modelId.startsWith('anthropic.claude')) {
      return this.buildClaudePayload(request);
    } else if (modelId.startsWith('amazon.titan')) {
      return this.buildTitanPayload(request);
    } else if (modelId.startsWith('meta.llama')) {
      return this.buildLlamaPayload(request);
    }

    // Default to Claude format
    return this.buildClaudePayload(request);
  }

  private buildClaudePayload(request: GenerationRequest): any {
    const messages: Array<{ role: string; content: string }> = [];

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

    return {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: request.maxTokens || 4096,
      system: request.systemPrompt,
      messages,
      temperature: request.temperature ?? 0.7,
      top_p: request.topP,
      stop_sequences: request.stopSequences,
    };
  }

  private buildTitanPayload(request: GenerationRequest): any {
    let fullPrompt = '';

    if (request.systemPrompt) {
      fullPrompt += request.systemPrompt + '\n\n';
    }

    if (request.history && request.history.length > 0) {
      for (const msg of request.history) {
        fullPrompt += `${msg.from === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      }
    }

    fullPrompt += `User: ${request.prompt}\nAssistant:`;

    return {
      inputText: fullPrompt,
      textGenerationConfig: {
        maxTokenCount: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7,
        topP: request.topP,
        stopSequences: request.stopSequences,
      },
    };
  }

  private buildLlamaPayload(request: GenerationRequest): any {
    let prompt = '';

    if (request.systemPrompt) {
      prompt += `<s>[INST] <<SYS>>\n${request.systemPrompt}\n<</SYS>>\n\n`;
    } else {
      prompt += '<s>[INST] ';
    }

    if (request.history && request.history.length > 0) {
      for (const msg of request.history) {
        if (msg.from === 'user') {
          prompt += `${msg.content} [/INST] `;
        } else {
          prompt += `${msg.content} </s><s>[INST] `;
        }
      }
    }

    prompt += `${request.prompt} [/INST]`;

    return {
      prompt,
      max_gen_len: request.maxTokens || 4096,
      temperature: request.temperature ?? 0.7,
      top_p: request.topP,
    };
  }

  private parseResponse(
    responseBody: any,
    modelId: string
  ): {
    content: string;
    finishReason: FinishReason;
    usage: TokenUsage;
  } {
    if (modelId.startsWith('anthropic.claude')) {
      return {
        content: responseBody.content[0]?.text || '',
        finishReason: this.mapFinishReason(responseBody.stop_reason),
        usage: {
          promptTokens: responseBody.usage?.input_tokens || 0,
          completionTokens: responseBody.usage?.output_tokens || 0,
          totalTokens:
            (responseBody.usage?.input_tokens || 0) +
            (responseBody.usage?.output_tokens || 0),
        },
      };
    } else if (modelId.startsWith('amazon.titan')) {
      const text = responseBody.results?.[0]?.outputText || '';
      return {
        content: text,
        finishReason: 'stop',
        usage: {
          promptTokens: responseBody.inputTextTokenCount || 0,
          completionTokens: responseBody.results?.[0]?.tokenCount || 0,
          totalTokens:
            (responseBody.inputTextTokenCount || 0) +
            (responseBody.results?.[0]?.tokenCount || 0),
        },
      };
    } else if (modelId.startsWith('meta.llama')) {
      return {
        content: responseBody.generation || '',
        finishReason: this.mapFinishReason(responseBody.stop_reason),
        usage: {
          promptTokens: responseBody.prompt_token_count || 0,
          completionTokens: responseBody.generation_token_count || 0,
          totalTokens:
            (responseBody.prompt_token_count || 0) +
            (responseBody.generation_token_count || 0),
        },
      };
    }

    // Default
    return {
      content: '',
      finishReason: 'error',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };
  }

  private parseChunk(
    chunkBody: any,
    modelId: string
  ): {
    content: string;
    done: boolean;
    finishReason?: FinishReason;
  } {
    if (modelId.startsWith('anthropic.claude')) {
      const type = chunkBody.type;

      if (type === 'content_block_delta') {
        return {
          content: chunkBody.delta?.text || '',
          done: false,
        };
      } else if (type === 'message_stop') {
        return {
          content: '',
          done: true,
          finishReason: 'stop',
        };
      }
    } else if (modelId.startsWith('amazon.titan')) {
      return {
        content: chunkBody.outputText || '',
        done: chunkBody.completionReason !== null,
        finishReason: chunkBody.completionReason ? 'stop' : undefined,
      };
    }

    return { content: '', done: false };
  }

  private mapFinishReason(reason?: string): FinishReason {
    if (!reason) {
      return 'stop';
    }

    switch (reason) {
      case 'end_turn':
      case 'stop_sequence':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'tool_use':
        return 'tool_use';
      default:
        return 'stop';
    }
  }
}
