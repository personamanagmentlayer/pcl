// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - Provider System
// Multi-LLM provider abstraction for AI persona execution
// ═══════════════════════════════════════════════════════════════════════════════

import type { Message } from '../index';

// ─────────────────────────────────────────────────────────────────────────────
// Provider Capabilities
// ─────────────────────────────────────────────────────────────────────────────

export interface ProviderCapabilities {
  /** Provider supports streaming responses */
  readonly streaming: boolean;

  /** Provider supports tool/function calling */
  readonly toolCalling: boolean;

  /** Provider supports vision/image inputs */
  readonly vision: boolean;

  /** Maximum tokens the provider can generate */
  readonly maxTokens: number;

  /** Maximum context window size in tokens */
  readonly maxContextWindow: number;

  /** Supported models */
  readonly models: readonly string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definition
// ─────────────────────────────────────────────────────────────────────────────

export interface Tool {
  /** Unique tool identifier */
  readonly name: string;

  /** Human-readable description */
  readonly description: string;

  /** JSON schema for tool parameters */
  readonly parameters: {
    readonly type: 'object';
    readonly properties: Record<string, unknown>;
    readonly required?: readonly string[];
  };
}

export interface ToolCall {
  /** Tool that was called */
  readonly name: string;

  /** Arguments passed to the tool */
  readonly arguments: Record<string, unknown>;

  /** Unique ID for this tool call */
  readonly id: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generation Request/Response
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerationRequest {
  /** The main prompt/user message */
  readonly prompt: string;

  /** System prompt (persona instructions) */
  readonly systemPrompt?: string;

  /** Conversation history */
  readonly history?: readonly Message[];

  /** Temperature for randomness (0.0-1.0) */
  readonly temperature?: number;

  /** Maximum tokens to generate */
  readonly maxTokens?: number;

  /** Available tools for function calling */
  readonly tools?: readonly Tool[];

  /** Stop sequences to end generation */
  readonly stopSequences?: readonly string[];

  /** Model to use (provider-specific) */
  readonly model?: string;

  /** Top-p nucleus sampling */
  readonly topP?: number;

  /** Frequency penalty */
  readonly frequencyPenalty?: number;

  /** Presence penalty */
  readonly presencePenalty?: number;
}

export type FinishReason = 'stop' | 'length' | 'tool_use' | 'error' | 'cancelled';

export interface TokenUsage {
  /** Tokens in the prompt */
  readonly promptTokens: number;

  /** Tokens in the completion */
  readonly completionTokens: number;

  /** Total tokens used */
  readonly totalTokens: number;
}

export interface GenerationResponse {
  /** Generated content */
  readonly content: string;

  /** Why generation finished */
  readonly finishReason: FinishReason;

  /** Token usage statistics */
  readonly usage: TokenUsage;

  /** Tool calls requested by the model */
  readonly toolCalls?: readonly ToolCall[];

  /** Provider-specific metadata */
  readonly metadata?: Record<string, unknown>;
}

export interface GenerationChunk {
  /** Content delta for this chunk */
  readonly content: string;

  /** Whether this is the final chunk */
  readonly done: boolean;

  /** Finish reason if done */
  readonly finishReason?: FinishReason;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Provider Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface AIProvider {
  /** Provider name (e.g., 'anthropic', 'openai', 'mock') */
  readonly name: string;

  /** Provider capabilities */
  readonly capabilities: ProviderCapabilities;

  /**
   * Generate a complete response
   */
  generateResponse(request: GenerationRequest): Promise<GenerationResponse>;

  /**
   * Stream response chunks as they're generated
   */
  streamResponse(request: GenerationRequest): AsyncIterator<GenerationChunk>;

  /**
   * Count tokens in a string (approximate)
   */
  countTokens(text: string): number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider Registry
// ─────────────────────────────────────────────────────────────────────────────

export class ProviderRegistry {
  private providers = new Map<string, AIProvider>();
  private defaultProvider: string | null = null;

  /**
   * Register a provider
   */
  register(provider: AIProvider): void {
    this.providers.set(provider.name, provider);

    // Set first provider as default
    if (this.defaultProvider === null) {
      this.defaultProvider = provider.name;
    }
  }

  /**
   * Unregister a provider
   */
  unregister(name: string): boolean {
    const result = this.providers.delete(name);

    // Clear default if it was the unregistered provider
    if (this.defaultProvider === name) {
      this.defaultProvider = this.providers.keys().next().value || null;
    }

    return result;
  }

  /**
   * Get a provider by name
   */
  get(name: string): AIProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get the default provider
   */
  getDefault(): AIProvider {
    if (this.defaultProvider === null || !this.providers.has(this.defaultProvider)) {
      throw new Error('No default provider available');
    }

    return this.providers.get(this.defaultProvider)!;
  }

  /**
   * Set the default provider
   */
  setDefault(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider '${name}' not registered`);
    }

    this.defaultProvider = name;
  }

  /**
   * Get all registered provider names
   */
  list(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is registered
   */
  has(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Get number of registered providers
   */
  get size(): number {
    return this.providers.size;
  }

  /**
   * Clear all providers
   */
  clear(): void {
    this.providers.clear();
    this.defaultProvider = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Registry Instance
// ─────────────────────────────────────────────────────────────────────────────

export const providers = new ProviderRegistry();
