// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - Google Gemini Provider
// Google's Gemini AI models with multimodal capabilities
// ═══════════════════════════════════════════════════════════════════════════════

import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
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
// Gemini Provider Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface GeminiProviderConfig {
  /** Google AI API key (get from https://makersuite.google.com/app/apikey) */
  apiKey: string;

  /** Default model to use */
  defaultModel?: string;

  /** Base URL (optional, for testing) */
  baseUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini Provider
// ─────────────────────────────────────────────────────────────────────────────

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';

  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    toolCalling: true,
    vision: true, // Gemini supports multimodal input
    maxTokens: 8192,
    maxContextWindow: 1_000_000, // 1M tokens for Pro/Flash
    models: [
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.0-pro',
    ],
  };

  private readonly client: GoogleGenerativeAI;
  private readonly config: GeminiProviderConfig;

  constructor(config: GeminiProviderConfig) {
    if (!config.apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.config = {
      defaultModel: 'gemini-1.5-flash',
      ...config,
    };

    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  /**
   * Generate a complete response
   */
  async generateResponse(request: GenerationRequest): Promise<GenerationResponse> {
    const model = this.getModel(request.model);

    // Build generation config
    const generationConfig = {
      temperature: request.temperature ?? 0.7,
      maxOutputTokens: request.maxTokens ?? 2048,
      topP: request.topP,
      stopSequences: request.stopSequences as string[] | undefined,
    };

    // Build contents (system + history + prompt)
    const contents = this.buildContents(request);

    try {
      const result = await model.generateContent({
        contents,
        generationConfig,
      });

      const response = result.response;
      const text = response.text();

      // Map finish reason
      const finishReason = this.mapFinishReason(response.candidates?.[0]?.finishReason);

      // Get token usage
      const usage = this.extractUsage(response);

      return {
        content: text,
        finishReason,
        usage,
        metadata: {
          model: request.model || this.config.defaultModel,
          candidateCount: response.candidates?.length ?? 1,
        },
      };
    } catch (error) {
      throw new Error(`Gemini generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Stream response chunks
   */
  async *streamResponse(request: GenerationRequest): AsyncIterable<GenerationChunk> {
    const model = this.getModel(request.model);

    // Build generation config
    const generationConfig = {
      temperature: request.temperature ?? 0.7,
      maxOutputTokens: request.maxTokens ?? 2048,
      topP: request.topP,
      stopSequences: request.stopSequences as string[] | undefined,
    };

    // Build contents
    const contents = this.buildContents(request);

    try {
      const result = await model.generateContentStream({
        contents,
        generationConfig,
      });

      for await (const chunk of result.stream) {
        const text = chunk.text();
        const finishReason = this.mapFinishReason(chunk.candidates?.[0]?.finishReason);

        yield {
          content: text,
          done: finishReason !== undefined && finishReason !== 'stop',
          finishReason,
        };
      }

      // Final chunk
      yield {
        content: '',
        done: true,
        finishReason: 'stop',
      };
    } catch (error) {
      throw new Error(`Gemini streaming failed: ${(error as Error).message}`);
    }
  }

  /**
   * Count tokens in text (approximate)
   */
  countTokens(text: string): number {
    // Gemini uses ~4 characters per token on average
    // This is an approximation - for exact count, use model.countTokens()
    return Math.ceil(text.length / 4);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ───────────────────────────────────────────────────────────────────────────

  private getModel(modelName?: string): GenerativeModel {
    const model = modelName || this.config.defaultModel || 'gemini-1.5-flash';
    return this.client.getGenerativeModel({ model });
  }

  private buildContents(request: GenerationRequest) {
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // Add system prompt if provided (Gemini uses system instructions)
    // Note: Gemini API doesn't have direct system message support like OpenAI
    // We prepend it to the first user message
    let systemPrefix = '';
    if (request.systemPrompt) {
      systemPrefix = `${request.systemPrompt}\n\n`;
    }

    // Add history
    if (request.history && request.history.length > 0) {
      for (const msg of request.history) {
        contents.push({
          role: msg.from === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        });
      }
    }

    // Add current prompt
    contents.push({
      role: 'user',
      parts: [{ text: systemPrefix + request.prompt }],
    });

    return contents;
  }

  private mapFinishReason(geminiReason?: string): FinishReason {
    if (!geminiReason) {
      return 'stop';
    }

    switch (geminiReason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'SAFETY':
      case 'RECITATION':
      case 'OTHER':
        return 'error';
      default:
        return 'stop';
    }
  }

  private extractUsage(response: any): TokenUsage {
    // Gemini's usage metadata
    const usageMetadata = response.usageMetadata;

    if (usageMetadata) {
      return {
        promptTokens: usageMetadata.promptTokenCount || 0,
        completionTokens: usageMetadata.candidatesTokenCount || 0,
        totalTokens: usageMetadata.totalTokenCount || 0,
      };
    }

    // Fallback if no usage metadata
    const promptText = response.promptFeedback?.blockReason || '';
    const responseText = response.text?.() || '';

    return {
      promptTokens: this.countTokens(promptText),
      completionTokens: this.countTokens(responseText),
      totalTokens: this.countTokens(promptText + responseText),
    };
  }
}
