/**
 * PCL Base Provider
 *
 * Abstract base class providing common functionality for all providers
 */

import type {
  Provider,
  ProviderConfig,
  ProviderCapabilities,
  ModelInfo,
  CompletionRequest,
  CompletionResponse,
  StreamChunk,
} from './provider-interface';

/**
 * Base provider implementation
 *
 * Provides common functionality like retry logic, error handling, and validation
 */
export abstract class BaseProvider implements Provider {
  abstract readonly name: string;
  abstract readonly displayName: string;
  abstract readonly version: string;

  protected config: ProviderConfig = {};
  protected initialized = false;
  protected models: Map<string, ModelInfo> = new Map();

  /**
   * Initialize the provider
   */
  async initialize(config: ProviderConfig): Promise<void> {
    this.config = {
      timeout: 30000, // 30s default
      maxRetries: 3,
      retryDelay: 1000, // 1s
      debug: false,
      ...config,
    };

    // Validate required config
    this.validateConfig(this.config);

    // Provider-specific initialization
    await this.doInitialize(this.config);

    this.initialized = true;

    if (this.config.debug) {
      console.log(`[${this.name}] Provider initialized`);
    }
  }

  /**
   * Provider-specific initialization logic
   */
  protected abstract doInitialize(config: ProviderConfig): Promise<void>;

  /**
   * Validate provider configuration
   */
  protected abstract validateConfig(config: ProviderConfig): void;

  /**
   * Get available models
   */
  abstract getModels(): Promise<ModelInfo[]>;

  /**
   * Get specific model info
   */
  async getModel(modelId: string): Promise<ModelInfo | null> {
    const models = await this.getModels();
    return models.find((m) => m.id === modelId) || null;
  }

  /**
   * Check if model is available
   */
  async hasModel(modelId: string): Promise<boolean> {
    const model = await this.getModel(modelId);
    return model !== null;
  }

  /**
   * Get provider capabilities
   */
  abstract getCapabilities(): ProviderCapabilities;

  /**
   * Generate completion (non-streaming)
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    this.assertInitialized();
    this.validateRequest(request);

    return this.withRetry(async () => {
      return this.doComplete(request);
    });
  }

  /**
   * Provider-specific completion logic
   */
  protected abstract doComplete(
    request: CompletionRequest
  ): Promise<CompletionResponse>;

  /**
   * Generate completion (streaming)
   */
  async *stream(request: CompletionRequest): AsyncIterable<StreamChunk> {
    this.assertInitialized();
    this.validateRequest(request);

    yield* this.doStream(request);
  }

  /**
   * Provider-specific streaming logic
   */
  protected abstract doStream(
    request: CompletionRequest
  ): AsyncIterable<StreamChunk>;

  /**
   * Count tokens for text
   */
  abstract countTokens(text: string, model?: string): Promise<number>;

  /**
   * Validate API credentials
   */
  async validateCredentials(): Promise<boolean> {
    try {
      await this.getModels();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Shutdown provider
   */
  async shutdown(): Promise<void> {
    if (this.config.debug) {
      console.log(`[${this.name}] Provider shutting down`);
    }

    await this.doShutdown();
    this.initialized = false;
  }

  /**
   * Provider-specific shutdown logic
   */
  protected async doShutdown(): Promise<void> {
    // Override in subclass if needed
  }

  /**
   * Assert provider is initialized
   */
  protected assertInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        `Provider ${this.name} not initialized. Call initialize() first.`
      );
    }
  }

  /**
   * Validate completion request
   */
  protected validateRequest(request: CompletionRequest): void {
    if (!request.model) {
      throw new Error('Model is required');
    }

    if (!request.messages || request.messages.length === 0) {
      throw new Error('At least one message is required');
    }

    // Validate message roles
    for (const message of request.messages) {
      if (
        !message.role ||
        !['system', 'user', 'assistant', 'function'].includes(message.role)
      ) {
        throw new Error(`Invalid message role: ${message.role}`);
      }
    }
  }

  /**
   * Retry logic with exponential backoff
   */
  protected async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    const maxRetries = this.config.maxRetries || 3;
    const retryDelay = this.config.retryDelay || 1000;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on client errors (4xx)
        if (this.isClientError(error)) {
          throw error;
        }

        // Last attempt, throw error
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retry with exponential backoff
        const delay = retryDelay * Math.pow(2, attempt);
        if (this.config.debug) {
          console.log(
            `[${this.name}] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`
          );
        }
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Check if error is a client error (4xx) that shouldn't be retried
   */
  protected isClientError(error: unknown): boolean {
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status;
      return status >= 400 && status < 500;
    }
    return false;
  }

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Make HTTP request with timeout
   */
  protected async fetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const timeout = this.config.timeout || 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...this.config.headers,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Parse JSON response with error handling
   */
  protected async parseJsonResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Expected JSON response, got: ${contentType}\n${text}`);
    }

    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${error}`);
    }
  }

  /**
   * Handle HTTP error responses
   */
  protected async handleErrorResponse(response: Response): Promise<never> {
    const status = response.status;
    const statusText = response.statusText;

    let errorMessage = `HTTP ${status}: ${statusText}`;

    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const errorData = (await response.json()) as {
          error?: { message?: string };
          message?: string;
        };
        errorMessage =
          errorData.error?.message || errorData.message || errorMessage;
      } else {
        const text = await response.text();
        if (text) {
          errorMessage += `\n${text}`;
        }
      }
    } catch {
      // Ignore JSON parse errors
    }

    const error = new Error(errorMessage);
    (error as Error & { status: number }).status = status;
    throw error;
  }
}
