// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - Provider Registry Tests
// Comprehensive tests for ProviderRegistry
// ═══════════════════════════════════════════════════════════════════════════════

import { ProviderRegistry } from '../../src/runtime/providers/index';
import { MockProvider } from '../../src/runtime/providers/mock';

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;
  let mockProvider1: MockProvider;
  let mockProvider2: MockProvider;

  beforeEach(() => {
    registry = new ProviderRegistry();
    mockProvider1 = new MockProvider();
    mockProvider2 = new MockProvider();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Registration
  // ───────────────────────────────────────────────────────────────────────────

  describe('register', () => {
    test('registers a provider', () => {
      registry.register(mockProvider1);

      expect(registry.has('mock')).toBe(true);
      expect(registry.size).toBe(1);
    });

    test('registers multiple providers', () => {
      // Create providers with different names
      const provider1 = new MockProvider();
      const provider2 = { ...mockProvider2, name: 'mock2' };

      registry.register(provider1);
      registry.register(provider2 as any);

      expect(registry.size).toBe(2);
      expect(registry.has('mock')).toBe(true);
      expect(registry.has('mock2')).toBe(true);
    });

    test('sets first provider as default automatically', () => {
      registry.register(mockProvider1);

      const defaultProvider = registry.getDefault();
      expect(defaultProvider.name).toBe('mock');
    });

    test('does not change default when registering additional providers', () => {
      registry.register(mockProvider1);
      const provider2 = { ...mockProvider2, name: 'mock2' };
      registry.register(provider2 as any);

      const defaultProvider = registry.getDefault();
      expect(defaultProvider.name).toBe('mock'); // First one stays default
    });

    test('overwrites provider if name already exists', () => {
      registry.register(mockProvider1);
      const newProvider = new MockProvider();

      registry.register(newProvider);

      expect(registry.size).toBe(1); // Still only 1 provider
      expect(registry.get('mock')).toBe(newProvider); // New instance
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Unregistration
  // ───────────────────────────────────────────────────────────────────────────

  describe('unregister', () => {
    test('unregisters a provider', () => {
      registry.register(mockProvider1);
      const result = registry.unregister('mock');

      expect(result).toBe(true);
      expect(registry.has('mock')).toBe(false);
      expect(registry.size).toBe(0);
    });

    test('returns false for non-existent provider', () => {
      const result = registry.unregister('non-existent');

      expect(result).toBe(false);
    });

    test('clears default when unregistering default provider', () => {
      registry.register(mockProvider1);
      registry.unregister('mock');

      expect(() => registry.getDefault()).toThrow('No default provider available');
    });

    test('sets new default when unregistering current default', () => {
      registry.register(mockProvider1);
      const provider2 = { ...mockProvider2, name: 'mock2' };
      registry.register(provider2 as any);

      // mock is default
      registry.unregister('mock');

      // Should automatically set mock2 as new default
      const defaultProvider = registry.getDefault();
      expect(defaultProvider.name).toBe('mock2');
    });

    test('handles multiple unregistrations', () => {
      const provider2 = { ...mockProvider2, name: 'mock2' };
      const provider3 = { ...mockProvider2, name: 'mock3' };

      registry.register(mockProvider1);
      registry.register(provider2 as any);
      registry.register(provider3 as any);

      registry.unregister('mock');
      registry.unregister('mock2');

      expect(registry.size).toBe(1);
      expect(registry.has('mock3')).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Retrieval
  // ───────────────────────────────────────────────────────────────────────────

  describe('get', () => {
    test('retrieves registered provider', () => {
      registry.register(mockProvider1);

      const provider = registry.get('mock');

      expect(provider).toBe(mockProvider1);
    });

    test('returns undefined for non-existent provider', () => {
      const provider = registry.get('non-existent');

      expect(provider).toBeUndefined();
    });

    test('retrieves correct provider among multiple', () => {
      const provider2 = { ...mockProvider2, name: 'mock2' };

      registry.register(mockProvider1);
      registry.register(provider2 as any);

      expect(registry.get('mock')).toBe(mockProvider1);
      expect(registry.get('mock2')).toBe(provider2);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Default Provider
  // ───────────────────────────────────────────────────────────────────────────

  describe('getDefault', () => {
    test('returns default provider', () => {
      registry.register(mockProvider1);

      const provider = registry.getDefault();

      expect(provider).toBe(mockProvider1);
    });

    test('throws error when no providers registered', () => {
      expect(() => registry.getDefault()).toThrow('No default provider available');
    });

    test('throws error when default was unregistered and no others exist', () => {
      registry.register(mockProvider1);
      registry.unregister('mock');

      expect(() => registry.getDefault()).toThrow('No default provider available');
    });

    test('returns updated default after setDefault', () => {
      const provider2 = { ...mockProvider2, name: 'mock2' };

      registry.register(mockProvider1);
      registry.register(provider2 as any);

      registry.setDefault('mock2');

      const defaultProvider = registry.getDefault();
      expect(defaultProvider.name).toBe('mock2');
    });
  });

  describe('setDefault', () => {
    test('sets default provider', () => {
      const provider2 = { ...mockProvider2, name: 'mock2' };

      registry.register(mockProvider1);
      registry.register(provider2 as any);

      registry.setDefault('mock2');

      expect(registry.getDefault().name).toBe('mock2');
    });

    test('throws error for non-existent provider', () => {
      expect(() => registry.setDefault('non-existent')).toThrow(
        "Provider 'non-existent' not registered"
      );
    });

    test('can change default multiple times', () => {
      const provider2 = { ...mockProvider2, name: 'mock2' };
      const provider3 = { ...mockProvider2, name: 'mock3' };

      registry.register(mockProvider1);
      registry.register(provider2 as any);
      registry.register(provider3 as any);

      registry.setDefault('mock2');
      expect(registry.getDefault().name).toBe('mock2');

      registry.setDefault('mock3');
      expect(registry.getDefault().name).toBe('mock3');

      registry.setDefault('mock');
      expect(registry.getDefault().name).toBe('mock');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Query Methods
  // ───────────────────────────────────────────────────────────────────────────

  describe('has', () => {
    test('returns true for registered provider', () => {
      registry.register(mockProvider1);

      expect(registry.has('mock')).toBe(true);
    });

    test('returns false for non-existent provider', () => {
      expect(registry.has('non-existent')).toBe(false);
    });

    test('returns false after unregistering', () => {
      registry.register(mockProvider1);
      registry.unregister('mock');

      expect(registry.has('mock')).toBe(false);
    });
  });

  describe('list', () => {
    test('returns empty array when no providers', () => {
      const names = registry.list();

      expect(names).toEqual([]);
    });

    test('returns all provider names', () => {
      const provider2 = { ...mockProvider2, name: 'mock2' };
      const provider3 = { ...mockProvider2, name: 'mock3' };

      registry.register(mockProvider1);
      registry.register(provider2 as any);
      registry.register(provider3 as any);

      const names = registry.list();

      expect(names).toContain('mock');
      expect(names).toContain('mock2');
      expect(names).toContain('mock3');
      expect(names.length).toBe(3);
    });

    test('updates after unregistering', () => {
      const provider2 = { ...mockProvider2, name: 'mock2' };

      registry.register(mockProvider1);
      registry.register(provider2 as any);

      registry.unregister('mock');

      const names = registry.list();

      expect(names).toEqual(['mock2']);
    });
  });

  describe('size', () => {
    test('returns 0 for empty registry', () => {
      expect(registry.size).toBe(0);
    });

    test('returns correct count after registrations', () => {
      registry.register(mockProvider1);
      expect(registry.size).toBe(1);

      const provider2 = { ...mockProvider2, name: 'mock2' };
      registry.register(provider2 as any);
      expect(registry.size).toBe(2);
    });

    test('decrements after unregistration', () => {
      const provider2 = { ...mockProvider2, name: 'mock2' };

      registry.register(mockProvider1);
      registry.register(provider2 as any);

      registry.unregister('mock');

      expect(registry.size).toBe(1);
    });

    test('stays same when overwriting provider', () => {
      registry.register(mockProvider1);
      expect(registry.size).toBe(1);

      const newProvider = new MockProvider();
      registry.register(newProvider);

      expect(registry.size).toBe(1); // Still 1, just replaced
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Edge Cases
  // ───────────────────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    test('handles rapid register/unregister cycles', () => {
      for (let i = 0; i < 10; i++) {
        registry.register(mockProvider1);
        expect(registry.size).toBe(1);
        registry.unregister('mock');
        expect(registry.size).toBe(0);
      }
    });

    test('handles registering same provider instance multiple times', () => {
      registry.register(mockProvider1);
      registry.register(mockProvider1);
      registry.register(mockProvider1);

      expect(registry.size).toBe(1);
      expect(registry.get('mock')).toBe(mockProvider1);
    });

    test('handles unregistering non-existent providers repeatedly', () => {
      expect(registry.unregister('non-existent')).toBe(false);
      expect(registry.unregister('non-existent')).toBe(false);
      expect(registry.unregister('non-existent')).toBe(false);
    });

    test('preserves independence of multiple registries', () => {
      const registry2 = new ProviderRegistry();

      registry.register(mockProvider1);
      const provider2 = { ...mockProvider2, name: 'mock2' };
      registry2.register(provider2 as any);

      expect(registry.has('mock')).toBe(true);
      expect(registry.has('mock2')).toBe(false);

      expect(registry2.has('mock')).toBe(false);
      expect(registry2.has('mock2')).toBe(true);
    });

    test('handles provider with empty name (edge case)', () => {
      const emptyNameProvider = { ...mockProvider1, name: '' };
      registry.register(emptyNameProvider as any);

      expect(registry.has('')).toBe(true);
      expect(registry.get('')).toBe(emptyNameProvider);
    });

    test('maintains correct default after multiple operations', () => {
      // Register 3 providers
      const provider2 = { ...mockProvider2, name: 'mock2' };
      const provider3 = { ...mockProvider2, name: 'mock3' };

      registry.register(mockProvider1); // Default: mock
      registry.register(provider2 as any);
      registry.register(provider3 as any);

      // Change default
      registry.setDefault('mock2'); // Default: mock2

      // Unregister mock2
      registry.unregister('mock2'); // Should pick next available (mock or mock3)

      // Should still have a default
      const defaultProvider = registry.getDefault();
      expect(['mock', 'mock3']).toContain(defaultProvider.name);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Real-World Scenarios
  // ───────────────────────────────────────────────────────────────────────────

  describe('Real-World Scenarios', () => {
    test('typical multi-provider setup', () => {
      const anthropic = { ...mockProvider1, name: 'anthropic' };
      const openai = { ...mockProvider2, name: 'openai' };
      const mock = new MockProvider();

      registry.register(anthropic as any);
      registry.register(openai as any);
      registry.register(mock);

      expect(registry.size).toBe(3);
      expect(registry.list()).toEqual(['anthropic', 'openai', 'mock']);
      expect(registry.getDefault().name).toBe('anthropic'); // First registered
    });

    test('switching default provider at runtime', () => {
      const anthropic = { ...mockProvider1, name: 'anthropic' };
      const openai = { ...mockProvider2, name: 'openai' };

      registry.register(anthropic as any);
      registry.register(openai as any);

      // Start with anthropic
      expect(registry.getDefault().name).toBe('anthropic');

      // Switch to openai for testing
      registry.setDefault('openai');
      expect(registry.getDefault().name).toBe('openai');

      // Switch back
      registry.setDefault('anthropic');
      expect(registry.getDefault().name).toBe('anthropic');
    });

    test('temporary provider registration', () => {
      const mainProvider = { ...mockProvider1, name: 'main' };
      const testProvider = { ...mockProvider2, name: 'test' };

      registry.register(mainProvider as any);
      registry.setDefault('main');

      // Temporarily add test provider
      registry.register(testProvider as any);
      registry.setDefault('test');

      // Do some testing...

      // Remove test provider
      registry.unregister('test');
      registry.setDefault('main');

      expect(registry.size).toBe(1);
      expect(registry.getDefault().name).toBe('main');
    });

    test('provider hot-swapping', () => {
      const oldProvider = new MockProvider();
      registry.register(oldProvider);

      // Swap with new instance (same name)
      const newProvider = new MockProvider();
      registry.register(newProvider);

      expect(registry.size).toBe(1);
      expect(registry.get('mock')).toBe(newProvider);
      expect(registry.get('mock')).not.toBe(oldProvider);
    });
  });
});
