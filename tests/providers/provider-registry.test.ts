/**
 * Provider Registry Tests
 * Tests for provider registration and lifecycle management
 */

import {
  ProviderRegistry,
  getProviderRegistry,
  registerProvider,
  getProvider,
  listProviders,
} from '../../src/providers/provider-registry';
import { BaseProvider } from '../../src/providers/base-provider';
import type {
  Provider,
  ProviderConfig,
  ProviderCapabilities,
  ModelInfo,
  CompletionRequest,
  CompletionResponse,
  StreamChunk,
  ProviderRegistryEntry,
} from '../../src/providers/provider-interface';

// Test provider implementation
class MockProvider extends BaseProvider {
  readonly name = 'mock';
  readonly displayName = 'Mock Provider';
  readonly version = '1.0.0';

  protected async doInitialize(_config: ProviderConfig): Promise<void> {}

  protected validateConfig(_config: ProviderConfig): void {}

  async getModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'mock-model',
        name: 'Mock Model',
        capabilities: this.getCapabilities(),
      },
    ];
  }

  getCapabilities(): ProviderCapabilities {
    return {
      streaming: true,
      functionCalling: false,
      vision: false,
      jsonMode: false,
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
      content: 'Mock response',
      finishReason: 'stop',
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      model: 'mock-model',
    };
  }

  protected async *doStream(
    _request: CompletionRequest
  ): AsyncIterable<StreamChunk> {
    yield { content: 'Mock', done: false };
    yield { content: '', done: true, finishReason: 'stop' };
  }

  async countTokens(text: string): Promise<number> {
    return Math.ceil(text.length / 4);
  }
}

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    // Get fresh instance and clear it
    registry = ProviderRegistry.getInstance();
    registry.clear();
  });

  afterEach(async () => {
    await registry.shutdownAll();
    registry.clear();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Singleton Pattern
  // ───────────────────────────────────────────────────────────────────────────

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = ProviderRegistry.getInstance();
      const instance2 = ProviderRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return same instance via helper', () => {
      const instance1 = getProviderRegistry();
      const instance2 = getProviderRegistry();
      expect(instance1).toBe(instance2);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Registration
  // ───────────────────────────────────────────────────────────────────────────

  describe('provider registration', () => {
    it('should register a provider', () => {
      const entry: ProviderRegistryEntry = {
        factory: () => new MockProvider(),
        metadata: {
          name: 'mock',
          displayName: 'Mock Provider',
          description: 'A mock provider for testing',
          version: '1.0.0',
        },
      };

      registry.register(entry);
      expect(registry.has('mock')).toBe(true);
    });

    it('should prevent duplicate registration', () => {
      const entry: ProviderRegistryEntry = {
        factory: () => new MockProvider(),
        metadata: {
          name: 'mock',
          displayName: 'Mock Provider',
          description: 'A mock provider',
          version: '1.0.0',
        },
      };

      registry.register(entry);
      expect(() => registry.register(entry)).toThrow(
        'Provider "mock" is already registered'
      );
    });

    it('should register via helper function', () => {
      const entry: ProviderRegistryEntry = {
        factory: () => new MockProvider(),
        metadata: {
          name: 'mock',
          displayName: 'Mock Provider',
          description: 'A mock provider',
          version: '1.0.0',
        },
      };

      registerProvider(entry);
      expect(registry.has('mock')).toBe(true);
    });

    it('should register multiple providers', () => {
      const entry1: ProviderRegistryEntry = {
        factory: () => new MockProvider(),
        metadata: {
          name: 'mock1',
          displayName: 'Mock Provider 1',
          description: 'First mock',
          version: '1.0.0',
        },
      };

      const entry2: ProviderRegistryEntry = {
        factory: () => new MockProvider(),
        metadata: {
          name: 'mock2',
          displayName: 'Mock Provider 2',
          description: 'Second mock',
          version: '1.0.0',
        },
      };

      registry.register(entry1);
      registry.register(entry2);

      expect(registry.has('mock1')).toBe(true);
      expect(registry.has('mock2')).toBe(true);
      expect(registry.listNames()).toHaveLength(2);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Unregistration
  // ───────────────────────────────────────────────────────────────────────────

  describe('provider unregistration', () => {
    it('should unregister a provider', () => {
      const entry: ProviderRegistryEntry = {
        factory: () => new MockProvider(),
        metadata: {
          name: 'mock',
          displayName: 'Mock Provider',
          description: 'A mock provider',
          version: '1.0.0',
        },
      };

      registry.register(entry);
      expect(registry.has('mock')).toBe(true);

      registry.unregister('mock');
      expect(registry.has('mock')).toBe(false);
    });

    it('should shutdown active provider on unregister', async () => {
      const entry: ProviderRegistryEntry = {
        factory: () => new MockProvider(),
        metadata: {
          name: 'mock',
          displayName: 'Mock Provider',
          description: 'A mock provider',
          version: '1.0.0',
        },
      };

      registry.register(entry);
      const provider = await registry.get('mock', { apiKey: 'test' });
      expect(provider).toBeDefined();

      registry.unregister('mock');
      expect(registry.has('mock')).toBe(false);
    });

    it('should handle unregistering non-existent provider', () => {
      expect(() => registry.unregister('non-existent')).not.toThrow();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Metadata
  // ───────────────────────────────────────────────────────────────────────────

  describe('metadata retrieval', () => {
    beforeEach(() => {
      const entry: ProviderRegistryEntry = {
        factory: () => new MockProvider(),
        metadata: {
          name: 'mock',
          displayName: 'Mock Provider',
          description: 'A mock provider for testing',
          version: '1.0.0',
          homepage: 'https://example.com',
          documentation: 'https://docs.example.com',
        },
      };
      registry.register(entry);
    });

    it('should get provider metadata', () => {
      const metadata = registry.getMetadata('mock');
      expect(metadata).toBeDefined();
      expect(metadata!.name).toBe('mock');
      expect(metadata!.displayName).toBe('Mock Provider');
      expect(metadata!.description).toBe('A mock provider for testing');
      expect(metadata!.version).toBe('1.0.0');
      expect(metadata!.homepage).toBe('https://example.com');
      expect(metadata!.documentation).toBe('https://docs.example.com');
    });

    it('should return null for non-existent provider', () => {
      const metadata = registry.getMetadata('non-existent');
      expect(metadata).toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Listing
  // ───────────────────────────────────────────────────────────────────────────

  describe('provider listing', () => {
    it('should list all providers', () => {
      const entry1: ProviderRegistryEntry = {
        factory: () => new MockProvider(),
        metadata: {
          name: 'mock1',
          displayName: 'Mock Provider 1',
          description: 'First',
          version: '1.0.0',
        },
      };

      const entry2: ProviderRegistryEntry = {
        factory: () => new MockProvider(),
        metadata: {
          name: 'mock2',
          displayName: 'Mock Provider 2',
          description: 'Second',
          version: '2.0.0',
        },
      };

      registry.register(entry1);
      registry.register(entry2);

      const providers = registry.list();
      expect(providers).toHaveLength(2);
      expect(providers.some((p) => p.name === 'mock1')).toBe(true);
      expect(providers.some((p) => p.name === 'mock2')).toBe(true);
    });

    it('should list via helper function', () => {
      const entry: ProviderRegistryEntry = {
        factory: () => new MockProvider(),
        metadata: {
          name: 'mock',
          displayName: 'Mock Provider',
          description: 'A mock',
          version: '1.0.0',
        },
      };

      registry.register(entry);
      const providers = listProviders();
      expect(providers).toHaveLength(1);
    });

    it('should list provider names', () => {
      const entry1: ProviderRegistryEntry = {
        factory: () => new MockProvider(),
        metadata: {
          name: 'mock1',
          displayName: 'Mock 1',
          description: 'First',
          version: '1.0.0',
        },
      };

      const entry2: ProviderRegistryEntry = {
        factory: () => new MockProvider(),
        metadata: {
          name: 'mock2',
          displayName: 'Mock 2',
          description: 'Second',
          version: '1.0.0',
        },
      };

      registry.register(entry1);
      registry.register(entry2);

      const names = registry.listNames();
      expect(names).toHaveLength(2);
      expect(names).toContain('mock1');
      expect(names).toContain('mock2');
    });

    it('should return empty list when no providers', () => {
      const providers = registry.list();
      expect(providers).toHaveLength(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Provider Creation
  // ───────────────────────────────────────────────────────────────────────────

  describe('provider creation', () => {
    beforeEach(() => {
      const entry: ProviderRegistryEntry = {
        factory: () => new MockProvider(),
        metadata: {
          name: 'mock',
          displayName: 'Mock Provider',
          description: 'A mock provider',
          version: '1.0.0',
        },
      };
      registry.register(entry);
    });

    it('should create provider instance', async () => {
      const provider = await registry.create('mock', { apiKey: 'test' });
      expect(provider).toBeDefined();
      expect(provider.name).toBe('mock');
    });

    it('should throw for non-existent provider', async () => {
      await expect(
        registry.create('non-existent', { apiKey: 'test' })
      ).rejects.toThrow('Provider "non-existent" not found');
    });

    it('should include available providers in error', async () => {
      await expect(
        registry.create('non-existent', { apiKey: 'test' })
      ).rejects.toThrow('Available: mock');
    });

    it('should initialize provider during creation', async () => {
      const provider = await registry.create('mock', { apiKey: 'test' });
      const models = await provider.getModels();
      expect(models).toBeDefined();
      expect(models.length).toBeGreaterThan(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Singleton Provider Instances
  // ───────────────────────────────────────────────────────────────────────────

  describe('singleton provider instances', () => {
    beforeEach(() => {
      const entry: ProviderRegistryEntry = {
        factory: () => new MockProvider(),
        metadata: {
          name: 'mock',
          displayName: 'Mock Provider',
          description: 'A mock provider',
          version: '1.0.0',
        },
      };
      registry.register(entry);
    });

    it('should return same instance on multiple gets', async () => {
      const provider1 = await registry.get('mock', { apiKey: 'test' });
      const provider2 = await registry.get('mock', { apiKey: 'test' });
      expect(provider1).toBe(provider2);
    });

    it('should get via helper function', async () => {
      const provider = await getProvider('mock', { apiKey: 'test' });
      expect(provider).toBeDefined();
      expect(provider.name).toBe('mock');
    });

    it('should create new instance with create()', async () => {
      const provider1 = await registry.create('mock', { apiKey: 'test' });
      const provider2 = await registry.create('mock', { apiKey: 'test' });
      expect(provider1).not.toBe(provider2);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Shutdown
  // ───────────────────────────────────────────────────────────────────────────

  describe('shutdown', () => {
    beforeEach(() => {
      const entry: ProviderRegistryEntry = {
        factory: () => new MockProvider(),
        metadata: {
          name: 'mock',
          displayName: 'Mock Provider',
          description: 'A mock provider',
          version: '1.0.0',
        },
      };
      registry.register(entry);
    });

    it('should shutdown all active providers', async () => {
      await registry.get('mock', { apiKey: 'test' });
      await registry.shutdownAll();
      // Should not throw
    });

    it('should handle shutdown errors gracefully', async () => {
      const shutdownSpy = vi
        .spyOn(MockProvider.prototype, 'shutdown')
        .mockRejectedValue(new Error('Shutdown failed'));

      await registry.get('mock', { apiKey: 'test' });
      await expect(registry.shutdownAll()).resolves.not.toThrow();

      shutdownSpy.mockRestore();
    });

    it('should clear active providers after shutdown', async () => {
      await registry.get('mock', { apiKey: 'test' });
      await registry.shutdownAll();
      // Getting provider again should create new instance
      const provider = await registry.get('mock', { apiKey: 'test' });
      expect(provider).toBeDefined();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Clear
  // ───────────────────────────────────────────────────────────────────────────

  describe('clear', () => {
    it('should clear all registrations', () => {
      const entry: ProviderRegistryEntry = {
        factory: () => new MockProvider(),
        metadata: {
          name: 'mock',
          displayName: 'Mock Provider',
          description: 'A mock provider',
          version: '1.0.0',
        },
      };

      registry.register(entry);
      expect(registry.has('mock')).toBe(true);

      registry.clear();
      expect(registry.has('mock')).toBe(false);
      expect(registry.listNames()).toHaveLength(0);
    });

    it('should shutdown providers before clearing', async () => {
      const entry: ProviderRegistryEntry = {
        factory: () => new MockProvider(),
        metadata: {
          name: 'mock',
          displayName: 'Mock Provider',
          description: 'A mock provider',
          version: '1.0.0',
        },
      };

      registry.register(entry);
      await registry.get('mock', { apiKey: 'test' });

      registry.clear();
      expect(registry.has('mock')).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Edge Cases
  // ───────────────────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('should handle checking non-existent provider', () => {
      expect(registry.has('non-existent')).toBe(false);
    });

    it('should handle empty provider name', () => {
      expect(registry.has('')).toBe(false);
    });

    it('should handle null-like provider names gracefully', () => {
      expect(registry.getMetadata('')).toBeNull();
    });

    it('should maintain registration order in list', () => {
      const entry1: ProviderRegistryEntry = {
        factory: () => new MockProvider(),
        metadata: {
          name: 'a-provider',
          displayName: 'A',
          description: 'First',
          version: '1.0.0',
        },
      };

      const entry2: ProviderRegistryEntry = {
        factory: () => new MockProvider(),
        metadata: {
          name: 'b-provider',
          displayName: 'B',
          description: 'Second',
          version: '1.0.0',
        },
      };

      registry.register(entry1);
      registry.register(entry2);

      const names = registry.listNames();
      expect(names.indexOf('a-provider')).toBeLessThan(
        names.indexOf('b-provider')
      );
    });
  });
});
