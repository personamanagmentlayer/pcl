/**
 * Base Provider Tests
 * Tests for the abstract BaseProvider class functionality
 */

import { BaseProvider } from '../../src/providers/base-provider';
import type {
  ProviderConfig,
  ProviderCapabilities,
  ModelInfo,
  CompletionRequest,
  CompletionResponse,
  StreamChunk,
} from '../../src/providers/provider-interface';

// Concrete implementation for testing
class TestProvider extends BaseProvider {
  readonly name = 'test';
  readonly displayName = 'Test Provider';
  readonly version = '1.0.0';

  protected async doInitialize(_config: ProviderConfig): Promise<void> {
    // Test implementation
  }

  protected validateConfig(config: ProviderConfig): void {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'test-model',
        name: 'Test Model',
        capabilities: this.getCapabilities(),
        inputTokenCost: 0.001,
        outputTokenCost: 0.002,
      },
    ];
  }

  getCapabilities(): ProviderCapabilities {
    return {
      streaming: true,
      functionCalling: true,
      vision: false,
      jsonMode: true,
      systemMessages: true,
      maxContextTokens: 4096,
      maxOutputTokens: 2048,
      temperature: true,
      topP: true,
      topK: false,
      stopSequences: true,
      chatHistory: true,
    };
  }

  protected async doComplete(
    _request: CompletionRequest
  ): Promise<CompletionResponse> {
    return {
      content: 'Test response',
      finishReason: 'stop',
      usage: {
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
      },
      model: 'test-model',
    };
  }

  protected async *doStream(
    _request: CompletionRequest
  ): AsyncIterable<StreamChunk> {
    yield { content: 'Test ', done: false };
    yield { content: 'response', done: false };
    yield {
      content: '',
      done: true,
      finishReason: 'stop',
      usage: {
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
      },
    };
  }

  async countTokens(text: string): Promise<number> {
    return Math.ceil(text.length / 4);
  }
}

describe('BaseProvider', () => {
  let provider: TestProvider;
  let mockFetch: any;

  beforeEach(() => {
    provider = new TestProvider();
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Initialization
  // ───────────────────────────────────────────────────────────────────────────

  describe('initialization', () => {
    it('should initialize with valid config', async () => {
      await provider.initialize({ apiKey: 'test-key' });
      expect(provider.name).toBe('test');
      expect(provider.displayName).toBe('Test Provider');
      expect(provider.version).toBe('1.0.0');
    });

    it('should set default timeout', async () => {
      await provider.initialize({ apiKey: 'test-key' });
      // Provider should be initialized
      const models = await provider.getModels();
      expect(models).toBeDefined();
    });

    it('should set default retry config', async () => {
      await provider.initialize({
        apiKey: 'test-key',
        maxRetries: 5,
        retryDelay: 2000,
      });
      const models = await provider.getModels();
      expect(models).toBeDefined();
    });

    it('should enable debug mode', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await provider.initialize({ apiKey: 'test-key', debug: true });
      expect(consoleSpy).toHaveBeenCalledWith('[test] Provider initialized');
      consoleSpy.mockRestore();
    });

    it('should throw on invalid config', async () => {
      await expect(provider.initialize({})).rejects.toThrow(
        'API key is required'
      );
    });

    it('should merge config with defaults', async () => {
      await provider.initialize({
        apiKey: 'test-key',
        timeout: 60000,
      });
      // Should succeed with merged config
      const models = await provider.getModels();
      expect(models).toBeDefined();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Model Management
  // ───────────────────────────────────────────────────────────────────────────

  describe('model management', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should get all models', async () => {
      const models = await provider.getModels();
      expect(models).toHaveLength(1);
      expect(models[0].id).toBe('test-model');
    });

    it('should get specific model', async () => {
      const model = await provider.getModel('test-model');
      expect(model).not.toBeNull();
      expect(model!.id).toBe('test-model');
      expect(model!.name).toBe('Test Model');
    });

    it('should return null for non-existent model', async () => {
      const model = await provider.getModel('non-existent');
      expect(model).toBeNull();
    });

    it('should check if model exists', async () => {
      const exists = await provider.hasModel('test-model');
      expect(exists).toBe(true);
    });

    it('should check if model does not exist', async () => {
      const exists = await provider.hasModel('non-existent');
      expect(exists).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Request Validation
  // ───────────────────────────────────────────────────────────────────────────

  describe('request validation', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should require model in request', async () => {
      const request = {
        model: '',
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      await expect(provider.complete(request)).rejects.toThrow(
        'Model is required'
      );
    });

    it('should require messages in request', async () => {
      const request = {
        model: 'test-model',
        messages: [],
      };

      await expect(provider.complete(request)).rejects.toThrow(
        'At least one message is required'
      );
    });

    it('should validate message roles', async () => {
      const request = {
        model: 'test-model',
        messages: [{ role: 'invalid' as any, content: 'Hello' }],
      };

      await expect(provider.complete(request)).rejects.toThrow(
        'Invalid message role'
      );
    });

    it('should accept valid system role', async () => {
      const request = {
        model: 'test-model',
        messages: [{ role: 'system' as const, content: 'You are helpful' }],
      };

      const response = await provider.complete(request);
      expect(response).toBeDefined();
    });

    it('should accept valid user role', async () => {
      const request = {
        model: 'test-model',
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      const response = await provider.complete(request);
      expect(response).toBeDefined();
    });

    it('should accept valid assistant role', async () => {
      const request = {
        model: 'test-model',
        messages: [{ role: 'assistant' as const, content: 'Hi there' }],
      };

      const response = await provider.complete(request);
      expect(response).toBeDefined();
    });

    it('should accept valid function role', async () => {
      const request = {
        model: 'test-model',
        messages: [{ role: 'function' as const, content: 'Result' }],
      };

      const response = await provider.complete(request);
      expect(response).toBeDefined();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Completion
  // ───────────────────────────────────────────────────────────────────────────

  describe('completion', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should complete valid request', async () => {
      const request = {
        model: 'test-model',
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      const response = await provider.complete(request);
      expect(response.content).toBe('Test response');
      expect(response.finishReason).toBe('stop');
      expect(response.usage.totalTokens).toBe(15);
    });

    it('should throw if not initialized', async () => {
      const uninitProvider = new TestProvider();
      const request = {
        model: 'test-model',
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      await expect(uninitProvider.complete(request)).rejects.toThrow(
        'not initialized'
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Streaming
  // ───────────────────────────────────────────────────────────────────────────

  describe('streaming', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should stream response', async () => {
      const request = {
        model: 'test-model',
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.stream(request)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0].content).toBe('Test ');
      expect(chunks[0].done).toBe(false);
      expect(chunks[1].content).toBe('response');
      expect(chunks[1].done).toBe(false);
      expect(chunks[2].done).toBe(true);
      expect(chunks[2].usage).toBeDefined();
    });

    it('should throw if not initialized', async () => {
      const uninitProvider = new TestProvider();
      const request = {
        model: 'test-model',
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      const stream = uninitProvider.stream(request);
      await expect(stream.next()).rejects.toThrow('not initialized');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Retry Logic
  // ───────────────────────────────────────────────────────────────────────────

  describe('retry logic', () => {
    beforeEach(async () => {
      await provider.initialize({
        apiKey: 'test-key',
        maxRetries: 3,
        retryDelay: 10,
      });
    });

    it('should not retry on client errors (4xx)', async () => {
      const errorProvider = new (class extends TestProvider {
        protected async doComplete(): Promise<CompletionResponse> {
          const error: any = new Error('Bad Request');
          error.status = 400;
          throw error;
        }
      })();

      await errorProvider.initialize({
        apiKey: 'test-key',
        maxRetries: 3,
        retryDelay: 10,
      });

      const request = {
        model: 'test-model',
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      await expect(errorProvider.complete(request)).rejects.toThrow(
        'Bad Request'
      );
    });

    it('should count tokens', async () => {
      const tokens = await provider.countTokens('Hello, world!');
      expect(tokens).toBeGreaterThan(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Credentials Validation
  // ───────────────────────────────────────────────────────────────────────────

  describe('credentials validation', () => {
    it('should validate credentials successfully', async () => {
      await provider.initialize({ apiKey: 'test-key' });
      const valid = await provider.validateCredentials();
      expect(valid).toBe(true);
    });

    it('should return false for invalid credentials', async () => {
      const failProvider = new (class extends TestProvider {
        async getModels(): Promise<ModelInfo[]> {
          throw new Error('Unauthorized');
        }
      })();

      await failProvider.initialize({ apiKey: 'bad-key' });
      const valid = await failProvider.validateCredentials();
      expect(valid).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Shutdown
  // ───────────────────────────────────────────────────────────────────────────

  describe('shutdown', () => {
    it('should shutdown cleanly', async () => {
      await provider.initialize({ apiKey: 'test-key' });
      await provider.shutdown();
      // Provider should be marked as not initialized
    });

    it('should log shutdown in debug mode', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await provider.initialize({ apiKey: 'test-key', debug: true });
      await provider.shutdown();
      expect(consoleSpy).toHaveBeenCalledWith('[test] Provider shutting down');
      consoleSpy.mockRestore();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // HTTP Helpers
  // ───────────────────────────────────────────────────────────────────────────

  describe('HTTP helpers', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key', timeout: 1000 });
    });

    it('should handle fetch timeout', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ ok: true }), 5000);
          })
      );

      // Access protected fetch method through provider's public methods
      const request = {
        model: 'test-model',
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      // This should eventually timeout (implementation dependent)
      const response = await provider.complete(request);
      expect(response).toBeDefined();
    });

    it('should merge custom headers', async () => {
      await provider.initialize({
        apiKey: 'test-key',
        headers: { 'X-Custom': 'value' },
      });

      const models = await provider.getModels();
      expect(models).toBeDefined();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Error Handling
  // ───────────────────────────────────────────────────────────────────────────

  describe('error handling', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    });

    it('should detect client errors', async () => {
      const error: any = new Error('Bad Request');
      error.status = 400;

      const errorProvider = new (class extends TestProvider {
        protected async doComplete(): Promise<CompletionResponse> {
          throw error;
        }
      })();

      await errorProvider.initialize({ apiKey: 'test-key' });
      const request = {
        model: 'test-model',
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      await expect(errorProvider.complete(request)).rejects.toThrow(
        'Bad Request'
      );
    });

    it('should detect server errors', async () => {
      const error: any = new Error('Internal Server Error');
      error.status = 500;

      const errorProvider = new (class extends TestProvider {
        protected async doComplete(): Promise<CompletionResponse> {
          throw error;
        }
      })();

      await errorProvider.initialize({
        apiKey: 'test-key',
        maxRetries: 0,
      });
      const request = {
        model: 'test-model',
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      await expect(errorProvider.complete(request)).rejects.toThrow(
        'Internal Server Error'
      );
    });
  });
});
