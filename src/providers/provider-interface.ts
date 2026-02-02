/**
 * PCL Provider Interface
 *
 * Defines the contract for AI model providers (Anthropic, OpenAI, Google, etc.)
 */

/**
 * Provider capabilities
 */
export interface ProviderCapabilities {
  /** Supports streaming responses */
  streaming: boolean;

  /** Supports function/tool calling */
  functionCalling: boolean;

  /** Supports vision/image inputs */
  vision: boolean;

  /** Supports JSON mode/structured outputs */
  jsonMode: boolean;

  /** Supports system messages */
  systemMessages: boolean;

  /** Maximum context window (tokens) */
  maxContextTokens: number;

  /** Maximum output tokens */
  maxOutputTokens: number;

  /** Supports temperature control */
  temperature: boolean;

  /** Supports top-p/nucleus sampling */
  topP: boolean;

  /** Supports top-k sampling */
  topK: boolean;

  /** Supports stop sequences */
  stopSequences: boolean;

  /** Supports chat history/multi-turn conversations */
  chatHistory: boolean;
}

/**
 * Model information
 */
export interface ModelInfo {
  /** Model identifier (e.g., "claude-3-5-sonnet-20241022") */
  id: string;

  /** Human-readable name */
  name: string;

  /** Model description */
  description?: string;

  /** Model capabilities */
  capabilities: ProviderCapabilities;

  /** Cost per 1K input tokens (USD) */
  inputTokenCost?: number;

  /** Cost per 1K output tokens (USD) */
  outputTokenCost?: number;

  /** Model version/release date */
  version?: string;

  /** Is this model deprecated? */
  deprecated?: boolean;
}

/**
 * Message role
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'function';

/**
 * Message content (text or multimodal)
 */
export type MessageContent =
  | string
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'image';
      source: {
        type: 'url' | 'base64';
        url?: string;
        data?: string;
        mediaType?: string;
      };
    };

/**
 * Chat message
 */
export interface Message {
  /** Message role */
  role: MessageRole;

  /** Message content (text or multimodal) */
  content: MessageContent | MessageContent[];

  /** Function/tool call (if applicable) */
  functionCall?: {
    name: string;
    arguments: string;
  };

  /** Function/tool response (if applicable) */
  functionResponse?: {
    name: string;
    content: string;
  };

  /** Message metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Tool/function definition
 */
export interface ToolDefinition {
  /** Tool name */
  name: string;

  /** Tool description */
  description: string;

  /** Input schema (JSON Schema) */
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Completion request parameters
 */
export interface CompletionRequest {
  /** Model to use */
  model: string;

  /** Chat messages */
  messages: Message[];

  /** System message/instructions */
  system?: string;

  /** Maximum tokens to generate */
  maxTokens?: number;

  /** Temperature (0-1, higher = more random) */
  temperature?: number;

  /** Top-p sampling (0-1) */
  topP?: number;

  /** Top-k sampling */
  topK?: number;

  /** Stop sequences */
  stopSequences?: string[];

  /** Enable streaming */
  stream?: boolean;

  /** Tools/functions available */
  tools?: ToolDefinition[];

  /** Metadata for tracking */
  metadata?: Record<string, unknown>;
}

/**
 * Token usage information
 */
export interface TokenUsage {
  /** Input tokens consumed */
  inputTokens: number;

  /** Output tokens generated */
  outputTokens: number;

  /** Total tokens */
  totalTokens: number;
}

/**
 * Completion response
 */
export interface CompletionResponse {
  /** Generated content */
  content: string;

  /** Finish reason */
  finishReason:
    | 'stop'
    | 'length'
    | 'function_call'
    | 'content_filter'
    | 'error';

  /** Token usage */
  usage: TokenUsage;

  /** Model used */
  model: string;

  /** Function/tool call (if applicable) */
  functionCall?: {
    name: string;
    arguments: string;
  };

  /** Response metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Streaming chunk
 */
export interface StreamChunk {
  /** Chunk content (delta) */
  content: string;

  /** Is this the final chunk? */
  done: boolean;

  /** Finish reason (only in final chunk) */
  finishReason?:
    | 'stop'
    | 'length'
    | 'function_call'
    | 'content_filter'
    | 'error';

  /** Token usage (only in final chunk) */
  usage?: TokenUsage;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  /** API key or authentication token */
  apiKey?: string;

  /** API base URL (for custom endpoints) */
  baseUrl?: string;

  /** Request timeout (ms) */
  timeout?: number;

  /** Max retries on failure */
  maxRetries?: number;

  /** Retry delay (ms) */
  retryDelay?: number;

  /** Custom headers */
  headers?: Record<string, string>;

  /** Enable debug logging */
  debug?: boolean;

  /** Additional provider-specific config */
  [key: string]: unknown;
}

/**
 * Base provider interface
 *
 * All AI model providers must implement this interface
 */
export interface Provider {
  /** Provider name (e.g., "anthropic", "openai", "google") */
  readonly name: string;

  /** Provider display name */
  readonly displayName: string;

  /** Provider version */
  readonly version: string;

  /**
   * Initialize the provider with configuration
   */
  initialize(config: ProviderConfig): Promise<void>;

  /**
   * Get available models from this provider
   */
  getModels(): Promise<ModelInfo[]>;

  /**
   * Get information about a specific model
   */
  getModel(modelId: string): Promise<ModelInfo | null>;

  /**
   * Check if a model is available
   */
  hasModel(modelId: string): Promise<boolean>;

  /**
   * Detect provider capabilities
   */
  getCapabilities(): ProviderCapabilities;

  /**
   * Generate a completion (non-streaming)
   */
  complete(request: CompletionRequest): Promise<CompletionResponse>;

  /**
   * Generate a completion (streaming)
   */
  stream(request: CompletionRequest): AsyncIterable<StreamChunk>;

  /**
   * Estimate token count for text
   */
  countTokens(text: string, model?: string): Promise<number>;

  /**
   * Validate API credentials
   */
  validateCredentials(): Promise<boolean>;

  /**
   * Shutdown and cleanup resources
   */
  shutdown(): Promise<void>;
}

/**
 * Provider factory function type
 */
export type ProviderFactory = (config: ProviderConfig) => Provider;

/**
 * Provider registry entry
 */
export interface ProviderRegistryEntry {
  /** Provider factory function */
  factory: ProviderFactory;

  /** Provider metadata */
  metadata: {
    name: string;
    displayName: string;
    description: string;
    version: string;
    homepage?: string;
    documentation?: string;
  };
}
