// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - Mock Provider
// Test/development provider with configurable responses
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  AIProvider,
  ProviderCapabilities,
  GenerationRequest,
  GenerationResponse,
  GenerationChunk,
} from './index';

// ─────────────────────────────────────────────────────────────────────────────
// Mock Provider Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface MockProviderConfig {
  /** Predefined responses to return in sequence */
  responses?: string[];

  /** Delay in ms before returning response */
  delay?: number;

  /** Whether to simulate errors */
  simulateErrors?: boolean;

  /** Error probability (0.0-1.0) */
  errorRate?: number;

  /** Default response if no predefined responses */
  defaultResponse?: string;

  /** Simulate streaming (chunk response) */
  enableStreaming?: boolean;

  /** Chunk size for streaming */
  chunkSize?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Provider Implementation
// ─────────────────────────────────────────────────────────────────────────────

export class MockProvider implements AIProvider {
  readonly name = 'mock';

  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    toolCalling: true,
    vision: false,
    maxTokens: 4096,
    maxContextWindow: 8192,
    models: ['mock-1', 'mock-turbo'],
  };

  private responseIndex = 0;
  private config: Required<MockProviderConfig>;

  constructor(config: MockProviderConfig = {}) {
    this.config = {
      responses: config.responses || [],
      delay: config.delay ?? 0,
      simulateErrors: config.simulateErrors ?? false,
      errorRate: config.errorRate ?? 0.1,
      defaultResponse: config.defaultResponse ?? 'Mock response: I understand your request.',
      enableStreaming: config.enableStreaming ?? true,
      chunkSize: config.chunkSize ?? 10,
    };
  }

  /**
   * Generate a complete response
   */
  async generateResponse(request: GenerationRequest): Promise<GenerationResponse> {
    // Simulate delay
    if (this.config.delay > 0) {
      await this.sleep(this.config.delay);
    }

    // Simulate errors
    if (this.config.simulateErrors && Math.random() < this.config.errorRate) {
      throw new Error('Mock provider error (simulated)');
    }

    // Get response content
    const content = this.getNextResponse(request);

    // Calculate token usage (approximate)
    const promptTokens = this.countTokens(this.buildPrompt(request));
    const completionTokens = this.countTokens(content);

    return {
      content,
      finishReason: 'stop',
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      metadata: {
        provider: 'mock',
        model: request.model || 'mock-1',
      },
    };
  }

  /**
   * Stream response chunks
   */
  async *streamResponse(request: GenerationRequest): AsyncIterator<GenerationChunk> {
    if (!this.config.enableStreaming) {
      const response = await this.generateResponse(request);
      yield {
        content: response.content,
        done: true,
        finishReason: response.finishReason,
      };
      return;
    }

    // Get full response
    const fullContent = this.getNextResponse(request);

    // Stream in chunks
    const chunkSize = this.config.chunkSize;
    for (let i = 0; i < fullContent.length; i += chunkSize) {
      const chunk = fullContent.slice(i, i + chunkSize);
      const done = i + chunkSize >= fullContent.length;

      // Simulate delay between chunks
      if (this.config.delay > 0) {
        await this.sleep(this.config.delay / 10);
      }

      yield {
        content: chunk,
        done,
        finishReason: done ? 'stop' : undefined,
      };
    }
  }

  /**
   * Count tokens (simple approximation: words * 1.3)
   */
  countTokens(text: string): number {
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words * 1.3);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private Helper Methods
  // ───────────────────────────────────────────────────────────────────────────

  private getNextResponse(request: GenerationRequest): string {
    // Use predefined responses in sequence
    if (this.config.responses.length > 0) {
      const response = this.config.responses[this.responseIndex % this.config.responses.length];
      this.responseIndex++;
      return response;
    }

    // Generate contextual default response
    return this.generateDefaultResponse(request);
  }

  private generateDefaultResponse(request: GenerationRequest): string {
    const parts: string[] = [];

    if (request.systemPrompt) {
      parts.push(`[Following instructions: ${request.systemPrompt.slice(0, 50)}...]`);
    }

    parts.push(`Mock response to: "${request.prompt.slice(0, 100)}..."`);

    if (request.history && request.history.length > 0) {
      parts.push(`(Context: ${request.history.length} previous messages)`);
    }

    return parts.join('\n\n');
  }

  private buildPrompt(request: GenerationRequest): string {
    const parts: string[] = [];

    if (request.systemPrompt) {
      parts.push(`System: ${request.systemPrompt}`);
    }

    if (request.history) {
      for (const msg of request.history) {
        parts.push(`${msg.from}: ${msg.content}`);
      }
    }

    parts.push(`User: ${request.prompt}`);

    return parts.join('\n');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Configuration Methods
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Add a response to the predefined list
   */
  addResponse(response: string): void {
    this.config.responses.push(response);
  }

  /**
   * Clear all predefined responses
   */
  clearResponses(): void {
    this.config.responses = [];
    this.responseIndex = 0;
  }

  /**
   * Set delay for all operations
   */
  setDelay(ms: number): void {
    this.config.delay = ms;
  }

  /**
   * Enable/disable error simulation
   */
  setErrorSimulation(enabled: boolean, rate?: number): void {
    this.config.simulateErrors = enabled;
    if (rate !== undefined) {
      this.config.errorRate = Math.max(0, Math.min(1, rate));
    }
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.responseIndex = 0;
  }
}
